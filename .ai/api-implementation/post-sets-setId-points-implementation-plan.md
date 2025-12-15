# API Implementation: POST /api/sets/{setId}/points

## Przegląd

**Endpoint:** `/api/sets/{setId}/points`
**Metoda:** POST
**Cel:** Dodanie punktu do aktywnego seta z automatycznym obliczaniem serwującego
**Prerender:** `false`

**Funkcjonalność:**

- Automatyczne obliczanie `sequence_in_set` i `served_by` (zasady tenisa stołowego)
- Opcjonalne przypisanie tagów
- Aktualizacja wyniku seta
- Zwracanie stanu seta z `current_server` dla następnego punktu

---

## Request

### Path Parameters

- `setId` (integer, required) - ID seta

**Schemat:** `idParamSchema` (shared-plan: Common Schemas)

### Body: CreatePointCommandDto

```typescript
{
  scored_by: 'player' | 'opponent',  // required
  tag_ids?: number[]                  // optional, array of positive integers
}
```

**Schemat:** `createPointCommandSchema` (shared-plan: Point Schemas)

---

## Response

### 201 Created

```typescript
{
  data: {
    id: number,
    set_id: number,
    sequence_in_set: number,
    scored_by: SideEnum,
    served_by: SideEnum,
    created_at: string,
    tags: string[],           // Nazwy tagów (nie IDs)
    set_state: {
      id: number,
      set_score_player: number,
      set_score_opponent: number,
      current_server: SideEnum  // Serwer NASTĘPNEGO punktu
    }
  }
}
```

### Błędy

- **404** - Set nie istnieje lub brak dostępu
- **422** - Walidacja biznesowa:
  - "Cannot add point: match is already finished"
  - "Cannot add point: set is already finished"
  - "Invalid tag IDs: {ids}" (tagi nie istnieją)
- **500** - Błąd serwera

---

## Implementacja

### Plik: `src/pages/api/sets/[id]/points/index.ts`

```typescript
export const prerender = false;

export async function POST(context: APIContext) {
  // 1. Supabase client + userId
  const supabase = supabaseClient;
  const userId = DEFAULT_USER_ID;

  // 2. Walidacja setId
  const paramResult = idParamSchema.safeParse({ id: context.params.setId });
  if (!paramResult.success) {
    return createValidationErrorResponse(paramResult.error);
  }

  const setId = paramResult.data.id;

  // 3. Walidacja body
  const bodyResult = await parseRequestBody(
    context.request,
    createPointCommandSchema
  );
  if (!bodyResult.success) {
    return createValidationErrorResponse(bodyResult.error);
  }

  const command = bodyResult.data;

  // 4. Utworzenie punktu
  try {
    const result = await createPoint(
      supabase,
      userId,
      setId,
      command.scored_by,
      command.tag_ids || []
    );

    if (!result) {
      return createNotFoundResponse("Set not found");
    }

    return createSuccessResponse(result, 201);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createNotFoundResponse("Set not found");
    }
    if (error instanceof ApiError) {
      return createErrorResponse(error.code, error.message, error.statusCode);
    }
    if (error instanceof DatabaseError) {
      logError("POST /api/sets/{setId}/points", error, {
        userId,
        setId,
        command,
      });
      return createInternalErrorResponse();
    }
    throw error;
  }
}
```

### Kluczowe kroki:

1. **Import clienta:** `supabaseClient, DEFAULT_USER_ID` z `src/db/supabase.client`
2. **Walidacja setId:** `idParamSchema` na `context.params.setId`
3. **Walidacja body:** `parseRequestBody` + `createPointCommandSchema`
4. **Service:** `createPoint(supabase, userId, setId, scoredBy, tagIds)`
5. **Response:** `createSuccessResponse(result, 201)`

---

## Logika biznesowa

### Zasady serwowania (w point.service)

**Normalny set do 10:10:**

- Zmiana co 2 punkty

**Normalny set po 10:10 (deuce):**

- Zmiana co 1 punkt

**Golden set:**

- Zmiana co 1 punkt przez cały set

**Implementacja:** Funkcje `calculateServedBy`, `determineCurrentServer`, `determineFirstServerForSet` w point.service (szczegóły w shared-plan)

### Walidacja biznesowa

Service weryfikuje:

- Mecz w statusie 'in_progress'
- Set nie zakończony (`is_finished = false`)
- Tagi istnieją w bazie (jeśli podane)

### Database queries

7-9 queries (w zależności od tagów):

1. SELECT set (weryfikacja ownership)
2. SELECT match (weryfikacja statusu)
3. SELECT tags (walidacja tag_ids, jeśli podane)
4. SELECT MAX(sequence) + COUNT (obliczenia)
5. INSERT point
6. INSERT point_tags (bulk)
7. UPDATE set (increment score)
8. SELECT tags names (dla response, jeśli podane)

### Current server

**Ważne:** `current_server` w response = serwer NASTĘPNEGO punktu, nie obecnego

---

## Zależności

**Services:** `point.service.createPoint`
**Schemas:** `idParamSchema`, `createPointCommandSchema`
**Utils:** `parseRequestBody`, `createSuccessResponse`, `createNotFoundResponse`, `createValidationErrorResponse`, `createErrorResponse`, `createInternalErrorResponse`, `logError`
**Errors:** `NotFoundError`, `ApiError`, `DatabaseError`

---

**Wersja:** 3.0 (Optimized)
