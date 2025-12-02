# API Endpoint Implementation Plan: PATCH /api/matches/{id}

## 1. Przegląd punktu końcowego

Endpoint **PATCH /api/matches/{id}** umożliwia aktualizację metadanych istniejącego meczu. Jest to operacja partial update, która pozwala na modyfikację wyłącznie wybranych pól:

- Nazwy gracza (`player_name`)
- Nazwy przeciwnika (`opponent_name`)
- Notatek trenera (`coach_notes`)

**Ograniczenia:**

- Nie można modyfikować setów, punktów ani statusu meczu
- Endpoint wymaga uwierzytelnienia (JWT token)
- Tylko właściciel meczu może go aktualizować
- Wszystkie pola w request body są opcjonalne (partial update)

**Use case:**

- Korekta nazw graczy (np. literówki)
- Dodanie lub aktualizacja notatek trenera
- Edycja metadanych bez wpływu na wynik meczu

---

## 2. Szczegóły żądania

### Metoda HTTP

`PATCH`

### Struktura URL

```
/api/matches/{id}
```

### Path Parameters

- **`id`** (integer, required) - ID meczu
- **Walidacja:** `idParamSchema` z `common.schemas.ts` (patrz `shared-implementation-plan.md`)

### Request Headers

- **`Authorization`** (required) - `Bearer {supabase_jwt_token}`
- **`Content-Type`** (required) - `application/json`

**Uwierzytelnienie:** JWT token weryfikowany przez middleware (`src/middleware/index.ts`)

### Request Body

**Type:** `UpdateMatchCommandDto` (z `src/types.ts`)

**Schemat walidacji:** `updateMatchCommandSchema` z `match.schemas.ts` (patrz `shared-implementation-plan.md`)

**Uwaga:** Wszystkie pola opcjonalne (partial update), puste body `{}` dozwolone

---

## 3. Wykorzystywane typy

### DTOs (z `src/types.ts`)

- **Request:** `UpdateMatchCommandDto`
- **Response:** `UpdateMatchDto`, `UpdateMatchResponse`

### Schematy walidacji (z `shared-implementation-plan.md`)

- **Path param:** `idParamSchema` z `common.schemas.ts` → typ `ValidatedIdParam`
- **Request body:** `updateMatchCommandSchema` z `match.schemas.ts` → typ `ValidatedUpdateMatchCommand`

### Service (z `shared-implementation-plan.md`)

- **Metoda:** `match.service.updateMatch()`
- **Sygnatura:** `(supabase, userId, matchId, command) => Promise<UpdateMatchDto | null>`

---

## 4. Szczegóły odpowiedzi

### Success Response (200 OK)

**Typ:** `UpdateMatchResponse` z `src/types.ts`

**Struktura:** Wrapper `{ data: UpdateMatchDto }` zawierający pola: `id`, `player_name`, `opponent_name`, `coach_notes`, `updated_at`

**Funkcja:** `createSuccessResponse<UpdateMatchDto>()` z `api-response.ts` (patrz `shared-implementation-plan.md`)

### Error Responses

Wszystkie error responses wykorzystują funkcje z `api-response.ts` (patrz `shared-implementation-plan.md`):

- **401 Unauthorized:** `createUnauthorizedResponse()`
- **404 Not Found:** `createNotFoundResponse("Match not found")`
- **422 Validation Error:** `createValidationErrorResponse(zodError)`
- **400 Invalid JSON:** `createErrorResponse('INVALID_JSON', ..., 400)`
- **500 Internal Error:** `createInternalErrorResponse()`

**Uwaga:** 403 Forbidden nie jest zwracany - RLS w Supabase traktuje brak autoryzacji jak 404.

---

## 5. Przepływ danych

### 5.1. Request Flow (High-Level)

```
Client Request (PATCH /api/matches/{id})
    ↓
Middleware (auth verification) → context.locals.user
    ↓
Endpoint Handler (src/pages/api/matches/[id].ts)
    ↓
1. Extract & validate path parameter {id}
2. Parse & validate request body
3. Call match.service.updateMatch()
    ↓
Match Service (src/lib/services/match.service.ts)
    ↓
4. Check if match exists (getMatchById)
5. Update match in Supabase (with user_id check via RLS)
6. Return UpdateMatchDto
    ↓
Endpoint Handler
    ↓
7. Format response with createSuccessResponse()
    ↓
Client Response (200 OK with UpdateMatchResponse)
```

### 5.2. Detailed Data Flow

#### Krok 1: Middleware

- Weryfikacja JWT → `context.locals.user` lub 401

#### Krok 2: Walidacja path parameter

- Użycie `idParamSchema` → `ValidatedIdParam` lub 422

#### Krok 3: Walidacja request body

- Użycie `parseRequestBody()` → `ValidatedUpdateMatchCommand` lub 422/400

#### Krok 4-6: Match Service - Aktualizacja meczu

- **Process:** Wywołanie `match.service.updateMatch()` (implementacja w `shared-implementation-plan.md`)
  1. Check existence przez `getMatchById()`
  2. UPDATE query z `.eq('user_id', userId)` - autoryzacja
  3. Mapowanie do `UpdateMatchDto`
