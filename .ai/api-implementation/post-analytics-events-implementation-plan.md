# API Endpoint Implementation Plan: POST /api/analytics/events

## 1. Przegląd punktu końcowego

### Cel

Wewnętrzny endpoint API przeznaczony do rejestrowania zdarzeń analitycznych użytkowników. Jest wywoływany przez logikę backendową (nie bezpośrednio przez frontend) w celu śledzenia kluczowych akcji użytkownika: logowanie, utworzenie meczu, zakończenie meczu.

### Charakterystyka

- **Typ:** Internal API (backend-to-backend)
- **Autoryzacja:** Service Role Key (Supabase) - różni się od innych endpointów
- **Metoda:** POST
- **URL:** `/api/analytics/events`
- **Response:** 201 Created z danymi utworzonego eventu

### Różnice w stosunku do standardowych endpointów

- Używa **service role key** zamiast user JWT token
- Nie jest wywoływany bezpośrednio przez frontend
- Dedykowany do trackingu i analytics

---

## 2. Szczegóły żądania

### Metoda HTTP

`POST`

### Struktura URL

```
POST /api/analytics/events
```

### Request Headers

**Wymagane:**

```
Authorization: Bearer {supabase_service_role_key}
Content-Type: application/json
```

**UWAGA:** Token autoryzacyjny to **Supabase Service Role Key**, nie user JWT token.

### Request Body

**Typ:** `CreateAnalyticsEventCommandDto`

**Pola:**

- `user_id` - UUID użytkownika
- `type` - Typ eventu ('login' | 'match_created' | 'match_finished')
- `match_id` - Opcjonalnie ID meczu, wymagane dla match_created i match_finished

### Reguły walidacji

#### Pole: `user_id`

- **Typ:** string (UUID)
- **Wymagane:** TAK
- **Walidacja:** Format UUID v4

#### Pole: `type`

- **Typ:** enum
- **Wymagane:** TAK
- **Dozwolone wartości:** `'login'`, `'match_created'`, `'match_finished'`

#### Pole: `match_id`

- **Typ:** number | null
- **Wymagane:** Warunkowo
  - **NIE wymagane** gdy `type = 'login'`
  - **WYMAGANE** gdy `type = 'match_created'` lub `type = 'match_finished'`

**Schemat walidacji:** `createAnalyticsEventCommandSchema` z `@shared-implementation-plan.md` (Analytics Schemas)

---

## 3. Wykorzystywane typy

### Request i Response

**Request Body:**

- `CreateAnalyticsEventCommandDto` (z `types.ts`)

**Response:**

- `AnalyticsEventDto` - alias do `AnalyticsEvent` (dodać do types.ts w sekcji ANALYTICS DTOs)
- `CreateAnalyticsEventResponse` - typ SingleItemResponseDto (dodać do types.ts w sekcji FINAL API RESPONSE TYPES)

### Entity Types

- `AnalyticsEvent` - entity z bazy
- `AnalyticsEventInsert` - insert type
- `AnalyticsEventTypeEnum` - enum typu

---

## 4. Szczegóły odpowiedzi

### Success Response (201 Created)

**Status:** `201 Created`

**Struktura:** Owinięty event w data wrapper zgodnie z SingleItemResponseDto

**Pola zwracane:**

- `id` - ID utworzonego eventu
- `user_id` - UUID użytkownika
- `type` - Typ eventu
- `match_id` - ID meczu (jeśli dotyczy)
- `created_at` - Timestamp utworzenia

**Helper:** `createSuccessResponse(eventDto, 201)` z `@shared-implementation-plan.md` (API Response Utilities)

### Error Responses

#### 401 Unauthorized

Brak lub nieprawidłowy service role key.

**Helper:** `createUnauthorizedResponse('Missing or invalid service role key')`

#### 403 Forbidden

Token nie jest service role (np. user token).

**Helper:** `createErrorResponse('FORBIDDEN', 'Service role required for this endpoint', 403)`

#### 422 Unprocessable Entity

Walidacja danych nie przeszła.

**Helper:** `createValidationErrorResponse(zodError)` z `@shared-implementation-plan.md`

#### 500 Internal Server Error

Błąd bazy danych.

