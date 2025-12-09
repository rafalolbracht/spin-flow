# API Endpoint Implementation Plan: GET /api/sets/{setId}/points

## 1. Przegląd punktu końcowego

Endpoint służy do pobierania wszystkich punktów dla konkretnego seta. Umożliwia opcjonalne dołączenie tagów do każdego punktu. Endpoint weryfikuje, że set należy do zalogowanego użytkownika i zwraca punkty uporządkowane chronologicznie według sekwencji w secie.

**Cel biznesowy:** Umożliwienie treneru podglądu szczegółowego przebiegu seta z informacją o każdym rozegranych punkcie wraz z opcjonalnymi tagami opisującymi charakter punktu.

**Kluczowe założenia:**

- Tylko właściciel seta ma dostęp do jego punktów
- Punkty są zawsze zwracane z tagami (parametr `include` jest opcjonalny w specyfikacji, ale w praktyce tagi są zawsze ładowane)
- Punkty są posortowane według `sequence_in_set` (chronologicznie)
- Return 404 dla both "set not found" i "no access" (information disclosure prevention)

## 2. Szczegóły żądania

### Metoda HTTP

GET

### Struktura URL

```
/api/sets/{setId}/points
```

### Parametry

**Path Parameters:**

- `setId` (integer, required) - ID seta, pozytywna liczba całkowita

**Query Parameters:**

- `include` (string, optional) - Wartość: `"tags"` (w praktyce tagi są zawsze ładowane, parametr zachowany dla zgodności ze specyfikacją API)

**Request Headers:**

```
Authorization: Bearer {supabase_jwt_token}
```

**Request Body:**
Brak (metoda GET)

### Przykład żądania

```http
GET /api/sets/456/points?include=tags HTTP/1.1
Host: example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3. Wykorzystywane typy

### Z pliku types.ts:

- **PointWithTagsDto** - reprezentacja punktu z tagami (zawiera tablicę nazw tagów)
- **PointListResponse** - wrapper odpowiedzi typu `ListResponseDto<PointWithTagsDto>`

### Ze shared-implementation-plan.md:

- **pointsIncludeQuerySchema** - schemat walidacji query param (Point Schemas)
- **getPointsBySetId** - service do pobierania punktów (Point Service)

## 4. Szczegóły odpowiedzi

### Success Response (200 OK)

**Content-Type:** `application/json`

**Body:**

```json
{
  "data": [
    {
      "id": 1001,
      "set_id": 456,
      "sequence_in_set": 1,
      "scored_by": "player",
      "served_by": "player",
      "created_at": "2024-01-15T14:31:00Z",
      "tags": ["Dobry atak"]
    },
    {
      "id": 1002,
      "set_id": 456,
      "sequence_in_set": 2,
      "scored_by": "opponent",
      "served_by": "player",
      "created_at": "2024-01-15T14:31:30Z",
      "tags": ["Błąd serwisu"]
    }
  ]
}
```

**Struktura:**

- `data` (array) - tablica obiektów PointWithTagsDto
  - `id` (number) - ID punktu
  - `set_id` (number) - ID seta
  - `sequence_in_set` (number) - numer punktu w secie (1, 2, 3...)
  - `scored_by` (SideEnum) - kto zdobył punkt: "player" lub "opponent"
  - `served_by` (SideEnum) - kto serwował: "player" lub "opponent"
  - `created_at` (string, ISO 8601) - timestamp utworzenia punktu
  - `tags` (string[]) - tablica nazw tagów opisujących punkt

### Error Responses

#### 401 Unauthorized

Obsługiwane przez middleware - brak lub nieprawidłowy token JWT.

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid authentication token"
  }
}
```

#### 404 Not Found

Set nie istnieje LUB użytkownik nie jest właścicielem (information disclosure prevention).

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Set not found"
  }
}
```

#### 422 Unprocessable Entity

Nieprawidłowy format parametrów (setId nie jest liczbą, include ma złą wartość).

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "setId",
        "message": "ID must be a positive integer"
      }
    ]
  }
}
```

#### 500 Internal Server Error

Błąd serwera lub bazy danych.

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## 5. Przepływ danych

### Szczegółowy przepływ:

