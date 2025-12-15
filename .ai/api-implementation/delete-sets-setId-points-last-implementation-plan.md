# API Implementation: DELETE /api/sets/{setId}/points/last

## Przegląd

**Endpoint:** `/api/sets/{setId}/points/last`
**Metoda:** DELETE
**Cel:** Cofnięcie ostatniego zdobytego punktu w secie
**Prerender:** `false`

**Operacje:**

- Usuwa ostatni punkt i jego tagi
- Aktualizuje wynik seta
- Zwraca nowy current_server

---

## Request

### Path Parameters

- `setId` (integer, required) - ID seta

**Schemat:** `idParamSchema` (shared-plan: Common Schemas)

### Body

Brak

---

## Response

### 200 OK

```typescript
{
  data: {
    deleted_point_id: number,
    set_state: {
      id: number,
      set_score_player: number,
      set_score_opponent: number,
      current_server: SideEnum  // 'player' | 'opponent'
    }
  }
}
```

### Błędy

- **404** - Set nie istnieje lub brak dostępu
- **422** - Walidacja biznesowa:
  - "Cannot undo point: match is already finished"
  - "Cannot undo point: set is already finished"
  - "Cannot undo point: set has no points"
- **500** - Błąd serwera

---

## Implementacja

### Plik: `src/pages/api/sets/[id]/points/delete.ts`

```typescript
export const prerender = false;

export async function DELETE(context: APIContext) {
  // 1. Supabase client + userId
  const supabase = supabaseClient;
  const userId = DEFAULT_USER_ID;

  // 2. Walidacja setId
  const paramResult = idParamSchema.safeParse({ id: context.params.setId });
  if (!paramResult.success) {
    return createValidationErrorResponse(paramResult.error);
  }

  const setId = paramResult.data.id;

  // 3. Cofnięcie punktu
  try {
    const result = await undoLastPoint(supabase, userId, setId);

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
      logError("DELETE /api/sets/{setId}/points/last", error, {
        userId,
        setId,
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
3. **Service:** `undoLastPoint(supabase, userId, setId)`
4. **Response:** `createSuccessResponse(result)`

---

## Logika biznesowa

### Walidacja stanu

Service weryfikuje:

- Mecz w statusie 'in_progress'
- Set nie jest zakończony (`is_finished = false`)
- Set ma co najmniej 1 punkt

### Algorytm usuwania

1. Znajdź ostatni punkt: `ORDER BY sequence_in_set DESC LIMIT 1`
2. Zapisz `served_by` jako `current_server` (dla response)
3. DELETE point_tags
4. DELETE point
5. UPDATE set (decrement score column)

### Current server logic

**Ważne:** `current_server` po undo = `served_by` z usuwanego punktu

- Nie wymaga ponownego obliczania
- Prostsze i wydajniejsze niż rekurencja

### Database queries

Maksymalnie 6 queries:

1. SELECT set (weryfikacja ownership)
2. SELECT match (weryfikacja statusu)
3. SELECT last point
4. DELETE point_tags
5. DELETE point
6. UPDATE set

---

## Zależności

**Services:** `point.service.undoLastPoint`
**Schemas:** `idParamSchema`
**Utils:** `createSuccessResponse`, `createNotFoundResponse`, `createValidationErrorResponse`, `createErrorResponse`, `createInternalErrorResponse`, `logError`
**Errors:** `NotFoundError`, `ApiError`, `DatabaseError`

---

**Wersja:** 3.0 (Optimized)
