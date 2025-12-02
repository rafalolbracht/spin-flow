# API Endpoint Implementation Plan: GET /api/matches/{id}

## 1. Przegląd punktu końcowego

Endpoint GET /api/matches/{id} służy do pobierania szczegółowych informacji o konkretnym meczu należącym do uwierzytelnionego użytkownika. Endpoint obsługuje opcjonalny parametr `include`, który pozwala na ładowanie powiązanych zasobów (sety, punkty, tagi, raport AI) w jednym żądaniu, co eliminuje potrzebę wielu roundtripów do API.

### Kluczowe cechy:

- Pobiera pojedynczy mecz po ID
- Wspiera lazy loading powiązanych zasobów przez parametr `include`
- Automatycznie dołącza `current_set` dla meczów w trakcie (`status=in_progress`)
- Zwraca `current_set: null` dla meczów zakończonych (`status=finished`)
- Weryfikuje własność zasobu (user_id) - zapewnienie bezpieczeństwa na poziomie aplikacji
- Wykorzystuje RLS na poziomie bazy danych jako dodatkową warstwę bezpieczeństwa

---

## 2. Szczegóły żądania

### Metoda HTTP

`GET`

### Struktura URL

```
/api/matches/{id}
```

### Path Parameters

| Parametr | Typ     | Wymagany | Opis              | Walidacja              |
| -------- | ------- | -------- | ----------------- | ---------------------- |
| `id`     | integer | Tak      | Unikalny ID meczu | Positive integer (> 0) |

### Query Parameters

| Parametr  | Typ    | Wymagany | Opis                                           | Walidacja                                                                   |
| --------- | ------ | -------- | ---------------------------------------------- | --------------------------------------------------------------------------- |
| `include` | string | Nie      | Lista powiązanych zasobów do załadowania (CSV) | Dozwolone wartości: `sets`, `points`, `tags`, `ai_report` (comma-separated) |

#### Logika zależności dla parametru `include`:

- `sets` - samodzielny, ładuje tablicę setów bez punktów
- `points` - automatycznie włącza `sets`, ładuje punkty dla każdego seta
- `tags` - automatycznie włącza `points` i `sets`, ładuje tagi dla każdego punktu
- `ai_report` - samodzielny, ładuje raport AI (tylko dla finished matches)

Przykłady:

- `?include=sets` - tylko sety (bez punktów)
- `?include=sets,points` - sety z punktami (bez tagów)
- `?include=sets,points,tags` - sety z punktami i tagami
- `?include=ai_report` - tylko raport AI (bez setów)
- `?include=sets,points,tags,ai_report` - wszystko

### Request Headers

```http
Authorization: Bearer {supabase_jwt_token}
```

### Request Body

Brak (metoda GET).

---

## 3. Wykorzystywane typy

### Typy z `src/types.ts`:

#### Response Type

- **`MatchDetailResponse`** - Zobacz definicję w `src/types.ts`
  - Typ wrapperowy: `SingleItemResponseDto<MatchDetailDto>`

#### DTO Types

- **`MatchDetailDto`** - Zobacz definicję w `src/types.ts`
- **`CurrentSetDto`** - Zobacz definicję w `src/types.ts`
- **`SetDetailDto`** - Zobacz definicję w `src/types.ts`
- **`PointWithTagsDto`** - Zobacz definicję w `src/types.ts`
- **`AiReportDto`** - Zobacz definicję w `src/types.ts`

#### Query Parameter Types

- **`IncludeQueryDto`** - Zobacz definicję w `src/types.ts`

### Schematy walidacji (z shared components):

- **`idParamSchema`** z `src/lib/schemas/common.schemas.ts` - walidacja path param `id`
- **`includeQuerySchema`** z `src/lib/schemas/match.schemas.ts` - walidacja query param `include`

---

## 4. Szczegóły odpowiedzi

### Success Response (200 OK)

#### Struktura podstawowa (bez include):

```json
{
  "data": {
    "id": 124,
    "player_name": "Jan Kowalski",
    "opponent_name": "Adam Nowak",
    "max_sets": 5,
    "golden_set_enabled": false,
    "first_server_first_set": "player",
    "generate_ai_summary": true,
    "sets_won_player": 2,
    "sets_won_opponent": 1,
    "status": "in_progress",
    "coach_notes": null,
    "started_at": "2024-01-15T14:30:00Z",
    "ended_at": null,
    "created_at": "2024-01-15T14:30:00Z",
    "current_set": {
      "id": 458,
      "sequence_in_match": 4,
      "is_golden": false,
      "set_score_player": 7,
      "set_score_opponent": 5,
      "is_finished": false,
      "current_server": "opponent"
    }
  }
}
```