1. **Request validation:**
   - Walidacja `setId` (path param) przez `idParamSchema`
   - Walidacja `include` (query param) przez `pointsIncludeQuerySchema`
   - Jeśli błąd walidacji → 422 z details

2. **Authorization check:**
   - Pobranie `userId` z `context.locals.user.id` (middleware)
   - Jeśli brak user → 401 (obsługiwane przez middleware)

3. **Service call:**
   - Wywołanie `getPointsBySetId(supabase, userId, setId)` z Point Service
   - Service weryfikuje ownership i pobiera punkty z tagami
   - Szczegóły implementacji: patrz shared-implementation-plan.md (Point Service)

4. **Response formatting:**
   - Jeśli service zwrócił null → 404 Not Found
   - Jeśli service zwrócił dane → `createListResponse(points, 200)`

5. **Error handling:**
   - Try-catch w endpoint handler
   - Obsługa błędów przez shared utilities (api-response, logger)
   - Szczegóły: patrz shared-implementation-plan.md

### Diagram przepływu:

```
Client Request
    ↓
Astro Endpoint Handler (/api/sets/[setId]/points.ts)
    ↓
Validate Path Param (setId) ← idParamSchema
    ↓
Validate Query Param (include) ← pointsIncludeQuerySchema
    ↓ (valid)
Get userId from context.locals.user
    ↓
point.service.getPointsBySetId(supabase, userId, setId)
    ↓
    ├─→ Verify set ownership (SELECT sets WHERE id & user_id)
    │   ├─→ null → return null
    │   └─→ found → continue
    ↓
    └─→ Get points with tags (via getPointsBySetIds)
        └─→ SELECT points + JOIN point_tags + JOIN tags
            └─→ WHERE set_id IN ([setId]) AND user_id
                └─→ ORDER BY sequence_in_set ASC
    ↓
Service returns PointWithTagsDto[] | null
    ↓
    ├─→ null → createNotFoundResponse("Set not found")
    └─→ data → createListResponse(points, 200)
    ↓
Response to Client
```

### Optymalizacja:

**Database queries:** Maksymalnie 2 (weryfikacja ownership + pobranie punktów z tagami)

**Problem N+1 unikany** przez wykorzystanie istniejącej funkcji z set.service.ts (szczegóły w shared-implementation-plan.md)

## 6. Względy bezpieczeństwa

### Autoryzacja

- Middleware weryfikuje JWT token (401)
- Service weryfikuje ownership seta przez `user_id` w query

### Information Disclosure Prevention

- Return 404 dla both "not found" i "no access" (generyczne "Set not found")

### SQL Injection & XSS Protection

- Supabase client używa prepared statements
- Walidacja parametrów przez Zod
- Frontend odpowiedzialny za escapowanie danych przy renderowaniu

## 7. Obsługa błędów

### Hierarchia obsługi błędów:

1. **Validation errors (422):**
   - Źródło: Zod validation
   - Handler: `createValidationErrorResponse(zodError)`
   - Przykłady:
     - setId nie jest liczbą
     - setId jest ujemny lub zero
     - include ma nieprawidłową wartość

2. **Authorization errors (401):**
   - Źródło: Middleware
   - Handler: Middleware automatycznie zwraca 401
   - Nie wymaga obsługi w endpoint handler

3. **Not Found errors (404):**
   - Źródło: Service zwraca null
   - Handler: `createNotFoundResponse("Set not found")`
   - Przypadki:
     - Set nie istnieje
     - Set należy do innego użytkownika

4. **Database errors (500):**
   - Źródło: DatabaseError z service
   - Handler: `createInternalErrorResponse()`
   - Logowanie: `logError(endpoint, error, context)`

5. **Unexpected errors (500):**
   - Źródło: Catch-all w try-catch
   - Handler: `createInternalErrorResponse()`
   - Logowanie: `logError(endpoint, error, context)`

### Struktura error handling w endpoint:

```typescript
try {
  // Validation
  const { id: setId } = validatePathParam(context.params, idParamSchema);
  const { include } = validateQueryParams(context.url.searchParams, pointsIncludeQuerySchema);

  // Authorization
  const userId = context.locals.user.id;

  // Service call
  const points = await getPointsBySetId(supabase, userId, setId);

  // Not found
  if (!points) {
    return createNotFoundResponse("Set not found");
  }

  // Success
  return createListResponse(points, 200);
} catch (error) {
  if (error instanceof ZodError) {
    return createValidationErrorResponse(error);
  }

  if (error instanceof DatabaseError) {
    logError("GET /api/sets/{setId}/points", error, { userId, setId });
    return createInternalErrorResponse();
  }

  // Unexpected error
  logError("GET /api/sets/{setId}/points", error as Error, { userId, setId });
  return createInternalErrorResponse();
}
```

## 8. Wydajność

### Optymalizacje zaimplementowane:

1. **Unikanie N+1 problem:**
   - Wykorzystanie funkcji `getPointsBySetIds` która wykonuje JOIN w jednym query
   - Zamiast: 1 query (points) + N queries (tags per point)
   - Jest: 1 query (points + tags via JOIN)

2. **Indeksy bazodanowe:**
   - Wymagany indeks na `points.set_id` (dla szybkiego filtrowania)
   - Wymagany indeks na `points.user_id` (dla autoryzacji)
   - Wymagany indeks kompozytowy: `(set_id, user_id)` (optymalizacja)
   - Wymagany indeks na `point_tags.point_id` (dla JOIN)

3. **Query optimization:**
   - SELECT tylko potrzebne kolumny (nie `SELECT *` w produkcji)
   - Limit 1 dla weryfikacji ownership seta
   - ORDER BY na indeksowanej kolumnie (`sequence_in_set`)

### Liczba database queries:

**Scenariusz standardowy (set istnieje, ma punkty):**

- 1 query: weryfikacja ownership seta
- 1 query: pobranie punktów z tagami
- **Razem: 2 queries**

**Scenariusz: set nie istnieje lub brak dostępu:**

- 1 query: weryfikacja ownership seta (zwraca null)
- **Razem: 1 query**

### Przewidywany czas odpowiedzi:

- **Set z 0-50 punktami:** < 100ms
- **Set z 50-100 punktami:** < 200ms
- **Set z 100+ punktami:** < 300ms

(Założenia: indeksy utworzone, normalne obciążenie bazy)

### Potencjalne wąskie gardła:

1. **Duża liczba punktów w secie:**
   - Teoretycznie set może mieć 100+ punktów (długi tie-break)
   - Rozwiązanie: paginacja (poza zakresem MVP)

2. **Duża liczba tagów na punkt:**
   - Każdy punkt może mieć wiele tagów (tabela point_tags)
   - JOIN zwiększa ilość danych do przesłania
   - Rozwiązanie: agregacja tagów w bazie (już zaimplementowana)

3. **Brak cache:**
   - Każde żądanie trafia do bazy
   - Rozwiązanie: cache Redis (poza zakresem MVP)

## 9. Etapy wdrożenia

### Krok 1: Utworzenie schematu walidacji

**Lokalizacja:** `src/lib/schemas/point.schemas.ts`

**Zadania:**

- Zaimplementować schemat `pointsIncludeQuerySchema` zgodnie z shared-implementation-plan.md (Point Schemas)

**Weryfikacja:**

- Schemat poprawnie waliduje `include="tags"` i `include=undefined`
- Schemat odrzuca nieprawidłowe wartości

---

### Krok 2: Implementacja service

**Lokalizacja:** `src/lib/services/point.service.ts`

**Zadania:**

- Zaimplementować funkcję `getPointsBySetId` zgodnie z shared-implementation-plan.md (Point Service)
- Funkcja wykorzystuje istniejącą `getPointsBySetIds` z set.service.ts

**Weryfikacja:**

- TypeScript kompiluje się bez błędów
- Funkcja poprawnie weryfikuje ownership
- Maksymalnie 2 database queries

---

### Krok 3: Utworzenie pliku endpointa

**Lokalizacja:** `src/pages/api/sets/[setId]/points.ts`

**Zadania:**

- Utworzyć strukturę katalogów `src/pages/api/sets/[setId]/` (jeśli nie istnieje)
- Utworzyć plik `points.ts`

**Zadania:**

