# API Implementation: GET /api/matches/{id}

## Przegląd

**Endpoint:** `/api/matches/{id}`  
**Metoda:** GET  
**Cel:** Pobieranie szczegółów pojedynczego meczu z opcjonalnym ładowaniem relacji  
**Prerender:** `false`

**Operacje:**

- Pobiera pojedynczy mecz po ID
- Wspiera lazy loading przez parametr `include`
- Automatycznie dołącza `current_set` dla meczów w trakcie
- `current_set: null` dla meczów zakończonych

---

## Request

### Path Parameters

- `id` (integer, required) - ID meczu

**Schemat:** `idParamSchema` (shared-plan: Common Schemas)

### Query Parameters

- `include` (string, optional, CSV) - Lista relacji do załadowania: `sets`, `points`, `tags`, `ai_report`

**Schemat:** `includeQuerySchema` (shared-plan: Match Schemas)

**Logika zależności:**

- `sets` - samodzielny (tylko sety, bez punktów)
- `points` - automatycznie włącza `sets` (sety z punktami, bez tagów)
- `tags` - automatycznie włącza `points` i `sets` (sety z punktami i tagami)
- `ai_report` - samodzielny (tylko raport AI)

**Przykłady:**

- `?include=sets` - tylko sety
- `?include=sets,points` - sety z punktami
- `?include=sets,points,tags` - wszystko
- `?include=ai_report` - tylko raport AI
- `?include=sets,ai_report` - sety + raport AI

---

## Response

### 200 OK

```typescript
{
  data: {
    // Match fields
    id: number,
    player_name: string,
    opponent_name: string,
    max_sets: number,
    golden_set_enabled: boolean,
    first_server_first_set: SideEnum,
    generate_ai_summary: boolean,
    sets_won_player: number,
    sets_won_opponent: number,
    status: MatchStatusEnum,
    coach_notes: string | null,
    started_at: string,
    ended_at: string | null,
    created_at: string,

    // Current set (automatically included)
    current_set: CurrentSetDto | null,  // null for finished matches

    // Optional: if include=sets
    sets?: SetDetailDto[],

    // Optional: if include=ai_report
    ai_report?: AiReportDto | null
  }
}
```

**CurrentSetDto:**

```typescript
{
  id: number,
  sequence_in_match: number,
  is_golden: boolean,
  set_score_player: number,
  set_score_opponent: number,
  is_finished: boolean,
  current_server: SideEnum
}
```

**SetDetailDto:**

```typescript
{
  id: number,
  sequence_in_match: number,
  is_golden: boolean,
  set_score_player: number,
  set_score_opponent: number,
  is_finished: boolean,
  current_server: SideEnum | null,
  points?: PointWithTagsDto[]  // if include=points or include=tags
}
```

**PointWithTagsDto:**

```typescript
{
  id: number,
  sequence_in_set: number,
  scored_by: SideEnum,
  tags: string[]  // Tag names (if include=tags)
}
```

**AiReportDto:**

```typescript
{
  status: 'pending' | 'success' | 'error',
  summary?: string,
  recommendations?: string,
  error_message?: string,
  generated_at?: string
}
```

### Błędy

- **404** - Mecz nie istnieje lub brak dostępu
- **422** - Nieprawidłowy format ID lub include
- **500** - Błąd serwera

---

## Implementacja

### Plik: `src/pages/api/matches/[id].ts` (współdzielony z DELETE i PATCH)

