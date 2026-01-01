# Shared Components Implementation Plan

## Przegląd

Ten dokument opisuje plan implementacji wspólnych komponentów dla API w aplikacji Spin Flow:

- Spójne formatowanie odpowiedzi API
- Jednolite zarządzanie błędami
- Reużywalne funkcje walidacji
- Logikę biznesową dla encji (Match, Set, Point, Analytics)
- Schematy walidacji Zod

**UWAGA:** Middleware (`src/middleware/index.ts`) jest już zaimplementowany.

**⚠️ ZAŁOŻENIA DEVELOPMENTOWE:**

- Autentykacja jest **tymczasowo wyłączona** - używamy `DEFAULT_USER_ID`
- Wszystkie endpointy działają bez JWT token
- RLS w Supabase weryfikuje `DEFAULT_USER_ID` (`"69c4930b-63f6-4c05-9dec-c3b888fac1f5"`)
- **Dane testowe w bazie muszą mieć** `user_id = DEFAULT_USER_ID`
- Pełna autentykacja zostanie dodana w późniejszych krokach projektu

---

## 1. Uniwersalne Wzorce i Konwencje

### 1.1 Supabase Client i Autentykacja (Development Mode)

**⚠️ TYMCZASOWE ROZWIĄZANIE - Development bez autentykacji:**

**W Astro API routes:**

```typescript
import { supabaseClient, DEFAULT_USER_ID } from "../../db/supabase.client";

export async function GET(context: APIContext) {
  const supabase = supabaseClient; // ✅ Import z src/db/supabase.client.ts
  const userId = DEFAULT_USER_ID; // ✅ Tymczasowe - zastąpi context.locals.userId

  // Wywołaj service
  const result = await someService(supabase, userId, ...);
  // ...
}
```

**W services:**

```typescript
import type { SupabaseClient } from "../../db/supabase.client";

export async function someService(
  supabase: SupabaseClient, // przekazywany z endpoint
  userId: string // DEFAULT_USER_ID w development
  // ...
) {
  // RLS w Supabase używa userId (DEFAULT_USER_ID w development)
  const { data } = await supabase
    .from("matches")
    .select("*")
    .eq("user_id", userId); // ✅ Weryfikacja ownership
}
```

**WAŻNE - Importy:**

- ✅ `import { supabaseClient, DEFAULT_USER_ID } from "../../db/supabase.client"`
- ❌ NIE importuj z `@supabase/supabase-js` ani `node_modules`
- ✅ Zawsze używaj klienta z `src/db/supabase.client.ts`

**DEFAULT_USER_ID:**

- UUID: `"69c4930b-63f6-4c05-9dec-c3b888fac1f5"`
- Używany w development zamiast prawdziwego userId z JWT
- RLS w Supabase weryfikuje ten ID
- TODO: Zastąpić prawdziwą autentykacją (middleware + JWT)

**Przyszłość (po implementacji autentykacji):**

```typescript
// Będzie (w routes):
const supabase = context.locals.supabase; // z middleware
const userId = context.locals.userId; // z JWT token

// Services pozostają bez zmian - przyjmują userId jako parametr
```

**Przykład pełnego endpoint (development):**

```typescript
// src/pages/api/matches/index.ts
import { supabaseClient, DEFAULT_USER_ID } from "../../../db/supabase.client";
import { getMatchesPaginated } from "../../../lib/services/match.service";
import { createPaginatedResponse } from "../../../lib/utils/api-response";

export async function GET(context: APIContext) {
  const supabase = supabaseClient;
  const userId = DEFAULT_USER_ID;

  // Parse query params (później)
  const query = { page: 1, limit: 20 };

  // Wywołaj service
  const result = await getMatchesPaginated(supabase, userId, query);

  // Zwróć response
  return createPaginatedResponse(result.data, result.pagination.total);
}
```

### 1.2 Error Handling

**Wzorzec dla wszystkich services:**

```typescript
// NotFoundError: return null (endpoint obsługuje jako 404)
if (!resource) return null;

// ValidationError: throw ApiError(422)
if (businessRuleViolated) {
  throw new ApiError("VALIDATION_ERROR", "Message", 422);
}

// DatabaseError: throw (propaguj wyżej)
if (dbError) {
  throw new DatabaseError("Failed to ...");
}
```

**Information Disclosure Prevention:**

- Return null dla both "not found" i "access denied"
- Zawsze ten sam komunikat błędu dla różnych scenariuszy
- Przykład: "Match not found" dla "nie istnieje" i "brak dostępu"

### 1.3 Autoryzacja i Ownership

**Wzorzec weryfikacji (z DEFAULT_USER_ID w development):**

```typescript
// Zawsze weryfikuj user_id w query (userId = DEFAULT_USER_ID w development)
const { data: match } = await supabase
  .from("matches")
  .select("*")
  .eq("id", matchId)
  .eq("user_id", userId) // ✅ RLS weryfikacja
  .single();

// Return null zamiast throw dla access denied
if (!match) return null; // nie ujawniaj czy to not found czy no access
```

**UWAGA Development:**

- W development `userId = DEFAULT_USER_ID` dla wszystkich requestów
- Wszystkie dane w bazie powinny mieć `user_id = DEFAULT_USER_ID`
- RLS weryfikuje poprawnie, ale wszystko należy do jednego "użytkownika"
- Po dodaniu autentykacji: `userId` będzie z JWT tokena

### 1.4 Mapowanie DTO

**Konwencje:**

- Nazewnictwo: `mapXToYDto(source, ...additionalData): YDto`
- Zawsze usuwaj `user_id` z rezultatów
- Grupuj mapping functions na końcu każdego serwisu

