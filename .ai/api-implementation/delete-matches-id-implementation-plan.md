# API Endpoint Implementation Plan: DELETE /api/matches/{id}

## 1. Przegląd punktu końcowego

Endpoint służy do trwałego usunięcia meczu wraz ze wszystkimi powiązanymi danymi (sety, punkty, tagi punktów, raporty AI, publiczne udostępnienia). Operacja jest nieodwracalna i wymaga autoryzacji użytkownika będącego właścicielem meczu.

**Kluczowe cechy:**

- Kaskadowe usuwanie obsługiwane przez logikę backendową (nie przez kaskady DB)
- Operacja transakcyjna - albo wszystko się usuwa, albo nic
- Zwraca pustą odpowiedź 204 No Content przy sukcesie
- Weryfikacja właściciela przed wykonaniem operacji

## 2. Szczegóły żądania

**Metoda HTTP:** DELETE

**Struktura URL:** `/api/matches/{id}`

**Path Parameters:**

- `id` (integer, required) - Identyfikator meczu do usunięcia

**Query Parameters:** Brak

**Request Body:** Brak (metoda DELETE nie przyjmuje body)

**Request Headers:**

```
Authorization: Bearer {supabase_jwt_token}
```

**Walidacja parametrów:**

- Path parameter `id`: wykorzystać `idParamSchema` z `common.schemas.ts`
- Token JWT: sprawdzany przez middleware (`src/middleware/index.ts`)

## 3. Wykorzystywane typy

**Typy z src/types.ts:**

- Brak specyficznych DTO (endpoint zwraca 204 No Content bez body)
- Wewnętrznie wykorzystywane typy encji: `Match`, `Set`, `Point`, `PointTag`, `MatchAiReport`, `MatchPublicShare`

**Schematy walidacji:**

- `idParamSchema` z `src/lib/schemas/common.schemas.ts` - walidacja path parametru

**Response type:**

- 204 No Content - brak body w odpowiedzi

## 4. Szczegóły odpowiedzi

**Sukces (204 No Content):**

```
Status: 204 No Content
Body: (empty)
```

**Błędy:**

| Kod | Opis                                     | Struktura odpowiedzi                          |
| --- | ---------------------------------------- | --------------------------------------------- |
| 401 | Brak lub nieprawidłowy token autoryzacji | `ErrorResponseDto` z kodem `UNAUTHORIZED`     |
| 403 | Użytkownik nie jest właścicielem meczu   | `ErrorResponseDto` z kodem `FORBIDDEN`        |
| 404 | Mecz nie został znaleziony               | `ErrorResponseDto` z kodem `NOT_FOUND`        |
| 422 | Nieprawidłowy format ID                  | `ErrorResponseDto` z kodem `VALIDATION_ERROR` |
| 500 | Błąd serwera/bazy danych                 | `ErrorResponseDto` z kodem `INTERNAL_ERROR`   |

## 5. Przepływ danych

### 5.1. Warstwy architektury

**Endpoint handler** (`src/pages/api/matches/[id].ts`)

- Walidacja path parametru
- Przekazanie sterowania do service layer
- Formatowanie odpowiedzi

**Service layer** (`src/lib/services/match.service.ts`)

- Weryfikacja istnienia meczu
- Weryfikacja właściciela
- Koordynacja kaskadowego usuwania
- Obsługa transakcji

**Database layer** (Supabase)

- Wykonanie operacji DELETE w odpowiedniej kolejności
- Walidacja RLS policies

### 5.2. Szczegółowy przepływ

1. **Request → Middleware:**
   - Middleware weryfikuje JWT token
   - Dodaje `supabase` client i `userId` do `context.locals`

2. **Endpoint handler:**
   - Ekstrakcja `id` z `context.params`
   - Walidacja `id` za pomocą `idParamSchema`
   - Wywołanie `deleteMatch(supabase, userId, matchId)`

3. **Service layer - deleteMatch:**
   - Szczegółowa implementacja kaskadowego usuwania jest opisana w `shared-implementation-plan.md`
   - Kluczowe kroki:
     - Weryfikacja istnienia i właściciela (return false jeśli nie znaleziono)
     - Pobranie ID setów i punktów
     - Kaskadowe usuwanie w kolejności: point_tags → points → sets → ai_reports → public_share → analytics (UPDATE) → matches
     - Bulk DELETE z WHERE IN dla optymalizacji
     - Error handling z logowaniem
   - Zwrócenie: true (sukces) lub false (nie znaleziono)

