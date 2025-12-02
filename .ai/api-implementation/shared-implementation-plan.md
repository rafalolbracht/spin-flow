# Shared Components Implementation Plan

## Przegląd

Ten dokument opisuje plan implementacji wspólnych komponentów używanych przez wszystkie endpointy API w aplikacji Spin Flow. Komponenty te zapewniają:

- Spójne formatowanie odpowiedzi API
- Jednolite zarządzanie błędami
- Reużywalne funkcje walidacji
- Logikę biznesową dla encji (Match, Set, Analytics)
- Schematy walidacji Zod

**UWAGA:** Middleware (`src/middleware/index.ts`) jest już zaimplementowany i nie jest objęty tym planem.

---

## Lista komponentów wspólnych

### 🔴 Priorytet KRYTYCZNY (przed implementacją jakiegokolwiek endpointa)

1. **API Response Utilities** (`src/lib/utils/api-response.ts`)
   - Formatowanie wszystkich typów odpowiedzi API
   - Używane przez: WSZYSTKIE endpointy

2. **API Error Utilities** (`src/lib/utils/api-errors.ts`)
   - Stałe, typy i klasy błędów
   - Używane przez: WSZYSTKIE endpointy

3. **Zod Helper Utilities** (`src/lib/utils/zod-helpers.ts`)
   - Funkcje pomocnicze dla walidacji
   - Używane przez: WSZYSTKIE endpointy z query params lub body

### 🟡 Priorytet WYSOKI (dla endpointów Match)

4. **Match Service** (`src/lib/services/match.service.ts`)
   - Logika biznesowa dla operacji na meczach
   - Używane przez: Wszystkie endpointy Match

5. **Set Service** (`src/lib/services/set.service.ts`)
   - Logika biznesowa dla operacji na setach
   - Używane przez: POST /api/matches, endpointy Set

6. **Match Schemas** (`src/lib/schemas/match.schemas.ts`)
   - Schematy walidacji Zod dla endpointów Match
   - Używane przez: Wszystkie endpointy Match

7. **Common Schemas** (`src/lib/schemas/common.schemas.ts`)
   - Wspólne schematy walidacji (ID, token, include)
   - Używane przez: Wiele endpointów

### 🟢 Priorytet ŚREDNI (nice to have)

8. **Logger Utility** (`src/lib/utils/logger.ts`)
   - Strukturalne logowanie błędów i zdarzeń
   - Używane przez: WSZYSTKIE endpointy (opcjonalnie)

9. **Analytics Service** (`src/lib/services/analytics.service.ts`)
   - Tracking zdarzeń użytkownika
   - Używane przez: POST /api/matches, POST /api/matches/{id}/finish

---

## 1. API Response Utilities

**Lokalizacja:** `src/lib/utils/api-response.ts`

### Cel

Zapewnienie spójnego formatowania odpowiedzi API dla wszystkich endpointów. Eliminacja duplikacji kodu związanego z tworzeniem obiektów Response.

### Funkcje do implementacji

#### 1.1. `createJsonResponse`

Podstawowa funkcja pomocnicza (prywatna).

**Sygnatura:**

```typescript
function createJsonResponse(body: unknown, status: number): Response;
```

**Implementacja:**

- Serializacja body do JSON
- Utworzenie Response z odpowiednimi nagłówkami
- Headers: `Content-Type: application/json`
- Obsługa błędów serializacji JSON

---

#### 1.2. `createSuccessResponse`

Formatowanie odpowiedzi dla single item (data wrapper).

**Sygnatura:**

```typescript
export function createSuccessResponse<T>(data: T, status: number = 200): Response;
```

**Implementacja:**

- Owinięcie data w `SingleItemResponseDto<T>`
- Struktura: `{ data: T }`
- Wywołanie `createJsonResponse({ data }, status)`
- Domyślny status: 200

**Używane przez:**

- POST /api/matches (201)
- GET /api/matches/{id} (200)
- PATCH /api/matches/{id} (200)
- POST /api/matches/{id}/finish (200)
- Wszystkie endpointy zwracające single item

---

#### 1.3. `createListResponse`

Formatowanie odpowiedzi dla prostej listy (bez paginacji).

**Sygnatura:**

```typescript
export function createListResponse<T>(data: T[], status: number = 200): Response;
```

**Implementacja:**

- Owinięcie data w `ListResponseDto<T>`
- Struktura: `{ data: T[] }`
- Wywołanie `createJsonResponse({ data }, status)`
- Domyślny status: 200

**Używane przez:**

- GET /api/tags (200)
- GET /api/dictionary/labels (200)
- GET /api/matches/{matchId}/sets (200)
- GET /api/sets/{setId}/points (200)

---

#### 1.4. `createPaginatedResponse`

Formatowanie odpowiedzi dla listy z paginacją.

**Sygnatura:**

```typescript
export function createPaginatedResponse<T>(data: T[], total: number, status: number = 200): Response;
```

**Implementacja:**

- Owinięcie data w `PaginatedResponseDto<T>`
- Struktura: `{ data: T[], pagination: { total: number } }`
- Wywołanie `createJsonResponse({ data, pagination: { total } }, status)`
- Domyślny status: 200

**Używane przez:**

- GET /api/matches (200)

---

#### 1.5. `createErrorResponse`

Formatowanie odpowiedzi błędu.

**Sygnatura:**

```typescript
export function createErrorResponse(
  code: string,
  message: string,
  status: number,
  details?: ValidationErrorDetail[]
): Response;
```

**Implementacja:**

- Utworzenie `ErrorResponseDto`
- Struktura: `{ error: { code, message, details? } }`
- Wywołanie `createJsonResponse({ error: { code, message, details } }, status)`

**Używane przez:**

- Wszystkie endpointy (error handling)

---

#### 1.6. `createValidationErrorResponse`

Formatowanie odpowiedzi błędu walidacji Zod.

**Sygnatura:**

```typescript
export function createValidationErrorResponse(zodError: ZodError): Response;
```

**Implementacja:**

- Import funkcji `zodErrorToValidationDetails` z `zod-helpers.ts`
- Konwersja ZodError na ValidationErrorDetail[]
- Wywołanie `createErrorResponse('VALIDATION_ERROR', 'Validation failed', 422, details)`

**Używane przez:**

- Wszystkie endpointy z walidacją Zod

---

#### 1.7. `createUnauthorizedResponse`

Shortcut dla błędu 401.

**Sygnatura:**

```typescript
export function createUnauthorizedResponse(message: string = "Missing or invalid authentication token"): Response;
```

**Implementacja:**

- Wywołanie `createErrorResponse('UNAUTHORIZED', message, 401)`

**Używane przez:**

- Wszystkie endpointy (auth check)

---

#### 1.8. `createNotFoundResponse`

Shortcut dla błędu 404.

**Sygnatura:**

```typescript
export function createNotFoundResponse(message: string = "Resource not found"): Response;
```

**Implementacja:**

- Wywołanie `createErrorResponse('NOT_FOUND', message, 404)`

**Używane przez:**

- GET /api/matches/{id}
- PATCH /api/matches/{id}
- DELETE /api/matches/{id}
- Wszystkie endpointy z path param {id}

---

#### 1.9. `createInternalErrorResponse`

Shortcut dla błędu 500.

**Sygnatura:**

