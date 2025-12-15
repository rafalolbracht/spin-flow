# API Implementation: PATCH /api/matches/{id}

## Przegląd

**Endpoint:** `/api/matches/{id}`
**Metoda:** PATCH
**Cel:** Aktualizacja metadanych istniejącego meczu (partial update)
**Prerender:** `false`

**Edytowalne pola:**

- `player_name`
- `opponent_name`
- `coach_notes`

**Ograniczenia:**

- Nie można modyfikować setów, punktów ani statusu meczu
- Wszystkie pola opcjonalne

---

## Request

### Path Parameters

- `id` (integer, required) - ID meczu

**Schemat:** `idParamSchema` (shared-plan: Common Schemas)

### Body: UpdateMatchCommandDto

```typescript
{
  player_name?: string,      // 1-200 chars
  opponent_name?: string,    // 1-200 chars
  coach_notes?: string | null
}
```

**Schemat:** `updateMatchCommandSchema` (shared-plan: Match Schemas)

**Uwaga:** Wszystkie pola opcjonalne, puste body `{}` dozwolone

---

## Response

### 200 OK

```typescript
{
  data: {
    id: number,
    player_name: string,
    opponent_name: string,
    coach_notes: string | null,
    updated_at: string
  }
}
```

### Błędy

- **404** - Mecz nie istnieje lub brak dostępu
- **422** - Walidacja (puste nazwy, za długie, nieprawidłowy format id)
- **400** - Invalid JSON
- **500** - Błąd serwera

---

## Implementacja

### Plik: `src/pages/api/matches/[id]/update.ts`

```typescript
export const prerender = false;

export async function PATCH(context: APIContext) {
  // 1. Supabase client + userId
  const supabase = supabaseClient;
  const userId = DEFAULT_USER_ID;

  // 2. Walidacja id
  const paramResult = idParamSchema.safeParse({ id: context.params.id });
  if (!paramResult.success) {
    return createValidationErrorResponse(paramResult.error);
  }

  const matchId = paramResult.data.id;

  // 3. Walidacja body
  const bodyResult = await parseRequestBody(
    context.request,
    updateMatchCommandSchema
  );
  if (!bodyResult.success) {
    // JSON parse error
    if (bodyResult.error instanceof Error) {
      return createErrorResponse("INVALID_JSON", bodyResult.error.message, 400);
    }
    // Zod validation error
    return createValidationErrorResponse(bodyResult.error);
  }

  const command = bodyResult.data;

  // 4. Aktualizacja meczu
  try {
    const result = await updateMatch(supabase, userId, matchId, command);

    if (!result) {
      return createNotFoundResponse("Match not found");
    }

    return createSuccessResponse(result);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createNotFoundResponse("Match not found");
    }
    if (error instanceof DatabaseError) {
      logError("PATCH /api/matches/{id}", error, { userId, matchId, command });
      return createInternalErrorResponse();
    }
    throw error;
  }
}
```

### Kluczowe kroki:

1. **Import clienta:** `supabaseClient, DEFAULT_USER_ID` z `src/db/supabase.client`
2. **Walidacja id:** `idParamSchema` na `context.params.id`
3. **Walidacja body:** `parseRequestBody` + `updateMatchCommandSchema`
4. **Service:** `updateMatch(supabase, userId, matchId, command)`
5. **Response:** `createSuccessResponse(result)`

---

## Logika biznesowa

### Partial Update

**Ważne:** Tylko podane pola są aktualizowane, reszta pozostaje niezmieniona

```typescript
// Przykład: tylko player_name
{ "player_name": "New Name" }
// → updateuje player_name, opponent_name i coach_notes pozostają bez zmian
```

### Aktualizacja updated_at

Pole `updated_at` jest automatycznie aktualizowane przez bazę danych.

### Database queries

2 queries w service:

1. SELECT match (weryfikacja ownership via getMatchById)
2. UPDATE match (tylko podane pola + updated_at)

### Idempotency

PATCH jest idempotentny:

- Wielokrotne wywołanie z tym samym body daje ten sam rezultat
- Bezpieczne retry w przypadku network errors

---

## Zależności

**Services:** `match.service.updateMatch`
**Schemas:** `idParamSchema`, `updateMatchCommandSchema`
**Utils:** `parseRequestBody`, `createSuccessResponse`, `createNotFoundResponse`, `createValidationErrorResponse`, `createErrorResponse`, `createInternalErrorResponse`, `logError`
**Errors:** `NotFoundError`, `DatabaseError`

---

**Wersja:** 3.0 (Optimized)