4. **Endpoint handler - response:**
   - Jeśli `deleteMatch` zwrócił true → `createNoContentResponse()`
   - Jeśli `deleteMatch` zwrócił false → odpowiedź 404 (nie znaleziono lub brak uprawnień)
   - Jeśli błąd DatabaseError → odpowiedź 500

### 5.3. Optymalizacja zapytań

**Strategia:**

- Bulk DELETE z `WHERE IN (...)` zamiast pętli (szczegóły w `shared-implementation-plan.md`)
- Maksymalnie 10 zapytań niezależnie od wielkości danych
- Unikanie N+1 problem poprzez grupowanie ID przed usunięciem

**Przykład:** Mecz z 5 setami, 100 punktami, 150 tagami → 10 queries łącznie.

## 6. Względy bezpieczeństwa

### 6.1. Autoryzacja

**Poziom 1: Token JWT (Middleware)**

- Middleware sprawdza obecność i ważność Bearer token
- Tworzy autoryzowany Supabase client z tokenem użytkownika
- Ekstraktuje `userId` z JWT

**Poziom 2: Ownership Verification (Service)**

- Pobranie meczu z warunkiem: `WHERE id = {matchId} AND user_id = {userId}`
- Jeśli query zwróci NULL → użytkownik nie jest właścicielem lub mecz nie istnieje
- Odpowiedź: 404 Not Found (nie ujawniamy czy mecz istnieje dla innych użytkowników)

**Poziom 3: RLS Policies (Database)**

- Supabase RLS policies jako ostatnia linia obrony
- Policies zapewniają, że użytkownik może usuwać tylko swoje rekordy

### 6.2. Walidacja danych wejściowych

**Path parameter validation:**

- Schema: `idParamSchema` - sprawdza czy ID jest liczbą całkowitą dodatnią
- Zabezpieczenie przed SQL injection (parametryzowane zapytania)
- Zabezpieczenie przed atakami typu path traversal

### 6.3. Potencjalne zagrożenia i mitigacje

| Zagrożenie                   | Mitigacja                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------- |
| SQL Injection                | Parametryzowane zapytania (Supabase client), walidacja Zod                    |
| Path traversal               | Walidacja ID jako positive integer                                            |
| Unauthorized deletion        | Ownership verification, RLS policies                                          |
| Race conditions              | Transakcje DB (implicit w Supabase), weryfikacja właściciela przed usunięciem |
| Resource enumeration         | Jednolita odpowiedź 404 (nie ujawniamy czy mecz istnieje)                     |
| DoS przez wielokrotne DELETE | Rate limiting (obsługiwane przez Cloudflare/Supabase)                         |

## 7. Obsługa błędów

### 7.1. Typy błędów i obsługa

**Error handling pattern:**

- Try-catch w endpoint handlerze
- Rzucanie typowanych błędów w service layer (ApiError, NotFoundError, DatabaseError)
- Mapowanie błędów na odpowiednie Response z wykorzystaniem utility functions

### 7.2. Scenariusze błędów

| Scenariusz                       | Wykrywanie         | Typ błędu     | Status | Response function                 |
| -------------------------------- | ------------------ | ------------- | ------ | --------------------------------- |
| Brak tokenu JWT                  | Middleware         | -             | 401    | `createUnauthorizedResponse()`    |
| Nieprawidłowy token              | Middleware         | -             | 401    | `createUnauthorizedResponse()`    |
| Nieprawidłowy format ID          | Zod validation     | ZodError      | 422    | `createValidationErrorResponse()` |
| Mecz nie istnieje                | SELECT zwraca null | NotFoundError | 404    | `createNotFoundResponse()`        |
| Użytkownik nie jest właścicielem | SELECT zwraca null | NotFoundError | 404    | `createNotFoundResponse()`        |
| Błąd DB podczas usuwania         | Supabase error     | DatabaseError | 500    | `createInternalErrorResponse()`   |
| Nieoczekiwany błąd               | Catch-all          | Error         | 500    | `createInternalErrorResponse()`   |