#### Obsługa `current_set`:

- Dla `status=in_progress`: zawsze dołączany automatycznie (ostatni nieukończony set)
- Dla `status=finished`: zawsze `null`

#### Z parametrem `include=sets`:

- Dodaje pole `sets` jako tablica `SetDetailDto[]`
- Każdy set NIE zawiera pola `points` (chyba że również `include=points`)

#### Z parametrem `include=sets,points`:

- Dodaje pole `sets` jako tablica `SetDetailDto[]`
- Każdy set zawiera pole `points` jako tablica `PointWithTagsDto[]`
- Punkty NIE zawierają szczegółowych informacji o tagach (tylko nazwy)

#### Z parametrem `include=sets,points,tags`:

- Identyczne jak `include=sets,points`
- Tags są już zawarte w `PointWithTagsDto.tags` jako tablica string[]
- Pełne informacje o tagach można pobrać z GET /api/tags

#### Z parametrem `include=ai_report`:

- Dodaje pole `ai_report` jako `AiReportDto | null`
- `null` gdy:
  - Mecz nie jest zakończony (`status=in_progress`)
  - `generate_ai_summary=false`
  - Raport jeszcze nie został wygenerowany
  - Wystąpił błąd generowania (`ai_status=error`)

### Kody statusu odpowiedzi:

| Status | Opis                  | Przypadek użycia                                 |
| ------ | --------------------- | ------------------------------------------------ |
| 200    | OK                    | Mecz znaleziony i zwrócony                       |
| 401    | Unauthorized          | Brak lub nieprawidłowy token JWT                 |
| 403    | Forbidden             | Użytkownik nie jest właścicielem meczu           |
| 404    | Not Found             | Mecz o podanym ID nie istnieje                   |
| 422    | Unprocessable Entity  | Nieprawidłowy format parametrów (id lub include) |
| 500    | Internal Server Error | Nieoczekiwany błąd serwera lub bazy danych       |

---

## 5. Przepływ danych

### 5.1. Walidacja i autoryzacja

**UWAGA:** Szczegółowy opis narzędzi walidacji i autoryzacji znajduje się w `shared-implementation-plan.md` (sekcje 1-3).

1. **Walidacja path parameter:**
   - Użycie `idParamSchema` (z `common.schemas.ts`)
   - Zwrot 422 w przypadku błędu walidacji

2. **Walidacja query parameters:**
   - Użycie `includeQuerySchema` (z `match.schemas.ts`)
   - Konwersja `URLSearchParams` przez `searchParamsToObject` (z `zod-helpers.ts`)
   - Zwrot 422 w przypadku błędu walidacji

3. **Autoryzacja:**
   - Pobranie Supabase client z `context.locals.supabase`
   - Wywołanie `supabase.auth.getUser()`
   - Zwrot 401 jeśli brak użytkownika

### 5.2. Pobieranie danych z bazy

**Wywołanie match service:**

- Funkcja `getMatchById` z `src/lib/services/match.service.ts` (szczegółowa implementacja w `shared-implementation-plan.md` sekcja 5.3)
- Parametry: `supabase`, `userId`, `matchId`, `include`
- Zwraca: `MatchDetailDto | null`
- Jeśli `null`: zwrot 404 Not Found

**Logika service obejmuje:**

- Pobranie meczu z weryfikacją własności (user_id)
- Automatyczne ładowanie `current_set` dla meczów in_progress
- Warunkowe ładowanie relacji zgodnie z parametrem `include` (sets, points, tags, ai_report)
- Obsługę zależności między parametrami include (np. points wymaga sets)

### 5.3. Formatowanie odpowiedzi

**UWAGA:** Funkcje response opisane szczegółowo w `shared-implementation-plan.md` (sekcja 1).

- Użycie `createSuccessResponse<MatchDetailDto>(matchDetail, 200)` z `api-response.ts`
- Automatyczne opakowywanie w `{ data: ... }`

### 5.4. Diagram przepływu

