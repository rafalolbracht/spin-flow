# API Implementation: GET /api/sets/{id}

## Przegląd

**Endpoint:** `/api/sets/{id}`
**Metoda:** GET
**Cel:** Pobieranie szczegółowych informacji o konkretnym secie
**Prerender:** `false`

**Funkcjonalność:**

- Zwraca pojedynczy set z metadanymi
- Opcjonalne includowanie punktów z tagami
- Weryfikacja ownership seta

---

## Request

### Path Parameters

- `id` (integer, required) - ID seta

**Schemat:** `idParamSchema` (shared-plan: Common Schemas)

### Query Parameters (opcjonalne)

- `include` (string) - Relacje do załadowania: `"points"`, `"tags"`, `"points,tags"`

**Schemat:** `setsIncludeQuerySchema` (shared-plan: Set Schemas)

---

## Response

### 200 OK

```typescript
{
  data: SetDetailDto;
}
```

**SetDetailDto:**

```typescript
{
  id: number,
  match_id: number,
  sequence_in_match: number,
  is_golden: boolean,
  set_score_player: number,
  set_score_opponent: number,
  winner: SideEnum | null,
  is_finished: boolean,
  coach_notes: string | null,
  finished_at: string | null,
  created_at: string,
  current_server: SideEnum | null,  // null dla zakończonych setów
  points?: PointWithTagsDto[]        // jeśli include zawiera "points" lub "tags"
}
```

### Błędy

- **404** - Set nie istnieje lub brak dostępu (ten sam komunikat)
- **422** - Walidacja parametrów (id lub include nieprawidłowy)
- **500** - Błąd serwera

---

## Implementacja

### Plik: `src/pages/api/sets/[id]/index.ts`

```typescript
export const prerender = false;

export async function GET(context: APIContext) {
  // 1. Supabase client + userId
  const supabase = supabaseClient;
  const userId = DEFAULT_USER_ID;

  // 2. Walidacja id
  const paramResult = idParamSchema.safeParse({ id: context.params.id });
  if (!paramResult.success) {
    return createValidationErrorResponse(paramResult.error);
  }

  const setId = paramResult.data.id;

  // 3. Walidacja query params
  const queryResult = parseQueryParams(
    context.url.searchParams,
    setsIncludeQuerySchema
  );
  if (!queryResult.success) {
    return createValidationErrorResponse(queryResult.error);
  }

  // 4. Określenie flagi includePoints
  const includePoints =
    queryResult.data.include?.includes("points") ||
    queryResult.data.include?.includes("tags") ||
    false;

  // 5. Pobranie seta
  try {
    const set = await getSetById(supabase, userId, setId, includePoints);

    if (!set) {
      return createNotFoundResponse("Set not found");
    }

    return createSuccessResponse(set);
  } catch (error) {
    if (error instanceof DatabaseError) {
      logError("GET /api/sets/{id}", error, {
        userId,
        setId,
        include: queryResult.data.include,
      });
      return createInternalErrorResponse();
    }
    throw error;
  }
}
```

### Kluczowe kroki:

1. **Import clienta:** `supabaseClient, DEFAULT_USER_ID` z `src/db/supabase.client`
2. **Walidacja id:** `idParamSchema` na `context.params.id`
3. **Walidacja query:** `parseQueryParams` + `setsIncludeQuerySchema`
4. **Flaga includePoints:** Sprawdź czy include zawiera "points" lub "tags"
5. **Service:** `getSetById(supabase, userId, setId, includePoints)`
6. **Response:** `createSuccessResponse(set)`

---

## Logika biznesowa

### Conditional Loading

**includePoints flag:**

- `true` jeśli include zawiera "points" LUB "tags"
- `false` domyślnie (nie podano include)

**Warunkowe ładowanie:**

- Bez include: tylko metadata seta (~300 bytes)
- Z include: metadata + punkty z tagami (~2-8 KB w zależności od liczby punktów)

### Information disclosure prevention

Service zwraca `null` dla:

- Set nie istnieje
- Brak dostępu do seta (user_id nie pasuje)

Endpoint zwraca ten sam komunikat "Set not found" dla obu przypadków.

### Database queries

Maksymalnie 2 queries:

1. SELECT set (weryfikacja ownership)
2. SELECT points (jeśli includePoints = true, via getPointsBySetIds z set.service)

**Optymalizacja N+1:** Wykorzystanie nested select dla punktów + tagów.

---

## Zależności

**Services:** `set.service.getSetById`
**Schemas:** `idParamSchema`, `setsIncludeQuerySchema`
**Utils:** `parseQueryParams`, `createSuccessResponse`, `createNotFoundResponse`, `createValidationErrorResponse`, `createInternalErrorResponse`, `logError`
**Errors:** `DatabaseError`

---

**Wersja:** 3.0 (Optimized)