- **Output:** `UpdateMatchDto` lub `null` (404)

#### Krok 7: Formatowanie response

- Użycie `createSuccessResponse(updateMatchDto, 200)`

---

## 6. Względy bezpieczeństwa

### 6.1. Authentication & Authorization

**Authentication:** JWT token weryfikowany przez middleware → `context.locals.user`

**Authorization (dwupoziomowa):**

1. **Application:** Query z `.eq('user_id', userId)` - brak dostępu → 404 (nie ujawnia istnienia)
2. **Database:** RLS policy `user_id = auth.uid()` - dodatkowa ochrona

### 6.3. Input Validation & Data Protection

**Schematy:** `idParamSchema` z `common.schemas.ts`, `updateMatchCommandSchema` z `match.schemas.ts` (patrz `shared-implementation-plan.md`)

**Ochrona:** Zod zapobiega injection attacks, RLS chroni sensitive data (`coach_notes`)

---

## 7. Obsługa błędów

### 7.1. Rodzaje błędów

#### Authentication Errors (401)

**Przyczyny:**

- Brak header `Authorization`
- Nieprawidłowy format tokenu
- Token wygasł
- Token nieprawidłowy (zmodyfikowany)

**Obsługa:** Zobacz sekcja 7.2 Error Response Flow

#### Validation Errors (422)

**Przykładowe przyczyny:**

- Invalid ID: `/api/matches/abc`, `/api/matches/-5`
- Empty `player_name`: `{ "player_name": "" }`
- Too long `opponent_name` (>200 chars)
- Invalid JSON syntax

**Obsługa:** `createValidationErrorResponse()` + `logWarning()`

#### Not Found Errors (404)

**Przyczyny:**

- Mecz nie istnieje lub należy do innego użytkownika

**Obsługa:** `createNotFoundResponse()` + `logInfo()`

**Security Note:** Nie ujawniaj czy mecz istnieje (information disclosure)

#### Database/Unexpected Errors (500)

**Przyczyny:** Timeout, connection issues, bugs

**Obsługa:** `createInternalErrorResponse()` + `logError()` - nie ujawniaj szczegółów

### 7.2. Error Response Flow

```
Error occurs
    ↓
Identify error type
    ↓
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ Validation      │ Not Found       │ Database        │ Unexpected      │
│ (ZodError)      │ (null from svc) │ (DatabaseError) │ (Error)         │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
    ↓                   ↓                   ↓                   ↓
createValidation    createNotFound    createInternal    createInternal
ErrorResponse()     Response()        ErrorResponse()   ErrorResponse()
    ↓                   ↓                   ↓                   ↓
logWarning()        logInfo()         logError()        logError()
    ↓                   ↓                   ↓                   ↓
Return Response (422)  (404)            (500)             (500)
```

### 7.3. Logging Strategy

**Wykorzystanie funkcji z `logger.ts` (patrz `shared-implementation-plan.md`):**

- **logError()** - Database errors, unexpected errors
- **logWarning()** - Validation errors (user input)
- **logInfo()** - Not found scenarios, successful operations

### 7.4. Idempotency

**PATCH jest idempotentny:**

- Wielokrotne wywołanie z tym samym body daje ten sam rezultat
- `updated_at` będzie się zmieniać, ale to oczekiwane zachowanie
- Bezpieczne retry w przypadku network errors

---

## 8. Wydajność

### 8.1. Database Queries

**Liczba queries:**

- Check existence: 1 query (SELECT w getMatchById)
- Update: 1 query (UPDATE)
- **Razem: 2 queries**

**Optymalizacja:**

- Można zoptymalizować do 1 query poprzez bezpośredni UPDATE z RETURNING
- Ale dla consistency z innymi endpointami, zachowujemy check existence

**Query Performance:**

- UPDATE na pojedynczym wierszu (by PK `id`)
- Index na `id` (primary key) - automatyczny
- Index na `user_id` - jeśli istnieje, przyspiesza WHERE clause
- RLS policy evaluation - minimal overhead

### 8.2. Payload Size

**Request:**

- Bardzo mały payload (< 1KB typowo)
- Max ~200 chars na pole × 2 pola + coach_notes
- Nie wymaga streaming ani compression

**Response:**

- Mały payload (<1KB)
- Tylko zaktualizowane pola + metadata

### 8.3. Expected Response Time

- **Target:** < 200ms (p95)
- **Breakdown:**
  - Auth verification: ~10-20ms
  - Validation: ~5ms
  - DB SELECT: ~20-50ms
  - DB UPDATE: ~20-50ms
  - Response formatting: ~5ms

### 8.4. Potential Bottlenecks

**Database Connection:**

- Supabase connection pooling
- W przypadku problemów: retry strategy w service layer

**RLS Policy Evaluation:**

- Minimal overhead dla prostej policy `user_id = auth.uid()`
- Policy execution: ~5-10ms

**Network Latency:**

- Client ↔ Cloudflare: zależy od lokalizacji
- Cloudflare ↔ Supabase: zależy od regionu
- Mitigation: CDN, proper region selection