```
1. Request → GET /api/matches/124?include=sets,points,tags
           ↓
2. Parse & Validate → idParamSchema + includeQuerySchema
           ↓
3. Auth Check → supabase.auth.getUser() → userId
           ↓
4. Service Call → getMatchById(supabase, userId, 124, "sets,points,tags")
           ↓
        ┌──────────────────────────────────────┐
        │ 4a. SELECT match WHERE id=124        │
        │ 4b. SELECT current_set (if in_prog)  │
        │ 4c. SELECT sets WHERE match_id=124   │
        │ 4d. SELECT points WHERE set_id IN... │
        │ 4e. SELECT tags via point_tags       │
        └──────────────────────────────────────┘
           ↓
5. Map to DTO → MatchDetailDto
           ↓
6. Format Response → createSuccessResponse(dto, 200)
           ↓
7. Return Response → { data: MatchDetailDto }
```

---

## 6. Względy bezpieczeństwa

**UWAGA:** Ogólne zasady bezpieczeństwa opisane w kontekście całego API w dokumentacji projektu. Poniżej aspekty specyficzne dla tego endpointa.

### 6.1. Autoryzacja i weryfikacja własności

- **Filtrowanie po user_id:**
  - W service: `WHERE user_id = {userId}` dla wszystkich query
  - W bazie danych: RLS (Row Level Security) jako dodatkowa warstwa
- **Przypadki naruszenia:**
  - Użytkownik A próbuje pobrać mecz należący do użytkownika B
  - Service zwraca `null` (mecz nie znaleziony dla tego user_id)
  - Endpoint zwraca 404 Not Found (zamiast 403 Forbidden)
  - **Uzasadnienie:** Nie ujawniamy istnienia zasobu należącego do innego użytkownika

### 6.2. Walidacja parametrów

- **Path parameter:** `idParamSchema` (dodatnia liczba całkowita)
- **Query parameter:** `includeQuerySchema` (whitelist: sets, points, tags, ai_report)

### 6.3. Ochrona danych

- Pole `user_id` zawsze usuwane z response (DTO mapping)
- Wrażliwe dane (notatki trenera, raport AI) dostępne tylko właścicielowi

---

## 7. Obsługa błędów

### 7.1. Tabela scenariuszy błędów

| Scenariusz                            | Status | Error Code       | Message                                 | Szczegóły                             |
| ------------------------------------- | ------ | ---------------- | --------------------------------------- | ------------------------------------- |
| Brak tokenu JWT                       | 401    | UNAUTHORIZED     | Missing or invalid authentication token | Middleware może to złapać wcześniej   |
| Nieprawidłowy/expired token           | 401    | UNAUTHORIZED     | Missing or invalid authentication token | `supabase.auth.getUser()` zwraca null |
| Nieprawidłowy format id (np. "abc")   | 422    | VALIDATION_ERROR | Validation failed                       | Zod: "ID must be a positive integer"  |
| Nieprawidłowy id (np. -5, 0)          | 422    | VALIDATION_ERROR | Validation failed                       | Zod: "ID must be a positive integer"  |
| Nieprawidłowy include (np. "invalid") | 422    | VALIDATION_ERROR | Validation failed                       | Zod: "Invalid include format"         |
| Mecz nie istnieje                     | 404    | NOT_FOUND        | Match not found                         | Service zwraca null                   |
| Mecz należy do innego użytkownika     | 404    | NOT_FOUND        | Match not found                         | Nie ujawniamy istnienia zasobu        |
| Błąd połączenia z bazą danych         | 500    | DATABASE_ERROR   | Database operation failed               | Service throw DatabaseError           |
| Nieoczekiwany błąd                    | 500    | INTERNAL_ERROR   | An unexpected error occurred            | Catch-all w głównym try-catch         |

**UWAGA:** Szczegółowe opisy utilities do obsługi błędów (error response functions, error classes, logging) znajdują się w `shared-implementation-plan.md` (sekcje 1-2, 4).

### 7.2. Struktura error handling

Endpoint używa standardowego wzorca try-catch z wykorzystaniem utilities ze shared components:

- Walidacja: `createValidationErrorResponse()` dla błędów Zod
- Autoryzacja: `createUnauthorizedResponse()` gdy brak użytkownika
- Not Found: `createNotFoundResponse()` gdy service zwraca null
- Database errors: `DatabaseError` catch → logowanie → `createErrorResponse()`
- Unexpected errors: catch-all → logowanie → `createInternalErrorResponse()`