**Helper:** `createInternalErrorResponse('Failed to create analytics event')`

---

## 5. Przepływ danych

### Diagram

1. POST /api/analytics/events
2. Weryfikacja Service Role Key → (401/403 jeśli fail)
3. Parsowanie i walidacja request body → (422 jeśli fail)
4. Wywołanie analytics.service.createAnalyticsEvent()
5. INSERT do tabeli analytics_events → (500 jeśli fail)
6. Zwrot 201 Created z danymi eventu

### Szczegółowy przepływ

**Krok 1: Weryfikacja Service Role Key**

- Pobranie `Authorization` header
- Ekstrakcja tokenu z `Bearer {token}`
- Porównanie z `import.meta.env.SUPABASE_SERVICE_ROLE_KEY`
- Return 401/403 jeśli nieprawidłowy

**Krok 2: Walidacja body**

- Użycie `parseRequestBody` z `@shared-implementation-plan.md` (Zod Helper Utilities)
- Schemat: `createAnalyticsEventCommandSchema` z `@shared-implementation-plan.md` (Analytics Schemas)
- Walidacja warunkowa dla `match_id`

**Krok 3: Utworzenie eventu**

- Wywołanie `createAnalyticsEvent` z `@shared-implementation-plan.md` (Analytics Service)
- Obsługa błędów przez service

**Krok 4: Response**

- Użycie `createSuccessResponse` z `@shared-implementation-plan.md`

---

## 6. Względy bezpieczeństwa

### Autoryzacja Service Role

**Kluczowa różnica:** Ten endpoint używa service role key, nie user JWT token.

**Implementacja weryfikacji:**

- Pobrać Authorization header z requestu
- Sprawdzić format Bearer token
- Wyekstrahować token
- Porównać z `SUPABASE_SERVICE_ROLE_KEY` ze zmiennych środowiskowych
- Zwrócić 401 jeśli brak tokenu
- Zwrócić 403 jeśli token nieprawidłowy

**UWAGA:**

- Nie używamy `context.locals.supabase` (skonfigurowany dla user auth)
- Tworzymy osobnego clienta: `createSupabaseServiceClient()` z `@shared-implementation-plan.md` (Supabase Service Client)

### Walidacja danych

- Format UUID dla `user_id` - przez Zod
- Walidacja warunkowa `match_id` - przez schemat z `@shared-implementation-plan.md`
- Nie weryfikujemy istnienia user_id w bazie (analytics jest fire-and-forget)

### Ochrona przed enumeracją

Wszystkie błędy walidacji zwracają generyczne komunikaty - nie ujawniamy czy user_id istnieje.

---

## 7. Obsługa błędów

### Kody błędów

| Kod              | Status | Przyczyna                   | Helper                          |
| ---------------- | ------ | --------------------------- | ------------------------------- |
| UNAUTHORIZED     | 401    | Brak service role key       | `createUnauthorizedResponse`    |
| FORBIDDEN        | 403    | Token nie jest service role | `createErrorResponse`           |
| VALIDATION_ERROR | 422    | Walidacja danych            | `createValidationErrorResponse` |
| INTERNAL_ERROR   | 500    | Błąd bazy danych            | `createInternalErrorResponse`   |

**Wszystkie helpery z:** `@shared-implementation-plan.md` (API Response Utilities)

### Logowanie

Użycie `logError` z `@shared-implementation-plan.md` (Logger Utility) w bloku catch dla wszystkich nieoczekiwanych błędów.

### Szczególne przypadki

**user_id nie istnieje:** Utworzenie eventu mimo to (FK może mieć CASCADE/SET NULL)

**match_id nie istnieje:** Utworzenie eventu mimo to (FK ma ON DELETE SET NULL)

**Duplikat eventu:** Utworzenie nowego rekordu (brak unique constraints)

---

## 8. Wydajność

### Operacje bazodanowe

**Pojedynczy INSERT:** O(1) - stała złożoność

**Czas wykonania:** < 10ms (typowo 2-5ms)

### Brak zewnętrznych wywołań

Endpoint nie wykonuje wywołań HTTP ani skomplikowanych JOIN-ów.

---

## 9. Etapy implementacji

### Faza 1: Przygotowanie (10 min)

