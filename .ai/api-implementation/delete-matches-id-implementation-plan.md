# API Implementation: DELETE /api/matches/{id}

## Przegląd

**Endpoint:** `/api/matches/{id}`  
**Metoda:** DELETE  
**Cel:** Trwałe usunięcie meczu wraz z powiązanymi danymi  
**Prerender:** `false`

**Operacje:**

- Kaskadowe usuwanie: sety → punkty → tagi punktów → raporty AI → publiczne udostępnienia
- Operacja nieodwracalna
- Zwraca 204 No Content

---

## Request

### Path Parameters

- `id` (integer, required) - ID meczu

**Schemat:** `idParamSchema` (shared-plan: Common Schemas)

### Body

Brak (metoda DELETE)

---

## Response

### 204 No Content

```
Status: 204 No Content
Body: (empty)
```

### Błędy

- **404** - Mecz nie istnieje lub brak dostępu
- **422** - Nieprawidłowy format ID
- **500** - Błąd serwera

---

## Implementacja

### Plik: `src/pages/api/matches/[id].ts` (współdzielony z GET i PATCH)

```typescript
export const prerender = false;

export async function DELETE(context: APIContext) {
  // 1. Supabase client + userId
  const supabase = supabaseClient;
  const userId = DEFAULT_USER_ID;

  // 2. Walidacja id
  const paramResult = idParamSchema.safeParse({ id: context.params.id });
  if (!paramResult.success) {
    return createValidationErrorResponse(paramResult.error);
  }

  const matchId = paramResult.data.id;

  // 3. Usunięcie meczu
  try {
    const deleted = await deleteMatch(supabase, userId, matchId);

    if (!deleted) {
      return createNotFoundResponse("Match not found");
    }

    return createNoContentResponse();
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createNotFoundResponse("Match not found");
    }
    if (error instanceof DatabaseError) {
      logError("DELETE /api/matches/{id}", error, { userId, matchId });
      return createInternalErrorResponse();
    }
    throw error;
  }
}
```

### Kluczowe kroki:

1. **Import clienta:** `supabaseClient, DEFAULT_USER_ID` z `src/db/supabase.client`
2. **Walidacja id:** `idParamSchema` na `context.params.id`
3. **Service:** `deleteMatch(supabase, userId, matchId)` → `true` | `false`
4. **Response:** `createNoContentResponse()` (204) lub `createNotFoundResponse()` (404)

---

## Logika biznesowa

### Kaskadowe usuwanie (w deleteMatch service)

**Kolejność operacji:**

1. Weryfikacja ownership (return false jeśli brak dostępu)
2. SELECT setIds WHERE match_id
3. SELECT pointIds WHERE set_id IN (setIds)
4. DELETE point_tags WHERE point_id IN (pointIds) - non-blocking
5. DELETE points WHERE set_id IN (setIds)
6. DELETE sets WHERE match_id
7. DELETE matches_ai_reports - non-blocking
8. DELETE matches_public_share - non-blocking
9. UPDATE analytics_events SET match_id=NULL - non-blocking, bez user_id filter
10. DELETE matches
11. Return true

**Bulk operations:**

- `WHERE IN (...)` zamiast pętli
- Maksymalnie 10 queries niezależnie od wielkości danych

**Non-blocking failures:**

- Błędy w point_tags, ai_reports, public_share, analytics nie przerywają głównego flow
- Logowane jako warning, nie jako error

### Database queries

Maksymalnie 10 queries (szczegóły w shared-plan: Match Service `deleteMatch`)

### Brak transakcji DB

**Ważne:** Supabase TypeScript SDK nie oferuje explicit transactions

**Rozwiązanie dla MVP:**

- Akceptujemy ryzyko częściowego niepowodzenia jako edge case
- Szczegółowe logowanie błędów
- RLS policies zapobiegają "wiszącym" rekordom

**Przyszłość:** Stored procedure w Postgres z transakcją

---

## Zależności

**Services:** `match.service.deleteMatch`  
**Schemas:** `idParamSchema`  
**Utils:** `createNoContentResponse`, `createNotFoundResponse`, `createValidationErrorResponse`, `createInternalErrorResponse`, `logError`  
**Errors:** `NotFoundError`, `DatabaseError`

---

**Wersja:** 3.0 (Optimized)