### 1.5 Optymalizacje Wydajności

**N+1 Prevention:**

```typescript
// ❌ Źle: pętla
for (const set of sets) {
  const points = await getPointsBySetId(set.id); // N queries
}

// ✅ Dobrze: bulk query
const allPoints = await getPointsBySetIds(setIds); // 1 query
```

**Inne optymalizacje:**

- Nested selects Supabase dla relacji
- Bulk operations dla DELETE/UPDATE z `WHERE IN`
- Maksymalizacja wykorzystania single query

---

## 2. Utilities (Priorytet KRYTYCZNY)

### 2.1 API Errors (`src/lib/utils/api-errors.ts`)

**Stałe:**

```typescript
export const ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  BAD_REQUEST: "BAD_REQUEST",
} as const;

export const ERROR_MESSAGES = {
  UNAUTHORIZED: "Missing or invalid authentication token",
  INTERNAL_ERROR: "An unexpected error occurred",
  NOT_FOUND: "Resource not found",
  DATABASE_ERROR: "Database operation failed",
  VALIDATION_FAILED: "Validation failed",
  MATCH_NOT_FOUND: "Match not found",
  SET_NOT_FOUND: "Set not found",
} as const;
```

**Klasy:**

```typescript
export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number,
    public details?: ValidationErrorDetail[]
  ) {
    /* ... */
  }
}

export class DatabaseError extends ApiError {
  constructor(message = ERROR_MESSAGES.DATABASE_ERROR) {
    super(ERROR_CODES.DATABASE_ERROR, message, 500);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = ERROR_MESSAGES.NOT_FOUND) {
    super(ERROR_CODES.NOT_FOUND, message, 404);
  }
}

export class ValidationError extends ApiError {
  constructor(details: ValidationErrorDetail[]) {
    super(
      ERROR_CODES.VALIDATION_ERROR,
      ERROR_MESSAGES.VALIDATION_FAILED,
      422,
      details
    );
  }
}
```

**Import z:** `../../types` (ValidationErrorDetail)

---

### 2.2 API Response (`src/lib/utils/api-response.ts`)

**Funkcje:**

```typescript
// Single item
export function createSuccessResponse<T>(data: T, status = 200): Response;

// Lista bez paginacji
export function createListResponse<T>(data: T[], status = 200): Response;

// Lista z paginacją
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  status = 200
): Response;

// Błędy
export function createErrorResponse(
  code: string,
  message: string,
  status: number,
  details?: ValidationErrorDetail[]
): Response;
export function createValidationErrorResponse(zodError: ZodError): Response;

// Shortcuts
export function createUnauthorizedResponse(message?: string): Response;
export function createNotFoundResponse(message?: string): Response;
export function createInternalErrorResponse(message?: string): Response;
export function createNoContentResponse(): Response; // 204
```

**Implementacja:**

- Prywatna `createJsonResponse(body, status)` jako baza
- `createValidationErrorResponse` używa `zodErrorToValidationDetails` z zod-helpers
- Wszystkie używają struktur: `{ data }`, `{ data, pagination }`, `{ error }`

**Importy z:** `../../types`, `./zod-helpers` (zodErrorToValidationDetails)

---

### 2.3 Zod Helpers (`src/lib/utils/zod-helpers.ts`)

**Funkcje:**

```typescript
// URLSearchParams -> Object
export function searchParamsToObject(
  searchParams: URLSearchParams
): Record<string, string>;

// ZodError -> ValidationErrorDetail[]
export function zodErrorToValidationDetails(
  error: z.ZodError
): ValidationErrorDetail[];

// Parse query params
export function parseQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: z.ZodError };

// Parse request body
export async function parseRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<
  { success: true; data: T } | { success: false; error: z.ZodError | Error }
>;
```

**Implementacja:**

- `zodErrorToValidationDetails`: mapuj `error.errors` na `{ field: path.join('.'), message }`
- `parseRequestBody`: try-catch dla `request.json()`, zwróć error dla invalid JSON

**Importy z:** `zod`, `../../types` (ValidationErrorDetail)

---

### 2.4 Logger (`src/lib/utils/logger.ts`) - OPCJONALNIE

**Funkcje:**

```typescript
export function logError(
  endpoint: string,
  error: Error,
  context?: Record<string, any>
): void;
export function logWarning(
  endpoint: string,
  message: string,
  context?: Record<string, any>
): void;
export function logInfo(
  endpoint: string,
  message: string,
  context?: Record<string, any>
): void;
```

**Implementacja:** Użyj `console.error/warn/log` z formatowaniem `[endpoint] Level: message`

---

## 3. Schemas (Priorytet WYSOKI)

### 3.1 Common (`src/lib/schemas/common.schemas.ts`)

```typescript
// Path param {id}
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive("ID must be a positive integer"),
});

// Path param {token} (43 znaki base64url)
export const tokenParamSchema = z.object({
  token: z
    .string()
    .length(43)
    .regex(/^[A-Za-z0-9_-]{43}$/, "Invalid token format"),
});
```

---

### 3.2 Match (`src/lib/schemas/match.schemas.ts`)

