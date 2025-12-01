# API Endpoint Implementation Plan: POST /api/matches

## 1. Przegląd punktu końcowego

Endpoint `POST /api/matches` służy do tworzenia nowego meczu tenisa stołowego z konfiguracją początkową. Po utworzeniu meczu, system automatycznie tworzy i rozpoczyna pierwszy set, zwracając pełne informacje o meczu wraz z danymi bieżącego seta.

### Główne funkcjonalności:

- Utworzenie nowego rekordu meczu w bazie danych
- Automatyczne utworzenie pierwszego seta
- Inicjalizacja liczników wygranych setów na 0
- Ustawienie statusu meczu na "in_progress"
- Określenie serwera w pierwszym secie na podstawie konfiguracji
- Rejestracja zdarzenia analitycznego (match_created)

### Użycie typowe:

Trener otwiera aplikację i rozpoczyna rejestrację nowego meczu, wprowadzając nazwiska zawodników oraz konfigurację meczu (liczba setów, zasady golden set, itp.).

---

## 2. Szczegóły żądania

### Metoda HTTP

`POST`

### Struktura URL

```
/api/matches
```

### Nagłówki żądania

```
Authorization: Bearer {supabase_jwt_token}
Content-Type: application/json
```

### Parametry URL

Brak parametrów URL ani query parameters.

### Request Body

**Typ**: `CreateMatchCommandDto`

**Struktura JSON**:

```json
{
  "player_name": "Jan Kowalski",
  "opponent_name": "Adam Nowak",
  "max_sets": 5,
  "golden_set_enabled": false,
  "first_server_first_set": "player",
  "generate_ai_summary": true
}
```

**Wymagane pola**:

- `player_name` (string): Nazwa zawodnika trenowanego przez trenera
  - Min: 1 znak
  - Max: 200 znaków
  - Nie może być pustym stringiem
- `opponent_name` (string): Nazwa przeciwnika
  - Min: 1 znak
  - Max: 200 znaków
  - Nie może być pustym stringiem
- `max_sets` (integer): Maksymalna liczba setów do wygrania meczu
  - Min: 1
  - Max: 7
  - Musi być liczbą całkowitą dodatnią
- `golden_set_enabled` (boolean): Czy włączyć golden set przy remisie
  - true lub false
- `first_server_first_set` (enum): Kto serwuje pierwszy w pierwszym secie
  - Dozwolone wartości: "player" lub "opponent"
- `generate_ai_summary` (boolean): Czy generować podsumowanie AI po zakończeniu meczu
  - true lub false

**Opcjonalne pola**:
Brak - wszystkie pola są wymagane.

---

## 3. Wykorzystywane typy

### Typy z src/types.ts:

**Request Body**: `CreateMatchCommandDto`  
**Response**: `CreateMatchResponse` = `SingleItemResponseDto<CreateMatchDto>`

### Schemat walidacji Zod:

**Schemat zdefiniowany w:** `src/lib/schemas/match.schemas.ts`

Wykorzystywany schema: **`createMatchCommandSchema`** - szczegóły w [Shared Components Implementation Plan](./shared-implementation-plan.md) → sekcja 8.1

---

## 4. Szczegóły odpowiedzi

### Response 201 Created

**Typ**: `CreateMatchResponse`