```typescript
export function createInternalErrorResponse(message: string = "An unexpected error occurred"): Response;
```

**Implementacja:**

- Wywołanie `createErrorResponse('INTERNAL_ERROR', message, 500)`

**Używane przez:**

- Wszystkie endpointy (catch-all error handler)

---

#### 1.10. `createNoContentResponse`

Odpowiedź 204 bez body.

**Sygnatura:**

```typescript
export function createNoContentResponse(): Response;
```

**Implementacja:**

- Utworzenie Response bez body
- Status: 204

**Używane przez:**

- DELETE /api/matches/{id}
- POST /api/analytics/events

---

### Importy

```typescript
import { z } from "zod";
import type {
  SingleItemResponseDto,
  ListResponseDto,
  PaginatedResponseDto,
  ErrorResponseDto,
  ValidationErrorDetail,
} from "../../types";
import { zodErrorToValidationDetails } from "./zod-helpers";
```

---

## 2. API Error Utilities

**Lokalizacja:** `src/lib/utils/api-errors.ts`

### Cel

Centralizacja definicji błędów, kodów i komunikatów. Zapewnienie type safety dla error handling.

### Komponenty do implementacji

#### 2.1. Stałe - Error Codes

```typescript
export const ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  BAD_REQUEST: "BAD_REQUEST",
  METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
```

---

#### 2.2. Stałe - Error Messages

```typescript
export const ERROR_MESSAGES = {
  UNAUTHORIZED: "Missing or invalid authentication token",
  INTERNAL_ERROR: "An unexpected error occurred",
  NOT_FOUND: "Resource not found",
  FORBIDDEN: "Access forbidden",
  DATABASE_ERROR: "Database operation failed",
  SERVICE_UNAVAILABLE: "Service temporarily unavailable",
  INVALID_JSON: "Invalid JSON in request body",
  VALIDATION_FAILED: "Validation failed",
  MATCH_NOT_FOUND: "Match not found",
  SET_NOT_FOUND: "Set not found",
  POINT_NOT_FOUND: "Point not found",
} as const;
```

---

#### 2.3. Klasa - ApiError

Bazowa klasa błędów API.

```typescript
export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number,
    public details?: ValidationErrorDetail[]
  ) {
    super(message);
    this.name = "ApiError";

    // Maintain proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}
```

**Używane przez:**

- Services (throw new ApiError)
- Endpoint handlers (catch ApiError)

---

#### 2.4. Klasa - DatabaseError

Błąd operacji bazodanowych.

```typescript
export class DatabaseError extends ApiError {
  constructor(message: string = ERROR_MESSAGES.DATABASE_ERROR) {
    super(ERROR_CODES.DATABASE_ERROR, message, 500);
    this.name = "DatabaseError";
  }
}
```

**Używane przez:**

- Services (catch database errors)

---

#### 2.5. Klasa - ValidationError

Błąd walidacji.

```typescript
export class ValidationError extends ApiError {
  constructor(details: ValidationErrorDetail[]) {
    super(ERROR_CODES.VALIDATION_ERROR, ERROR_MESSAGES.VALIDATION_FAILED, 422, details);
    this.name = "ValidationError";
  }
}
```

**Używane przez:**

- Endpoint handlers (throw ValidationError)

---

#### 2.6. Klasa - NotFoundError

Błąd nie znaleziono zasobu.

```typescript
export class NotFoundError extends ApiError {
  constructor(message: string = ERROR_MESSAGES.NOT_FOUND) {
    super(ERROR_CODES.NOT_FOUND, message, 404);
    this.name = "NotFoundError";
  }
}
```

**Używane przez:**

- Services (throw NotFoundError gdy zasób nie istnieje)

---

### Importy

```typescript
import type { ValidationErrorDetail } from "../../types";
```

---

## 3. Zod Helper Utilities

**Lokalizacja:** `src/lib/utils/zod-helpers.ts`

### Cel

Reużywalne funkcje pomocnicze dla walidacji Zod. Redukcja boilerplate code w endpointach.

### Funkcje do implementacji

#### 3.1. `searchParamsToObject`

Konwersja URLSearchParams do obiektu.

**Sygnatura:**

```typescript
export function searchParamsToObject(searchParams: URLSearchParams): Record<string, string>;
```

**Implementacja:**

- Iteracja przez searchParams
- Utworzenie obiektu z kluczami i wartościami
- Zwrócenie płaskiego obiektu

**Przykład:**

```typescript
// Input: ?page=1&limit=20&status=in_progress
// Output: { page: '1', limit: '20', status: 'in_progress' }
```

**Używane przez:**

- GET /api/matches
- Wszystkie endpointy z query params

---

#### 3.2. `zodErrorToValidationDetails`

Konwersja ZodError na ValidationErrorDetail[].

**Sygnatura:**

```typescript
export function zodErrorToValidationDetails(error: z.ZodError): ValidationErrorDetail[];
```

**Implementacja:**

- Iteracja przez `error.errors`
- Mapowanie każdego błędu na `ValidationErrorDetail`
- Ekstrakcja `field` z `error.path.join('.')`
- Ekstrakcja `message` z `error.message`
- Zwrócenie tablicy ValidationErrorDetail[]

**Przykład:**

```typescript
// Input: ZodError z błędami na polach 'page' i 'limit'
// Output: [
//   { field: 'page', message: 'Number must be greater than or equal to 1' },
//   { field: 'limit', message: 'Number must be less than or equal to 100' }
// ]
```

**Używane przez:**

- `api-response.ts` (createValidationErrorResponse)
- Wszystkie endpointy

---

#### 3.3. `parseQueryParams`

Parsowanie i walidacja query parameters.

**Sygnatura:**

```typescript
export function parseQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: z.ZodError };
```

**Implementacja:**

- Wywołanie `searchParamsToObject(searchParams)`
- Wywołanie `schema.safeParse(paramsObject)`
- Zwrócenie rezultatu (success/error)

**Używane przez:**

- GET /api/matches
- Wszystkie endpointy z query params

---

#### 3.4. `parseRequestBody`

Parsowanie i walidacja request body.

**Sygnatura:**

```typescript
export async function parseRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: z.ZodError | Error }>;
```

**Implementacja:**

- Try-catch dla `await request.json()`
- W przypadku błędu JSON: zwróć `{ success: false, error: new Error('Invalid JSON') }`
- Wywołanie `schema.safeParse(body)`
- Zwrócenie rezultatu (success/error)

**Używane przez:**

- POST /api/matches
- PATCH /api/matches/{id}
- Wszystkie endpointy z body

---

### Importy

```typescript
import { z } from "zod";
import type { ValidationErrorDetail } from "../../types";
```

---

## 4. Logger Utility

**Lokalizacja:** `src/lib/utils/logger.ts`

### Cel

Strukturalne logowanie błędów, ostrzeżeń i informacji. Spójny format logów w całej aplikacji.

### Funkcje do implementacji

#### 4.1. `logError`

Logowanie błędów.

**Sygnatura:**

```typescript
export function logError(
  endpoint: string,
  error: Error,
  context?: {
    userId?: string;
    params?: Record<string, any>;
    body?: Record<string, any>;
  }
): void;
```

**Implementacja:**

