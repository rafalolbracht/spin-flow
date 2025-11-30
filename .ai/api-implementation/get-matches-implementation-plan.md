# API Endpoint Implementation Plan: GET /api/matches

## 1. Przegląd punktu końcowego

Endpoint `GET /api/matches` służy do pobierania spaginowanej listy meczów tenisa stołowego należących do zauwierzytelnionego użytkownika. Umożliwia filtrowanie wyników według nazw graczy, przeciwników i statusu meczu, a także sortowanie według wybranych pól. Endpoint zwraca uproszczone dane meczu bez zagnieżdżonych relacji (bez zestawów czy punktów) w celu optymalizacji wydajności.

**Główne funkcjonalności:**

- Paginacja server-side z konfigurowalnymi parametrami (strona i limit)
- Filtrowanie po nazwie gracza (częściowe dopasowanie)
- Filtrowanie po nazwie przeciwnika (częściowe dopasowanie)
- Filtrowanie po statusie meczu (w trakcie/zakończony)
- Sortowanie według różnych pól (domyślnie: najnowsze mecze najpierw)
- Automatyczna autoryzacja i izolacja danych użytkownika (RLS)

**Strategia paginacji:**
Backend wykonuje server-side pagination i zwraca tylko `total` w obiekcie pagination. Klient zarządza stanem paginacji po swojej stronie (current page, rows per page, obliczanie `total_pages`) i wywołuje backend przy zmianie strony lub liczby elementów.

## 2. Szczegóły żądania

### Metoda HTTP

`GET`

### Struktura URL

```
/api/matches
```

### Parametry żądania

#### Query Parameters (wszystkie opcjonalne):

| Parametr        | Typ     | Domyślna wartość | Walidacja                         | Opis                                                                                                                                            |
| --------------- | ------- | ---------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `page`          | integer | 1                | min: 1                            | Numer strony wyników                                                                                                                            |
| `limit`         | integer | 20               | min: 1, max: 100                  | Liczba elementów na stronę                                                                                                                      |
| `player_name`   | string  | -                | min: 1 znak po trim               | Filtr po nazwie gracza (case-insensitive, częściowe dopasowanie)                                                                                |
| `opponent_name` | string  | -                | min: 1 znak po trim               | Filtr po nazwie przeciwnika (case-insensitive, częściowe dopasowanie)                                                                           |
| `status`        | string  | -                | enum: 'in_progress' \| 'finished' | Filtr po statusie meczu                                                                                                                         |
| `sort`          | string  | `-started_at`    | format: `[-]field_name`           | Pole sortowania. Prefix `-` oznacza sortowanie malejące. Dozwolone pola: `started_at`, `ended_at`, `created_at`, `player_name`, `opponent_name` |

#### Request Headers (wymagane):

```
Authorization: Bearer {supabase_jwt_token}
```

### Request Body

Brak (metoda GET)

## 3. Wykorzystywane typy

### Istniejące typy z `src/types.ts`:

**Typy wejściowe (query parameters):**

- `MatchListQueryDto` - interfejs opisujący query parameters

**Typy wyjściowe (response):**

- `MatchListResponse` - typ odpowiedzi (alias dla `PaginatedResponseDto<MatchListItemDto>`)
- `MatchListItemDto` - pojedynczy element listy meczów
- `PaginationDto` - uproszczone metadane paginacji (zawiera tylko `total`)
- `ErrorResponseDto` - standardowy format błędu
- `ValidationErrorDetail` - szczegóły błędu walidacji

**Enums:**

- `MatchStatusEnum` - status meczu ('in_progress' | 'finished')
- `MATCH_STATUS_VALUES` - stała z wartościami dla Zod (zdefiniowana w `src/types.ts`)

### Nowe typy do stworzenia (lokalne w pliku endpointa):

**Schemat walidacji Zod:**

```typescript
import { MATCH_STATUS_VALUES } from "../../../types";

const MatchListQuerySchema = z.object({
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
```

Typ wewnętrzny dla zwalidowanych parametrów:

```typescript
type ValidatedMatchListQuery = z.infer<typeof MatchListQuerySchema>;
```

Typ dla parametrów sortowania (wewnętrzny):

```typescript
interface SortParams {
  column: string;
  ascending: boolean;
}
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)

**Content-Type:** `application/json`

**Struktura odpowiedzi:**

```json
{
  "data": [
    {
      "id": 123,
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
      "created_at": "2024-01-15T14:25:00Z"
    }
  ],
  "pagination": {
    "total": 45
  }
}
```

**Opis pól:**

- `data` - tablica obiektów `MatchListItemDto` dla aktualnej strony (bez pola `user_id` i bez zagnieżdżonych relacji)
- `pagination.total` - całkowita liczba meczów spełniających kryteria filtrowania

### Błędy

#### 400 Bad Request

Nieprawidłowe parametry zapytania

**Przykład:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameters",
    "details": [
      {
        "field": "page",
        "message": "Number must be greater than or equal to 1"
      },
      {
        "field": "limit",
        "message": "Number must be less than or equal to 100"
      },
      {
        "field": "status",
        "message": "Invalid enum value. Expected 'in_progress' | 'finished', received 'running'"
      }
    ]
  }
}
```

#### 401 Unauthorized

Brak lub nieprawidłowy token uwierzytelniający

**Przykład:**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid authentication token"
  }
}
```

#### 500 Internal Server Error

Błąd serwera

**Przykład:**

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## 5. Przepływ danych

### Przepływ wysokiego poziomu:

```
1. Client → Request (GET /api/matches?page=1&limit=20&status=in_progress)
2. Astro Middleware → Weryfikacja tokenu JWT (automatyczna przez Supabase)
3. API Route Handler → Walidacja query parameters (Zod)
4. API Route Handler → Ekstrakcja user_id z context.locals.supabase.auth.getUser()
5. MatchService → Wywołanie getMatchesPaginated(userId, validatedQuery)
6. MatchService → Budowanie query Supabase:
   - Filtrowanie po user_id (automatyczne przez RLS lub explicit)
   - Filtrowanie po player_name (ILIKE)
   - Filtrowanie po opponent_name (ILIKE)
   - Filtrowanie po status (equals)
   - Sortowanie według wybranego pola
   - Limit i offset dla paginacji