```typescript
// POST /api/matches
export const createMatchCommandSchema = z.object({
  player_name: z.string().min(1).max(200),
  opponent_name: z.string().min(1).max(200),
  max_sets: z.number().int().min(1).max(7),
  golden_set_enabled: z.boolean(),
  first_server_first_set: z.enum(SIDE_VALUES),
  generate_ai_summary: z.boolean(),
});

// GET /api/matches
export const matchListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  player_name: z.string().trim().min(1).optional(),
  opponent_name: z.string().trim().min(1).optional(),
  status: z.enum(MATCH_STATUS_VALUES).optional(),
  sort: z
    .string()
    .regex(/^-?(started_at|ended_at|created_at|player_name|opponent_name)$/)
    .default("-started_at"),
});

// PATCH /api/matches/{id}
export const updateMatchCommandSchema = z.object({
  player_name: z.string().min(1).max(200).optional(),
  opponent_name: z.string().min(1).max(200).optional(),
  coach_notes: z.string().nullable().optional(),
});

// POST /api/matches/{id}/finish
export const finishMatchCommandSchema = z.object({
  coach_notes: z.string().nullable().optional(),
});

// GET /api/matches/{id}?include=...
export const includeQuerySchema = z.object({
  include: z
    .string()
    .regex(/^(sets|points|tags|ai_report)(,(sets|points|tags|ai_report))*$/)
    .optional(),
});
```

**Importy z:** `../../types` (SIDE_VALUES, MATCH_STATUS_VALUES)

---

### 3.3 Set (`src/lib/schemas/set.schemas.ts`)

```typescript
// GET /api/matches/{matchId}/sets?include=...
export const setsIncludeQuerySchema = z.object({
  include: z
    .string()
    .regex(/^(points|tags)(,(points|tags))?$/)
    .optional(),
});

// POST /api/sets/{id}/finish
export const finishSetCommandSchema = z.object({
  coach_notes: z.string().nullable().optional(),
});
```

---

### 3.4 Point (`src/lib/schemas/point.schemas.ts`)

```typescript
// GET /api/sets/{setId}/points?include=tags (zawsze ładowane)
export const pointsIncludeQuerySchema = z.object({
  include: z.literal("tags").optional(),
});

// POST /api/sets/{setId}/points
export const createPointCommandSchema = z.object({
  scored_by: z.enum(SIDE_VALUES),
  tag_ids: z.array(z.number().int().positive()).optional(),
});
```

**Importy z:** `../../types` (SIDE_VALUES)

---

### 3.5 Dictionary (`src/lib/schemas/dictionary.schemas.ts`)

```typescript
// GET /api/dictionary/labels?domain=...
export const dictionaryQuerySchema = z.object({
  domain: z.string().trim().min(1).optional(),
});
```

---

### 3.6 Analytics (`src/lib/schemas/analytics.schemas.ts`)

```typescript
// POST /api/analytics/events
export const createAnalyticsEventCommandSchema = z
  .object({
    user_id: z.string().uuid(),
    type: z.enum(ANALYTICS_EVENT_TYPE_VALUES),
    match_id: z.number().int().positive().nullable().optional(),
  })
  .refine(
    (data) => {
      const requiresMatchId = ["match_created", "match_finished"].includes(
        data.type
      );
      return !requiresMatchId || data.match_id;
    },
    { message: "match_id required for match events", path: ["match_id"] }
  );
```

**Importy z:** `../../types` (ANALYTICS_EVENT_TYPE_VALUES)

---

## 4. Services (Priorytet WYSOKI)

### 4.1 Set Service (`src/lib/services/set.service.ts`)

#### Funkcje Publiczne

**`createFirstSet`**

```typescript
export async function createFirstSet(
  supabase: SupabaseClient,
  matchId: number,
  userId: string,
  firstServer: SideEnum,
  isGolden = false
): Promise<CurrentSetDto>;
```

- INSERT seta z `sequence_in_match: 1`, `is_finished: false`
- Mapuj na CurrentSetDto z firstServer jako current_server

**`getSetsByMatchId`**

```typescript
export async function getSetsByMatchId(
  supabase: SupabaseClient,
  userId: string,
  matchId: number,
  includePoints = false
): Promise<SetDetailDto[]>;
```

- SELECT wszystkie sety dla meczu, sortuj po sequence_in_match
- Jeśli includePoints: wywołaj `getPointsBySetIds(setIds)` (optymalizacja N+1)
- Mapuj na SetDetailDto[]

**`getSetById`**

```typescript
export async function getSetById(
  supabase: SupabaseClient,
  userId: string,
  setId: number,
  includePoints = false
): Promise<SetDetailDto | null>;
```

- SELECT set z weryfikacją user_id
- Return null jeśli nie istnieje lub brak dostępu
- Jeśli includePoints: użyj `getPointsBySetIds([setId])`

**`finishSet`**

```typescript
export async function finishSet(
  supabase: SupabaseClient,
  userId: string,
  setId: number,
  command: FinishSetCommandDto
): Promise<FinishSetDto | null>;
```

- Walidacja: set.is_finished === false, match.status === 'in_progress', wynik nie remisowy
- Określ zwycięzcę: `set_score_player > set_score_opponent ? 'player' : 'opponent'`
- UPDATE set: `is_finished: true, winner, finished_at`
- UPDATE match: przelicz sets_won_player/opponent z COUNT GROUP BY winner
- Sprawdź czy mecz się zakończył (ktoś wygrał > max_sets/2)
- **Ważne:** Throw error jeśli to ostatni możliwy set (wymuszenie POST /finish)
- Utwórz następny set: `sequence+1`, określ first server (alternating), is_golden (jeśli enabled i ostatni)
- Return `{ finished_set, next_set }`

#### Funkcje Prywatne

**`getPointsBySetIds` (optymalizacja N+1)**

```typescript
async function getPointsBySetIds(
  supabase: SupabaseClient,
  userId: string,
  setIds: number[]
): Promise<Record<number, PointWithTagsDto[]>>;
```

- Single query z nested select:

```sql
SELECT *, point_tags(tag:tags(name))
FROM points
WHERE set_id IN (...)
ORDER BY sequence_in_set ASC
```

- Grupuj po set_id i zwróć Record<number, PointWithTagsDto[]>

**Mapping Functions:**

```typescript
function mapSetToCurrentSetDto(
  set: Set,
  currentServer: SideEnum
): CurrentSetDto;
function mapSetToSetDetailDto(
  set: Set,
  points?: PointWithTagsDto[]
): SetDetailDto;
function mapSetToFinishedSetDto(set: Set): FinishedSetDto;
function determineSetWinner(set: Set): SideEnum;
function determineNextServer(match: Match, nextSequence: number): SideEnum;
```

**Importy z:** `../../db/supabase.client`, `../../types`, `../utils/api-errors`

---

### 4.2 Point Service (`src/lib/services/point.service.ts`)

#### Funkcje Publiczne

**`getPointsBySetId`**

```typescript
export async function getPointsBySetId(
  supabase: SupabaseClient,
  userId: string,
  setId: number
): Promise<PointWithTagsDto[] | null>;
```

- Weryfikuj ownership seta, return null jeśli brak
- Użyj `getPointsBySetIds([setId])` z set.service

**`createPoint`**

```typescript
export async function createPoint(
  supabase: SupabaseClient,
  userId: string,
  setId: number,
  scoredBy: SideEnum,
  tagIds: number[]
): Promise<CreatePointDto>;
```

- Pobierz set i match (z getSetById)
- Walidacja: match in_progress, set not finished, tagi istnieją
- Oblicz sequence: MAX(sequence_in_set) + 1, COUNT total
- Określ served_by: `calculateServedBy(match, set, totalPoints)`
- INSERT point, INSERT point_tags (bulk)
- UPDATE set: increment score column
- Pobierz nazwy tagów
- Return CreatePointDto z set_state (current_server dla następnego punktu)

**`undoLastPoint`**

```typescript
export async function undoLastPoint(
  supabase: SupabaseClient,
  userId: string,
  setId: number
): Promise<UndoPointDto>;
```

- Walidacja: match in_progress, set not finished
- Znajdź ostatni punkt: ORDER BY sequence DESC LIMIT 1
- Zapisz served_by (będzie current_server po undo)
- DELETE point_tags, DELETE point
- UPDATE set: decrement score column
- Return `{ deleted_point_id, set_state: { current_server: served_by } }`

#### Funkcje Prywatne - Logika Serwowania

**Zasady serwowania w tenisie stołowym:**

- **Normalny set do 10:10:** zmiana co 2 punkty
- **Normalny set po 10:10 (deuce):** zmiana co 1 punkt
- **Golden set:** zawsze zmiana co 1 punkt

```typescript
function calculateServedBy(
  match: Match,
  set: Set,
  totalPointsInSet: number
): SideEnum {
  const firstServer = determineFirstServerForSet(match, set.sequence_in_match);

  if (set.is_golden) {
    // Golden: zmiana co 1 punkt
    return totalPointsInSet % 2 === 0 ? firstServer : opposite(firstServer);
  }

  if (set.set_score_player >= 10 && set.set_score_opponent >= 10) {
    // Deuce: zmiana co 1 punkt
    return totalPointsInSet % 2 === 0 ? firstServer : opposite(firstServer);
  }

  // Normalny: zmiana co 2 punkty
  return Math.floor(totalPointsInSet / 2) % 2 === 0
    ? firstServer
    : opposite(firstServer);
}

function determineFirstServerForSet(
  match: Match,
  sequenceInMatch: number
): SideEnum {
  // Nieparzyste sety (1,3,5): first_server_first_set
  // Parzyste sety (2,4,6): opposite
  return sequenceInMatch % 2 === 1
    ? match.first_server_first_set
    : opposite(match.first_server_first_set);
}

function determineCurrentServer(
  match: Match,
  set: Set,
  totalPointsAfterInsert: number
): SideEnum {
  return calculateServedBy(match, set, totalPointsAfterInsert);
}

function opposite(side: SideEnum): SideEnum {
  return side === "player" ? "opponent" : "player";
}
```

**Importy z:** `../../db/supabase.client`, `../../types`, `./set.service` (getPointsBySetIds, getSetById), `../utils/api-errors`

---

### 4.3 Match Service (`src/lib/services/match.service.ts`)

#### Funkcje Publiczne

**`getMatchesPaginated`**

```typescript
export async function getMatchesPaginated(
  supabase: SupabaseClient,
  userId: string,
  query: ValidatedMatchListQuery
): Promise<{ data: MatchListItemDto[]; pagination: { total: number } }>;
```

- Parse sort: `parseSortParam(query.sort)` → `{ column, ascending }`
- COUNT: `buildFilteredQuery(...).select('*', { count: 'exact', head: true })`
- SELECT: `buildFilteredQuery(...).order(...).range(offset, offset+limit-1).select('*')`
- Mapuj: usuń user_id z każdego rekordu

**`createMatch`**

```typescript
export async function createMatch(
  supabase: SupabaseClient,
  userId: string,
  command: CreateMatchCommandDto
): Promise<CreateMatchDto>;
```

- INSERT match: status='in*progress', sets_won*\*=0
- Wywołaj `createFirstSet(supabase, matchId, userId, command.first_server_first_set, false)`
- Return CreateMatchDto z current_set

**`getMatchById`**

```typescript
export async function getMatchById(
  supabase: SupabaseClient,
  userId: string,
  matchId: number,
  include?: string
): Promise<MatchDetailDto | null>;
```

