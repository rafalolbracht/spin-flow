# API Endpoint Implementation Plan: GET /api/sets/{id}

## 1. Przegląd punktu końcowego

Endpoint służy do pobierania szczegółowych informacji o konkretnym secie. Zwraca pojedynczy set z opcjonalnymi zagnieżdżonymi punktami i tagami. Weryfikuje własność zasobu na poziomie user_id.

**Kluczowe funkcjonalności:**

- Pobieranie pojedynczego seta po ID
- Weryfikacja własności seta (autoryzacja na poziomie zasobów)
- Opcjonalne includowanie punktów z tagami
- Zabezpieczenie przed information disclosure (403 vs 404)

## 2. Szczegóły żądania

**Metoda HTTP:** GET

**Struktura URL:** `/api/sets/{id}`

**Parametry:**

_Path Parameters:_

- `id` (integer, required) - ID seta, musi być positive integer

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

**Response types (src/types.ts):**

- `SetDetailDto` - pojedynczy set z opcjonalnymi punktami
- `SetDetailResponse = SingleItemResponseDto<SetDetailDto>` - finalna odpowiedź API

**Schematy walidacji (szczegóły w shared-implementation-plan.md):**

- `idParamSchema` z `src/lib/schemas/common.schemas.ts`
- `setsIncludeQuerySchema` z `src/lib/schemas/set.schemas.ts`

**Service (szczegóły w shared-implementation-plan.md):**

- `getSetById()` z `src/lib/services/set.service.ts`

## 4. Szczegóły odpowiedzi

**Success Response (200 OK):**

Wykorzystanie `createSuccessResponse()` z `api-response.ts`.

```json
{
  "data": {
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
    "current_server": null,
    "points": [
      {
        "id": 1001,
        "sequence_in_set": 1,
        "scored_by": "player",
        "served_by": "player",
        "created_at": "2024-01-15T14:31:00Z",
        "tags": ["Dobry atak"]
      }
    ]
  }
}
```

**Struktura SetDetailDto:**

- Wszystkie pola z tabeli `sets` (bez `user_id`)
- `current_server?: SideEnum | null` - zawsze null dla zakończonych setów
- `points?: PointWithTagsDto[]` - opcjonalne, gdy include zawiera "points" lub "tags"

**Error Responses:**

Wykorzystanie funkcji z `src/lib/utils/api-response.ts`:

- `401 Unauthorized` - `createUnauthorizedResponse()`
- `404 Not Found` - `createNotFoundResponse('Set not found')` - gdy set nie istnieje LUB użytkownik nie jest właścicielem (information disclosure prevention)
- `422 Validation Error` - `createValidationErrorResponse(zodError)`
- `500 Internal Server Error` - `createInternalErrorResponse()`

## 5. Przepływ danych

### 5.1. Request Flow

```
Client Request
    ↓
Astro Middleware (auth verification)
    ↓ context.locals.supabase + context.locals.user
Endpoint Handler: /api/sets/[id].ts
    ↓
1. Validate path param {id} → setId
    ↓
2. Validate query param {include}
    ↓
3. Determine includePoints flag
    ↓
4. Call set.service.getSetById(supabase, userId, setId, includePoints)
    │ (szczegóły implementacji w shared-implementation-plan.md)
    ↓
    ├─ return null → 404 Not Found
    └─ return SetDetailDto → 200 OK
```

### 5.2. Database Queries

Szczegółowa logika queries jest zaimplementowana w `set.service.ts → getSetById()` (shared-implementation-plan.md).

**Podsumowanie:**

- Maksymalnie 2 queries (1 dla seta + 1 dla punktów jeśli includePoints=true)
- Weryfikacja user_id w każdym query zapewnia autoryzację
- Wykorzystanie funkcji `getPointsBySetIds` dla spójności z innymi serwisami

### 5.3. Service Layer

Endpoint wykorzystuje funkcję `getSetById()` z `set.service.ts` (szczegóły implementacji w shared-implementation-plan.md).

**Podział odpowiedzialności:**

**Service (`set.service.ts`):**

- Wykonanie queries do bazy danych
- Weryfikacja user_id (autoryzacja)
- Warunkowe ładowanie punktów
- Mapowanie na SetDetailDto
- Zwrócenie null jeśli nie znaleziono

**Endpoint handler:**

- Walidacja parametrów wejściowych (path + query)
- Wywołanie service
- Konwersja null → 404 Not Found
- Formatowanie success response (200 OK)
- Global error handling (catch block)