**Ważne:** Zwracamy 404 (nie 403) gdy mecz należy do innego użytkownika - nie ujawniamy istnienia zasobów.

---

## 8. Rozważania dotyczące wydajności

### 8.1. N+1 Query Problem

Problem N+1 dla ładowania punktów z wieloma setami jest **automatycznie rozwiązany** w shared components. Szczegółowa implementacja optymalizacji znajduje się w `shared-implementation-plan.md`:

- **Sekcja 5.3** - `getMatchById`
- **Sekcja 6.2** - `getSetsByMatchId`
- **Sekcja 6.5** - `getPointsBySetIds`

**Nie wymaga żadnych dodatkowych akcji** przy implementacji tego endpointa.

### 8.2. Wielkość odpowiedzi

**Problem:**

- Mecz z 5 setami po 20+ punktów każdy = duża odpowiedź JSON
- Z tagami: jeszcze większa
- Z ai_report: dodatkowe KB

**Mitygacja:**

- Lazy loading przez parametr `include` - domyślnie nie ładujemy setów/punktów
- Klient może wybrać tylko potrzebne dane
- Brak potrzeby paginacji (mecz ma zazwyczaj max 7 setów)

**Szacunki wielkości:**

- Bez include: ~300-500 bytes
- Z sets (bez points): ~1-2 KB
- Z sets+points: ~10-50 KB (zależnie od liczby punktów)
- Z ai_report: +5-10 KB

### 8.3. Indeksy bazy danych

**Wymagane indeksy:**

- `matches(id)` - PK, automatyczny index
- `matches(user_id)` - index dla filtrowania (RLS + aplikacja)
- `sets(match_id, user_id)` - composite index dla szybszego ładowania setów
- `points(set_id, user_id)` - composite index dla szybszego ładowania punktów
- `point_tags(point_id)` - index dla ładowania tagów
- `matches_ai_reports(match_id)` - unique constraint, automatyczny index

**UWAGA:** Tworzenie indeksów jest poza zakresem tego planu (zaznaczone w instrukcjach).

### 8.4. Caching

**Możliwości:**

- HTTP caching: `Cache-Control: private, max-age=60` dla finished matches
- Dla `status=in_progress`: `Cache-Control: no-cache` (dane mogą się zmienić)
- Redis/Memcached: opcjonalnie dla często pobieranych meczów

**Implementacja (opcjonalnie):**

```typescript
const headers =
  match.status === "finished" ? { "Cache-Control": "private, max-age=300" } : { "Cache-Control": "no-cache" };
```

**UWAGA:** Na tym etapie nie implementujemy cachingu (nice to have).

### 8.5. Database connection pooling

- Supabase automatycznie zarządza connection poolingiem
- Brak akcji wymaganej po stronie aplikacji
- Cloudflare Pages może mieć limity na ilość jednoczesnych połączeń

### 8.6. Optymalizacja query

**Best practices:**

- Używać `select('*')` tylko gdy potrzebujemy wszystkich kolumn
- Dla include: explicit select tylko potrzebnych pól
- Unikać SELECT \* w produkcji (lepiej wymienić kolumny)

**Przykład optymalizacji:**

```typescript
// Zamiast:
.select('*')

// Lepiej (explicit):
.select('id, player_name, opponent_name, ...')
```

**UWAGA:** Na początek używamy `select('*')` dla prostoty, optymalizacja później.

---

## 9. Etapy implementacji

### Faza 1: Przygotowanie środowiska

**Czas:** 5-10 minut

1. **Weryfikacja shared components:**
   - Upewnić się, że wszystkie shared components są zaimplementowane:
     - `src/lib/utils/api-response.ts`
     - `src/lib/utils/api-errors.ts`
     - `src/lib/utils/zod-helpers.ts`
     - `src/lib/utils/logger.ts`
     - `src/lib/schemas/common.schemas.ts`
     - `src/lib/schemas/match.schemas.ts`
     - `src/lib/services/match.service.ts`
     - `src/lib/services/set.service.ts`
   - Jeśli brakuje któregoś: zaimplementować zgodnie z `shared-implementation-plan.md`

2. **Sprawdzenie struktury katalogów:**
   - Upewnić się, że istnieje katalog `src/pages/api/matches/`
   - Jeśli nie istnieje: utworzyć

### Faza 2: Implementacja endpointa

**Czas:** 30-45 minut

**Lokalizacja:** `src/pages/api/matches/[id].ts`