- Utworzyć plik z importami shared utilities i services
- Dodać `export const prerender = false`
- Przygotować strukturę GET handler

**Weryfikacja:**

- Importy działają
- TypeScript kompiluje się bez błędów

---

### Krok 4: Implementacja endpoint handler

**Lokalizacja:** `src/pages/api/sets/[setId]/points.ts`

**Zadania:**

1. **Walidacja parametrów:**
   - Path param (setId) - użycie `idParamSchema` z common.schemas
   - Query param (include) - użycie `pointsIncludeQuerySchema` z point.schemas
   - Wykorzystanie funkcji z zod-helpers

2. **Authorization:**
   - Pobranie userId z `context.locals.user.id`

3. **Service call:**
   - Wywołanie `getPointsBySetId(supabase, userId, setId)`
   - Obsługa return null → 404 Not Found

4. **Success response:**
   - Użycie `createListResponse(points, 200)` z api-response

5. **Error handling:**
   - ZodError → ValidationError (422)
   - DatabaseError → Internal Error (500)
   - Inne błędy → Internal Error (500)
   - Logowanie przez `logError` z logger

**Weryfikacja:**

- Wszystkie ścieżki kodu obsłużone
- Error handling kompletny
- Linter bez ostrzeżeń

---

### Krok 5: Weryfikacja zgodności

**Zadania:**

1. **Linter i TypeScript check:**

   ```bash
   npm run lint
   npx tsc --noEmit
   ```

2. **Code review checklist:**
   - [ ] Error handling kompletny
   - [ ] Security best practices zastosowane
   - [ ] Performance optymalizacje wykorzystane
   - [ ] Code quality zgodny z guidelines
   - [ ] Zgodność ze specyfikacją API

---

### Krok 6: Dokumentacja (opcjonalnie)

**Zadania:**

- Dodanie komentarzy JSDoc w service
- Aktualizacja dokumentacji API (jeśli istnieje)

---

## 10. Checklist implementacji

### Przygotowanie

- [ ] Przeczytano i zrozumiano specyfikację API
- [ ] Przeczytano shared-implementation-plan.md
- [ ] Zweryfikowano dostępność shared components

### Implementacja

- [ ] Utworzono schemat walidacji `pointsIncludeQuerySchema`
- [ ] Zaimplementowano `getPointsBySetId` w point.service.ts
- [ ] Utworzono plik endpointa `/api/sets/[setId]/points.ts`
- [ ] Zaimplementowano GET handler z pełną walidacją
- [ ] Dodano obsługę wszystkich błędów
- [ ] Dodano logowanie błędów

### Jakość kodu

- [ ] TypeScript kompiluje się bez błędów
- [ ] Linter nie zgłasza ostrzeżeń
- [ ] Kod zgodny z coding guidelines
- [ ] Error handling jest kompletny
- [ ] Security best practices zastosowane

### Finalizacja

- [ ] Dodano komentarze JSDoc
- [ ] Zaktualizowano dokumentację (jeśli dotyczy)
- [ ] Code review wykonany

---

## 11. Uwagi końcowe

### Integracja z istniejącym kodem

Endpoint wykorzystuje shared components z shared-implementation-plan.md:

- API Response Utilities
- API Error Utilities
- Zod Helper Utilities
- Logger Utility
- Common Schemas (idParamSchema)
- Point Service (getPointsBySetId)
- Point Schemas (pointsIncludeQuerySchema)

### Założenia biznesowe

1. **Tagi zawsze ładowane:**
   - Parametr `include=tags` jest opcjonalny w API spec
   - W implementacji tagi są zawsze ładowane (uproszczenie logiki)
   - Frontend może zignorować tagi jeśli nie są potrzebne

2. **Information disclosure prevention:**
   - Return 404 dla both "not found" i "no access"
   - Nie ujawniamy czy set istnieje, ale należy do innego użytkownika

3. **Sortowanie:**
   - Punkty zawsze posortowane według `sequence_in_set ASC`
   - Brak możliwości zmiany sortowania w MVP

---

**Autor:** AI Assistant  
**Data utworzenia:** 2025-12-06  
**Wersja:** 1.0  
**Status:** Gotowy do implementacji