## 6. Względy bezpieczeństwa

### 6.1. Autentykacja

**Implementacja:**

- Middleware `src/middleware/index.ts` weryfikuje JWT token z header Authorization
- Jeśli token nieprawidłowy/brak: middleware zwraca 401
- Token jest weryfikowany przez Supabase
- UserId jest ekstrahowany z tokenu i dostępny w `context.locals.user.id`

### 6.2. Autoryzacja

**Weryfikacja własności zasobu:**

- Service używa `eq('user_id', userId)` w query SQL
- Jeśli set nie należy do użytkownika: query zwraca null
- Endpoint zwraca 404 (nie 403) - information disclosure prevention
- Użytkownik nie może odróżnić "nie istnieje" od "nie masz dostępu"

### 6.3. Walidacja danych wejściowych

**Path parameter {id}:**

- Schema: `idParamSchema` z common.schemas.ts
- Walidacja: positive integer
- Zapobiega: path traversal, SQL injection

**Query parameter {include}:**

- Schema: `setsIncludeQuerySchema` z set.schemas.ts
- Walidacja: regex `/^(points|tags)(,(points|tags))?$/`
- Dopuszczalne wartości: "points", "tags", "points,tags", "tags,points"
- Zapobiega: injection, unexpected values

### 6.4. Data Exposure Prevention

**Usunięcie wrażliwych danych:**

- Service usuwa `user_id` z SetDetailDto
- Endpoint nie zwraca internal IDs niepowiązanych zasobów
- Error messages nie ujawniają szczegółów implementacji

## 7. Obsługa błędów

### 7.1. Scenariusze błędów

Wykorzystanie klas błędów z `src/lib/utils/api-errors.ts` i funkcji z `src/lib/utils/api-response.ts`:

| Kod | Scenariusz                       | Źródło błędu                         | Response Function                         |
| --- | -------------------------------- | ------------------------------------ | ----------------------------------------- |
| 401 | Brak/nieprawidłowy JWT token     | Middleware                           | `createUnauthorizedResponse()`            |
| 404 | Set nie istnieje                 | Service zwraca null                  | `createNotFoundResponse('Set not found')` |
| 404 | Użytkownik nie jest właścicielem | Service zwraca null (user_id filter) | `createNotFoundResponse('Set not found')` |
| 422 | Nieprawidłowy format id          | Zod validation                       | `createValidationErrorResponse(zodError)` |
| 422 | Nieprawidłowy format include     | Zod validation                       | `createValidationErrorResponse(zodError)` |
| 500 | Błąd połączenia z bazą           | Supabase query error                 | `createInternalErrorResponse()`           |
| 500 | Nieoczekiwany błąd               | Catch block                          | `createInternalErrorResponse()`           |

### 7.2. Error Handling Pattern

**W endpoint handlerze:**

```typescript
try {
  // 1. Validate path param
  const pathValidation = idParamSchema.safeParse({ id: params.id });
  if (!pathValidation.success) {
    return createValidationErrorResponse(pathValidation.error);
  }

  // 2. Validate query params
  const queryValidation = parseQueryParams(url.searchParams, setsIncludeQuerySchema);
  if (!queryValidation.success) {
    return createValidationErrorResponse(queryValidation.error);
  }

  // 3. Call service
  const set = await getSetById(supabase, userId, setId, includePoints);

  // 4. Handle not found
  if (!set) {
    return createNotFoundResponse("Set not found");
  }

  // 5. Return success
  return createSuccessResponse(set, 200);
} catch (error) {
  // Log error
  logError("GET /api/sets/{id}", error, {
    userId,
    params: { id: setId },
    query: { include },
  });

  // Return 500
  return createInternalErrorResponse();
}
```

### 7.3. Logowanie błędów

Wykorzystanie `logError()` z `src/lib/utils/logger.ts`:

**Kontekst do logowania:**

- Endpoint: `'GET /api/sets/{id}'`
- User ID: `userId`
- Path params: `{ id: setId }`
- Query params: `{ include }`
- Error object: `error`
- Stack trace: automatycznie z error.stack

## 8. Rozważania dotyczące wydajności

### 8.1. Query Optimization

**Problem N+1:**
Automatycznie rozwiązany w `set.service.ts` przez wykorzystanie funkcji `getPointsBySetIds` (szczegóły w shared-implementation-plan.md):

- Punkty ładowane jednym query z JOIN na point_tags i tags
- Brak iteracji po punktach

