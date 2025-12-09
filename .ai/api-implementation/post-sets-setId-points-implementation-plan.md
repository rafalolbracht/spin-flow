# API Endpoint Implementation Plan: POST /api/sets/{setId}/points

## 1. Przegląd punktu końcowego

### Cel

Dodanie punktu do aktywnego seta z automatycznym obliczaniem serwującego według zasad tenisa stołowego, aktualizacją wyniku seta i opcjonalnym przypisaniem tagów.

### Funkcjonalność

- Walidacja że set i mecz rodzica są aktywne (nie zakończone)
- Automatyczne obliczanie `sequence_in_set` (ostatni + 1)
- Określanie `served_by` według zasad serwowania:
  - Normalny set: co 2 punkty (wyjątek: po 10:10 co 1 punkt)
  - Golden set: co 1 punkt przez cały set
- Tworzenie rekordu punktu z transakcyjnością
- Opcjonalne przypisanie tagów do punktu
- Aktualizacja wyniku seta (`set_score_player` lub `set_score_opponent`)
- Obliczanie `current_server` dla następnego punktu
- Zwracanie danych punktu + aktualnego stanu seta

---

## 2. Szczegóły żądania

### Metoda HTTP

POST

### Struktura URL

```
POST /api/sets/{setId}/points
```

### Parametry

**Path Parameters:**

- `setId` (integer, required) - ID seta, walidowany przez schema z `common.schemas.ts`

**Request Headers:**

```
Authorization: Bearer {supabase_jwt_token}
Content-Type: application/json
```

**Request Body:**

Struktura zgodna z `CreatePointCommandDto` z `types.ts`:

```json
{
  "scored_by": "player",
  "tag_ids": [5, 12]
}
```

**Validation Schema:**

Schema `createPointCommandSchema` z `point.schemas.ts` (zdefiniowany w shared-implementation-plan.md):

- `scored_by` (required): enum "player" | "opponent"
- `tag_ids` (optional): array of positive integers

---

## 3. Wykorzystywane typy

### Command Model

- `CreatePointCommandDto` z `types.ts`

### Response DTOs

- `CreatePointDto` - extends PointWithTagsDto + set_state
- `PointWithTagsDto` - Point bez user_id + tags: string[]
- `SetStateDto` - stan seta po operacji

### Response Type

- `CreatePointResponse` = SingleItemResponseDto<CreatePointDto>

---

## 4. Szczegóły odpowiedzi

### Response 201 Created

Struktura zgodna z `CreatePointResponse`:

```json
{
  "data": {
    "id": 1003,
    "set_id": 456,
    "sequence_in_set": 3,
    "scored_by": "player",
    "served_by": "player",
    "created_at": "2024-01-15T14:32:00Z",
    "tags": ["Dobry atak", "Forehand winner"],
    "set_state": {
      "id": 456,
      "set_score_player": 8,
      "set_score_opponent": 5,
      "current_server": "opponent"
    }
  }
}
```

### Kody statusu

- **201 Created** - Punkt utworzony pomyślnie
- **401 Unauthorized** - Brak/nieprawidłowy token autentykacji
- **403 Forbidden** - Set nie należy do użytkownika
- **404 Not Found** - Set nie znaleziony
- **422 Unprocessable Entity** - Błędy walidacji biznesowej:
  - Mecz rodzica już zakończony
  - Set już zakończony
  - Nieprawidłowe tag_ids (nie istnieją w bazie)
- **500 Internal Server Error** - Błąd serwera/bazy danych

---

## 5. Przepływ danych

### Krok 1: Walidacja żądania (Endpoint Layer)

1. **Autoryzacja:**
   - Ekstrakcja userId z `context.locals.supabase`
   - Guard clause: return 401 jeśli brak

2. **Walidacja path param:**
   - Parsowanie setId z `context.params.setId`
   - Walidacja przez schema z `common.schemas.ts`
   - Return 422 jeśli nieprawidłowy format

