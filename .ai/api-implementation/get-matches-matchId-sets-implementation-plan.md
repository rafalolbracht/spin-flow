# API Endpoint Implementation Plan: GET /api/matches/{matchId}/sets

## 1. Przegląd punktu końcowego

Endpoint służy do pobierania wszystkich setów dla konkretnego meczu. Zwraca listę setów uporządkowanych według kolejności w meczu (`sequence_in_match`). Obsługuje opcjonalne ładowanie zagnieżdżonych relacji (punkty z tagami) przez parametr `include`.

**Kluczowe funkcjonalności:**

- Pobieranie wszystkich setów dla meczu
- Weryfikacja własności meczu (autoryzacja na poziomie zasobów)
- Opcjonalne includowanie punktów i tagów
- Optymalizacja N+1 problem dla zagnieżdżonych relacji

## 2. Szczegóły żądania

**Metoda HTTP:** GET

**Struktura URL:** `/api/matches/{matchId}/sets`

**Parametry:**

_Path Parameters:_

- `matchId` (integer, required) - ID meczu, musi być positive integer

_Query Parameters:_

- `include` (string, optional) - Lista relacji do załadowania, możliwe wartości:
  - `"points"` - ładuje punkty z tagami
  - `"tags"` - ładuje punkty z tagami (alias dla "points")
  - `"points,tags"` - ładuje punkty z tagami
  - Format: comma-separated, dowolna kolejność

**Request Headers:**

```
Authorization: Bearer {supabase_jwt_token}
```

**Request Body:** Brak (GET request)

## 3. Wykorzystywane typy

**Z src/types.ts:**

- `SetDetailDto` - typ pojedynczego seta w odpowiedzi
- `PointWithTagsDto` - typ punktu z tagami (gdy include zawiera points/tags)
- `SetListResponse` - typ końcowej odpowiedzi API
- `ListResponseDto<T>` - wrapper dla listy

**Schematy walidacji:**

- `idParamSchema` z `src/lib/schemas/common.schemas.ts` - walidacja matchId
- `setsIncludeQuerySchema` z `src/lib/schemas/set.schemas.ts` - walidacja include (zgodnie z shared-implementation-plan.md)

**Service:**

- `getSetsByMatchId()` z `src/lib/services/set.service.ts` (już zaimplementowana zgodnie z shared-implementation-plan.md)
- `getMatchById()` z `src/lib/services/match.service.ts` (do weryfikacji własności meczu)

## 4. Szczegóły odpowiedzi

**Success Response (200 OK):**

```json
{
  "data": [
    {
      "id": 456,
      "match_id": 124,
      "sequence_in_match": 1,
      "is_golden": false,
      "set_score_player": 11,
      "set_score_opponent": 8,
      "winner": "player",
      "is_finished": true,
      "coach_notes": "Dobry początek",
      "finished_at": "2024-01-15T14:45:00Z",
      "created_at": "2024-01-15T14:30:00Z",
      "points": [
        /* jeśli include=points */
      ]
    }
  ]
}
```

**Struktura SetDetailDto:**

- Wszystkie pola z tabeli `sets` (bez `user_id`)
- `points?: PointWithTagsDto[]` - opcjonalne, gdy include zawiera "points" lub "tags"

**Error Responses:**

Wykorzystanie funkcji z `src/lib/utils/api-response.ts`:

- `401 Unauthorized` - `createUnauthorizedResponse()`
- `403 Forbidden` - `createErrorResponse('FORBIDDEN', 'Access denied', 403)`
- `404 Not Found` - `createNotFoundResponse('Match not found')`
- `422 Validation Error` - `createValidationErrorResponse(zodError)`
- `500 Internal Server Error` - `createInternalErrorResponse()`

## 5. Przepływ danych

### 5.1. Request Flow

```
Client Request
    ↓
Astro Middleware (auth verification)
    ↓
Endpoint Handler: /api/matches/[matchId]/sets.ts
    ↓
1. Extract & validate matchId from params.matchId
2. Extract & validate include from request.url.searchParams
3. Get userId from context.locals.user.id
    ↓
4. Verify match ownership: getMatchById(supabase, userId, matchId)
   - Jeśli null → 404 Not Found
   - Jeśli user_id !== userId → 403 Forbidden (obsługiwane przez RLS)
    ↓
5. Parse include parameter:
   - Split by comma
   - Trim whitespace
   - Determine: includePoints = include zawiera 'points' OR 'tags'
    ↓
6. Call service: getSetsByMatchId(supabase, userId, matchId, includePoints)
   (szczegóły implementacji w shared-implementation-plan.md)
    ↓
7. Format response: createListResponse(sets, 200)
    ↓
Response to Client
```

## 6. Względy bezpieczeństwa

### 6.1. Uwierzytelnianie

- JWT token weryfikowany przez Astro middleware
- Middleware ustawia `context.locals.user` i `context.locals.supabase`
- Brak tokenu → middleware zwraca 401 (obsługiwane automatycznie)

### 6.2. Autoryzacja zasobów

**Weryfikacja własności meczu:**

