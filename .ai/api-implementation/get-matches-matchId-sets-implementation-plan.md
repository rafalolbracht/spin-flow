# API Implementation: GET /api/matches/{matchId}/sets

## Przegląd

**Endpoint:** `/api/matches/{matchId}/sets`  
**Metoda:** GET  
**Cel:** Pobieranie wszystkich setów dla konkretnego meczu  
**Prerender:** `false`

**Funkcjonalność:**

- Zwraca listę setów posortowaną według `sequence_in_match`
- Opcjonalne includowanie punktów z tagami
- Weryfikacja ownership meczu

---

## Request

### Path Parameters

- `matchId` (integer, required) - ID meczu

**Schemat:** `idParamSchema` (shared-plan: Common Schemas)

### Query Parameters (opcjonalne)

- `include` (string) - Relacje do załadowania: `"points"`, `"tags"`, `"points,tags"`

**Schemat:** `setsIncludeQuerySchema` (shared-plan: Set Schemas)

---

## Response

### 200 OK

```typescript
{
  data: SetDetailDto[]  // Array of sets with optional points
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
  points?: PointWithTagsDto[]  // jeśli include zawiera "points" lub "tags"
}
```

**Uwaga:** Pusta tablica `[]` to poprawna odpowiedź (mecz bez setów)

### Błędy

- **404** - Mecz nie istnieje lub brak dostępu (ten sam komunikat)
- **422** - Walidacja parametrów (matchId lub include nieprawidłowy)
- **500** - Błąd serwera

---

## Implementacja

### Plik: `src/pages/api/matches/[matchId]/sets.ts`

```typescript
export const prerender = false;

export async function GET(context: APIContext) {
  // 1. Supabase client + userId
  const supabase = supabaseClient;
  const userId = DEFAULT_USER_ID;

  // 2. Walidacja matchId
  const paramResult = idParamSchema.safeParse({ id: context.params.matchId });
  if (!paramResult.success) {
    return createValidationErrorResponse(paramResult.error);
  }

  const matchId = paramResult.data.id;

  // 3. Walidacja query params
  const queryResult = parseQueryParams(context.url.searchParams, setsIncludeQuerySchema);
  if (!queryResult.success) {
    return createValidationErrorResponse(queryResult.error);
  }

  // 4. Weryfikacja ownership meczu
  try {
    const match = await getMatchById(supabase, userId, matchId, undefined);

    if (!match) {
      return createNotFoundResponse("Match not found");
    }

    // 5. Określenie flagi includePoints
    const includePoints =
      queryResult.data.include?.includes("points") || queryResult.data.include?.includes("tags") || false;

    // 6. Pobranie setów
    const sets = await getSetsByMatchId(supabase, userId, matchId, includePoints);

    return createListResponse(sets);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createNotFoundResponse("Match not found");
    }
    if (error instanceof DatabaseError) {
      logError("GET /api/matches/{matchId}/sets", error, { userId, matchId, include: queryResult.data.include });
      return createInternalErrorResponse();
    }
    throw error;
  }
}
```

### Kluczowe kroki:

1. **Import clienta:** `supabaseClient, DEFAULT_USER_ID` z `src/db/supabase.client`
2. **Walidacja matchId:** `idParamSchema` na `context.params.matchId`
3. **Walidacja query:** `parseQueryParams` + `setsIncludeQuerySchema`
4. **Weryfikacja ownership:** `getMatchById(supabase, userId, matchId, undefined)`
5. **Flaga includePoints:** Sprawdź czy include zawiera "points" lub "tags"
6. **Service:** `getSetsByMatchId(supabase, userId, matchId, includePoints)`
7. **Response:** `createListResponse(sets)`

---

## Logika biznesowa

### Weryfikacja ownership meczu

**Ważne:** Przed pobraniem setów endpoint musi zweryfikować że mecz należy do użytkownika:

```typescript
const match = await getMatchById(supabase, userId, matchId, undefined);
if (!match) return 404;
```

### Conditional Loading

**includePoints flag:**

- `true` jeśli include zawiera "points" LUB "tags"
- `false` domyślnie

**Warunkowe ładowanie:**

- Bez include: tylko metadata setów
- Z include: metadata + punkty z tagami

### Information disclosure prevention

- `getMatchById` zwraca null dla "nie istnieje" i "brak dostępu"
- Ten sam komunikat "Match not found" dla obu przypadków

### Pusta lista

- Mecz bez setów = `{ data: [] }` z statusem 200
- To NIE jest błąd

### Limity

- Brak paginacji (max 7 setów w meczu)
- Liczba setów jest naturalnie ograniczona przez zasady gry

---

## Zależności

**Services:** `match.service.getMatchById`, `set.service.getSetsByMatchId`  
**Schemas:** `idParamSchema`, `setsIncludeQuerySchema`  
**Utils:** `parseQueryParams`, `createListResponse`, `createNotFoundResponse`, `createValidationErrorResponse`, `createInternalErrorResponse`, `logError`  
**Errors:** `NotFoundError`, `DatabaseError`

---

**Wersja:** 3.0 (Optimized)
