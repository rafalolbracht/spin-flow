# API Implementation: POST /api/sets/{id}/finish

## Przegląd

**Endpoint:** `/api/sets/{id}/finish`  
**Metoda:** POST  
**Cel:** Zakończenie seta i automatyczne utworzenie następnego  
**Prerender:** `false`

**Operacje:**

- Waliduje wynik (brak remisu)
- Oznacza set jako zakończony
- Aktualizuje wynik meczu
- Tworzy następny set (jeśli mecz nie zakończony)

---

## Request

### Path Parameters

- `id` (integer, required) - ID seta

**Schemat:** `idParamSchema` (shared-plan: Common Schemas)

### Body: FinishSetCommandDto

```typescript
{
  coach_notes?: string | null
}
```

**Schemat:** `finishSetCommandSchema` (shared-plan: Set Schemas)

---

## Response

### 200 OK

```typescript
{
  data: {
    finished_set: {
      id: number,
      is_finished: true,
      winner: SideEnum,
      set_score_player: number,
      set_score_opponent: number,
      finished_at: string
    },
    next_set: {
      id: number,
      sequence_in_match: number,
      is_golden: boolean,
      set_score_player: 0,
      set_score_opponent: 0,
      is_finished: false,
      current_server: SideEnum
    }
  }
}
```

### Błędy

- **404** - Set nie istnieje lub brak dostępu
- **422** - Walidacja biznesowa:
  - "Set is already finished"
  - "Cannot finish set: match is already finished"
  - "Cannot finish set: score is tied"
  - "Cannot finish last set: use finish match endpoint instead"
- **500** - Błąd serwera

---

## Implementacja

### Plik: `src/pages/api/sets/[id]/finish.ts`

```typescript
export const prerender = false;

export async function POST(context: APIContext) {
  // 1. Supabase client + userId
  const supabase = supabaseClient;
  const userId = DEFAULT_USER_ID;

  // 2. Walidacja id
  const paramResult = idParamSchema.safeParse({ id: context.params.id });
  if (!paramResult.success) {
    return createValidationErrorResponse(paramResult.error);
  }

  const setId = paramResult.data.id;

  // 3. Walidacja body
  const bodyResult = await parseRequestBody(context.request, finishSetCommandSchema);
  if (!bodyResult.success) {
    return createValidationErrorResponse(bodyResult.error);
  }

  const command = bodyResult.data;

  // 4. Zakończenie seta
  try {
    const result = await finishSet(supabase, userId, setId, command);

    if (!result) {
      return createNotFoundResponse("Set not found");
    }

    return createSuccessResponse(result);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createNotFoundResponse("Set not found");
    }
    if (error instanceof ApiError) {
      return createErrorResponse(error.code, error.message, error.statusCode);
    }
    if (error instanceof DatabaseError) {
      logError("POST /api/sets/{id}/finish", error, { userId, setId, command });
      return createInternalErrorResponse();
    }
    throw error;
  }
}
```

### Kluczowe kroki:

1. **Import clienta:** `supabaseClient, DEFAULT_USER_ID` z `src/db/supabase.client`
2. **Walidacja id:** `idParamSchema` na `context.params.id`
3. **Walidacja body:** `parseRequestBody` + `finishSetCommandSchema`
4. **Service:** `finishSet(supabase, userId, setId, command)`
5. **Response:** `createSuccessResponse(result)`

---

## Logika biznesowa

### Walidacje w service

- Set nie jest już zakończony (`is_finished = false`)
- Mecz w statusie 'in_progress'
- Wynik nie jest remisowy (set_score_player ≠ set_score_opponent)
- **Ważne:** To NIE jest ostatni możliwy set (wymuszenie użycia finish match endpoint)

### Określenie zwycięzcy

```typescript
winner = set_score_player > set_score_opponent ? "player" : "opponent";
```

### Aktualizacja meczu

- Przeliczenie `sets_won_player` / `sets_won_opponent` (COUNT GROUP BY winner)
- Sprawdzenie czy mecz się zakończył (ktoś wygrał > max_sets/2)

### Utworzenie następnego seta

- `sequence_in_match` = obecny + 1
- `first_server` = alternating (zgodnie z regułami)
- `is_golden` = true jeśli enabled i ostatni możliwy set

### Database queries

~6 queries w service (szczegóły w shared-plan: Set Service)

---

## Zależności

**Services:** `set.service.finishSet`  
**Schemas:** `idParamSchema`, `finishSetCommandSchema`  
**Utils:** `parseRequestBody`, `createSuccessResponse`, `createNotFoundResponse`, `createValidationErrorResponse`, `createErrorResponse`, `createInternalErrorResponse`, `logError`  
**Errors:** `NotFoundError`, `ApiError`, `DatabaseError`

---

**Wersja:** 3.0 (Optimized)