- Wypisanie strukturalnego logu
- Format: `[{endpoint}] Error: {error.message}`
- Jeśli context.userId: wypisz User ID
- Jeśli context.params: wypisz Query/Path params
- Jeśli context.body: wypisz Request body (bez wrażliwych danych)
- Wypisz timestamp
- Wypisz stack trace

**Przykład:**

```
[GET /api/matches] Error: Database connection timeout
  User ID: uuid-123-456
  Query params: { page: 1, limit: 20, status: "in_progress" }
  Timestamp: 2024-01-15T14:30:00Z
  Stack: [stack trace]
```

**Używane przez:**

- Wszystkie endpointy (catch block)
- Wszystkie services

---

#### 4.2. `logWarning`

Logowanie ostrzeżeń.

**Sygnatura:**

```typescript
export function logWarning(endpoint: string, message: string, context?: Record<string, any>): void;
```

**Implementacja:**

- Wypisanie strukturalnego logu
- Format: `[{endpoint}] Warning: {message}`
- Jeśli context: wypisz jako JSON

**Używane przez:**

- Services (np. analytics failure - non-critical)

---

#### 4.3. `logInfo`

Logowanie informacji.

**Sygnatura:**

```typescript
export function logInfo(endpoint: string, message: string, context?: Record<string, any>): void;
```

**Implementacja:**

- Wypisanie strukturalnego logu
- Format: `[{endpoint}] Info: {message}`
- Jeśli context: wypisz jako JSON

**Używane przez:**

- Services (np. successful operations - do debugowania)

---

### Uwagi implementacyjne

- Na początku używać `console.error`, `console.warn`, `console.log`
- W przyszłości można zintegrować z systemem logowania (np. Sentry, DataDog)
- Nie logować wrażliwych danych (tokeny, hasła)
- Możliwość dodania poziomów logowania (DEBUG, INFO, WARN, ERROR)

---

## 5. Match Service

**Lokalizacja:** `src/lib/services/match.service.ts`

### Cel

Centralizacja logiki biznesowej związanej z meczami. Separacja od warstwy API.

### Metody do implementacji

#### 5.1. `getMatchesPaginated`

Pobranie spaginowanej listy meczów użytkownika.

**Sygnatura:**

```typescript
export async function getMatchesPaginated(
  supabase: SupabaseClient,
  userId: string,
  query: ValidatedMatchListQuery
): Promise<{ data: MatchListItemDto[]; pagination: { total: number } }>;
```

**Parametry:**

- `supabase` - Supabase client z context.locals
- `userId` - ID użytkownika z JWT token
- `query` - Zwalidowane query parameters (page, limit, filters, sort)

**Implementacja:**

1. **Parsowanie sortowania:**
   - Wywołanie `parseSortParam(query.sort)`
   - Ekstrakcja `column` i `ascending`

2. **Obliczenie offset:**
   - `offset = (query.page - 1) * query.limit`

3. **COUNT query:**
   - Wywołanie `buildFilteredQuery(supabase, userId, query)`
   - Wykonanie `.select('*', { count: 'exact', head: true })`
   - Obsługa błędu: throw DatabaseError
   - Zapisanie `count`

4. **SELECT query:**
   - Wywołanie `buildFilteredQuery(supabase, userId, query)` (nowy builder!)
   - Zastosowanie sortowania: `.order(column, { ascending })`
   - Zastosowanie paginacji: `.range(offset, offset + query.limit - 1)`
   - Wykonanie `.select('*')`
   - Obsługa błędu: throw DatabaseError

5. **Mapowanie rezultatów:**
   - Usunięcie `user_id` z każdego rekordu: `data.map(({ user_id, ...match }) => match)`

6. **Zwrócenie:**
   - `{ data: mappedData, pagination: { total: count } }`

**Używane przez:**

- GET /api/matches

---

#### 5.2. `createMatch`

Utworzenie nowego meczu z pierwszym setem.

**Sygnatura:**

```typescript
export async function createMatch(
  supabase: SupabaseClient,
  userId: string,
  command: CreateMatchCommandDto
): Promise<CreateMatchDto>;
```

**Parametry:**

- `supabase` - Supabase client z context.locals
- `userId` - ID użytkownika z JWT token
- `command` - Zwalidowane dane z request body

**Implementacja:**

1. **Przygotowanie danych match:**

   ```typescript
   const matchInsert: MatchInsert = {
     user_id: userId,
     player_name: command.player_name,
     opponent_name: command.opponent_name,
     max_sets: command.max_sets,
     golden_set_enabled: command.golden_set_enabled,
     first_server_first_set: command.first_server_first_set,
     generate_ai_summary: command.generate_ai_summary,
     sets_won_player: 0,
     sets_won_opponent: 0,
     status: "in_progress",
     coach_notes: null,
     started_at: now(), // lub undefined - DB ustawi
     ended_at: null,
   };
   ```

2. **INSERT match:**
   - Wykonanie `supabase.from('matches').insert(matchInsert).select().single()`
   - Obsługa błędu: throw DatabaseError('Failed to create match')
   - Zapisanie `match`

3. **Utworzenie pierwszego seta:**
   - Import `createFirstSet` z set.service
   - Wywołanie `await createFirstSet(supabase, match.id, userId, command.first_server_first_set, false)`
   - Obsługa błędu: throw DatabaseError('Failed to create first set')
   - Zapisanie `currentSet`

4. **Konstrukcja response DTO:**
   - Wywołanie `mapMatchToCreateMatchDto(match, currentSet)`

5. **Zwrócenie:**
   - `CreateMatchDto`

**Używane przez:**

- POST /api/matches

---

#### 5.3. `getMatchById`

Pobranie pojedynczego meczu po ID.

**Sygnatura:**

```typescript
export async function getMatchById(
  supabase: SupabaseClient,
  userId: string,
  matchId: number,
  include?: string
): Promise<MatchDetailDto | null>;
```

**Parametry:**

- `supabase` - Supabase client
- `userId` - ID użytkownika
- `matchId` - ID meczu
- `include` - Opcjonalne: "sets", "points", "tags", "ai_report" (comma-separated)

**Implementacja:**

1. **SELECT match:**
   - `supabase.from('matches').select('*').eq('id', matchId).eq('user_id', userId).single()`
   - Obsługa błędu: return null (not found)

2. **Parsowanie include:**
   - Split `include` po przecinku
   - Utworzenie tablicy: `['sets', 'points', ...]`
   - Trim whitespace dla każdego elementu

3. **Warunkowe ładowanie relacji:**
   - **Jeśli include zawiera 'ai_report':**
     - Załaduj z `matches_ai_reports` dla tego match_id
   - **Jeśli include zawiera 'sets', 'points' lub 'tags':**
     - Określ czy ładować punkty: `includePoints = include zawiera 'points' lub 'tags'`
     - Wywołaj `getSetsByMatchId(supabase, userId, matchId, includePoints)`
     - **WAŻNE:** funkcja `getSetsByMatchId` automatycznie optymalizuje N+1 dla punktów
   - **Jeśli mecz in_progress:**
     - Załaduj current_set (ostatni nieukończony set)
     - Query: `supabase.from('sets').select('*').eq('match_id', matchId).eq('user_id', userId).eq('is_finished', false).order('sequence_in_match', { ascending: false }).limit(1).single()`
     - Określ current_server na podstawie liczby punktów w current_set