7. Supabase → Wykonanie query (SELECT COUNT + SELECT z danymi)
8. MatchService → Zwrócenie { data, pagination: { total } }
9. API Route Handler → Zwrócenie Response.json() z kodem 200
10. Client ← Response (JSON)
```

### Szczegółowy przepływ z obsługą błędów:

**Krok 1: Middleware (src/middleware/index.ts)**

- Supabase client już dostępny w `context.locals.supabase`
- Weryfikacja tokenu JWT wykonywana przez Supabase (automatyczna)
- Token przechowywany w cookies lub Authorization header

**Krok 2: API Route Handler (src/pages/api/matches/index.ts)**

- Obsługa tylko metody GET (zwróć 405 dla innych metod)
- Pobranie query parameters z `Astro.url.searchParams`
- Walidacja query parameters przez schemat Zod
- Obsługa błędów walidacji → zwróć 400 z detalami
- Pobranie user_id z `context.locals.supabase.auth.getUser()`
- Obsługa braku użytkownika → zwróć 401
- Wywołanie serwisu: `matchService.getMatchesPaginated(userId, validatedQuery)`
- Obsługa błędów serwisu → zwróć 500
- Zwrócenie odpowiedzi 200 z JSON

**Krok 3: Match Service (src/lib/services/match.service.ts)**

- Przyjęcie parametrów: userId, validatedQuery
- Stworzenie funkcji pomocniczej do budowania query z filtrami (dla reużycia w COUNT i SELECT)
- Zastosowanie filtrów:
  - `eq('user_id', userId)` - jeśli RLS nie jest włączone
  - `ilike('player_name', `%${player_name}%`)` - jeśli player_name podane
  - `ilike('opponent_name', `%${opponent_name}%`)` - jeśli opponent_name podane
  - `eq('status', status)` - jeśli status podany
- Parsowanie parametru sort na kolumnę i kierunek
- Zastosowanie sortowania: `order(column, { ascending })`
- Wykonanie dwóch osobnych zapytań (osobne query builders):
  1. `count()` - pobranie całkowitej liczby rekordów (z filtrami, bez paginacji)
  2. `select()` + `range()` - pobranie danych strony (z filtrami, sortowaniem i paginacją)
- Obliczenie offset: `(page - 1) * limit`
- Zastosowanie paginacji: `range(offset, offset + limit - 1)`
- Mapowanie wyników na `MatchListItemDto[]` (usunięcie `user_id` poprzez destrukturyzację)
- Zwrócenie `{ data: mappedData, pagination: { total: count } }`

### Interakcje z zewnętrznymi serwisami:

**Supabase Database:**

- Tabela: `matches`
- Operacje: SELECT (odczyt), COUNT (licznik)
- Zabezpieczenia: Row Level Security (RLS) - użytkownik widzi tylko swoje mecze
- Indeksy: Zalecane na kolumnach `user_id`, `started_at`, `status` (dla wydajności, ale pomijamy tworzenie na tym etapie)

**Supabase Auth:**

- Weryfikacja tokenu JWT
- Pobranie user_id z tokenu
- Automatyczna obsługa sesji

## 6. Względy bezpieczeństwa

### Uwierzytelnianie

- **Wymagany token JWT**: Każde żądanie musi zawierać prawidłowy token Supabase w nagłówku `Authorization: Bearer {token}`
- **Automatyczna weryfikacja**: Middleware Astro wykorzystuje `context.locals.supabase.auth.getUser()` do weryfikacji tokenu
- **Obsługa błędów**: Brak tokenu lub nieprawidłowy token → 401 Unauthorized

### Autoryzacja

- **Izolacja danych użytkownika**: Implementacja Row Level Security (RLS) w Supabase zapewnia, że użytkownik widzi tylko swoje mecze
- **Filtrowanie po user_id**: W zapytaniu do bazy zawsze stosowany jest filtr `user_id = {authenticated_user_id}`
- **Brak możliwości dostępu do danych innych użytkowników**: Nawet próba manipulacji parametrami nie pozwoli na dostęp do obcych danych

### Walidacja danych wejściowych

- **Schemat Zod**: Wszystkie query parameters walidowane przez ścisły schemat Zod
- **Sanityzacja stringów**: Automatyczne trimowanie whitespace z parametrów tekstowych
- **Ograniczenia typu i zakresu**:
  - `page`: integer >= 1
  - `limit`: integer 1-100 (zapobiega DoS przez nadmierne obciążenie)
  - `status`: enum - tylko dozwolone wartości
  - `sort`: regex - tylko dozwolone pola i format
- **Ochrona przed SQL Injection**: Użycie Supabase Query Builder automatycznie parametryzuje zapytania

### Zapobieganie atakom

- **DoS Protection**: Limit maksymalny 100 elementów na stronę zapobiega przeciążeniu serwera
- **Field Whitelisting**: Tylko predefiniowane pola mogą być użyte do sortowania (zapobiega dostępowi do nieautoryzowanych kolumn)
- **Input Length Limits**: Walidacja minimalnej długości stringów (>=1 po trim) zapobiega pustym/bezsensownym zapytaniom
- **ILIKE Safe Usage**: Używanie ILIKE z parametryzacją zapobiega SQL injection

### Bezpieczeństwo odpowiedzi

- **Ukrywanie wrażliwych danych**: Pole `user_id` nigdy nie jest zwracane w odpowiedzi (usuwane przez typ `Omit<Match, "user_id">`)
- **Kontrola błędów**: Błędy 500 nie ujawniają szczegółów implementacji ani stack trace
- **Spójne formaty błędów**: Wszystkie błędy używają standardowego formatu `ErrorResponseDto`

## 7. Obsługa błędów

### Klasyfikacja błędów i kody statusu

#### 1. Błędy walidacji (400 Bad Request)

**Scenariusze:**

- Nieprawidłowy typ parametru (np. `page=abc` zamiast liczby)
- Wartość poza dozwolonym zakresem (np. `limit=200` gdy max to 100)
- Nieprawidłowa wartość enum (np. `status=running` zamiast `in_progress`)
- Nieprawidłowy format sortowania (np. `sort=invalid_field` lub `sort=--started_at`)
- Pusty string po trim dla parametrów tekstowych

**Odpowiedź:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameters",
    "details": [
      {
        "field": "page",
        "message": "Expected number, received string"
      },
      {
        "field": "limit",
        "message": "Number must be less than or equal to 100"
      }
    ]
  }
}
```

