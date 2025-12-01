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

### Schemat walidacji Zod:

**Schemat zdefiniowany w:** `src/lib/schemas/match.schemas.ts`

Wykorzystywany schema: **`matchListQuerySchema`** - szczegóły w [Shared Components Implementation Plan](./shared-implementation-plan.md) → sekcja 8.2

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

Endpoint wykorzystuje **standardowe formaty błędów** opisane w [Shared Components Implementation Plan](./shared-implementation-plan.md):

- **400 / 422 Bad Request** - błędy walidacji query parameters (format: `ErrorResponseDto` z `details`)
- **401 Unauthorized** - brak lub nieprawidłowy token JWT
- **500 Internal Server Error** - błędy bazy danych lub nieoczekiwane błędy

**Szczegóły implementacji błędów:** Zobacz sekcja 1 i 2 w Shared Components (API Response Utilities, API Error Utilities)

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

- Wywołanie metody `getMatchesPaginated(supabase, userId, validatedQuery)`
- **Szczegółowa implementacja** tej metody opisana w [Shared Components Implementation Plan](./shared-implementation-plan.md) → sekcja 5.1

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

**Wykorzystywany schema:** `matchListQuerySchema` z `src/lib/schemas/match.schemas.ts`

**Szczegóły schematu:** [Shared Components Implementation Plan](./shared-implementation-plan.md) → sekcja 8.2

**Kluczowe zabezpieczenia:**

- `limit`: max 100 (zapobiega DoS)
- `status`, `sort`: tylko predefiniowane wartości (enum/regex)
- Automatyczna sanityzacja i trimowanie stringów przez Zod

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

### Specyficzne scenariusze dla GET /api/matches

#### Błędy walidacji query parameters (422 Unprocessable Entity)

**Typowe scenariusze dla tego endpointa:**

- `page=abc` - nieprawidłowy typ parametru
- `limit=200` - wartość poza zakresem (max 100)
- `status=running` - nieprawidłowa wartość enum
- `sort=invalid_field` - nieprawidłowe pole sortowania

**Obsługa:**

- Walidacja przez `parseQueryParams()` z `zod-helpers.ts`
- Zwrócenie odpowiedzi przez `createValidationErrorResponse()`

#### Błędy bazy danych (500 Internal Server Error)

**Typowe scenariusze:**

- Timeout zapytania COUNT lub SELECT
- Błąd połączenia z Supabase
- Błąd w klauzuli filtrowania

**Obsługa:**

- Catch błędów w `match.service.getMatchesPaginated()`
- Propagacja do route handler
- Zwrócenie odpowiedzi przez `createInternalErrorResponse()`

### Implementacja obsługi błędów

**Wykorzystywane komponenty z [Shared Components](./shared-implementation-plan.md):**

- **API Response Utilities** (sekcja 1): `createValidationErrorResponse`, `createUnauthorizedResponse`, `createInternalErrorResponse`
- **API Error Utilities** (sekcja 2): klasy błędów, kody błędów, komunikaty
- **Zod Helpers** (sekcja 3): `parseQueryParams` z obsługą ZodError
- **Logger Utility** (sekcja 4): `logError` dla błędów 500

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
- **Szczegóły implementacji:** Zobacz `match.service.getMatchesPaginated()` w [Shared Components](./shared-implementation-plan.md) → sekcja 5.1

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

### ⚠️ UWAGA: Zależności od shared components

**Przed rozpoczęciem implementacji tego endpointa, należy najpierw zaimplementować wspólne komponenty opisane w:**

📄 **[Shared Components Implementation Plan](./shared-implementation-plan.md)**

**Wymagane komponenty:**

- ✅ `src/lib/utils/api-response.ts` - formatowanie odpowiedzi
- ✅ `src/lib/utils/api-errors.ts` - obsługa błędów
- ✅ `src/lib/utils/zod-helpers.ts` - walidacja
- ✅ `src/lib/services/match.service.ts` - logika biznesowa (metoda `getMatchesPaginated`)
- ✅ `src/lib/schemas/match.schemas.ts` - schemat walidacji (`matchListQuerySchema`)

**Status:** Ten plan zakłada, że powyższe komponenty są już zaimplementowane.

---

### Faza 1: Przygotowanie struktury API Route

1. **Utworzenie katalogu dla endpointów matches**
   - Ścieżka: `src/pages/api/matches/`
   - Cel: Organizacja endpointów związanych z meczami

2. **Utworzenie pliku endpointa**
   - Plik: `src/pages/api/matches/index.ts`
   - Ustawienie: `export const prerender = false`
   - Ten plik będzie zawierał handlery GET i POST

---

### Faza 2: Implementacja GET handler

3. **Import zależności**
   - Import `type { APIContext }` z 'astro'
   - Import funkcji z **shared components** (szczegóły w sekcjach 1-9 [Shared Plan](./shared-implementation-plan.md)):
     - `api-response`: `createPaginatedResponse`, `createUnauthorizedResponse`, `createValidationErrorResponse`, `createInternalErrorResponse`
     - `zod-helpers`: `parseQueryParams`
     - `match.service`: `getMatchesPaginated`
     - `match.schemas`: `matchListQuerySchema`
     - `logger`: `logError` (opcjonalnie)

4. **Implementacja funkcji GET handler**

   **Struktura funkcji:**

   ```typescript
   export async function GET(context: APIContext): Promise<Response>;
   ```

   **Kroki implementacji:**
   - **Setup:** Destrukturyzacja `context` (locals, url), pobranie supabase client
   - **Uwierzytelnianie:** Sprawdzenie `supabase.auth.getUser()`, zwrot `createUnauthorizedResponse()` w przypadku błędu
   - **Walidacja:** `parseQueryParams(url.searchParams, matchListQuerySchema)`, zwrot `createValidationErrorResponse()` przy błędzie
   - **Wywołanie serwisu:** Try-catch z `getMatchesPaginated(supabase, user.id, validatedQuery)`, logowanie błędów
   - **Odpowiedź:** `createPaginatedResponse(matchesData.data, matchesData.pagination.total, 200)`

   **Uwaga:** Szczegółowe sygnatury funkcji pomocniczych dostępne w [Shared Components](./shared-implementation-plan.md)

### Faza 3: Przegląd i finalizacja

5. **Code review**
   - Sprawdzenie zgodności z guidelines z .cursor/rules/
   - Weryfikacja error handling (early returns, guard clauses)
   - Sprawdzenie typowania TypeScript
   - Weryfikacja użycia funkcji z shared components

6. **Linting**
   - Uruchomienie lintera: `npm run lint`
   - Naprawa wszystkich błędów i ostrzeżeń

7. **Weryfikacja**
   - Sprawdzenie czy wszystkie wymagania ze specyfikacji zostały spełnione
   - Weryfikacja formatów odpowiedzi
   - Weryfikacja kodów statusu HTTP
   - Test kompilacji: `npm run build`
   - Test dev server: `npm run dev`

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