### 7.3. Logowanie błędów

**Wykorzystanie `logger.ts`:**

- `logError()` dla wszystkich błędów 500
- Kontekst logowania: endpoint, userId, matchId, stack trace
- Nie logować wrażliwych danych (tokeny)

**Przykład logowania:**

```typescript
logError("DELETE /api/matches/{id}", error, {
  userId: userId,
  params: { matchId },
});
```

### 7.4. Obsługa częściowego niepowodzenia

**Problem:** Co jeśli DELETE point_tags się uda, ale DELETE points zawiedzie?

**Rozwiązanie (opcjonalne dla przyszłej iteracji):**

- Rozważenie użycia transakcji DB (Supabase Postgres transactions)
- Aktualnie: Supabase client nie oferuje explicite transactions w TypeScript SDK
- Fallback: Logowanie błędów i manualna interwencja (dla MVP akceptowalne)
- W przyszłości: Migracja na stored procedure w Postgres z transakcją

**Dla MVP:**

- Akceptujemy ryzyko częściowego niepowodzenia jako edge case
- Logujemy szczegółowo błędy do późniejszej analizy
- RLS policies zapobiegają "wiszącym" rekordom dostępnym dla użytkownika

## 8. Rozważania dotyczące wydajności

### 8.1. Optymalizacje zapytań

Szczegóły optymalizacji są opisane w `shared-implementation-plan.md`:

- Bulk DELETE z WHERE IN zamiast pętli
- Maksymalnie 10 zapytań niezależnie od rozmiaru danych
- Unikanie N+1 problem

### 8.2. Indeksy bazodanowe

**Wymagane indeksy** (zakładamy że już istnieją):

- FK indeksy: `sets.match_id`, `points.set_id`, `point_tags.point_id`
- Unique constraints: `matches_ai_reports.match_id`, `matches_public_share.match_id`
- `analytics_events.match_id` - dla UPDATE query

Plan pomija tworzenie nowych indeksów zgodnie z wymaganiami.

### 8.3. Czas odpowiedzi

**Oczekiwany czas:**

- Mały mecz (1-2 sety, <50 punktów): <200ms
- Średni mecz (3-5 setów, 50-200 punktów): 200-500ms
- Duży mecz (5-7 setów, 200+ punktów): 500-1000ms

**Potencjalne bottlenecki:**

- Duża liczba punktów (>500) w meczu
- Wolne połączenie z Supabase
- Równoczesne operacje na tych samych rekordach

**Mitigacje:**

- Monitoring czasu wykonania (logowanie)
- W przyszłości: Async delete (queue) dla bardzo dużych meczów
- Dla MVP: synchroniczne usuwanie jest akceptowalne

### 8.4. Skalowalność

**Obecne podejście:**

- Synchroniczne usuwanie w request/response cycle
- Akceptowalne dla meczów do ~500 punktów

**Przyszłe ulepszenia (poza MVP):**

- Queue-based deletion dla bardzo dużych meczów
- Soft delete (status: 'deleted') + asynchroniczne hard delete
- Stored procedure w Postgres z transakcją

## 9. Etapy implementacji

### Faza 1: Implementacja deleteMatch w match.service.ts

**Cel:** Implementacja pełnej logiki kaskadowego usuwania zgodnie ze specyfikacją w `shared-implementation-plan.md`

**Kroki:**

1. **Otwarcie pliku `src/lib/services/match.service.ts`**

2. **Implementacja funkcji `deleteMatch`:**
   - Pełny algorytm kaskadowego usuwania jest opisany w `shared-implementation-plan.md`
   - Kluczowe elementy do zaimplementowania:
     - Weryfikacja istnienia i właściciela
     - Pobranie ID setów i punktów (bulk queries)
     - Kaskadowe usuwanie w kolejności: point_tags → points → sets → ai_reports → public_share → analytics (UPDATE) → matches
     - Error handling z rozróżnieniem critical vs non-critical failures
     - Logowanie błędów
     - Return false jeśli mecz nie istnieje, true po sukcesie