4. **Mapowanie i zwrócenie:**
   - `mapMatchToMatchDetailDto(match, currentSet, sets, aiReport)`

**Uwagi dot. wydajności:**

- **Problem N+1 jest automatycznie rozwiązany** w `getSetsByMatchId`
- Przykład: mecz z 5 setami i `include=points`:
  - Bez optymalizacji: 1 (match) + 1 (sets) + 5 (points per set) = 7 queries
  - Z optymalizacją: 1 (match) + 1 (sets) + 1 (all points) = 3 queries

**Używane przez:**

- GET /api/matches/{id}

---

#### 5.4. `updateMatch`

Aktualizacja metadanych meczu.

**Sygnatura:**

```typescript
export async function updateMatch(
  supabase: SupabaseClient,
  userId: string,
  matchId: number,
  command: UpdateMatchCommandDto
): Promise<UpdateMatchDto | null>;
```

**Parametry:**

- `supabase` - Supabase client
- `userId` - ID użytkownika
- `matchId` - ID meczu
- `command` - Zwalidowane dane do aktualizacji

**Implementacja:**

1. **Sprawdzenie istnienia:**
   - Wywołanie `getMatchById(supabase, userId, matchId)` (bez include)
   - Jeśli null: return null (not found)

2. **Przygotowanie update data:**
   - Tylko pola z `command` (player_name?, opponent_name?, coach_notes?)
   - Dodanie `updated_at: now()`

3. **UPDATE:**
   - `supabase.from('matches').update(updateData).eq('id', matchId).eq('user_id', userId).select().single()`
   - Obsługa błędu: throw DatabaseError

4. **Mapowanie i zwrócenie:**
   - Ekstrakcja pól dla `UpdateMatchDto`
   - `{ id, player_name, opponent_name, coach_notes, updated_at }`

**Używane przez:**

- PATCH /api/matches/{id}

---

#### 5.5. `finishMatch`

Zakończenie meczu z walidacją wyników i opcjonalnym triggerowaniem AI.

**Sygnatura:**

```typescript
export async function finishMatch(
  supabase: SupabaseClient,
  userId: string,
  matchId: number,
  command: FinishMatchCommandDto
): Promise<FinishMatchDto>;
```

**Implementacja:**

1. **Pobranie meczu:**
   - Query: `SELECT * FROM matches WHERE id = {matchId} AND user_id = {userId}`
   - Jeśli null: throw `NotFoundError('Match not found')`
   - Jeśli status === 'finished': throw `ApiError('VALIDATION_ERROR', 'Match is already finished', 422)`

2. **Pobranie bieżącego seta:**
   - Query: `SELECT * FROM sets WHERE match_id = {matchId} AND is_finished = false ORDER BY sequence_in_match DESC LIMIT 1`
   - Jeśli brak: throw `ApiError('VALIDATION_ERROR', 'No current set found', 422)`
   - Walidacja że wynik nie jest remisowy: `set_score_player !== set_score_opponent`
   - Jeśli remis: throw `ApiError('VALIDATION_ERROR', 'Cannot finish match: current set score is tied', 422)`

3. **Określenie zwycięzcy bieżącego seta:**
   - Wywołanie helper function: `const winner = determineSetWinner(currentSet)`
   - Porównanie `set_score_player` vs `set_score_opponent`

4. **Zakończenie bieżącego seta:**
   - UPDATE sets:
     ```typescript
     {
       is_finished: true,
       winner: winner,
       finished_at: now()
     }
     ```

5. **Obliczenie wyniku meczowego:**
   - Query: `SELECT winner, COUNT(*) as count FROM sets WHERE match_id = {matchId} AND is_finished = true GROUP BY winner`
   - Mapowanie wyników na sets_won_player i sets_won_opponent
   - Walidacja że wynik nie jest remisowy: `sets_won_player !== sets_won_opponent`
   - Jeśli remis: throw `ApiError('VALIDATION_ERROR', 'Cannot finish match: overall score is tied', 422)`

6. **Aktualizacja meczu:**
   - UPDATE matches:
     ```typescript
     {
       status: 'finished',
       ended_at: now(),
       sets_won_player: calculatedSetsWonPlayer,
       sets_won_opponent: calculatedSetsWonOpponent,
       coach_notes: command.coach_notes || match.coach_notes
     }
     ```

7. **Obsługa AI report (jeśli generate_ai_summary === true):**
   - Import `createAiReportRecord` i `generateAiReport` z `ai.service.ts`
   - Wywołanie `await createAiReportRecord(supabase, matchId, userId)` - tworzy rekord z ai_status='pending'
   - Wywołanie asynchroniczne: `Promise.resolve().then(() => generateAiReport(supabase, matchId))` (fire-and-forget)
   - ai_report_status do response: 'pending'

8. **Analytics event:**
   - Import `trackEvent` z `analytics.service.ts`
   - Wywołanie `trackEvent(supabase, userId, 'match_finished', matchId)` (fire-and-forget, bez await)

9. **Przygotowanie response:**
   - Mapowanie na `FinishMatchDto`:
     ```typescript
     {
       id: match.id,
       status: 'finished',
       sets_won_player: calculatedSetsWonPlayer,
       sets_won_opponent: calculatedSetsWonOpponent,
       ended_at: updatedMatch.ended_at,
       ai_report_status: match.generate_ai_summary ? 'pending' : null
     }
     ```

10. **Zwrócenie:**
    - `FinishMatchDto`

**Helper function (prywatna):**

```typescript
function determineSetWinner(set: Set): SideEnum {
  return set.set_score_player > set.set_score_opponent ? "player" : "opponent";
}
```

**Error handling:**

- `NotFoundError` - mecz nie istnieje
- `ApiError` z statusem 422 - walidacja biznesowa nie przeszła
- `DatabaseError` - błąd operacji bazodanowych

**Używane przez:**

- POST /api/matches/{id}/finish

---

#### 5.6. `deleteMatch`

Usunięcie meczu z kaskadowym usuwaniem powiązanych danych.

**Sygnatura:**

```typescript
export async function deleteMatch(supabase: SupabaseClient, userId: string, matchId: number): Promise<boolean>;
```

**Implementacja:**

**Uwaga:** Kaskadowe usuwanie jest obsługiwane przez logikę backendową (nie przez DB cascades), zgodnie ze schematem bazy danych gdzie FK nie mają kaskad.

1. **Weryfikacja istnienia i właściciela:**
   - Query: `SELECT * FROM matches WHERE id = {matchId} AND user_id = {userId}`
   - Jeśli null: return false (endpoint obsłuży jako 404)
   - Zapisanie rekordu match do zmiennej (dla logowania)

2. **Pobranie ID setów:**
   - Query: `SELECT id FROM sets WHERE match_id = {matchId} AND user_id = {userId}`
   - Obsługa błędu: throw DatabaseError
   - Zapisanie tablicy `setIds: number[]`
   - Jeśli pusta tablica: przejść do kroku 5 (brak setów)

3. **Pobranie ID punktów:**
   - Query: `SELECT id FROM points WHERE set_id IN ({setIds}) AND user_id = {userId}`
   - Obsługa błędu: throw DatabaseError
   - Zapisanie tablicy `pointIds: number[]`
   - Jeśli pusta tablica: przejść do kroku 5 (brak punktów)