3. **Walidacja body:**
   - Parsowanie i walidacja przez `createPointCommandSchema`
   - Wykorzystać `parseRequestBody()` z `zod-helpers.ts`
   - Return 422 jeśli nieprawidłowe dane

### Krok 2: Utworzenie punktu (Service Layer)

Wywołanie metody `createPoint()` z `point.service.ts`:

```typescript
const result = await createPoint(supabase, userId, setId, command.scored_by, command.tag_ids || []);
```

**Logika biznesowa:**

Funkcja `createPoint()` implementuje pełny przepływ zgodnie z planem w `shared-implementation-plan.md`:

- Weryfikację istnienia seta i meczu
- Walidację biznesową (status meczu i seta)
- Walidację tagów (jeśli podane)
- Obliczenie sequence_in_set i served_by (zasady serwowania)
- INSERT punktu i point_tags (transakcyjnie)
- UPDATE wyniku seta
- Obliczenie current_server dla następnego punktu
- Konstrukcję response DTO

**Liczba queries:** 7-9 (w zależności od obecności tagów)

**Error handling:**

- NotFoundError: set nie istnieje
- ApiError (422): walidacja biznesowa nie przeszła
- DatabaseError: błędy operacji bazodanowych

### Krok 3: Zwrócenie odpowiedzi (Endpoint Layer)

- Wykorzystanie `createSuccessResponse()` z `api-response.ts`
- Status: 201 Created
- Body: `CreatePointResponse` = SingleItemResponseDto<CreatePointDto>

---

## 6. Logika zasad serwowania

### Zasady ogólne

**Normalny set (do 10:10):**

- Serwis zmienia się co 2 punkty
- Pierwszy serwer w secie zależy od sequence seta (nieparzyste vs parzyste)

**Normalny set (po 10:10 - deuce):**

- Serwis zmienia się co 1 punkt

**Golden set:**

- Serwis zmienia się co 1 punkt przez cały set

### Implementacja

Pełna logika zasad serwowania jest zaimplementowana w funkcjach pomocniczych w `point.service.ts` zgodnie z planem w `shared-implementation-plan.md`:

- `calculateServedBy()` - określa kto serwuje OBECNY punkt
- `determineCurrentServer()` - określa kto będzie serwował NASTĘPNY punkt
- `determineFirstServerForSet()` - określa pierwszego serwera w secie
- `opposite()` - zwraca przeciwną stronę

**Uwaga:** current_server w SetStateDto to serwer NASTĘPNEGO punktu, nie obecnego.

---

## 7. Względy bezpieczeństwa

### Autoryzacja

- **Poziom middleware:**
  - Middleware Astro weryfikuje JWT token
  - Ustawia `context.locals.supabase` z user context

- **Poziom endpoint:**
  - Sprawdzenie czy userId istnieje w context.locals
  - Guard clause na początku funkcji

- **Poziom service:**
  - Każde query zawiera warunek `user_id = {userId}`
  - Weryfikacja ownership poprzez `getSetById()` z `set.service.ts`
  - Return null dla "not found" + "no access" (information disclosure prevention)

### Walidacja danych wejściowych

- **Path param:**
  - Walidacja przez `idParamSchema` (positive integer)
  - Zabezpieczenie przed SQL injection (Supabase parametryzuje queries)

- **Body:**
  - Walidacja przez `createPointCommandSchema`
  - scored_by: strict enum validation
  - tag_ids: array of positive integers

- **Tag IDs:**
  - Weryfikacja istnienia w bazie przed INSERT
  - Zapobieganie foreign key violation
  - User-friendly error message z brakującymi IDs

### Rate Limiting

- Poza scope implementacji endpointa
- Obsługiwane na poziomie systemu (Cloudflare, API Gateway)

### SQL Injection

- Zabezpieczenie przez Supabase (parametryzowane queries)
- Brak string concatenation w queries

---

## 8. Obsługa błędów