- Sprawdzenie czy `match.user_id === userId` przed pobraniem setów
- Użycie `getMatchById(supabase, userId, matchId)` (bez include) jako guard
- Jeśli mecz nie istnieje lub nie należy do użytkownika → 404
- RLS w Supabase jako dodatkowa warstwa ochrony

**Filtrowanie setów:**

- Service `getSetsByMatchId()` automatycznie filtruje po `user_id`

### 6.3. Walidacja danych wejściowych

- `matchId` - walidacja przez `idParamSchema` (positive integer)
- `include` - walidacja przez `setsIncludeQuerySchema` (dozwolone wartości)
- Użycie funkcji `parseQueryParams()` z `zod-helpers.ts`

### 6.4. Ochrona przed atakami

- **SQL Injection:** Supabase client używa parametryzowanych zapytań
- **Path Traversal:** Walidacja matchId jako integer
- **DoS:** Include ograniczony do 2 wartości (points, tags), brak możliwości deep nesting

## 7. Obsługa błędów

### 7.1. Walidacja danych wejściowych (422)

**Scenariusz 1: Nieprawidłowy format matchId**

- Przykład: `/api/matches/abc/sets`
- Walidacja: `idParamSchema.safeParse({ id: params.matchId })`
- Response: `createValidationErrorResponse(zodError)`
- Details: `[{ field: "id", message: "ID must be a positive integer" }]`

**Scenariusz 2: Nieprawidłowy format include**

- Przykład: `?include=invalid,wrong`
- Walidacja: `setsIncludeQuerySchema.safeParse({ include })`
- Response: `createValidationErrorResponse(zodError)`
- Details: `[{ field: "include", message: "Invalid include format" }]`

### 7.2. Autoryzacja (401, 403)

**Scenariusz 3: Brak tokenu autoryzacji**

- Obsługiwane przez middleware
- Response: `401 Unauthorized`

**Scenariusz 4: Mecz nie należy do użytkownika**

- Weryfikacja: `getMatchById()` zwraca null
- Response: `createNotFoundResponse('Match not found')`
- Status: `404 Not Found`
- Uwaga: Używamy 404 zamiast 403 aby nie ujawniać istnienia zasobu

### 7.3. Zasób nie znaleziony (404)

**Scenariusz 5: Mecz nie istnieje**

- Weryfikacja: `getMatchById()` zwraca null
- Response: `createNotFoundResponse('Match not found')`

**Scenariusz 6: Mecz istnieje ale nie ma setów**

- To NIE jest błąd - zwracamy pustą listę: `{ data: [] }`
- Status: `200 OK`

### 7.4. Błędy bazy danych (500)

**Scenariusz 7: Błąd połączenia z bazą**

- Catch: `DatabaseError` z service
- Response: `createInternalErrorResponse()`
- Logging: `logError('GET /api/matches/{matchId}/sets', error, context)`

**Scenariusz 8: Nieoczekiwany błąd**

- Catch: Generic Error
- Response: `createInternalErrorResponse()`
- Logging: `logError()` z pełnym stack trace

### 7.5. Struktura Error Handling

```typescript
try {
  // Walidacja
  // Autoryzacja
  // Business logic
} catch (error) {
  if (error instanceof ZodError) {
    return createValidationErrorResponse(error);
  }
  if (error instanceof NotFoundError) {
    return createNotFoundResponse(error.message);
  }
  if (error instanceof ApiError) {
    return createErrorResponse(error.code, error.message, error.statusCode);
  }
  logError(endpoint, error, context);
  return createInternalErrorResponse();
}
```

## 8. Rozważania dotyczące wydajności

### 8.1. Optymalizacje zapytań

**Problem N+1:**

- Service `getSetsByMatchId()` ma wbudowaną optymalizację N+1 dla punktów (szczegóły w shared-implementation-plan.md)

### 8.2. Ładowanie warunkowe

- Punkty i tagi ładowane tylko gdy `include` zawiera "points" lub "tags"
- Domyślnie (bez include) zwracane są tylko podstawowe dane setów
- Redukcja transferu danych gdy punkty nie są potrzebne

### 8.3. Limity

- Brak paginacji dla setów (liczba setów w meczu jest ograniczona: max 7)
- Punkty w secie mogą być liczne (~11-30), ale akceptowalne dla REST API
- Jeśli wydajność stanie się problemem: rozważyć paginację punktów lub osobny endpoint

## 9. Etapy implementacji

### Krok 1: Utworzenie struktury pliku endpointa

**Plik:** `src/pages/api/matches/[matchId]/sets.ts` (nowy plik)

**Struktura:**

- Import typów z `src/types.ts`
- Import service functions z `src/lib/services/`
- Import validation schemas z `src/lib/schemas/`
- Import utilities z `src/lib/utils/`
- Export `prerender = false`
- Implementacja handlera `GET()`

**Zależności:**

- `src/types.ts`
- `src/lib/services/set.service.ts`
- `src/lib/services/match.service.ts`
- `src/lib/schemas/common.schemas.ts`
- `src/lib/schemas/set.schemas.ts`
- `src/lib/utils/api-response.ts`
- `src/lib/utils/zod-helpers.ts`
- `src/lib/utils/logger.ts`