4. **Usunięcie point_tags:**
   - Query: `DELETE FROM point_tags WHERE point_id IN ({pointIds}) AND user_id = {userId}`
   - Logowanie błędu jeśli zawiedzie, ale kontynuuj (non-blocking)
   - Bulk delete - jedno zapytanie dla wszystkich tagów

5. **Usunięcie points:**
   - Query: `DELETE FROM points WHERE set_id IN ({setIds}) AND user_id = {userId}`
   - Obsługa błędu: throw DatabaseError
   - Bulk delete - jedno zapytanie dla wszystkich punktów

6. **Usunięcie sets:**
   - Query: `DELETE FROM sets WHERE match_id = {matchId} AND user_id = {userId}`
   - Obsługa błędu: throw DatabaseError

7. **Usunięcie matches_ai_reports:**
   - Query: `DELETE FROM matches_ai_reports WHERE match_id = {matchId} AND user_id = {userId}`
   - Logowanie błędu jeśli zawiedzie, ale kontynuuj (non-blocking, może nie istnieć)

8. **Usunięcie matches_public_share:**
   - Query: `DELETE FROM matches_public_share WHERE match_id = {matchId} AND user_id = {userId}`
   - Logowanie błędu jeśli zawiedzie, ale kontynuuj (non-blocking, może nie istnieć)

9. **Rozłączenie analytics_events:**
   - Query: `UPDATE analytics_events SET match_id = NULL WHERE match_id = {matchId}`
   - **Bez warunku user_id** (analytics może mieć innego właściciela lub service role)
   - Logowanie błędu jeśli zawiedzie, ale kontynuuj (non-critical)

10. **Usunięcie matches:**
    - Query: `DELETE FROM matches WHERE id = {matchId} AND user_id = {userId}`
    - Obsługa błędu: throw DatabaseError

11. **Zwrócenie sukcesu:**
    - return true

**Error handling:**

- Try-catch owijający całą logikę
- Catch: `logError()` + throw DatabaseError
- Specjalna obsługa NotFoundError (gdy match nie istnieje)

**Optymalizacja:**

- Bulk DELETE z `WHERE IN (...)` zamiast pętli
- Minimalizacja round-trips: maksymalnie 10 zapytań niezależnie od wielkości danych
- Unikanie N+1 problem

**Kolejność usuwania:**

Usuwanie w odwrotnej kolejności zależności (child → parent):

1. point_tags (zależą od points)
2. points (zależą od sets)
3. sets (zależą od matches)
4. matches_ai_reports (powiązane z matches)
5. matches_public_share (powiązane z matches)
6. analytics_events (UPDATE, nie DELETE)
7. matches (główny rekord)

**Używane przez:**

- DELETE /api/matches/{id}

---

### Funkcje pomocnicze (prywatne)

#### 5.7. `buildFilteredQuery`

Budowanie query z filtrami (bez sortowania i paginacji).

**Sygnatura:**

```typescript
function buildFilteredQuery(supabase: SupabaseClient, userId: string, query: ValidatedMatchListQuery);
```

**Implementacja:**

- Start: `supabase.from('matches')`
- Filtr user_id: `.eq('user_id', userId)`
- Jeśli query.player_name: `.ilike('player_name', `%${query.player_name}%`)`
- Jeśli query.opponent_name: `.ilike('opponent_name', `%${query.opponent_name}%`)`
- Jeśli query.status: `.eq('status', query.status)`
- Zwrócenie query builder (nie wykonanie!)

**UWAGA:** Funkcja zwraca query builder, nie rezultat. Jest używana zarówno dla COUNT jak i SELECT.

---

#### 5.8. `parseSortParam`

Parsowanie parametru sort na kolumnę i kierunek.

**Sygnatura:**

```typescript
function parseSortParam(sort: string): { column: string; ascending: boolean };
```

**Implementacja:**

```typescript
const ascending = !sort.startsWith("-");
const column = ascending ? sort : sort.substring(1);
return { column, ascending };
```

---

#### 5.9. Funkcje mapowania

```typescript
function mapMatchToMatchListItemDto(match: Match): MatchListItemDto {
  const { user_id, ...rest } = match;
  return rest;
}

function mapMatchToMatchDetailDto(
  match: Match,
  currentSet?: CurrentSetDto | null,
  sets?: SetDetailDto[],
  aiReport?: AiReportDto | null
): MatchDetailDto {
  const { user_id, ...matchData } = match;
  return {
    ...matchData,
    current_set: currentSet,
    sets: sets,
    ai_report: aiReport,
  };
}

function mapMatchToCreateMatchDto(match: Match, currentSet: CurrentSetDto): CreateMatchDto {
  const { user_id, ...matchData } = match;
  return {
    ...matchData,
    current_set: currentSet,
  };
}
```

---

### Importy

```typescript
import type { SupabaseClient } from "../../db/supabase.client";
import type {
  Match,
  MatchInsert,
  MatchListItemDto,
  MatchDetailDto,
  CreateMatchDto,
  UpdateMatchDto,
  FinishMatchDto,
  CreateMatchCommandDto,
  UpdateMatchCommandDto,
  FinishMatchCommandDto,
  CurrentSetDto,
  SetDetailDto,
  AiReportDto,
} from "../../types";
import { DatabaseError, NotFoundError, ApiError } from "../utils/api-errors";
import { createFirstSet } from "./set.service";
import { getSetsByMatchId } from "./set.service";
```

---

## 6. Set Service

**Lokalizacja:** `src/lib/services/set.service.ts`

### Cel

Logika biznesowa związana z setami.

### Metody do implementacji

#### 6.1. `createFirstSet`

Utworzenie pierwszego seta w meczu.

**Sygnatura:**

```typescript
export async function createFirstSet(
  supabase: SupabaseClient,
  matchId: number,
  userId: string,
  firstServer: SideEnum,
  isGolden: boolean = false
): Promise<CurrentSetDto>;
```

**Implementacja:**

1. **Przygotowanie danych:**

   ```typescript
   const setInsert: SetInsert = {
     match_id: matchId,
     user_id: userId,
     sequence_in_match: 1,
     is_golden: isGolden,
     set_score_player: 0,
     set_score_opponent: 0,
     winner: null,
     is_finished: false,
     coach_notes: null,
     finished_at: null,
   };
   ```

2. **INSERT:**
   - `supabase.from('sets').insert(setInsert).select().single()`
   - Obsługa błędu: throw DatabaseError('Failed to create set')

3. **Mapowanie:**
   - `mapSetToCurrentSetDto(set, firstServer)`

4. **Zwrócenie:**
   - `CurrentSetDto`

**Używane przez:**

- `match.service.ts` (createMatch)

---

#### 6.2. `getSetsByMatchId`

Pobranie wszystkich setów dla meczu.

**Sygnatura:**

```typescript
export async function getSetsByMatchId(
  supabase: SupabaseClient,
  userId: string,
  matchId: number,
  includePoints: boolean = false
): Promise<SetDetailDto[]>;
```

**Implementacja:**

1. **SELECT:**
   - `supabase.from('sets').select('*').eq('match_id', matchId).eq('user_id', userId).order('sequence_in_match', { ascending: true })`
   - Obsługa błędu: throw DatabaseError