### 8.2. Response Size Optimization

**Conditional Loading:**

- Punkty są ładowane tylko gdy `include` zawiera "points" lub "tags"
- Domyślnie (bez include): tylko metadata seta
- Z include=points: pełne dane (~100-500 punktów, ~5-50KB)

**Payload Examples:**

- Bez points: ~300 bytes (tylko metadata seta)
- Z points (20 punktów, 2 tagi każdy): ~2-3 KB
- Z points (maxed out game, ~50 punktów): ~5-8 KB

### 8.3. Database Load

**Query Complexity:**

- Single set lookup: O(1) przez primary key
- Points z JOIN: O(n) gdzie n = liczba punktów
- Maksymalnie 2 queries niezależnie od liczby punktów

**Expected Performance:**

- Typowy set (11-21 punktów): <50ms
- Duży set (~50 punktów): <100ms

## 9. Etapy implementacji

**Lokalizacja pliku:** `src/pages/api/sets/[id].ts`

### Krok 1: Utworzenie pliku endpointa

- Utworzyć `src/pages/api/sets/[id].ts`
- Dodać `export const prerender = false`
- Zdefiniować handler funkcję `GET`

### Krok 2: Importy

Zaimportować potrzebne moduły:

- Typy: `SetDetailResponse`, `SetDetailDto` z `src/types.ts`
- Schemas: `idParamSchema` z `src/lib/schemas/common.schemas.ts`, `setsIncludeQuerySchema` z `src/lib/schemas/set.schemas.ts`
- Service: `getSetById` z `src/lib/services/set.service.ts`
- Utils: funkcje z `src/lib/utils/api-response.ts` i `src/lib/utils/zod-helpers.ts`
- Logger: `logError` z `src/lib/utils/logger.ts`
- Astro types: `APIContext`

### Krok 3: Ekstrakcja danych z context

- Pobrać `context.locals.supabase` (Supabase client z middleware)
- Pobrać `context.locals.user` (User object z middleware)
- Jeśli `user` jest null: zwrócić `createUnauthorizedResponse()` (fallback, middleware powinno to obsłużyć)
- Ekstrakcja `userId` z `user.id`

### Krok 4: Walidacja path parameter {id}

- Ekstrakcja `context.params.id`
- Parsowanie używając `idParamSchema.safeParse({ id: context.params.id })`
- Jeśli walidacja nie powiedzie się: zwrócić `createValidationErrorResponse(zodError)`
- Zapisać zwalidowane `setId` do zmiennej

### Krok 5: Walidacja query parameters

- Ekstrakcja `context.url.searchParams`
- Parsowanie używając `parseQueryParams(searchParams, setsIncludeQuerySchema)`
- Jeśli walidacja nie powiedzie się: zwrócić `createValidationErrorResponse(zodError)`
- Zapisać zwalidowane query params

### Krok 6: Określenie flagi includePoints

- Sprawdzić czy `include` zawiera "points" lub "tags"
- Logika: `includePoints = include?.includes('points') || include?.includes('tags')`
- Zapisać do zmiennej `includePoints: boolean`

### Krok 7: Wywołanie service

- Wywołać `await getSetById(supabase, userId, setId, includePoints)`
- Zapisać rezultat do zmiennej `set`

### Krok 8: Obsługa not found

- Sprawdzić czy `set === null`
- Jeśli null: zwrócić `createNotFoundResponse('Set not found')`
- Uwaga: nie rozróżniamy "nie istnieje" vs "nie masz dostępu" (information disclosure prevention)

### Krok 9: Zwrócenie success response

- Wywołać `createSuccessResponse<SetDetailDto>(set, 200)`
- Typ response: `SetDetailResponse` (SingleItemResponseDto<SetDetailDto>)

### Krok 10: Obsługa błędów (catch block)

- Owinąć całą logikę w try-catch
- W catch: wywołać `logError('GET /api/sets/{id}', error, { userId, params: { id: setId }, query: { include } })`
- Zwrócić `createInternalErrorResponse()`

### Krok 11: Weryfikacja kodu

- Sprawdzić TypeScript compilation: `npx tsc --noEmit`
- Sprawdzić linter: `npm run lint`
- Sprawdzić czy wszystkie importy są poprawne
- Sprawdzić zgodność z coding guidelines z .cursor/rules/

---

**Autor:** AI Assistant  
**Data:** 2025-01-15  
**Wersja:** 1.0