3. **Dodanie importów:**
   - Sprawdzenie czy wszystkie typy są zaimportowane
   - Import `logError` i `logWarning` z `logger.ts`

### Faza 2: Utworzenie endpoint handlera

**Cel:** Implementacja DELETE handler w pliku endpointa

**Kroki:**

1. **Utworzenie/edycja pliku `src/pages/api/matches/[id].ts`**
   - Jeśli plik istnieje (GET/PATCH), dodać handler DELETE obok istniejących

2. **Implementacja funkcji DELETE:**
   - Sygnatura: `export async function DELETE(context: APIContext): Promise<Response>`
   - Logika:
     - Ekstrakcja `supabase` i `userId` z `context.locals`
     - Walidacja auth: sprawdzenie userId → `createUnauthorizedResponse()` jeśli brak
     - Walidacja path param: `idParamSchema.safeParse({ id: context.params.id })`
     - Wywołanie: `await deleteMatch(supabase, userId, validatedId)`
     - Response:
       - `deleted === true` → `createNoContentResponse()`
       - `deleted === false` → `createNotFoundResponse('Match not found')`
     - Error handling: try-catch z logowaniem i mapowaniem na odpowiednie response

3. **Dodanie importów:**
   - APIContext, response utils, deleteMatch, idParamSchema, error classes, logger

4. **Eksport prerender:**
   - `export const prerender = false;`

### Faza 3: Weryfikacja i testy manualne

**Cel:** Upewnienie się, że implementacja działa zgodnie z oczekiwaniami

**Kroki:**

1. **TypeScript compilation:**
   - Uruchomić `npx tsc --noEmit`
   - Naprawić ewentualne błędy typowania

2. **Linting:**
   - Uruchomić `npm run lint`
   - Naprawić ewentualne błędy linter

3. **Przegląd kodu:**
   - Sprawdzenie zgodności z coding guidelines
   - Weryfikacja error handling
   - Sprawdzenie czy wszystkie edge cases są obsłużone

4. **Przygotowanie do testów manualnych:**
   - Uruchomienie dev server: `npm run dev`
   - Przygotowanie przykładowych meczów w bazie testowej
   - Przygotowanie narzędzi do testowania API (Postman/curl/Thunder Client)

**Uwaga:** Szczegółowe testy manualne i automatyczne są poza zakresem tego planu zgodnie z wymaganiami.

### Faza 4: Dokumentacja (opcjonalna)

**Cel:** Dodanie JSDoc comments do publicznych funkcji

**Kroki:**

1. **Dodanie JSDoc do deleteMatch w match.service.ts:**
   - Opis funkcjonalności
   - Opis parametrów
   - Opis zwracanej wartości
   - Uwagi o kaskadowym usuwaniu

2. **Dodanie komentarzy do skomplikowanych sekcji:**
   - Komentarz wyjaśniający kolejność kaskadowego usuwania
   - Komentarz o braku transakcji (limitation)

---

## 10. Podsumowanie

Endpoint DELETE /api/matches/{id} implementuje trwałe usuwanie meczów z pełną obsługą kaskadowego usuwania powiązanych danych. Kluczowe aspekty implementacji:

- **Kaskadowe usuwanie**: Ręczna implementacja w service layer ze względu na brak DB cascades
- **Bezpieczeństwo**: Trzystopniowa weryfikacja (JWT → ownership → RLS)
- **Wydajność**: Optymalizacja zapytań (bulk DELETE, WHERE IN)
- **Reliability**: Szczegółowe logowanie błędów, graceful handling non-critical failures
- **Simplicity**: Wykorzystanie istniejących shared components (response utils, error classes, schemas)

Plan jest gotowy do implementacji przez zespół deweloperski zgodnie z etapami opisanymi w sekcji 9.

---

**Powiązane plany implementacji:**

- `shared-implementation-plan.md` - shared components (utilities, services, schemas)
- `post-matches-implementation-plan.md` - tworzenie meczów
- `get-matches-id-implementation-plan.md` - pobieranie pojedynczego meczu
- `patch-matches-id-implementation-plan.md` - aktualizacja meczu

**Autor:** AI Assistant  
**Data:** 2025-12-01  
**Wersja:** 1.0