2. **Warunkowe ładowanie punktów (z optymalizacją N+1):**
   - Jeśli includePoints === false: pomiń ten krok
   - Jeśli includePoints === true:
     - **WAŻNE - Optymalizacja N+1:**
       - Zamiast pętli z `getPointsBySetId` dla każdego seta (N queries)
       - Użyj jednego query z `WHERE set_id IN (...)` (1 query)
       - Wywołaj funkcję pomocniczą `getPointsBySetIds(supabase, userId, setIds)`
       - Grupuj punkty po set_id i przypisz do odpowiednich setów
     - **Problem N+1:**
       - Przykład: mecz ma 5 setów → 1 query dla setów + 5 queries dla punktów = 6 queries
       - Z optymalizacją: 1 query dla setów + 1 query dla wszystkich punktów = 2 queries
     - **Implementacja:**
       ```typescript
       const setIds = sets.map((s) => s.id);
       const allPointsGrouped = await getPointsBySetIds(supabase, userId, setIds);
       // allPointsGrouped jest obiektem: { [setId: number]: PointWithTagsDto[] }
       ```

3. **Mapowanie:**
   - `sets.map(set => mapSetToSetDetailDto(set, allPointsGrouped[set.id] || []))`

4. **Zwrócenie:**
   - `SetDetailDto[]`

**Używane przez:**

- `match.service.ts` (getMatchById z include=sets)
- GET /api/matches/{matchId}/sets

---

#### 6.3. `getSetById`

Pobranie pojedynczego seta.

**Sygnatura:**

```typescript
export async function getSetById(
  supabase: SupabaseClient,
  userId: string,
  setId: number,
  includePoints: boolean = false
): Promise<SetDetailDto | null>;
```

**Implementacja:**

- Podobna do getSetsByMatchId, ale dla pojedynczego ID
- Return null jeśli nie znaleziono

**Używane przez:**

- GET /api/sets/{id}

---

#### 6.4. `finishSet`

Zakończenie seta i utworzenie następnego (jeśli potrzebny).

**Sygnatura:**

```typescript
export async function finishSet(
  supabase: SupabaseClient,
  userId: string,
  setId: number,
  command: FinishSetCommandDto
): Promise<FinishSetDto | null>;
```

**Implementacja:**

1. **Pobranie seta:**
   - Sprawdzenie istnienia
   - Sprawdzenie czy nie jest już zakończony

2. **Określenie zwycięzcy:**
   - Porównanie set_score_player i set_score_opponent
   - Walidacja (różnica >= 2, min 11 punktów)

3. **UPDATE seta:**
   - Ustawienie is_finished: true
   - Ustawienie winner
   - Ustawienie finished_at: now()
   - Ustawienie coach_notes (jeśli podane)

4. **Sprawdzenie czy potrzebny kolejny set:**
   - Pobranie meczu
   - Sprawdzenie sets_won
   - Jeśli mecz nie zakończony: utworzenie następnego seta

5. **Zwrócenie:**
   - `{ finished_set: FinishedSetDto, next_set: CurrentSetDto }`

**Używane przez:**

- POST /api/sets/{id}/finish

---

### Funkcje pomocnicze (prywatne)

#### 6.5. `getPointsBySetIds`

Pobranie punktów dla wielu setów jednym query (optymalizacja N+1).

**Sygnatura:**

```typescript
async function getPointsBySetIds(
  supabase: SupabaseClient,
  userId: string,
  setIds: number[]
): Promise<Record<number, PointWithTagsDto[]>>;
```

**Implementacja:**

1. **Walidacja:**
   - Jeśli setIds jest puste: zwróć pusty obiekt `{}`

2. **SELECT z JOIN:**
   - Query:
     ```typescript
     supabase
       .from("points")
       .select(
         `
         *,
         point_tags(tag:tags(name))
       `
       )
       .in("set_id", setIds)
       .eq("user_id", userId)
       .order("sequence_in_set", { ascending: true });
     ```
   - **UWAGA:** To jeden query zamiast N queries
   - Obsługa błędu: throw DatabaseError

3. **Grupowanie po set_id:**
   - Iteracja przez wszystkie punkty
   - Utworzenie struktury: `{ [setId: number]: PointWithTagsDto[] }`
   - Dla każdego punktu:
     - Ekstrakcja tagów z `point_tags.tag.name`
     - Utworzenie `PointWithTagsDto` z tablicą `tags: string[]`
     - Dodanie do odpowiedniego `setId` w wyniku

4. **Zwrócenie:**
   - `Record<number, PointWithTagsDto[]>` - obiekt z punktami zgrupowanymi po set_id

**Przykład struktury zwracanej:**

```typescript
{
  123: [
    { id: 1, set_id: 123, ..., tags: ['forehand_winner', 'cross_court'] },
    { id: 2, set_id: 123, ..., tags: ['backhand_error'] }
  ],
  124: [
    { id: 3, set_id: 124, ..., tags: ['serve_ace'] }
  ]
}
```

**Używane przez:**

- `getSetsByMatchId` (gdy includePoints=true)

---

#### 6.6. `mapSetToCurrentSetDto`

```typescript
function mapSetToCurrentSetDto(set: Set, currentServer: SideEnum): CurrentSetDto {
  return {
    id: set.id,
    sequence_in_match: set.sequence_in_match,
    is_golden: set.is_golden,
    set_score_player: set.set_score_player,
    set_score_opponent: set.set_score_opponent,
    is_finished: set.is_finished,
    current_server: currentServer,
  };
}
```

---

#### 6.7. `mapSetToSetDetailDto`

```typescript
function mapSetToSetDetailDto(set: Set, points?: PointWithTagsDto[]): SetDetailDto {
  const { user_id, ...setData } = set;
  return {
    ...setData,
    points: points,
  };
}
```

---

### Importy

```typescript
import type { SupabaseClient } from "../../db/supabase.client";
import type {
  Set,
  SetInsert,
  SetDetailDto,
  CurrentSetDto,
  FinishSetDto,
  FinishedSetDto,
  FinishSetCommandDto,
  SideEnum,
  PointWithTagsDto,
} from "../../types";
import { DatabaseError, NotFoundError, ApiError } from "../utils/api-errors";
```

---

## 7. Analytics Service

**Lokalizacja:** `src/lib/services/analytics.service.ts`

### Cel

Tracking zdarzeń użytkownika w celach analitycznych. Fire-and-forget approach.

### Metody do implementacji

#### 7.1. `trackEvent`

Zapisanie zdarzenia analitycznego.

**Sygnatura:**

```typescript
export async function trackEvent(
  supabase: SupabaseClient,
  userId: string,
  type: AnalyticsEventTypeEnum,
  matchId?: number | null
): Promise<void>;
```

**Implementacja:**

1. **Przygotowanie danych:**

   ```typescript
   const eventInsert: AnalyticsEventInsert = {
     user_id: userId,
     type: type,
     match_id: matchId || null,
   };
   ```

2. **INSERT:**
   - `supabase.from('analytics_events').insert(eventInsert)`
   - **UWAGA:** Nie czekać na rezultat (.then() bez await)
   - **UWAGA:** Nie rzucać błędów - tylko logować

3. **Error handling:**
   - Try-catch wewnątrz
   - W przypadku błędu: `logWarning('Analytics', 'Failed to track event', { type, userId, matchId })`
   - NIE propagować błędu