- SELECT match z weryfikacją user_id, return null jeśli brak
- Parse include: split(','), trim
- Warunkowe ładowanie:
  - 'ai_report': SELECT matches_ai_reports
  - 'sets'/'points'/'tags': `getSetsByMatchId(includePoints = include zawiera 'points' lub 'tags')`
  - current_set jeśli in_progress: ostatni nieukończony set + determine current_server
- Return MatchDetailDto

**`updateMatch`**

```typescript
export async function updateMatch(
  supabase: SupabaseClient,
  userId: string,
  matchId: number,
  command: UpdateMatchCommandDto
): Promise<UpdateMatchDto | null>;
```

- Sprawdź istnienie: `getMatchById(...)`, return null jeśli brak
- UPDATE: tylko podane pola + updated_at
- Return UpdateMatchDto

**`finishMatch`**

```typescript
export async function finishMatch(
  supabase: SupabaseClient,
  userId: string,
  matchId: number,
  command: FinishMatchCommandDto
): Promise<FinishMatchDto>;
```

- Pobierz match i current set (nieukończony)
- Walidacja: match.status !== 'finished', wynik seta nie remisowy
- Określ zwycięzcę seta, UPDATE set: finished
- Przelicz sets_won z COUNT GROUP BY winner
- Walidacja: wynik meczu nie remisowy
- UPDATE match: status='finished', ended*at, sets_won*\*, coach_notes
- **AI Report (fire-and-forget):**
  ```typescript
  if (match.generate_ai_summary) {
    await createAiReportRecord(supabase, matchId, userId);
    Promise.resolve().then(() => generateAiReport(supabase, matchId)); // async
  }
  ```
- **Analytics (fire-and-forget):**
  ```typescript
  trackEvent(supabase, userId, "match_finished", matchId); // no await
  ```
- Return FinishMatchDto z ai_report_status='pending' lub null

**`deleteMatch`**

```typescript
export async function deleteMatch(
  supabase: SupabaseClient,
  userId: string,
  matchId: number
): Promise<boolean>;
```

- Weryfikacja ownership, return false jeśli brak
- **Kaskadowe usuwanie (10 queries max, bulk operations):**
  1. SELECT setIds: `WHERE match_id=...`
  2. SELECT pointIds: `WHERE set_id IN (...)`
  3. DELETE point_tags: `WHERE point_id IN (...)` (non-blocking)
  4. DELETE points: `WHERE set_id IN (...)`
  5. DELETE sets: `WHERE match_id=...`
  6. DELETE matches_ai_reports (non-blocking)
  7. DELETE matches_public_share (non-blocking)
  8. UPDATE analytics_events SET match_id=NULL (non-blocking, bez user_id filter)
  9. DELETE matches
- Return true

#### Funkcje Prywatne

```typescript
function buildFilteredQuery(supabase, userId, query) {
  let q = supabase.from("matches").eq("user_id", userId);
  if (query.player_name) q = q.ilike("player_name", `%${query.player_name}%`);
  if (query.opponent_name)
    q = q.ilike("opponent_name", `%${query.opponent_name}%`);
  if (query.status) q = q.eq("status", query.status);
  return q; // nie wykonuj, zwróć builder
}

function parseSortParam(sort: string): { column: string; ascending: boolean } {
  const ascending = !sort.startsWith("-");
  const column = ascending ? sort : sort.substring(1);
  return { column, ascending };
}

// Mapping functions
function mapMatchToMatchListItemDto(match: Match): MatchListItemDto;
function mapMatchToMatchDetailDto(
  match,
  currentSet?,
  sets?,
  aiReport?
): MatchDetailDto;
function mapMatchToCreateMatchDto(match, currentSet): CreateMatchDto;
```

**Importy z:** `../../db/supabase.client`, `../../types`, `./set.service` (createFirstSet, getSetsByMatchId), `./ai.service`, `./analytics.service`, `../utils/api-errors`

---

### 4.4 Analytics Service (`src/lib/services/analytics.service.ts`)

**`trackEvent` (fire-and-forget)**

```typescript
export async function trackEvent(
  supabase: SupabaseClient,
  userId: string,
  type: AnalyticsEventTypeEnum,
  matchId?: number | null
): Promise<void>;
```

- INSERT analytics_events (bez await w wywołującym kodzie)
- Try-catch wewnątrz, logWarning przy błędzie
- NIE propaguj błędów

**`createAnalyticsEvent` (internal API)**

```typescript
export async function createAnalyticsEvent(
  supabase: SupabaseClient,
  command: CreateAnalyticsEventCommandDto
): Promise<AnalyticsEvent>;
```

- INSERT analytics_events, RETURNING \*
- Throw DatabaseError przy błędzie
- Używane przez POST /api/analytics/events (z service role client jeśli internal endpoint)

**Importy z:** `../../db/supabase.client`, `../../types`, `../utils/api-errors`, `../utils/logger`

---

### 4.5 AI Service (`src/lib/services/ai.service.ts`)

**`createAiReportRecord`**

```typescript
export async function createAiReportRecord(
  supabase: SupabaseClient,
  matchId: number,
  userId: string
): Promise<void>;
```

- INSERT matches_ai_reports: ai_status='pending', nulls dla reszty
- Throw DatabaseError przy błędzie

**`generateAiReport` (fire-and-forget)**

```typescript
export async function generateAiReport(
  supabase: SupabaseClient,
  matchId: number
): Promise<void>;
```

