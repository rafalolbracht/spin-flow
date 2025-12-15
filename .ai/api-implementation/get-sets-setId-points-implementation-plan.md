# API Implementation: GET /api/sets/{setId}/points

## Przegląd

**Endpoint:** `/api/sets/{setId}/points`
**Metoda:** GET
**Cel:** Pobieranie wszystkich punktów dla konkretnego seta
**Prerender:** `false`

**Funkcjonalność:**

- Zwraca punkty posortowane według `sequence_in_set` (chronologicznie)
- Tagi są **zawsze ładowane** (parametr `include` ignorowany)
- Weryfikacja ownership seta

---

## Request

### Path Parameters

- `setId` (integer, required) - ID seta

**Schemat:** `idParamSchema` (shared-plan: Common Schemas)

### Query Parameters (opcjonalne)

- `include` (string) - Wartość: `"tags"` (w praktyce ignorowany - tagi zawsze ładowane)

**Schemat:** `pointsIncludeQuerySchema` (shared-plan: Point Schemas)

---

## Response

### 200 OK

```typescript
{
  data: PointWithTagsDto[]  // Array of points with tags
}
```

**PointWithTagsDto:**

```typescript
{
  id: number,
  set_id: number,
  sequence_in_set: number,
  scored_by: SideEnum,
  served_by: SideEnum,
  created_at: string,
  tags: string[]  // Nazwy tagów (nie IDs)
}
```

**Sortowanie:** `sequence_in_set ASC`

### Błędy

- **404** - Set nie istnieje lub brak dostępu (ten sam komunikat)
- **422** - Walidacja parametrów (setId nieprawidłowy format)
- **500** - Błąd serwera

---

## Implementacja

### Plik: `src/pages/api/sets/[id]/points/index.ts`

```typescript
export const prerender = false;

export async function GET(context: APIContext) {
  // 1. Supabase client + userId
  const supabase = supabaseClient;
  const userId = DEFAULT_USER_ID;

  // 2. Walidacja setId
  const paramResult = idParamSchema.safeParse({ id: context.params.setId });
  if (!paramResult.success) {
    return createValidationErrorResponse(paramResult.error);
  }

  const setId = paramResult.data.id;

  // 3. Walidacja query param (opcjonalne, ale zachowane dla zgodności)
  const queryResult = parseQueryParams(
    context.url.searchParams,
    pointsIncludeQuerySchema
  );
  if (!queryResult.success) {
    return createValidationErrorResponse(queryResult.error);
  }

  // 4. Pobranie punktów
  try {
    const points = await getPointsBySetId(supabase, userId, setId);

    if (!points) {
      return createNotFoundResponse("Set not found");
    }

    return createListResponse(points);
  } catch (error) {
    if (error instanceof DatabaseError) {
      logError("GET /api/sets/{setId}/points", error, { userId, setId });
      return createInternalErrorResponse();
    }
    throw error;
  }
}
```

### Kluczowe kroki:

1. **Import clienta:** `supabaseClient, DEFAULT_USER_ID` z `src/db/supabase.client`
2. **Walidacja setId:** `idParamSchema` na `context.params.setId`
3. **Walidacja query:** `parseQueryParams` + `pointsIncludeQuerySchema` (opcjonalne)
4. **Service:** `getPointsBySetId(supabase, userId, setId)`
5. **Response:** `createListResponse(points)`

---

## Logika biznesowa

### Tagi zawsze ładowane

**Ważne:** Parametr `include=tags` jest opcjonalny w specyfikacji, ale w implementacji tagi są **zawsze ładowane** (uproszczenie).

- Frontend może zignorować tagi jeśli nie potrzebuje
- Eliminuje potrzebę warunkowego ładowania

### Information disclosure prevention

Service zwraca `null` dla:

- Set nie istnieje
- Brak dostępu do seta

Endpoint zwraca ten sam komunikat "Set not found" dla obu.

### Database queries

Maksymalnie 2 queries:

1. SELECT set (weryfikacja ownership) - w point.service
2. SELECT points z tagami (via getPointsBySetIds z set.service)

**Optymalizacja N+1:** Wykorzystanie `getPointsBySetIds` z nested select:

```sql
SELECT *, point_tags(tag:tags(name))
FROM points
WHERE set_id IN (...)
ORDER BY sequence_in_set ASC
```

---

## Zależności

**Services:** `point.service.getPointsBySetId` (używa `set.service.getPointsBySetIds`)
**Schemas:** `idParamSchema`, `pointsIncludeQuerySchema`
**Utils:** `parseQueryParams`, `createListResponse`, `createNotFoundResponse`, `createValidationErrorResponse`, `createInternalErrorResponse`, `logError`
**Errors:** `DatabaseError`

---

**Wersja:** 3.0 (Optimized)