**Używane przez:**

- POST /api/matches (match_created)
- POST /api/matches/{id}/finish (match_finished)

---

### Importy

```typescript
import type { SupabaseClient } from "../../db/supabase.client";
import type { AnalyticsEventInsert, AnalyticsEventTypeEnum } from "../../types";
import { logWarning } from "../utils/logger";
```

---

## 8. AI Service

**Lokalizacja:** `src/lib/services/ai.service.ts`

### Cel

Obsługa generacji raportów AI dla zakończonych meczów. Asynchroniczne generowanie podsumowań i rekomendacji treningowych przy użyciu OpenRouter API.

### Metody do implementacji

#### 8.1. `createAiReportRecord`

Utworzenie rekordu AI report ze statusem 'pending'.

**Sygnatura:**

```typescript
export async function createAiReportRecord(supabase: SupabaseClient, matchId: number, userId: string): Promise<void>;
```

**Implementacja:**

1. **Przygotowanie danych:**

   ```typescript
   const reportInsert: MatchAiReportInsert = {
     match_id: matchId,
     user_id: userId,
     ai_status: "pending",
     ai_summary: null,
     ai_recommendations: null,
     ai_error: null,
     ai_generated_at: null,
   };
   ```

2. **INSERT:**
   - `supabase.from('matches_ai_reports').insert(reportInsert)`
   - Obsługa błędu: throw DatabaseError('Failed to create AI report record')

**Używane przez:**

- `match.service.ts` (finishMatch)

---

#### 8.2. `generateAiReport`

Asynchroniczne generowanie raportu AI (fire-and-forget).

**Sygnatura:**

```typescript
export async function generateAiReport(supabase: SupabaseClient, matchId: number): Promise<void>;
```

**Implementacja:**

1. **Pobranie danych meczu:**
   - Query: Pobranie meczu ze wszystkimi setami i punktami (include=sets,points,tags)
   - Przygotowanie kontekstu dla AI

2. **Wywołanie OpenRouter API:**
   - Endpoint: zgodnie z dokumentacją OpenRouter
   - Prompt: Wygenerowanie podsumowania meczu i rekomendacji treningowych
   - Model: Do określenia w konfiguracji

3. **Aktualizacja rekordu - SUCCESS:**
   - UPDATE matches_ai_reports:
     ```typescript
     {
       ai_status: 'success',
       ai_summary: generatedSummary,
       ai_recommendations: generatedRecommendations,
       ai_generated_at: now()
     }
     ```

4. **Aktualizacja rekordu - ERROR:**
   - UPDATE matches_ai_reports:
     ```typescript
     {
       ai_status: 'error',
       ai_error: error.message,
       ai_generated_at: now()
     }
     ```

5. **Error handling:**
   - Try-catch wewnątrz funkcji
   - Logowanie błędów: `logError('AI Service', error, { matchId })`
   - NIE propagować błędów (fire-and-forget)

**Uwagi:**

- Funkcja jest wywoływana asynchronicznie (fire-and-forget)
- Błędy nie blokują głównego przepływu
- Szczegóły integracji z OpenRouter będą w osobnym planie implementacji

**Używane przez:**

- `match.service.ts` (finishMatch)

---

### Importy

```typescript
import type { SupabaseClient } from "../../db/supabase.client";
import type { MatchAiReportInsert, MatchAiReportUpdate } from "../../types";
import { DatabaseError } from "../utils/api-errors";
import { logError, logInfo } from "../utils/logger";
```

---

## 9. Match Schemas

**Lokalizacja:** `src/lib/schemas/match.schemas.ts`

### Cel

Centralizacja schematów walidacji Zod dla endpointów Match.

### Schematy do implementacji

#### 9.1. `createMatchCommandSchema`

Walidacja body dla POST /api/matches.

```typescript
export const createMatchCommandSchema = z.object({
  player_name: z.string().min(1, "Player name is required").max(200, "Player name too long"),
  opponent_name: z.string().min(1, "Opponent name is required").max(200, "Opponent name too long"),
  max_sets: z.number().int("Must be an integer").min(1, "Must be at least 1").max(7, "Cannot exceed 7"),
  golden_set_enabled: z.boolean(),
  first_server_first_set: z.enum(SIDE_VALUES, { errorMap: () => ({ message: 'Must be "player" or "opponent"' }) }),
  generate_ai_summary: z.boolean(),
});

export type ValidatedCreateMatchCommand = z.infer<typeof createMatchCommandSchema>;
```

---

#### 9.2. `matchListQuerySchema`

Walidacja query params dla GET /api/matches.

```typescript
export const matchListQuerySchema = z.object({
  page: z.coerce.number().int().min(1, "Page must be at least 1").default(1),
  limit: z.coerce.number().int().min(1).max(100, "Limit cannot exceed 100").default(20),
  player_name: z.string().trim().min(1).optional(),
  opponent_name: z.string().trim().min(1).optional(),
  status: z.enum(MATCH_STATUS_VALUES).optional(),
  sort: z
    .string()
    .regex(/^-?(started_at|ended_at|created_at|player_name|opponent_name)$/, "Invalid sort field")
    .default("-started_at"),
});

export type ValidatedMatchListQuery = z.infer<typeof matchListQuerySchema>;
```

---

#### 9.3. `updateMatchCommandSchema`

Walidacja body dla PATCH /api/matches/{id}.

```typescript
export const updateMatchCommandSchema = z.object({
  player_name: z.string().min(1).max(200).optional(),
  opponent_name: z.string().min(1).max(200).optional(),
  coach_notes: z.string().nullable().optional(),
});

export type ValidatedUpdateMatchCommand = z.infer<typeof updateMatchCommandSchema>;
```

---

#### 9.4. `finishMatchCommandSchema`

Walidacja body dla POST /api/matches/{id}/finish.

```typescript
export const finishMatchCommandSchema = z.object({
  coach_notes: z.string().nullable().optional(),
});

export type ValidatedFinishMatchCommand = z.infer<typeof finishMatchCommandSchema>;
```

---

#### 9.5. `includeQuerySchema`

Walidacja query param "include" dla GET /api/matches/{id}.

```typescript
export const includeQuerySchema = z.object({
  include: z
    .string()
    .regex(/^(sets|points|tags|ai_report)(,(sets|points|tags|ai_report))*$/, "Invalid include format")
    .optional(),
});

export type ValidatedIncludeQuery = z.infer<typeof includeQuerySchema>;
```

---

### Importy

```typescript
import { z } from "zod";
import { SIDE_VALUES, MATCH_STATUS_VALUES } from "../../types";
```

---

## 10. Common Schemas

**Lokalizacja:** `src/lib/schemas/common.schemas.ts`

### Cel

Schematy walidacji używane przez wiele różnych endpointów.

### Schematy do implementacji

#### 10.1. `idParamSchema`

Walidacja path parameter {id}.

```typescript
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive("ID must be a positive integer"),
});

export type ValidatedIdParam = z.infer<typeof idParamSchema>;
```

**Używane przez:**

- GET /api/matches/{id}
- PATCH /api/matches/{id}
- DELETE /api/matches/{id}
- GET /api/sets/{id}
- POST /api/sets/{id}/finish
- Wszystkie endpointy z {id}

---