- Pobierz mecz z setami, punktami, tagami (include=sets,points,tags)
- Wywołaj OpenRouter API (szczegóły w osobnym planie)
- **Success:** UPDATE ai_status='success', ai_summary, ai_recommendations, ai_generated_at
- **Error:** UPDATE ai_status='error', ai_error, ai_generated_at
- Try-catch wewnątrz, logError, NIE propaguj błędów

**`getAiReportByMatchId`**

```typescript
export async function getAiReportByMatchId(
  supabase: SupabaseClient,
  userId: string,
  matchId: number
): Promise<AiReportDto | null>;
```

- Weryfikuj ownership meczu, return null jeśli brak
- Sprawdź match.generate_ai_summary === true, return null jeśli false
- SELECT matches_ai_reports, return null jeśli brak
- Mapuj: usuń user_id

**Importy z:** `../../db/supabase.client`, `../../types`, `../utils/api-errors`, `../utils/logger`

---

### 4.6 Share Service (`src/lib/services/share.service.ts`)

#### Główna Funkcja

**`createOrGetPublicShare`**

```typescript
export async function createOrGetPublicShare(
  supabase: SupabaseClient,
  userId: string,
  matchId: number
): Promise<{ dto: PublicShareDto; isNew: boolean }>;
```

- Weryfikuj ownership i status: `verifyMatchOwnershipAndStatus(...)` (must be finished)
- Sprawdź istniejący link: `getExistingPublicShare(...)`
- Jeśli istnieje: return `{ dto: mapToPublicShareDto(existing), isNew: false }`
- Jeśli nie istnieje: `createPublicShare(...)`, return `{ dto: mapToPublicShareDto(new), isNew: true }`

#### Funkcje Prywatne

**Token Security:**

```typescript
function generateSecureToken(): string {
  // crypto.randomBytes(32) -> base64url (43 znaki)
  // 256 bitów entropii, URL-safe, bez padding
  const bytes = crypto.randomBytes(32);
  return bytes
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}
```

**WAŻNE - Token plaintext w DB:**

- Token zapisywany bez hashowania (plaintext)
- Uzasadnienie: 256 bitów entropii chroni przed brute force (~10^77 lat)
- Model bezpieczeństwa: dane meczu są publiczne dla posiadacza tokenu
- Idempotentność: zawsze ten sam URL dla tego samego meczu
- Zgodne z praktykami: Google Drive, Dropbox, GitHub Gists

```typescript
async function verifyMatchOwnershipAndStatus(
  supabase,
  userId,
  matchId
): Promise<void> {
  // SELECT status WHERE id=... AND user_id=...
  // Throw NotFoundError jeśli null
  // Throw ApiError(422) jeśli status !== 'finished'
}

async function getExistingPublicShare(
  supabase,
  userId,
  matchId
): Promise<MatchPublicShare | null> {
  // SELECT * FROM matches_public_share WHERE match_id=... AND user_id=...
}

async function createPublicShare(
  supabase,
  userId,
  matchId
): Promise<MatchPublicShare> {
  const token = generateSecureToken();
  // INSERT matches_public_share: { match_id, user_id, token }
  // Return MatchPublicShare
}

function mapToPublicShareDto(record: MatchPublicShare): PublicShareDto {
  const baseUrl = import.meta.env.PUBLIC_BASE_URL || "https://spin-flow.app";
  return {
    id: record.id,
    match_id: record.match_id,
    public_url: `${baseUrl}/public/matches/${record.token}`,
    token: record.token, // plaintext, ten sam zawsze
    created_at: record.created_at,
  };
}
```

**Importy z:** `crypto`, `../../db/supabase.client`, `../../types`, `../utils/api-errors`

---

### 4.7 Public Match Service (`src/lib/services/public-match.service.ts`)

**`getPublicMatchByToken`**

```typescript
export async function getPublicMatchByToken(
  supabase: SupabaseClient,
  token: string
): Promise<PublicMatchDataDto>;
```

- **Token lookup:** SELECT match_id WHERE token=... (plaintext comparison)
- Throw NotFoundError('Shared match not found') jeśli null
- SELECT match WHERE id=..., throw ten sam error jeśli null (zapobieganie enumeracji)
- **Optymalizacja - Nested select (4 queries max):**
  ```typescript
  supabase
    .from("sets")
    .select(
      `
    *,
    points(
      *,
      point_tags(tags(name))
    )
  `
    )
    .eq("match_id", matchId)
    .order("sequence_in_match", { ascending: true })
    .order("sequence_in_set", { ascending: true, foreignTable: "points" });
  ```
- SELECT matches_ai_reports (może nie istnieć)
- **Mapuj na publiczne DTOs (usuń wrażliwe dane):**
  - Match: usuń user_id, generate_ai_summary (first_server_first_set, created_at mogą być publiczne)
  - Set: usuń user_id (match_id, is_finished, created_at mogą być publiczne)
  - Point: usuń user_id (set_id może być publiczny dla kontekstu)
  - AI Report: tylko ai_status, ai_summary, ai_recommendations
- Return PublicMatchDataDto

**Mapping Functions:**

```typescript
function mapToPublicMatchDto(match: Match): PublicMatchDto;
function mapToPublicSetDto(set: Set, points: PublicPointDto[]): PublicSetDto;
function mapToPublicPointDto(point: Point, tagNames: string[]): PublicPointDto;
function mapToPublicAIReportDto(
  report: MatchAiReport | null
): PublicAIReportDto | null;
```

**Importy z:** `../../db/supabase.client`, `../../types`, `../utils/api-errors`

---

### 4.8 Dictionary Service (`src/lib/services/dictionary.service.ts`)

**`getDictionaryLabels`**

```typescript
export async function getDictionaryLabels(
  supabase: SupabaseClient,
  domain?: string
): Promise<DictionaryLabelDto[]>;
```