1. **Utworzenie pliku endpointa:**
   - Utworzyć plik: `src/pages/api/matches/[id].ts`
   - Dodać `export const prerender = false;` (wymagane dla API routes w Astro)

2. **Implementacja importów:**
   - Importy z Astro: `APIRoute`, `APIContext`
   - Importy typów z `src/types.ts`:
     - `MatchDetailDto`
     - `MatchDetailResponse`
   - Importy schematów z `src/lib/schemas/`:
     - `idParamSchema` z `common.schemas.ts`
     - `includeQuerySchema` z `match.schemas.ts`
   - Importy utilities z `src/lib/utils/`:
     - Wszystkie funkcje response z `api-response.ts`
     - Klasy error z `api-errors.ts`
     - `searchParamsToObject` z `zod-helpers.ts`
     - `logError` z `logger.ts`
   - Import service:
     - `getMatchById` z `src/lib/services/match.service.ts`

3. **Implementacja głównej funkcji GET:**
   - Sygnatura: `export const GET: APIRoute = async (context: APIContext): Promise<Response>`
   - Struktura: try-catch block
4. **Walidacja path parameter (wewnątrz try):**
   - Ekstrakcja: `const { id } = context.params`
   - Utworzenie obiektu dla Zod: `{ id }`
   - Parsowanie: `const idResult = idParamSchema.safeParse({ id })`
   - Obsługa błędu:
     ```typescript
     if (!idResult.success) {
       return createValidationErrorResponse(idResult.error);
     }
     ```
   - Ekstrakcja: `const { id: matchId } = idResult.data`

5. **Walidacja query parameters (wewnątrz try):**
   - Ekstrakcja: `const searchParams = context.url.searchParams`
   - Konwersja: `const paramsObject = searchParamsToObject(searchParams)`
   - Parsowanie: `const queryResult = includeQuerySchema.safeParse(paramsObject)`
   - Obsługa błędu:
     ```typescript
     if (!queryResult.success) {
       return createValidationErrorResponse(queryResult.error);
     }
     ```
   - Ekstrakcja: `const { include } = queryResult.data`

6. **Autoryzacja (wewnątrz try):**
   - Pobranie Supabase client: `const supabase = context.locals.supabase`
   - Pobranie user: `const { data: { user } } = await supabase.auth.getUser()`
   - Sprawdzenie:
     ```typescript
     if (!user) {
       return createUnauthorizedResponse();
     }
     ```
   - Ekstrakcja: `const userId = user.id`

7. **Wywołanie service (wewnątrz try):**
   - Wywołanie: `const match = await getMatchById(supabase, userId, matchId, include)`
   - Sprawdzenie rezultatu:
     ```typescript
     if (!match) {
       return createNotFoundResponse("Match not found");
     }
     ```

8. **Formatowanie i zwrócenie odpowiedzi (wewnątrz try):**
   - Wywołanie: `return createSuccessResponse<MatchDetailDto>(match, 200)`

9. **Obsługa błędów (catch block):**
   - Sprawdzenie typu błędu:
     ```typescript
     catch (error) {
       if (error instanceof DatabaseError) {
         logError('GET /api/matches/{id}', error, { userId, matchId });
         return createErrorResponse(error.code, error.message, error.statusCode);
       }

       if (error instanceof ApiError) {
         logError('GET /api/matches/{id}', error, { userId, matchId });
         return createErrorResponse(error.code, error.message, error.statusCode);
       }

       // Catch-all
       logError('GET /api/matches/{id}', error as Error, { userId, matchId });
       return createInternalErrorResponse();
     }
     ```

### Faza 3: Code review i refactoring

**Czas:** 15-20 minut

1. **Weryfikacja TypeScript:**
   - Uruchomienie: `npx tsc --noEmit`
   - Naprawa błędów typowania (jeśli występują)

2. **Weryfikacja linter:**
   - Uruchomienie: `npm run lint`
   - Naprawa błędów i ostrzeżeń

3. **Code review:**
   - Sprawdzenie zgodności z coding guidelines z `.cursor/rules/`
   - Weryfikacja error handling (early returns, guard clauses)
   - Sprawdzenie czy wszystkie typy są poprawne
   - Weryfikacja czy nie ma duplicate code

---

**Autor:** AI Assistant  
**Data:** 2025-12-01  
**Wersja:** 1.0  
**Endpoint:** GET /api/matches/{id}