#### 10.2. `tokenParamSchema`

Walidacja path parameter {token} (SHA-256 hex).

```typescript
export const tokenParamSchema = z.object({
  token: z
    .string()
    .length(64, "Invalid token format")
    .regex(/^[a-f0-9]{64}$/, "Token must be 64 hex characters"),
});

export type ValidatedTokenParam = z.infer<typeof tokenParamSchema>;
```

**Używane przez:**

- GET /api/public/matches/{token}

---

### Importy

```typescript
import { z } from "zod";
```

---

## 11. Etapy implementacji

### Faza 1: Utilities (Priorytet KRYTYCZNY)

**Czas:** 2-3 godziny

**Kolejność:**

1. Utworzenie katalogu `src/lib/utils/` (jeśli nie istnieje)

2. **api-errors.ts** (najpierw, bo używane przez inne)
   - Implementacja stałych ERROR_CODES
   - Implementacja stałych ERROR_MESSAGES
   - Implementacja klas ApiError, DatabaseError, ValidationError, NotFoundError
   - Eksport wszystkich

3. **zod-helpers.ts**
   - Implementacja searchParamsToObject
   - Implementacja zodErrorToValidationDetails
   - Implementacja parseQueryParams
   - Implementacja parseRequestBody
   - Eksport wszystkich

4. **api-response.ts**
   - Implementacja createJsonResponse (prywatna)
   - Implementacja createSuccessResponse
   - Implementacja createListResponse
   - Implementacja createPaginatedResponse
   - Implementacja createErrorResponse
   - Implementacja createValidationErrorResponse (używa zodErrorToValidationDetails)
   - Implementacja createUnauthorizedResponse
   - Implementacja createNotFoundResponse
   - Implementacja createInternalErrorResponse
   - Implementacja createNoContentResponse
   - Eksport wszystkich (oprócz createJsonResponse)

5. **logger.ts** (opcjonalnie, można pominąć)
   - Implementacja logError
   - Implementacja logWarning
   - Implementacja logInfo
   - Eksport wszystkich

**Weryfikacja:**

- TypeScript kompiluje się bez błędów
- Wszystkie importy działają
- Linter nie zgłasza błędów

---

### Faza 2: Schemas (Priorytet WYSOKI)

**Czas:** 1-2 godziny

**Kolejność:**

1. Utworzenie katalogu `src/lib/schemas/` (jeśli nie istnieje)

2. **common.schemas.ts**
   - Implementacja idParamSchema
   - Implementacja tokenParamSchema
   - Eksport schematów i typów

3. **match.schemas.ts**
   - Implementacja createMatchCommandSchema
   - Implementacja matchListQuerySchema
   - Implementacja updateMatchCommandSchema
   - Implementacja finishMatchCommandSchema
   - Implementacja includeQuerySchema
   - Eksport schematów i typów

**Weryfikacja:**

- TypeScript kompiluje się bez błędów
- Testy Zod działają (można stworzyć prosty test)

---

### Faza 3: Services (Priorytet WYSOKI)

**Czas:** 4-6 godzin

**Kolejność:**

1. Utworzenie katalogu `src/lib/services/` (jeśli nie istnieje)

2. **set.service.ts** (najpierw, bo używany przez match.service)
   - Implementacja funkcji pomocniczych (mapSetToCurrentSetDto, mapSetToSetDetailDto)
   - Implementacja createFirstSet
   - Implementacja getSetsByMatchId
   - Implementacja getSetById
   - Implementacja finishSet
   - Eksport funkcji publicznych

3. **match.service.ts**
   - Implementacja funkcji pomocniczych (buildFilteredQuery, parseSortParam, mapping functions)
   - Implementacja getMatchesPaginated
   - Implementacja createMatch (używa createFirstSet z set.service)
   - Implementacja getMatchById (używa getSetsByMatchId z set.service)
   - Implementacja updateMatch
   - Implementacja finishMatch
   - Implementacja deleteMatch
   - Eksport funkcji publicznych

4. **analytics.service.ts**
   - Implementacja trackEvent
   - Eksport funkcji publicznych

5. **ai.service.ts**
   - Implementacja createAiReportRecord
   - Implementacja generateAiReport (asynchroniczne, fire-and-forget)
   - Implementacja helper functions dla OpenRouter API
   - Eksport funkcji publicznych

**Weryfikacja:**

- TypeScript kompiluje się bez błędów
- Wszystkie importy działają
- Linter nie zgłasza błędów

---

### Faza 4: Przegląd i testy

**Czas:** 1-2 godziny

1. **Code review**
   - Sprawdzenie zgodności z coding guidelines
   - Weryfikacja error handling
   - Sprawdzenie typowania

2. **Refactoring** (jeśli potrzebny)
   - Poprawa nazw
   - Optymalizacja

3. **Dokumentacja**
   - JSDoc dla funkcji publicznych
   - Komentarze dla skomplikowanej logiki

---

## 12. Checklist przed zakończeniem implementacji

### Utilities

- [ ] `api-errors.ts` utworzony i działa
- [ ] `zod-helpers.ts` utworzony i działa
- [ ] `api-response.ts` utworzony i działa
- [ ] `logger.ts` utworzony (opcjonalnie)

### Schemas

- [ ] `common.schemas.ts` utworzony
- [ ] `match.schemas.ts` utworzony
- [ ] Wszystkie schematy eksportowane z typami

### Services

- [ ] `set.service.ts` utworzony
- [ ] `match.service.ts` utworzony
- [ ] `analytics.service.ts` utworzony (opcjonalnie)
- [ ] `ai.service.ts` utworzony
- [ ] Wszystkie funkcje publiczne eksportowane

### Ogólne

- [ ] TypeScript kompiluje się bez błędów (`npx tsc --noEmit`)
- [ ] Linter nie zgłasza błędów (`npm run lint`)
- [ ] Wszystkie importy działają
- [ ] Struktura katalogów zgodna z planem
- [ ] Kod zgodny z guidelines (.cursor/rules/)

---

## 13. Uwagi końcowe

### Zależności między komponentami

```
api-response.ts
  ↓ używa
zod-helpers.ts (zodErrorToValidationDetails)

match.service.ts
  ↓ używa
set.service.ts (createFirstSet, getSetsByMatchId)
ai.service.ts (createAiReportRecord, generateAiReport)
analytics.service.ts (trackEvent)

Wszystkie services
  ↓ używają
api-errors.ts (throw DatabaseError, NotFoundError)
logger.ts (logError, logWarning)
```

### Kolejność implementacji jest ważna

1. Najpierw: api-errors.ts (używane przez wszystko)
2. Następnie: zod-helpers.ts (używane przez api-response.ts)
3. Następnie: api-response.ts
4. Następnie: schemas (niezależne)
5. Następnie: set.service.ts (używany przez match.service.ts)
6. Następnie: analytics.service.ts (używany przez match.service.ts)
7. Następnie: ai.service.ts (używany przez match.service.ts)
8. Na końcu: match.service.ts

### Po ukończeniu implementacji shared components

Przejść do implementacji konkretnych endpointów:

- GET /api/matches (używa match.service.getMatchesPaginated)
- POST /api/matches (używa match.service.createMatch)

---

**Autor:** AI Assistant  
**Data:** 2025-12-01  
**Wersja:** 1.0