- SELECT dic_lookup_labels
- Jeśli domain podany: `.eq('domain', domain)`
- Sort: `.order('domain', { ascending: true }).order('order_in_list', { ascending: true })`
- **Uwaga:** Brak weryfikacji user_id (publiczny endpoint)
- Return DictionaryLabelDto[] (alias, bez transformacji)

**Importy z:** `../../db/supabase.client`, `../../types`, `../utils/api-errors`

---

## 5. Supabase Clients - Wyjaśnienie

### 5.1 Istniejące Rozwiązanie

**Plik:** `src/db/supabase.client.ts`

**✅ Już dodane:**

```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types.ts";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);

export type SupabaseClient = typeof supabaseClient;

// TODO: Temporary - replace with real authentication
export const DEFAULT_USER_ID = "69c4930b-63f6-4c05-9dec-c3b888fac1f5";
```

**Development Mode:**

- Używamy `supabaseClient` i `DEFAULT_USER_ID` bezpośrednio w routes
- Pomijamy `context.locals` (będzie po dodaniu autentykacji)

### 5.2 Service Role Client (opcjonalnie)

**Kiedy potrzebny:** Tylko dla internal/admin endpoints bez uwierzytelnienia użytkownika

**Jeśli będzie potrzebny, dodaj do `src/db/supabase.client.ts`:**

```typescript
export function createSupabaseServiceClient(): ReturnType<
  typeof createClient<Database>
> {
  return createClient<Database>(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
```

**Różnice:**

- **supabaseClient** (development) - anon key + DEFAULT_USER_ID → obecnie używane we wszystkich endpointach
- **context.locals.supabase** (przyszłość) - z RLS, z session użytkownika → po dodaniu autentykacji
- **createSupabaseServiceClient()** (opcjonalnie) - bypasses RLS → TYLKO w internal endpoints

**Potencjalnie używane przez:** POST /api/analytics/events (jeśli będzie internal endpoint)

**DEVELOPMENT MODE:**

```typescript
// Obecnie w routes:
import { supabaseClient, DEFAULT_USER_ID } from "../../db/supabase.client";
const supabase = supabaseClient;
const userId = DEFAULT_USER_ID;

// Przyszłość (po autentykacji):
const supabase = context.locals.supabase;
const userId = context.locals.userId;
```

---

## 6. Kolejność Implementacji

### Faza 0: Przygotowanie Danych Testowych (15 min)

**⚠️ Przed rozpoczęciem implementacji:**

1. **Upewnij się że DEFAULT_USER_ID jest w bazie:**
   - Sprawdź czy tabele mają kolumnę `user_id` typu UUID
   - Dodaj testowe dane z `user_id = '69c4930b-63f6-4c05-9dec-c3b888fac1f5'`
   - Lub zmodyfikuj istniejące dane testowe

2. **Przykładowy INSERT testowego meczu:**

```sql
INSERT INTO matches (
  id, user_id, player_name, opponent_name,
  max_sets, golden_set_enabled, first_server_first_set,
  generate_ai_summary, status, sets_won_player, sets_won_opponent
) VALUES (
  1, '69c4930b-63f6-4c05-9dec-c3b888fac1f5',
  'Player Test', 'Opponent Test',
  5, false, 'player',
  false, 'in_progress', 0, 0
);
```

3. **Weryfikacja RLS:**
   - Sprawdź czy RLS policies weryfikują `user_id`
   - Polityki powinny działać z `DEFAULT_USER_ID`

### Faza 1: Utilities (2-3h) - KRYTYCZNA

1. **api-errors.ts** (najpierw - używane przez wszystko)
   - Stałe ERROR_CODES, ERROR_MESSAGES
   - Klasy: ApiError, DatabaseError, ValidationError, NotFoundError

2. **zod-helpers.ts** (używane przez api-response)
   - 4 funkcje: searchParamsToObject, zodErrorToValidationDetails, parseQueryParams, parseRequestBody

3. **api-response.ts**
   - 10 funkcji: createSuccessResponse, createListResponse, createPaginatedResponse, createErrorResponse, createValidationErrorResponse, shortcuts

4. **logger.ts** (opcjonalnie)
   - 3 funkcje: logError, logWarning, logInfo

✅ **Weryfikacja:** `npx tsc --noEmit`, importy działają

---

### Faza 2: Schemas (1-2h)

Kolejność dowolna (niezależne):

1. common.schemas.ts (2 schematy)
2. match.schemas.ts (5 schematów)
3. set.schemas.ts (2 schematy)
4. point.schemas.ts (2 schematy)
5. dictionary.schemas.ts (1 schemat)
6. analytics.schemas.ts (1 schemat)

✅ **Weryfikacja:** TypeScript OK, eksporty działają

---

### Faza 3: Services (4-6h) - UWAGA NA KOLEJNOŚĆ

**Zależności:**

```
set.service.ts (baza dla innych)
  ↓ używane przez
point.service.ts (używa getPointsBySetIds, getSetById)
  ↓
match.service.ts (używa createFirstSet, getSetsByMatchId)
  ↓ używa
analytics.service.ts + ai.service.ts
```

**Kolejność implementacji:**

1. **set.service.ts** (najpierw - używany przez point i match)
   - 4 public: createFirstSet, getSetsByMatchId, getSetById, finishSet
   - Helpers: getPointsBySetIds, mapping functions

2. **point.service.ts** (używa set.service)
   - 3 public: getPointsBySetId, createPoint, undoLastPoint
   - Helpers: calculateServedBy, determineCurrentServer, opposite, determineFirstServerForSet