**Implementacja:**

- Catch błędów Zod (`ZodError`)
- Mapowanie błędów Zod na `ValidationErrorDetail[]`
- Zwrócenie strukturyzowanej odpowiedzi 400

#### 2. Błędy uwierzytelniania (401 Unauthorized)

**Scenariusze:**

- Brak nagłówka Authorization
- Nieprawidłowy format tokenu
- Wygasły token JWT
- Token nie zawiera user_id
- Użytkownik nie istnieje w systemie

**Odpowiedź:**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid authentication token"
  }
}
```

**Implementacja:**

- Sprawdzenie `context.locals.supabase.auth.getUser()`
- Jeśli zwraca błąd lub `user === null` → zwróć 401
- Nie ujawniaj szczegółów przyczyny (bezpieczeństwo)

#### 3. Błędy serwera (500 Internal Server Error)

**Scenariusze:**

- Błąd połączenia z bazą danych
- Timeout zapytania do bazy
- Nieoczekiwany błąd w logice biznesowej
- Błąd Supabase (np. RLS policy error)

**Odpowiedź:**

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

**Implementacja:**

- Catch wszystkich nieobsłużonych błędów w try-catch głównego handlera
- Logowanie szczegółów błędu do konsoli/systemu logowania: `console.error('[GET /api/matches]', error)`
- Zwrócenie ogólnej odpowiedzi 500 bez ujawniania szczegółów implementacji
- Monitoring i alerting (dla produkcji)

#### 4. Błędy metody (405 Method Not Allowed)

**Scenariusze:**

- Wywołanie endpointa metodą inną niż GET (np. POST, PUT, DELETE)

**Odpowiedź:**

```json
{
  "error": {
    "code": "METHOD_NOT_ALLOWED",
    "message": "Method POST not allowed. Use GET."
  }
}
```

**Implementacja:**

- Eksportowanie tylko funkcji `GET` w pliku endpointa
- Astro automatycznie zwróci 405 dla innych metod

### Hierarchia obsługi błędów w kodzie

```
1. API Route Handler (najwyższy poziom):
   - Try-catch opakowujący całą logikę
   - Obsługa błędów Zod (400)
   - Obsługa błędów auth (401)
   - Obsługa błędów serwisu (może zwracać 500)
   - Catch-all dla nieoczekiwanych błędów (500)

2. Match Service:
   - Try-catch dla operacji bazodanowych
   - Propagowanie błędów do route handler (throw)
   - Logowanie szczegółów błędów

3. Supabase Client:
   - Automatyczna obsługa błędów połączenia
   - Zwracanie błędów w strukturze { data, error }
```

### Logowanie błędów

**Co logować:**

- Wszystkie błędy 500 z pełnym stack trace
- Identyfikator użytkownika (jeśli dostępny) dla kontekstu
- Parametry zapytania (dla błędów 400)
- Timestamp
- Request ID (jeśli dostępny)

**Format logu:**

```
[GET /api/matches] Error: Database connection timeout
  User ID: uuid-123-456
  Query params: { page: 1, limit: 20, status: "in_progress" }
  Timestamp: 2024-01-15T14:30:00Z
  Stack: [stack trace]