```typescript
export const prerender = false;

export async function GET(context: APIContext) {
  // 1. Supabase client + userId
  const supabase = supabaseClient;
  const userId = DEFAULT_USER_ID;

  // 2. Walidacja path param
  const paramResult = idParamSchema.safeParse({ id: context.params.id });
  if (!paramResult.success) {
    return createValidationErrorResponse(paramResult.error);
  }

  const matchId = paramResult.data.id;

  // 3. Walidacja query param
  const queryResult = parseQueryParams(context.url.searchParams, includeQuerySchema);
  if (!queryResult.success) {
    return createValidationErrorResponse(queryResult.error);
  }

  const { include } = queryResult.data;

  // 4. Parsowanie include
  const includeSets = include?.includes("sets") || include?.includes("points") || include?.includes("tags");
  const includePoints = include?.includes("points") || include?.includes("tags");
  const includeTags = include?.includes("tags");
  const includeAiReport = include?.includes("ai_report");

  // 5. Pobranie meczu
  try {
    const match = await getMatchById(supabase, userId, matchId, {
      includeSets,
      includePoints,
      includeTags,
      includeAiReport,
    });

    if (!match) {
      return createNotFoundResponse("Match not found");
    }

    return createSuccessResponse(match, 200);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createNotFoundResponse("Match not found");
    }
    if (error instanceof DatabaseError) {
      logError("GET /api/matches/{id}", error, { userId, matchId, include });
      return createInternalErrorResponse();
    }
    throw error;
  }
}
```

### Kluczowe kroki:

1. **Import clienta:** `supabaseClient, DEFAULT_USER_ID` z `src/db/supabase.client`
2. **Walidacja id:** `idParamSchema` na `context.params.id`
3. **Walidacja include:** `parseQueryParams` + `includeQuerySchema`
4. **Parsowanie zależności:** `includeSets`, `includePoints`, `includeTags`, `includeAiReport`
5. **Service:** `getMatchById(supabase, userId, matchId, options)`
6. **Response:** `createSuccessResponse(match, 200)` lub `createNotFoundResponse()`

---

## Logika biznesowa

### Algorytm w getMatchById service

1. **SELECT match:**
   - WHERE id = matchId AND user_id = userId
   - Return null jeśli nie znaleziono

2. **SELECT current_set (automatycznie):**
   - Dla status='in_progress': ostatni nieukończony set
   - Dla status='finished': null

3. **Opcjonalnie: SELECT sets (jeśli includeSets):**
   - WHERE match_id = matchId
   - ORDER BY sequence_in_match

4. **Opcjonalnie: SELECT points (jeśli includePoints):**
   - WHERE set_id IN (setIds)
   - ORDER BY sequence_in_set
   - Optymalizacja: 1 query dla wszystkich setów (WHERE IN)

5. **Opcjonalnie: SELECT tags (jeśli includeTags):**
   - JOIN point_tags + tags
   - WHERE point_id IN (pointIds)
   - Optymalizacja: bulk query z nested select

6. **Opcjonalnie: SELECT ai_report (jeśli includeAiReport):**
   - WHERE match_id = matchId
   - Return null jeśli brak lub pending/error

7. **Mapowanie na DTO:**
   - `MatchDetailDto` z odpowiednimi polami opcjonalnymi

### Database queries

**Minimum:** 2 queries (match + current_set)  
**Maximum:** 6 queries (match + current_set + sets + points + tags + ai_report)

**Optymalizacje:**

- N+1 prevention: bulk queries z WHERE IN dla punktów i tagów
- Nested selects dla relacji 1:N (points → tags)

### Logika zależności include

```typescript
// Automatyczne cascade
if (include.has("tags")) {
  include.add("points");
  include.add("sets");
}
if (include.has("points")) {
  include.add("sets");
}
```

### current_set logic

- **in_progress:** Ostatni set WHERE is_finished=false (powinien być dokładnie 1)
- **finished:** null (brak nieukończonych setów)

### Information disclosure prevention

Jednolita odpowiedź 404 dla:

- Mecz nie istnieje
- Użytkownik nie jest właścicielem

---

## Zależności

**Services:** `match.service.getMatchById`  
**Schemas:** `idParamSchema`, `includeQuerySchema`  
**Utils:** `parseQueryParams`, `createSuccessResponse`, `createNotFoundResponse`, `createValidationErrorResponse`, `createInternalErrorResponse`, `logError`  
**Errors:** `NotFoundError`, `DatabaseError`

---

**Wersja:** 3.0 (Optimized)