**Struktura**:

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
    "sets_won_player": 0,
    "sets_won_opponent": 0,
    "status": "in_progress",
    "coach_notes": null,
    "started_at": "2024-01-15T14:30:00Z",
    "ended_at": null,
    "created_at": "2024-01-15T14:30:00Z",
    "current_set": {
      "id": 456,
      "sequence_in_match": 1,
      "is_golden": false,
      "set_score_player": 0,
      "set_score_opponent": 0,
      "is_finished": false,
      "current_server": "player"
    }
  }
}
```

**Opis pól odpowiedzi**:

Pole `data.current_set` jest wymagane (nie opcjonalne) w odpowiedzi POST /api/matches, ponieważ pierwszy set jest zawsze automatycznie tworzony.

Pola automatycznie generowane przez backend:

- `id` - wygenerowane przez bazę (BIGSERIAL)
- `sets_won_player` - inicjalizowane na 0
- `sets_won_opponent` - inicjalizowane na 0
- `status` - ustawiane na "in_progress"
- `coach_notes` - inicjalizowane na null
- `started_at` - ustawiane na now()
- `ended_at` - inicjalizowane na null
- `created_at` - ustawiane na now()
- `current_set.id` - wygenerowane przez bazę
- `current_set.sequence_in_match` - ustawiane na 1
- `current_set.is_golden` - ustawiane na false (pierwszy set nigdy nie jest golden)
- `current_set.set_score_player` - inicjalizowane na 0
- `current_set.set_score_opponent` - inicjalizowane na 0
- `current_set.is_finished` - ustawiane na false
- `current_set.current_server` - kopiowane z `first_server_first_set`

---

## 5. Przepływ danych

### Krok 1: Walidacja i autoryzacja

1. Middleware Astro weryfikuje token JWT z nagłówka Authorization
2. Ekstrahuje `user_id` z tokenu i dodaje do `context.locals.supabase`
3. Endpoint waliduje body za pomocą schematu Zod

### Krok 2: Utworzenie meczu (transakcja)

- Wywołanie `matchService.createMatch(supabase, userId, commandDto)`
- **Szczegółowa implementacja** w [Shared Components Implementation Plan](./shared-implementation-plan.md) → sekcja 5.2
- Service tworzy mecz i automatycznie pierwszy set (używa `setService.createFirstSet`)

### Krok 3: Rejestracja zdarzenia analitycznego

- Wywołanie `analyticsService.trackEvent(...)` (fire-and-forget)
- **Szczegółowa implementacja** w [Shared Components Implementation Plan](./shared-implementation-plan.md) → sekcja 7.1
- Błąd w analytics nie przerywa procesu tworzenia meczu

### Krok 4: Konstrukcja odpowiedzi

1. Połączenie danych z `Match` i `CurrentSetDto`
2. Utworzenie obiektu `CreateMatchDto`
3. Owinięcie w `SingleItemResponseDto<CreateMatchDto>`
4. Zwrócenie odpowiedzi z kodem 201

### Diagram przepływu:

```
Client → POST /api/matches
    ↓
Middleware (JWT validation)
    ↓
Endpoint handler (Zod validation)
    ↓
matchService.createMatch()
    ↓
┌─────────────────────────────┐
│ Transaction START           │
│  1. INSERT matches          │
│  2. INSERT sets (first)     │
│ Transaction COMMIT          │
└─────────────────────────────┘
    ↓
analyticsService.trackEvent() (async, non-blocking)
    ↓
Construct CreateMatchDto
    ↓