### Błędy autentykacji (401)

**Scenariusz:**

- Brak tokenu w header Authorization
- Token nieprawidłowy lub wygasły

**Obsługa:**

- Middleware zwraca 401 automatycznie
- Endpoint sprawdza `context.locals.supabase` na początku
- Wykorzystać `createUnauthorizedResponse()` z `api-response.ts`

**Response:**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid authentication token"
  }
}
```

---

### Błędy autoryzacji (403)

**Scenariusz:**

- Set należy do innego użytkownika
- User próbuje manipulować cudzymi danymi

**Obsługa:**

- `getSetById()` zwraca null jeśli user_id nie pasuje
- Endpoint traktuje jako 404 (information disclosure prevention)
- Faktyczny 403 nie jest zwracany (security best practice)

---

### Nie znaleziono zasobu (404)

**Scenariusz:**

- Set o podanym ID nie istnieje
- Set istnieje ale nie należy do użytkownika (maskowane jako 404)

**Obsługa:**

- `getSetById()` zwraca null
- Endpoint wykorzystuje `createNotFoundResponse()` z `api-response.ts`

**Response:**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Set not found"
  }
}
```

---

### Błędy walidacji biznesowej (422)

#### Scenariusz 1: Mecz już zakończony

**Walidacja:**

- `match.status === 'finished'`

**Response:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Cannot add point: match is already finished"
  }
}
```

#### Scenariusz 2: Set już zakończony

**Walidacja:**

- `set.is_finished === true`

**Response:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Cannot add point: set is already finished"
  }
}
```

#### Scenariusz 3: Nieprawidłowe tag IDs

**Walidacja:**

- Query `SELECT id FROM tags WHERE id IN ({tag_ids})`
- Porównanie zwróconych IDs z podanymi

**Response:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid tag IDs: 999, 1000"
  }
}
```

#### Scenariusz 4: Nieprawidłowy scored_by

**Walidacja:**

- Schema Zod automatycznie

**Response:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "scored_by",
        "message": "Must be 'player' or 'opponent'"
      }
    ]
  }
}
```

**Obsługa:**

- Wykorzystać `ApiError` z `api-errors.ts`
- Throw ApiError('VALIDATION_ERROR', message, 422)
- Catch w endpoint handler i convert do response

---

### Błędy serwera (500)

**Scenariusz:**

- Błąd połączenia z bazą danych
- Timeout query
- Nieoczekiwany błąd w service layer

**Obsługa:**

- Try-catch w endpoint handler
- Catch wszystkich błędów (DatabaseError, innych)
- Logowanie przez `logError()` z `logger.ts`
- Wykorzystać `createInternalErrorResponse()` z `api-response.ts`

**Response:**

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

**Logging:**

```typescript
logError("POST /api/sets/{setId}/points", error, {
  userId,
  setId,
  body: command,
});
```

---

## 9. Wydajność

### Optymalizacje

**Liczba queries:** 7-9 (w zależności od obecności tagów)

Szczegółowy breakdown implementacji w `point.service.ts` zgodnie z shared-implementation-plan.md:

- Weryfikacja zasobów: 2 queries (set + match)
- Walidacja tagów: 1 query (jeśli tagi)
- Obliczenia: 1 query (MAX + COUNT może być połączone)
- INSERT operacje: 2 queries (point + point_tags bulk)
- UPDATE seta: 1 query
- Pobranie nazw tagów: 1 query (jeśli tagi)

**Bulk operations:**

- INSERT point_tags jako bulk (jedno zapytanie dla wszystkich tagów)

### Wąskie gardła

1. **Duża liczba tagów:**
   - Mitygacja: walidacja na froncie (max 5-10 tagów)

2. **Częste dodawanie punktów:**
   - Monitoring: response time < 200ms
   - Row-level locking na UPDATE seta (krótkie transakcje)

---

## 10. Kroki implementacji

### Etap 1: Przygotowanie schematów walidacji