```

**Nie logować:**

- Tokenów JWT
- Haseł (nie występują w tym endpoincie)
- Wrażliwych danych osobowych w production logs

## 8. Rozważania dotyczące wydajności

### Optymalizacje zapytań bazodanowych

**1. Minimalizacja danych:**

- Nie pobieramy zagnieżdżonych relacji (sets, points) w liście meczów
- Używamy `select()` tylko z potrzebnymi kolumnami (wszystkie z matches)
- Typ `MatchListItemDto` nie zawiera relacji

**2. Efektywna paginacja:**

- Używanie `range(offset, offset + limit - 1)` zamiast pobierania wszystkich danych
- Offset: `(page - 1) * limit`
- Supabase natywnie wspiera efektywną paginację

**3. Optymalizacja COUNT:**

- Wykonanie `count()` z tymi samymi filtrami co SELECT (potrzebne dla `total`)
- COUNT jest niezbędny dla klienta do obliczenia liczby stron
- Supabase może cache'ować wynik count dla powtarzających się zapytań
- Możliwa optymalizacja: cache count po stronie aplikacji dla pierwszego zapytania (opcjonalne, na późniejszym etapie)

### Strategia cache'owania

**Potencjalne miejsca cache'owania (opcjonalne, na późniejszym etapie):**

- Cache po stronie klienta (za pomocą odpowiednich mechanizmów frontendowych)
- Cache total count dla użytkownika (invalidacja przy tworzeniu/usuwaniu meczu)
- HTTP Cache headers: `Cache-Control: private, max-age=60` dla stabilnych danych

**Na tym etapie:**

- Brak implementacji cache na backendzie
- Pozostawienie cache'owania klientowi

### Limity i throttling

**Obecne zabezpieczenia:**

- Maksymalny limit per page: 100 elementów
- Domyślny limit: 20 elementów

**Przyszłe rozważania (poza zakresem tego planu):**

- Rate limiting per użytkownik (np. 100 requests/minutę)
- Monitoring slow queries (> 1s)

### Monitorowanie wydajności

**Metryki do śledzenia (poza zakresem tego planu):**

- Średni czas odpowiedzi endpointa
- Liczba zapytań per użytkownik per godzina
- Rozkład wartości parametru `limit`
- Procent zapytań ze stosowanymi filtrami

### Skalowanie

**Baza danych:**

- Supabase automatycznie skaluje połączenia
- Connection pooling wbudowany w Supabase

**Aplikacja:**

- Stateless endpoint - łatwo skalowalny horyzontalnie
- Brak state'u po stronie serwera

## 9. Etapy implementacji

### Faza 1: Przygotowanie struktury projektu

1. **Utworzenie katalogu services**
   - Ścieżka: `src/lib/services/`
   - Cel: Centralne miejsce dla logiki biznesowej

2. **Utworzenie katalogu utils**
   - Ścieżka: `src/lib/utils/`
   - Cel: Funkcje pomocnicze dla API responses (error handling, response formatting)

3. **Utworzenie struktury katalogów API**
   - Ścieżka: `src/pages/api/matches/`
   - Cel: Organizacja endpointów związanych z meczami

### Faza 2: Implementacja warstwy utilities

4. **Utworzenie pliku API response helpers**
   - Plik: `src/lib/utils/api-response.ts`
   - Funkcje pomocnicze:
     - `createSuccessResponse<T>(data: T, status: number = 200): Response`
     - `createErrorResponse(code: string, message: string, status: number, details?: ValidationErrorDetail[]): Response`
     - `createValidationErrorResponse(zodError: ZodError): Response`
   - Cel: Ujednolicenie formatowania odpowiedzi API

### Faza 3: Implementacja warstwy service

5. **Utworzenie pliku Match Service**
   - Plik: `src/lib/services/match.service.ts`
   - Struktura: Klasa lub obiekt z metodami

6. **Implementacja funkcji pomocniczej buildFilteredQuery**
   - Plik: `src/lib/services/match.service.ts` (prywatna funkcja)
   - Sygnatura: `buildFilteredQuery(supabase: SupabaseClient, userId: string, query: ValidatedMatchListQuery)`
   - Logika:
     a. Stworzenie query builder: `supabase.from('matches')`
     b. Zastosowanie filtra user_id: `.eq('user_id', userId)`
     c. Warunkowe zastosowanie filtra player_name (jeśli podany): `.ilike('player_name', `%${query.player_name}%`)`
     d. Warunkowe zastosowanie filtra opponent_name (jeśli podany): `.ilike('opponent_name', `%${query.opponent_name}%`)`
     e. Warunkowe zastosowanie filtra status (jeśli podany): `.eq('status', query.status)`
   - Zwrócenie query buildera (bez wykonania zapytania)
   - **Uwaga:** Ta funkcja jest potrzebna, aby uniknąć duplikacji logiki filtrowania między COUNT i SELECT

7. **Implementacja metody getMatchesPaginated**
   - Sygnatura: `async getMatchesPaginated(supabase: SupabaseClient, userId: string, query: ValidatedMatchListQuery): Promise<MatchListResponse>`
   - Kroki implementacji:
     a. Parsowanie parametru sort na kolumnę i kierunek (użyj parseSortParam)
     b. Obliczenie offset: `const offset = (query.page - 1) * query.limit`

8. **Implementacja części zliczającej**
   - Wywołanie `buildFilteredQuery(supabase, userId, query)` dla COUNT
   - Wykonanie zapytania: `const { count, error: countError } = await queryBuilder.select('*', { count: 'exact', head: true })`
   - Obsługa błędu countError (throw error)
   - **Uwaga:** Używamy osobnego query buildera dla COUNT

9. **Implementacja części pobierającej dane**
   - Wywołanie `buildFilteredQuery(supabase, userId, query)` dla SELECT (nowy query builder!)
   - Zastosowanie sortowania: `.order(column, { ascending })`
   - Zastosowanie range: `.range(offset, offset + query.limit - 1)`
   - Wykonanie zapytania: `const { data, error } = await queryBuilder.select('*')`
   - Obsługa błędu (throw error)
   - **Uwaga:** Nie możemy użyć tego samego query buildera co dla COUNT - Supabase query builder jest mutowalny

10. **Mapowanie wyników i zwrócenie odpowiedzi**
    - Mapowanie `data` na `MatchListItemDto[]` poprzez usunięcie `user_id`:
      ```typescript
      const mappedData = data.map(({ user_id, ...match }) => match);
      ```
    - Zwrócenie obiektu inline: `{ data: mappedData, pagination: { total: count } }`
    - **Uwaga:** Nie ma potrzeby osobnej funkcji utility - to wystarczająco proste

11. **Implementacja funkcji pomocniczej parseSortParam**
    - Plik: `src/lib/services/match.service.ts` (prywatna funkcja)
    - Sygnatura: `parseSortParam(sort: string): SortParams`
    - Logika:
      - Sprawdzenie czy sort zaczyna się od `-`
      - Ekstrakcja nazwy kolumny
      - Zwrócenie: `{ column, ascending: !sort.startsWith('-') }`

### Faza 4: Implementacja warstwy API Route

12. **Utworzenie pliku endpointa**
    - Plik: `src/pages/api/matches/index.ts`
    - Ustawienie: `export const prerender = false`

13. **Definicja schematu walidacji Zod**
    - Import Zod
    - Import `MATCH_STATUS_VALUES` z `../../../types`
    - Definicja `MatchListQuerySchema` z wszystkimi parametrami i walidacją
    - Użycie `status: z.enum(MATCH_STATUS_VALUES).optional()`
    - Wyeksportowanie typu: `type ValidatedMatchListQuery = z.infer<typeof MatchListQuerySchema>`

14. **Implementacja funkcji GET handler - część 1: setup**
    - Sygnatura: `export async function GET(context: APIContext): Promise<Response>`
    - Destrukturyzacja: `const { locals, url } = context`
    - Pobranie Supabase client: `const supabase = locals.supabase`

15. **Implementacja GET handler - część 2: uwierzytelnianie**
    - Wywołanie: `const { data: { user }, error: authError } = await supabase.auth.getUser()`
    - Sprawdzenie: `if (authError || !user)`
    - W przypadku błędu: zwróć `createErrorResponse('UNAUTHORIZED', 'Missing or invalid authentication token', 401)`

16. **Implementacja GET handler - część 3: walidacja query params**
    - Ekstrakcja query parameters z `url.searchParams`
    - Konwersja URLSearchParams do obiektu
    - Try-catch dla walidacji Zod:
      - `const validatedQuery = MatchListQuerySchema.parse(queryParamsObject)`
      - W przypadku ZodError: zwróć `createValidationErrorResponse(error)`

17. **Implementacja GET handler - część 4: wywołanie serwisu**
    - Import MatchService
    - Try-catch dla wywołania serwisu:
      - `const result = await matchService.getMatchesPaginated(supabase, user.id, validatedQuery)`
      - W przypadku błędu:
        - Logowanie: `console.error('[GET /api/matches]', error)`
        - Zwróć: `createErrorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500)`

18. **Implementacja GET handler - część 5: zwrócenie odpowiedzi**
    - Zwrócenie: `createSuccessResponse(result, 200)`
    - Content-Type automatycznie ustawiony na `application/json`

### Faza 5: Przegląd i optymalizacja

23. **Code review**
    - Sprawdzenie zgodności z guidelines z .cursor/rules/
    - Weryfikacja error handling (early returns, guard clauses)
    - Sprawdzenie typowania TypeScript
    - Weryfikacja separacji warstw (route → service → database)

24. **Optymalizacja na podstawie feedback linter**
    - Uruchomienie lintera na nowych plikach
    - Naprawa wszystkich błędów i ostrzeżeń
    - Refactoring jeśli potrzebny

25. **Dokumentacja kodu**
    - Dodanie komentarzy JSDoc do funkcji publicznych
    - Dokumentacja parametrów i zwracanych wartości
    - Przykłady użycia w komentarzach (dla serwisu)

### Faza 6: Finalizacja

26. **Weryfikacja zgodności z planem**
    - Sprawdzenie czy wszystkie wymagania ze specyfikacji zostały spełnione
    - Weryfikacja formatów odpowiedzi
    - Weryfikacja kodów statusu HTTP

27. **Przygotowanie do merge**
    - Sprawdzenie czy wszystkie pliki zostały dodane
    - Sprawdzenie czy projekt się buduje (`npm run build`)
    - Sprawdzenie czy dev server działa (`npm run dev`)

## Podsumowanie

Ten plan dostarcza kompletny blueprint implementacji endpointa GET /api/matches z **uproszczoną server-side pagination**. Implementacja powinna być wykonana etapami w podanej kolejności, z testowaniem po każdej fazie.

### Kluczowe cechy implementacji:

✅ **Server-side pagination** - Backend wykonuje paginację i zwraca tylko dane aktualnej strony
✅ **Uproszczony PaginationDto** - Backend zwraca tylko `total`, bez `page`, `limit`, `total_pages`
✅ **Zarządzanie po stronie klienta** - Klient zarządza stanem paginacji i oblicza `total_pages`
✅ **Efektywność** - Mniejszy payload response, lepsza wydajność dla dużej liczby rekordów

### Szczególny nacisk należy położyć na:

- **Walidację danych wejściowych** (Zod) - parametry page i limit
- **Bezpieczeństwo** (izolacja użytkowników, RLS, limit max 100 per page)
- **Separację warstw** (route → service → database)
- **Obsługę błędów** (spójne formaty, odpowiednie kody statusu)
- **Wydajność** (efektywna paginacja, minimalizacja danych)

Po implementacji endpoint będzie w pełni funkcjonalny, bezpieczny i gotowy do użycia w produkcji (po dodaniu testów jednostkowych i integracyjnych, które są poza zakresem tego planu).