3. **analytics.service.ts** (używany przez match.service)
   - 2 public: trackEvent, createAnalyticsEvent

4. **ai.service.ts** (używany przez match.service)
   - 3 public: createAiReportRecord, generateAiReport, getAiReportByMatchId

5. **match.service.ts** (używa set, analytics, ai)
   - 6 public: getMatchesPaginated, createMatch, getMatchById, updateMatch, finishMatch, deleteMatch
   - Helpers: buildFilteredQuery, parseSortParam, mapping functions

6. **share.service.ts** (niezależny)
   - 1 public: createOrGetPublicShare
   - Helpers: generateSecureToken, verify, get, create, map

7. **public-match.service.ts** (niezależny)
   - 1 public: getPublicMatchByToken
   - Helpers: mapping functions

8. **dictionary.service.ts** (niezależny)
   - 1 public: getDictionaryLabels

9. **Supabase Service Client** (opcjonalnie)
   - Dodaj createSupabaseServiceClient do src/db/supabase.client.ts (tylko jeśli będzie internal endpoint)

✅ **Weryfikacja:** `npm run lint`, wszystkie importy OK

---

### Faza 4: Review (1-2h)

1. Code review: zgodność z guidelines, error handling, typowanie
2. Refactoring: nazwy, optymalizacje
3. Dokumentacja: JSDoc dla funkcji publicznych (opcjonalnie)

---

## 7. Checklist Implementacji

### ✅ Utilities

- [ ] api-errors.ts: stałe + 4 klasy
- [ ] zod-helpers.ts: 4 funkcje
- [ ] api-response.ts: 10 funkcji
- [ ] logger.ts: 3 funkcje (opcjonalnie)

### ✅ Schemas

- [ ] common.schemas.ts: idParamSchema, tokenParamSchema
- [ ] match.schemas.ts: 5 schematów
- [ ] set.schemas.ts: 2 schematy
- [ ] point.schemas.ts: 2 schematy
- [ ] dictionary.schemas.ts: 1 schemat
- [ ] analytics.schemas.ts: 1 schemat

### ✅ Services

- [ ] set.service.ts: 4 public + helpers (getPointsBySetIds!)
- [ ] point.service.ts: 3 public + helpers (calculateServedBy!)
- [ ] match.service.ts: 6 public + helpers
- [ ] analytics.service.ts: 2 public
- [ ] ai.service.ts: 3 public
- [ ] share.service.ts: 1 public + helpers (generateSecureToken!)
- [ ] public-match.service.ts: 1 public + helpers
- [ ] dictionary.service.ts: 1 public

### ✅ Supabase Client

- [x] ~~Dodaj `export type SupabaseClient = typeof supabaseClient` do src/db/supabase.client.ts~~ (✅ Dodane)
- [x] ~~Dodaj `export const DEFAULT_USER_ID` do src/db/supabase.client.ts~~ (✅ Dodane)
- [ ] createSupabaseServiceClient w src/db/supabase.client.ts (opcjonalnie, tylko dla internal endpoints)

### ✅ Weryfikacja Finalna

- [ ] `npx tsc --noEmit` - brak błędów TypeScript
- [ ] `npm run lint` - brak błędów lintera
- [ ] Wszystkie importy działają
- [ ] Struktura katalogów: src/lib/utils/, src/lib/schemas/, src/lib/services/

---

## 8. Kluczowe Decyzje Architektoniczne

### 8.1 Development Mode - DEFAULT_USER_ID

- **Decyzja:** Tymczasowo używamy stałego `DEFAULT_USER_ID` zamiast prawdziwej autentykacji
- **Uzasadnienie:** Umożliwia testowanie API bez pełnej implementacji JWT/auth
- **UUID:** `"69c4930b-63f6-4c05-9dec-c3b888fac1f5"`
- **Implementacja:**
  - Wszystkie endpointy używają tego ID
  - RLS w Supabase działa normalnie
  - Dane testowe muszą mieć ten `user_id`
- **Migration path:** Zamiana `DEFAULT_USER_ID` na `context.locals.userId` w przyszłości
- **TODO:** Implementacja middleware auth + JWT w późniejszych krokach

### 8.2 Token Security (Share Service)

- **Decyzja:** Token plaintext w DB (nie hashować)
- **Uzasadnienie:** 256 bitów entropii = niemożliwy brute force, idempotentność, zgodność z praktykami branżowymi
- **Model bezpieczeństwa:** Dane meczu są publiczne dla posiadacza tokenu

### 8.3 N+1 Prevention

- **Problem:** Pętle ładujące dane dla każdego rekordu osobno
- **Rozwiązanie:** `getPointsBySetIds` z `WHERE IN`, nested selects Supabase
- **Przykład:** Mecz z 5 setami: 2 queries zamiast 6

### 8.4 Fire-and-Forget Operations

- **Stosowanie:** Analytics tracking, AI report generation
- **Implementacja:** No await w wywołującym kodzie, try-catch wewnątrz, logWarning przy błędzie
- **Uzasadnienie:** Nie blokować głównego przepływu przez non-critical operations

### 8.5 Information Disclosure Prevention

- **Wzorzec:** Return null dla "not found" i "access denied", ten sam komunikat błędu
- **Stosowanie:** Wszystkie funkcje z weryfikacją ownership
- **Uzasadnienie:** Nie ujawniaj czy zasób istnieje czy użytkownik nie ma dostępu

---

**Autor:** AI Assistant
**Data:** 2025-12-09
**Wersja:** 2.1 (Zoptymalizowana + Development Mode z DEFAULT_USER_ID)