### 8.6. Concurrent Updates

**Scenario:** Dwóch użytkowników aktualizuje ten sam mecz jednocześnie

**Current Behavior:**

- Last write wins (LWW)
- Brak optimistic locking
- `updated_at` odzwierciedla ostatnią modyfikację

**Potential Issue:**

- User A i User B edytują różne pola
- Update A może nadpisać zmiany B (lub odwrotnie)

**Mitigation (jeśli potrzebne w przyszłości):**

- Optimistic locking z `version` column
- Conditional update z `If-Match` header (ETag)
- **Uwaga:** Dla MVP nie jest to konieczne - scenariusz rzadki

---

## 9. Kroki implementacji

### 9.1. Prerequisites

- [ ] **Shared components** zaimplementowane zgodnie z `shared-implementation-plan.md`:
  - Utilities: `api-response.ts`, `api-errors.ts`, `zod-helpers.ts`, `logger.ts`
  - Services: `match.service.ts` (metoda `updateMatch`)
  - Schemas: `common.schemas.ts` (`idParamSchema`), `match.schemas.ts` (`updateMatchCommandSchema`)

- [ ] **Typy** z `src/types.ts`: `UpdateMatchCommandDto`, `UpdateMatchDto`, `UpdateMatchResponse`

- [ ] **Middleware** skonfigurowany: `src/middleware/index.ts`

### 9.2. Implementacja Endpoint Handler

**Lokalizacja:** `src/pages/api/matches/[id].ts`

**Uwaga:** Endpoint handler łączy metody GET (już zaimplementowany według `get-matches-id-implementation-plan.md`), PATCH (ten plan) i DELETE w jednym pliku.

#### Krok 1: Dodanie metody PATCH do handlera

W pliku `src/pages/api/matches/[id].ts`:

1. Dodaj import dla PATCH-specific dependencies:
   - `updateMatchCommandSchema` z `match.schemas.ts`
   - `parseRequestBody` z `zod-helpers.ts` (jeśli nie importowany)
   - Typy: `UpdateMatchCommandDto`, `UpdateMatchResponse`

2. Dodaj handler funkcję `export async function PATCH(context: APIContext): Promise<Response>`

3. Dodaj export `export const prerender = false;` (jeśli jeszcze nie istnieje)

#### Krok 2-3: Ekstrakcja dependencies i auth check

- Ekstrakcja: `supabase`, `user`, `params`, `request` z context
- Auth check: jeśli `user === null` → `createUnauthorizedResponse()`

#### Krok 4: Walidacja path parameter

- Użycie `idParamSchema.safeParse()`
- Obsługa błędu → `createValidationErrorResponse()`

#### Krok 5: Walidacja request body

- Użycie `parseRequestBody(request, updateMatchCommandSchema)`
- Obsługa: JSON error (400), validation error (422), success

#### Krok 6-7: Wywołanie service i obsługa wyniku

- Wywołanie `match.service.updateMatch(supabase, userId, matchId, command)`
- Jeśli `null` → `createNotFoundResponse()`
- Jeśli `UpdateMatchDto` → `createSuccessResponse(result, 200)`

#### Krok 8: Error handling

- Try-catch z obsługą `ApiError`, `DatabaseError`, generic `Error`
- Użycie `logError()`, `createInternalErrorResponse()`

### 9.3. Weryfikacja implementacji match.service.updateMatch

Upewnij się, że metoda `updateMatch` w `match.service.ts` jest zaimplementowana zgodnie z `shared-implementation-plan.md`.

### 9.4. Code Quality Checks

- [ ] TypeScript kompiluje się bez błędów: `npx tsc --noEmit`
- [ ] Linter passes: `npm run lint`
- [ ] Wszystkie importy poprawne
- [ ] Error handling dla wszystkich ścieżek
- [ ] Logging na odpowiednich poziomach
- [ ] Zgodność z coding guidelines (`.cursor/rules/`)
- [ ] JSDoc comments dla funkcji publicznych
- [ ] Proper null handling

### 9.5. Documentation Updates

- [ ] Dodaj JSDoc do funkcji `PATCH` w handler
- [ ] Zaktualizuj README jeśli potrzeba (przykłady użycia API)
- [ ] Zaktualizuj API documentation (jeśli istnieje)

---

## 10. Notatki końcowe

### 10.1. Relacja z innymi endpointami

**GET /api/matches/{id}:**

- Współdzieli ten sam handler file (`[id].ts`)
- Po PATCH, GET powinien zwrócić zaktualizowane dane

**DELETE /api/matches/{id}:**

- Współdzieli ten sam handler file
- Po DELETE, PATCH na tym ID zwróci 404

**POST /api/matches/{id}/finish:**

- Zmienia status na 'finished'
- Po finish, PATCH nadal działa (można edytować nazwy i notatki)
- Nie można zmienić statusu przez PATCH

---

**Autor:** AI Assistant  
**Data:** 2025-12-01  
**Wersja:** 1.0  
**Endpoint:** PATCH /api/matches/{id}