### Krok 2: Implementacja walidacji parametrów

**W funkcji GET():**

1. **Ekstrakcja parametrów:**
   - `matchId` z `context.params.matchId`
   - `include` z `context.url.searchParams`

2. **Walidacja matchId:**
   - Użycie `idParamSchema.safeParse({ id: context.params.matchId })`
   - Jeśli błąd → return `createValidationErrorResponse(result.error)`

3. **Walidacja include:**
   - Użycie `parseQueryParams(searchParams, setsIncludeQuerySchema)`
   - Jeśli błąd → return `createValidationErrorResponse(result.error)`

**Error handling:**

- Try-catch dla całej walidacji
- Return appropriate error responses

### Krok 3: Implementacja autoryzacji

1. **Pobranie userId:**
   - Z `context.locals.user.id`
   - Middleware już to ustawia po weryfikacji JWT

2. **Pobranie Supabase client:**
   - Z `context.locals.supabase`

3. **Weryfikacja własności meczu:**
   - Wywołanie `getMatchById(supabase, userId, matchId)` (bez include)
   - Jeśli null → return `createNotFoundResponse('Match not found')`
   - Uwaga: Nie sprawdzamy statusu meczu (in_progress vs finished) - oba są dozwolone

**Error handling:**

- Catch `NotFoundError` → 404
- Catch `DatabaseError` → 500

### Krok 4: Parsowanie parametru include

**Logika:**

1. Sprawdzenie czy `include` jest podany
2. Jeśli tak:
   - Split po przecinku: `include.split(',')`
   - Trim każdego elementu: `.map(s => s.trim())`
   - Utworzenie Set: `new Set(includeArray)`
3. Określenie `includePoints`:
   - `includeSet.has('points') || includeSet.has('tags')`
   - Uwaga: "tags" jest aliasem dla "points" (tagi są zawsze z punktami)

**Przykłady:**

- `?include=points` → includePoints = true
- `?include=tags` → includePoints = true
- `?include=points,tags` → includePoints = true
- Brak include → includePoints = false

### Krok 5: Wywołanie service

**Wywołanie funkcji:**

```typescript
const sets = await getSetsByMatchId(supabase, userId, matchId, includePoints);
```

**Uwaga:** Funkcja jest już zaimplementowana zgodnie z shared-implementation-plan.md

**Error handling:**

- Catch `DatabaseError` → 500
- Catch generic Error → 500

### Krok 6: Formatowanie odpowiedzi

**Sukces:**

- Wywołanie `createListResponse(sets, 200)`
- Zwraca: `{ data: SetDetailDto[] }`
- Content-Type: application/json

**Pusta lista:**

- Jeśli mecz nie ma setów: `sets = []`
- Response: `{ data: [] }` z statusem 200
- To NIE jest błąd

### Krok 7: Globalna obsługa błędów

**Try-catch block owijający całą funkcję:**

```typescript
try {
  // Wszystkie kroki 2-6
} catch (error) {
  // Obsługa różnych typów błędów
  // Logowanie
  // Return appropriate error response
}
```

**Kolejność obsługi:**

1. ZodError → 422 Validation Error
2. NotFoundError → 404
3. ApiError → odpowiedni status z error.statusCode
4. DatabaseError → 500
5. Generic Error → 500 (z pełnym logowaniem)

**Logowanie:**

- Użycie `logError()` z `src/lib/utils/logger.ts`
- Context: `{ userId, matchId, include }`
- Tylko dla błędów 500 (nie logować 404, 422)

### Krok 8: Weryfikacja implementacji

**Checklist:**

- [ ] Schema walidacji utworzony i eksportowany
- [ ] Plik endpointa utworzony w poprawnej lokalizacji
- [ ] `prerender = false` ustawione
- [ ] Walidacja parametrów działa poprawnie
- [ ] Autoryzacja weryfikuje własność meczu
- [ ] Service jest poprawnie wywoływany
- [ ] Response jest poprawnie formatowany
- [ ] Error handling pokrywa wszystkie scenariusze
- [ ] Logging jest poprawnie skonfigurowany
- [ ] TypeScript kompiluje się bez błędów
- [ ] Linter nie zgłasza błędów

### Krok 9: Weryfikacja zależności

**Sprawdzenie czy shared components są zaimplementowane:**

- Utilities (api-response.ts, zod-helpers.ts, logger.ts, api-errors.ts)
- Schemas (common.schemas.ts, set.schemas.ts)
- Services (set.service.ts, match.service.ts)

**W przypadku braków:**

- Najpierw zaimplementować brakujące komponenty zgodnie z shared-implementation-plan.md

---

**Uwagi końcowe:**

- Endpoint korzysta w pełni z już zaimplementowanych shared components
- Główna logika biznesowa jest w `set.service.ts`
- Endpoint handler jest cienką warstwą: walidacja → autoryzacja → service → response
- Optymalizacja N+1 jest transparentna dla endpointa (obsługiwana w service)
- Endpoint może być łatwo rozszerzony o dodatkowe parametry include w przyszłości