Return 201 with { data: CreateMatchDto }
```

---

## 6. Względy bezpieczeństwa

### Autoryzacja i uwierzytelnianie

1. **Token JWT**:
   - Wymagany nagłówek: `Authorization: Bearer {token}`
   - Token weryfikowany przez middleware Astro
   - Token musi być ważny i nie wygasły
   - Ekstrahowany `user_id` używany we wszystkich operacjach DB

2. **User ID**:
   - NIGDY nie pobierać user_id z request body
   - ZAWSZE używać user_id z tokenu JWT (context.locals.user)
   - Każdy rekord (matches, sets) musi mieć pole user_id ustawione na user_id z tokenu

3. **Supabase Client**:
   - ZAWSZE używać `context.locals.supabase` (z middleware)
   - NIE importować bezpośrednio supabaseClient
   - RLS policies w bazie automatycznie ograniczają dostęp do danych użytkownika

### Walidacja danych wejściowych

**Wykorzystywany schema:** `createMatchCommandSchema` z `src/lib/schemas/match.schemas.ts`

**Szczegóły schematu:** [Shared Components Implementation Plan](./shared-implementation-plan.md) → sekcja 8.1

**Walidowane pola:**

- `player_name`, `opponent_name`: min 1, max 200 znaków
- `max_sets`: integer 1-7
- `first_server_first_set`: enum "player" | "opponent"
- `golden_set_enabled`, `generate_ai_summary`: boolean

### Ochrona przed atakami

1. **SQL Injection**:
   - Użycie Supabase Client z prepared statements
   - Wszystkie wartości automatycznie escapowane

2. **XSS**:
   - Backend nie renderuje HTML
   - Frontend odpowiedzialny za sanityzację przy wyświetlaniu

3. **DoS**:
   - Limit max_sets: 7
   - Limit długości stringów: 200 znaków
   - Rate limiting (implementowany na poziomie Cloudflare/Astro middleware)

4. **Data Leakage**:
   - Response DTO celowo pomija pole `user_id`
   - RLS policies zapewniają, że użytkownik widzi tylko swoje dane

---

## 7. Obsługa błędów

### Specyficzne scenariusze dla POST /api/matches

#### Błędy walidacji request body (422 Unprocessable Entity)

**Typowe scenariusze dla tego endpointa:**

- Brak wymaganych pól (`player_name`, `opponent_name`, etc.)
- `player_name` lub `opponent_name`: pusty string lub > 200 znaków
- `max_sets`: < 1 lub > 7, nie jest liczbą całkowitą
- `first_server_first_set`: wartość inna niż "player" lub "opponent"
- `golden_set_enabled`, `generate_ai_summary`: nie jest boolean

**Obsługa:**

- Walidacja przez `parseRequestBody()` z `zod-helpers.ts`
- Zwrócenie odpowiedzi przez `createValidationErrorResponse()`

#### Błędy bazy danych (500 Internal Server Error)

**Typowe scenariusze:**

- Błąd podczas INSERT do tabeli `matches`
- Błąd podczas INSERT do tabeli `sets` (pierwszy set)
- Błąd transakcji (rollback jeśli set się nie utworzy)
- Błąd połączenia z Supabase

**Obsługa:**

- Catch błędów w `match.service.createMatch()` i `set.service.createFirstSet()`
- Propagacja do route handler jako `DatabaseError`
- Zwrócenie odpowiedzi przez `createInternalErrorResponse()`

#### Błędy analytics (nie przerywają procesu)

**Obsługa:**

- Wywołanie `trackEvent()` w trybie fire-and-forget (bez `await`)
- Błąd logowany przez `console.error()`
- NIE przerywa procesu tworzenia meczu

### Implementacja obsługi błędów

**Wykorzystywane komponenty z [Shared Components](./shared-implementation-plan.md):**

- **API Response Utilities** (sekcja 1): `createSuccessResponse`, `createValidationErrorResponse`, `createUnauthorizedResponse`, `createInternalErrorResponse`
- **API Error Utilities** (sekcja 2): `DatabaseError` class, kody błędów
- **Zod Helpers** (sekcja 3): `parseRequestBody` z obsługą ZodError i JSON parse errors
- **Match Service** (sekcja 5.2): `createMatch` z obsługą błędów transakcji
- **Set Service** (sekcja 6.1): `createFirstSet` z obsługą błędów INSERT
- **Analytics Service** (sekcja 7.1): `trackEvent` z fire-and-forget approach

---

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła

1. **Wywołania bazy danych**:
   - Dwa INSERTy (matches, sets) w ramach jednej transakcji
   - Potencjalnie wolne przy dużym obciążeniu

2. **Zdarzenia analityczne**:
   - Dodatkowy INSERT do analytics_events
   - Może opóźnić response

3. **Latencja sieci**:
   - Round-trip do Supabase
   - Czas odpowiedzi zależny od lokalizacji bazy

### Strategie optymalizacji

1. **Transakcja atomowa**:
   - Match i pierwszy set tworzone w jednej transakcji
   - **Implementacja:** Zobacz `match.service.createMatch()` w [Shared Components](./shared-implementation-plan.md) → sekcja 5.2

2. **Async analytics**:
   - Fire-and-forget approach (bez `await`)
   - **Implementacja:** Zobacz `analytics.service.trackEvent()` w [Shared Components](./shared-implementation-plan.md) → sekcja 7.1

3. **Minimize data transfer**:
   - Response DTO pomija pole `user_id` (mapping w service)

### Oczekiwana wydajność

- **Czas odpowiedzi**: < 500ms (w warunkach normalnych)
- **Throughput**: > 100 requestów/sekundę (ograniczony przez Supabase tier)
- **Skalowanie**: Horizontal scaling przez Cloudflare + Supabase

---

## 9. Etapy wdrożenia

### ⚠️ UWAGA: Zależności od shared components

**Przed rozpoczęciem implementacji tego endpointa, należy najpierw zaimplementować wspólne komponenty opisane w:**

📄 **[Shared Components Implementation Plan](./shared-implementation-plan.md)**

**Wymagane komponenty:**

- ✅ `src/lib/utils/api-response.ts` - formatowanie odpowiedzi
- ✅ `src/lib/utils/api-errors.ts` - obsługa błędów
- ✅ `src/lib/utils/zod-helpers.ts` - walidacja
- ✅ `src/lib/services/match.service.ts` - logika biznesowa (metoda `createMatch`)
- ✅ `src/lib/services/set.service.ts` - logika biznesowa (metoda `createFirstSet`)
- ✅ `src/lib/services/analytics.service.ts` - tracking (opcjonalnie)
- ✅ `src/lib/schemas/match.schemas.ts` - schemat walidacji (`createMatchCommandSchema`)

**Status:** Ten plan zakłada, że powyższe komponenty są już zaimplementowane.

---

### Etap 1: Implementacja POST endpoint handler

1.1. **Utworzenie/otwarcie pliku endpointa**

- Plik: `src/pages/api/matches/index.ts`
- Ustawienie: `export const prerender = false`
- Ten plik może już istnieć (jeśli GET został zaimplementowany wcześniej)

1.2. **Import zależności**

- Import `type { APIContext }` z 'astro'
- Import funkcji z **shared components** (szczegóły w sekcjach 1-9 [Shared Plan](./shared-implementation-plan.md)):
  - `api-response`: `createSuccessResponse`, `createUnauthorizedResponse`, `createValidationErrorResponse`, `createInternalErrorResponse`
  - `zod-helpers`: `parseRequestBody`
  - `match.service`: `createMatch`
  - `analytics.service`: `trackEvent` (opcjonalnie)
  - `match.schemas`: `createMatchCommandSchema`
  - `logger`: `logError` (opcjonalnie)

1.3. **Implementacja funkcji POST handler**

**Struktura funkcji:**

```typescript
export async function POST(context: APIContext): Promise<Response>;
```

**Kroki implementacji:**

- **Setup:** Destrukturyzacja `context` (locals, request), pobranie supabase client
- **Uwierzytelnianie:** Sprawdzenie `supabase.auth.getUser()`, zwrot `createUnauthorizedResponse()` w przypadku błędu
- **Walidacja:** `parseRequestBody(request, createMatchCommandSchema)`, zwrot `createValidationErrorResponse()` przy błędzie Zod lub błędzie JSON
- **Wywołanie serwisu:** Try-catch z `createMatch(supabase, user.id, validatedCommand)`, logowanie błędów
- **Analytics (opcjonalnie):** Fire-and-forget `trackEvent(...).catch()` - BEZ await
- **Odpowiedź:** `createSuccessResponse(matchData, 201)`

**Uwaga:** Szczegółowe sygnatury funkcji pomocniczych dostępne w [Shared Components](./shared-implementation-plan.md)

### Etap 2: Przegląd i finalizacja

2.1. **Code review**

- Sprawdzenie zgodności z guidelines z .cursor/rules/
- Weryfikacja error handling (early returns, guard clauses)
- Sprawdzenie typowania TypeScript
- Weryfikacja użycia funkcji z shared components

2.2. **Linting**

- Uruchomienie lintera: `npm run lint`
- Naprawa wszystkich błędów i ostrzeżeń

2.3. **Weryfikacja**

- Sprawdzenie czy wszystkie wymagania ze specyfikacji zostały spełnione
- Weryfikacja formatów odpowiedzi (201, 401, 422, 500)
- Weryfikacja że analytics jest fire-and-forget
- Test kompilacji: `npm run build`
- Test dev server: `npm run dev`

### Etap 3: Testowanie (opcjonalne - manualne)

3.1. **Testowanie podstawowych scenariuszy:**

- Valid request → 201 response z prawidłową strukturą
- Missing token → 401 response
- Invalid token → 401 response
- Missing required field → 422 response z details
- Invalid field values → 422 response
- max_sets > 7 → 422 response
- player_name > 200 chars → 422 response

3.2. **Weryfikacja danych w bazie:**

- Sprawdzenie tabeli matches (nowy rekord)
- Sprawdzenie tabeli sets (pierwszy set utworzony z sequence_in_match=1)
- Sprawdzenie tabeli analytics_events (zdarzenie match_created)

---

## 10. Checklist przed zakończeniem implementacji

### Zależności (muszą być gotowe PRZED implementacją)

- [ ] Shared components zaimplementowane (api-response, api-errors, zod-helpers)
- [ ] Match service gotowy (metoda `createMatch`)
- [ ] Set service gotowy (metoda `createFirstSet`)
- [ ] Match schemas gotowe (`createMatchCommandSchema`)
- [ ] Analytics service gotowy (opcjonalnie)

### Implementacja endpointa

- [ ] Plik `src/pages/api/matches/index.ts` utworzony lub zaktualizowany
- [ ] Funkcja POST handler zaimplementowana
- [ ] Używa `createUnauthorizedResponse()` dla błędów auth
- [ ] Używa `parseRequestBody()` do walidacji
- [ ] Używa `createValidationErrorResponse()` dla błędów walidacji
- [ ] Używa `createMatch()` z match.service
- [ ] Tracking analytics jest fire-and-forget (no await)
- [ ] Zwraca 201 z `createSuccessResponse(data, 201)`
- [ ] User ID pobierany z tokenu JWT (NIE z body)
- [ ] Supabase client z `context.locals.supabase`
- [ ] `export const prerender = false` ustawione

### Weryfikacja

- [ ] TypeScript kompiluje się bez błędów (`npx tsc --noEmit`)
- [ ] Linter nie zgłasza błędów (`npm run lint`)
- [ ] Endpoint zwraca prawidłową strukturę JSON
- [ ] Pierwszy set automatycznie tworzony z prawidłowymi danymi
- [ ] Obsługa błędów kompletna (401, 422, 500)
- [ ] Analytics trackuje zdarzenie match_created (jeśli zaimplementowane)

---

## 11. Uwagi końcowe

### Kluczowe decyzje implementacyjne

1. **Używanie Shared Components**:
   - Wszystkie funkcje response z `api-response.ts`
   - Walidacja przez `parseRequestBody()` z `zod-helpers.ts`
   - Logika biznesowa w `match.service.ts` i `set.service.ts`
   - Zapewnia spójność z innymi endpointami

2. **Fire-and-forget Analytics**:
   - Wywołanie `trackEvent()` BEZ await
   - Dodanie `.catch()` do obsługi błędów
   - Błąd w analytics NIE przerywa procesu tworzenia meczu

3. **Transakcyjność**:
   - Utworzenie match i pierwszego seta w serwisie
   - Jeśli set nie zostanie utworzony, match też nie powinien pozostać
   - Obsługa tego w `match.service.createMatch()`

4. **Autoryzacja**:
   - User ID ZAWSZE z tokenu JWT (context.locals)
   - NIGDY z request body
   - Middleware już weryfikuje token

### Różnice między GET i POST /api/matches

- **GET**: Używa `createPaginatedResponse()`, wywołuje `getMatchesPaginated()`
- **POST**: Używa `createSuccessResponse(data, 201)`, wywołuje `createMatch()`
- **Wspólne**: Ten sam plik (`index.ts`), te same utilities, te same error handling patterns