**Aktualizacja types.ts:**

- Dodać `AnalyticsEventDto` do sekcji "ANALYTICS DTOs"
- Dodać `CreateAnalyticsEventResponse` do sekcji "FINAL API RESPONSE TYPES"

### Faza 2: Endpoint Handler (30 min)

**Utworzenie struktury:**

- Katalog: `src/pages/api/analytics/`
- Plik: `src/pages/api/analytics/events.ts`

**Implementacja funkcji POST:**

**Krok 1: Weryfikacja Service Role Key**

- Pobrać Authorization header
- Sprawdzić format Bearer
- Wyekstrahować token
- Porównać z `SUPABASE_SERVICE_ROLE_KEY`
- Zwrócić 401 lub 403 jeśli nieprawidłowy

**Krok 2: Utworzenie Supabase clienta**

- Wywołać `createSupabaseServiceClient()` z `@shared-implementation-plan.md`

**Krok 3: Walidacja request body**

- Użyć `parseRequestBody` z `@shared-implementation-plan.md` (Zod Helper Utilities)
- Użyć `createAnalyticsEventCommandSchema` z `@shared-implementation-plan.md` (Analytics Schemas)
- Obsłużyć błędy JSON i walidacji

**Krok 4: Utworzenie eventu**

- Wywołać `createAnalyticsEvent` z `@shared-implementation-plan.md` (Analytics Service)
- Przekazać supabase clienta i zwalidowane dane

**Krok 5: Response**

- Zwrócić 201 Created przez `createSuccessResponse(event, 201)`

**Krok 6: Error handling**

- Try-catch owijający całą logikę
- Logowanie przez `logError` z `@shared-implementation-plan.md`
- Obsługa DatabaseError → 500
- Obsługa nieoczekiwanych błędów → 500

**Uwagi:**

- Ustawić `export const prerender = false`
- Wszystkie importy z odpowiednich sekcji `@shared-implementation-plan.md`

### Faza 3: Weryfikacja (10 min)

**Kompilacja:**

```bash
npx tsc --noEmit
```

**Linter:**
Sprawdzenie `src/pages/api/analytics/events.ts`

---

## 10. Checklist implementacji

### Przygotowanie

- [ ] `AnalyticsEventDto` dodany do `types.ts`
- [ ] `CreateAnalyticsEventResponse` dodany do `types.ts`

### Shared Components

Wykorzystywane z `@shared-implementation-plan.md`:

- [ ] `createSupabaseServiceClient` (Supabase Service Client)
- [ ] `createAnalyticsEvent` (Analytics Service)
- [ ] `createAnalyticsEventCommandSchema` (Analytics Schemas)
- [ ] API Response Utilities (wszystkie helpery)
- [ ] Zod Helper Utilities (`parseRequestBody`)
- [ ] Logger Utility (`logError`)

### Endpoint

- [ ] Katalog `src/pages/api/analytics/` utworzony
- [ ] `src/pages/api/analytics/events.ts` utworzony
- [ ] Handler POST zaimplementowany
- [ ] Weryfikacja service role key działa
- [ ] Wszystkie scenariusze błędów obsłużone
- [ ] `prerender = false` ustawione
- [ ] TypeScript kompiluje się
- [ ] Linter nie zgłasza błędów

---

## 11. Uwagi końcowe

### Użycie w systemie

**Różnica między funkcjami:**

- `trackEvent` - fire-and-forget, używany wewnętrznie przez inne endpointy
- `createAnalyticsEvent` - z walidacją i zwracaniem danych, używany przez ten endpoint

**Ten endpoint nie jest wywoływany przez:**

- POST /api/matches (używa `trackEvent` bezpośrednio)
- POST /api/matches/{id}/finish (używa `trackEvent` bezpośrednio)

**Ten endpoint może być używany przez:**

- Zewnętrzne microservices
- Backend jobs i scheduled tasks
- Future integrations

### Bezpieczeństwo

- Service role key przechowywany w zmiennych środowiskowych
- Endpoint nie wystawiony publicznie (backend-to-backend)
- Rate limiting kontrolowany przez backend

---

**Autor:** AI Assistant  
**Data:** 2025-12-07  
**Wersja:** 2.0