**Plik:** `src/lib/schemas/point.schemas.ts`

Dodanie schema `createPointCommandSchema` zgodnie z planem w shared-implementation-plan.md.

**Czas:** 15 minut

---

### Etap 2: Implementacja funkcji service

**Plik:** `src/lib/services/point.service.ts`

Implementacja zgodnie z planem w `shared-implementation-plan.md`:

1. **Funkcje pomocnicze (helpers):**
   - `opposite()` - zwraca przeciwną stronę
   - `determineFirstServerForSet()` - pierwszy serwer w secie
   - `calculateServedBy()` - kto serwuje obecny punkt (zasady serwowania)
   - `determineCurrentServer()` - kto będzie serwował następny punkt

2. **Funkcja główna `createPoint()`:**
   - Walidacja zasobów (set, mecz)
   - Walidacja biznesowa (status, tagi)
   - Obliczenie sequence i served_by
   - INSERT punktu i tagów (transakcyjnie)
   - UPDATE wyniku seta
   - Konstrukcja response DTO

3. **Error handling:**
   - NotFoundError, ApiError, DatabaseError
   - Logowanie błędów

**Czas:** 2-3 godziny

---

### Etap 3: Implementacja endpoint handler

**Plik:** `src/pages/api/sets/[setId]/points/index.ts`

**Struktura:**

- Export `prerender = false`
- Import utilities z `api-response.ts`, `api-errors.ts`, `zod-helpers.ts`
- Import schemas z `common.schemas.ts`, `point.schemas.ts`
- Import service z `point.service.ts`
- Funkcja POST handler

**Implementacja:**

1. Autoryzacja (userId z context.locals)
2. Walidacja path param (setId przez idParamSchema)
3. Walidacja body (przez createPointCommandSchema z parseRequestBody)
4. Wywołanie createPoint() z point.service
5. Error handling (NotFoundError → 404, ApiError → 422, DatabaseError → 500)
6. Zwrócenie response 201 (przez createSuccessResponse)

**Czas:** 1 godzina

---

### Etap 4: Code review i refactoring

1. **Przegląd kodu:**
   - Zgodność z coding guidelines
   - Sprawdzenie error handling
   - Weryfikacja typowania
   - Optymalizacja queries

2. **Refactoring:**
   - Wydzielenie powtarzalnych fragmentów
   - Poprawa nazewnictwa
   - Dodanie komentarzy do skomplikowanej logiki

3. **Dokumentacja:**
   - JSDoc dla funkcji publicznych
   - Komentarze wyjaśniające zasady serwowania

**Czas:** 30 minut

---

## 11. Podsumowanie

### Nowe komponenty

**Schematy:**

- `createPointCommandSchema` w `point.schemas.ts` (dodane do shared-implementation-plan.md)

**Service:**

- `createPoint()` - główna logika w `point.service.ts` (dodane do shared-implementation-plan.md)
- Helper functions: `calculateServedBy()`, `determineCurrentServer()`, etc. (dodane do shared-implementation-plan.md)

**Endpoint:**

- Handler POST w `src/pages/api/sets/[setId]/points/index.ts`

### Wykorzystywane shared components

Z `shared-implementation-plan.md`:

- API utilities: `api-response.ts`, `api-errors.ts`, `zod-helpers.ts`
- Schemas: `common.schemas.ts`, `point.schemas.ts`
- Services: `set.service.ts`, `point.service.ts`
- Types: wszystkie DTOs z `types.ts`

### Całkowity czas implementacji

**Szacowany:** 3-4 godziny

- Schematy: 15 min
- Service functions: 2-3h
- Endpoint handler: 1h
- Code review: 30 min

---

**Autor:** AI Assistant  
**Data:** 2025-12-07  
**Wersja:** 1.1  
**Ostatnia aktualizacja:** 2025-12-07 (uproszczenie, usunięcie duplikatów z shared-implementation-plan.md)
