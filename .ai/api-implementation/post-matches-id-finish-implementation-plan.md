# API Endpoint Implementation Plan: POST /api/matches/{id}/finish

## 1. Przegląd punktu końcowego

Endpoint służy do zakończenia trwającego meczu tenisa stołowego. Wykonuje kompleksową walidację wyników (bieżącego seta i ogólnego wyniku meczowego), finalizuje ostatni set, aktualizuje status meczu oraz opcjonalnie triggeruje asynchroniczną generację raportu AI. Dodatkowo rejestruje zdarzenie analityczne.

**Kluczowe operacje:**

- Walidacja możliwości zakończenia meczu (status, wyniki)
- Zakończenie bieżącego (ostatniego) seta z określeniem zwycięzcy
- Aktualizacja meczu do statusu 'finished'
- Opcjonalne uruchomienie generacji raportu AI (asynchroniczne)
- Utworzenie zdarzenia analitycznego 'match_finished'

## 2. Szczegóły żądania

- **Metoda HTTP**: POST
- **Struktura URL**: `/api/matches/{id}/finish`
- **Content-Type**: `application/json`
- **Authorization**: Bearer token (JWT z Supabase Auth)

### Parametry

**Path Parameters (wymagane):**

- `id` (integer) - ID meczu do zakończenia

**Request Body (opcjonalne):**

- `coach_notes` (string | null) - Notatki trenera dla zakończonego meczu

### Przykład żądania

```json
{
  "coach_notes": "Excellent performance in decisive moments. Work on backhand consistency."
}
```

## 3. Wykorzystywane typy

Z pliku `src/types.ts`:

- **Request Command**: `FinishMatchCommandDto`
- **Response DTO**: `FinishMatchDto`
- **Response Wrapper**: `FinishMatchResponse` (alias dla `SingleItemResponseDto<FinishMatchDto>`)
- **Validation Types**: `ValidatedIdParam`, `ValidatedFinishMatchCommand`

Wszystkie typy są już zdefiniowane zgodnie z specyfikacją w `types.ts`.

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)

```json
{
  "data": {
    "id": 124,
    "status": "finished",
    "sets_won_player": 3,
    "sets_won_opponent": 1,
    "ended_at": "2024-01-15T16:00:00Z",
    "ai_report_status": "pending"
  }
}
```

**Uwagi:**

- `ai_report_status` może być: `"pending"` (jeśli generate_ai_summary=true), `null` (jeśli generate_ai_summary=false)
- `ended_at` jest ustawiane automatycznie przez backend na moment zakończenia

### Błędy

Wykorzystanie funkcji z `shared-components/api-response.ts`:

- **401 Unauthorized**: Brak lub nieprawidłowy token JWT
- **403 Forbidden**: Użytkownik nie jest właścicielem meczu
- **404 Not Found**: Mecz o podanym ID nie istnieje
- **422 Unprocessable Entity**:
  - Mecz jest już zakończony (`status === 'finished'`)
  - Wynik bieżącego seta jest remisowy
  - Wynik ogólny (po doliczeniu bieżącego seta) jest remisowy
- **500 Internal Server Error**: Błąd bazy danych lub nieoczekiwany błąd

## 5. Przepływ danych

### 5.1. Przygotowanie i walidacja

1. **Middleware** (`src/middleware/index.ts`): Weryfikacja JWT tokenu, wyciągnięcie userId
2. **Walidacja path param**: Użycie `idParamSchema` z `common.schemas.ts`
3. **Walidacja body**: Użycie `finishMatchCommandSchema` z `match.schemas.ts`
4. **Parsowanie**: Funkcje `parseRequestBody` z `zod-helpers.ts`

### 5.2. Logika biznesowa (w match.service.ts)

Endpoint wykorzystuje metodę `finishMatch` z `match.service.ts` (szczegóły w `shared-implementation-plan.md`, sekcja 5.5):

**Kluczowe operacje:**

1. **Walidacja meczu**: Sprawdzenie istnienia, statusu (musi być 'in_progress'), autoryzacji
2. **Walidacja bieżącego seta**: Pobranie nieukończonego seta i walidacja że wynik nie jest remisowy
3. **Zakończenie bieżącego seta**: Określenie zwycięzcy i aktualizacja statusu seta
4. **Obliczenie wyniku meczowego**: Zsumowanie wygranych setów i walidacja że wynik nie jest remisowy
5. **Aktualizacja meczu**: Ustawienie statusu 'finished', ended_at, sets_won, coach_notes
6. **AI report**: Utworzenie rekordu (jeśli generate_ai_summary=true) i asynchroniczne wywołanie generacji
7. **Analytics**: Rejestracja zdarzenia 'match_finished' (fire-and-forget)
8. **Response**: Zwrócenie `FinishMatchDto`

**Walidacje biznesowe:**

- Status meczu musi być 'in_progress' (nie można zakończyć już zakończonego meczu)
- Wynik bieżącego seta nie może być remisowy
- Wynik ogólny (po doliczeniu bieżącego seta) nie może być remisowy

**Obsługa błędów:**

- `NotFoundError` - mecz nie istnieje lub user nie jest właścicielem
- `ApiError` (422) - walidacja biznesowa nie przeszła
- `DatabaseError` - błąd operacji bazodanowych

### 5.3. Zwrócenie odpowiedzi

- Użycie `createSuccessResponse<FinishMatchDto>` z `api-response.ts`
- Status: 200 OK

## 6. Względy bezpieczeństwa

### 6.1. Autentykacja

- **JWT token**: Weryfikowany przez middleware Astro
- Użycie `context.locals.supabase` (authenticated client)
- Wyciągnięcie `userId` z `context.locals.user.id`

### 6.2. Autoryzacja

- **RLS**: Row Level Security w Supabase zapewnia że użytkownik widzi tylko swoje mecze
- **Dodatkowa walidacja**: Sprawdzenie że `match.user_id === userId`
- **403 Forbidden**: Jeśli użytkownik próbuje zakończyć cudzy mecz

### 6.3. Walidacja danych

- **Zod schemas**: Walidacja wszystkich inputów przed przetwarzaniem
- **Type safety**: TypeScript zapewnia poprawność typów w całym przepływie
- **SQL Injection**: Ochrona przez Supabase client (parametryzowane queries)

### 6.4. Race Conditions

**Problem**: Dwa równoległe requesty mogą próbować zakończyć ten sam mecz.

**Rozwiązanie**:

- Sprawdzenie `status === 'in_progress'` na początku transakcji
- Pierwszy request zakończy mecz, drugi dostanie błąd 422 (already finished)
- Można rozważyć optymistic locking w przyszłości

### 6.5. Data Integrity

- Walidacja że wynik bieżącego seta nie jest remisowy
- Walidacja że wynik ogólny nie jest remisowy
- Brak dodatkowych warunków zakończenia (np. min punktów) - trener może zakończyć mecz w dowolnym momencie gdy wyniki nie są remisowe

## 7. Obsługa błędów

### 7.1. Scenariusze błędów

| Kod | Typ błędu            | Warunek                    | Response Function                                                                                |
| --- | -------------------- | -------------------------- | ------------------------------------------------------------------------------------------------ |
| 401 | Unauthorized         | Brak/invalid JWT           | `createUnauthorizedResponse()`                                                                   |
| 403 | Forbidden            | User nie jest właścicielem | `createErrorResponse('FORBIDDEN', ...)`                                                          |
| 404 | Not Found            | Match nie istnieje         | `createNotFoundResponse('Match not found')`                                                      |
| 422 | Validation Error     | Zod validation failed      | `createValidationErrorResponse(zodError)`                                                        |
| 422 | Business Logic Error | Match already finished     | `createErrorResponse('VALIDATION_ERROR', 'Match is already finished', 422)`                      |
| 422 | Business Logic Error | Bieżący set remisowy       | `createErrorResponse('VALIDATION_ERROR', 'Cannot finish match: current set score is tied', 422)` |
| 422 | Business Logic Error | Wynik ogólny remisowy      | `createErrorResponse('VALIDATION_ERROR', 'Cannot finish match: overall score is tied', 422)`     |
| 500 | Database Error       | DB operation failed        | `createInternalErrorResponse()`                                                                  |
| 500 | Unexpected Error     | Catch-all                  | `createInternalErrorResponse()`                                                                  |

### 7.2. Error Handling Pattern

```typescript
try {
  // Walidacja path param
  // Walidacja body
  // Logika biznesowa (service call)
  // Zwrócenie odpowiedzi
} catch (error) {
  if (error instanceof ApiError) {
    // Obsługa known errors (NotFoundError, ValidationError, etc.)
    logError(endpoint, error, context);
    return createErrorResponse(error.code, error.message, error.statusCode, error.details);
  }
  // Obsługa unexpected errors
  logError(endpoint, error, context);
  return createInternalErrorResponse();
}
```

### 7.3. Logowanie

Użycie `logError` z `logger.ts` dla wszystkich błędów:

- Context: endpoint, userId, matchId, body
- Stack trace dla unexpected errors
- Structured logging dla łatwiejszego debugowania

## 8. Wydajność

### 8.1. Optymalizacje

1. **Minimalizacja queries**:
   - 1 query: pobranie meczu (SELECT z user_id check)
   - 1 query: pobranie bieżącego seta (SELECT WHERE is_finished=false)
   - 1 query: aktualizacja seta (UPDATE is_finished, winner, finished_at)
   - 1 query: obliczenie sets_won (SELECT ... GROUP BY winner)
   - 1 query: aktualizacja meczu (UPDATE status, ended_at, sets_won, coach_notes)
   - 1 query: insert AI report - tylko jeśli generate_ai_summary=true
   - 1 query: insert analytics event - fire-and-forget
   - **Razem: 6-7 queries** (7 jeśli AI enabled)

2. **Indeksy** (zakładam że istnieją):
   - `matches.id` (PK, automatyczny)
   - `matches.user_id` (dla RLS)
   - `sets.match_id` (FK)
   - `sets.is_finished` (dla znajdowania bieżącego seta)
   - Composite: `(match_id, is_finished, sequence_in_match)` byłby optymalny

3. **Asynchroniczne operacje**:
   - AI generation: fire-and-forget, nie blokuje response
   - Analytics event: fire-and-forget, nie blokuje response

### 8.2. Potencjalne wąskie gardła

1. **AI generation**: Może być wolna (10-30s), dlatego asynchroniczna
2. **Database locks**: UPDATE na meczu może zablokować inne operacje (ale krótkotrwałe)
3. **Race conditions**: Dwa równoległe finish requests (rozwiązane przez sprawdzenie statusu)

### 8.3. Oczekiwany czas odpowiedzi

- **Typowy case**: < 200ms (5-6 DB queries)
- **Worst case**: < 500ms (jeśli DB pod obciążeniem)
- AI generation działa w tle, nie wpływa na response time

## 9. Etapy implementacji

### Krok 1: Weryfikacja shared components

**Wymagane komponenty** (muszą być zaimplementowane przed endpointem):

- ✓ `ai.service.ts` - metody `createAiReportRecord` i `generateAiReport` (szczegóły w `shared-implementation-plan.md`, sekcja 8)
- ✓ `match.service.ts` - rozbudowana metoda `finishMatch` (szczegóły w `shared-implementation-plan.md`, sekcja 5.5)
- ✓ `analytics.service.ts` - metoda `trackEvent`
- ✓ `api-response.ts`, `api-errors.ts`, `zod-helpers.ts` utilities
- ✓ `match.schemas.ts` - schema `finishMatchCommandSchema`
- ✓ `common.schemas.ts` - schema `idParamSchema`

### Krok 2: Utworzenie endpoint handler

**Plik**: `src/pages/api/matches/[id]/finish.ts`

**Struktura**:

```typescript
export const prerender = false;

export async function POST(context: APIContext): Promise<Response> {
  // 1. Wyciągnięcie supabase i user z context.locals
  // 2. Sprawdzenie autentykacji (user !== null)
  // 3. Walidacja path param (id) używając idParamSchema
  // 4. Walidacja body używając finishMatchCommandSchema
  // 5. Wywołanie match.service.finishMatch()
  // 6. Obsługa błędów (try-catch z ApiError handling)
  // 7. Zwrócenie createSuccessResponse<FinishMatchDto>()
}
```

**Error handling**:

- Użycie pattern opisanego w sekcji 7.2
- Logowanie wszystkich błędów z kontekstem
- Mapowanie ApiError na odpowiednie response functions

### Krok 3: Integracja i testy

**Weryfikacja że endpoint wykorzystuje shared components**:

- ✓ `api-response.ts` utilities (createSuccessResponse, createErrorResponse, etc.)
- ✓ `api-errors.ts` classes (ApiError, NotFoundError, DatabaseError)
- ✓ `zod-helpers.ts` functions (parseRequestBody)
- ✓ `match.schemas.ts` (finishMatchCommandSchema)
- ✓ `common.schemas.ts` (idParamSchema)
- ✓ `analytics.service.ts` (trackEvent)
- ✓ `logger.ts` (logError)

**Weryfikacja bezpieczeństwa:**

- Sprawdzenie że RLS policies są aktywne dla `matches` table
- Weryfikacja że user_id jest sprawdzany w service
- Test scenariusza: user próbuje zakończyć cudzy mecz (powinno dać 403)

### Krok 4: Finalizacja

- Code review zgodnie z `.cursor/rules/`
- Sprawdzenie linter warnings
- Weryfikacja że wszystkie typy są zgodne z `types.ts`
- Sprawdzenie że dokumentacja (JSDoc) jest kompletna

---

**Uwagi końcowe**:

1. **Zależność od shared components**: Endpoint wymaga pełnej implementacji `ai.service.ts` i rozbudowanej metody `finishMatch` w `match.service.ts` (szczegóły w `shared-implementation-plan.md`).

2. **Asynchroniczność AI**: Generacja raportu AI musi być fire-and-forget, aby nie blokować response. Implementacja w `ai.service.ts`.

3. **Analytics**: Event 'match_finished' jest rejestrowany fire-and-forget, błędy nie propagują się do użytkownika.

4. **Walidacja wyników**: Endpoint waliduje tylko że wyniki nie są remisowe (bieżący set i wynik ogólny). Brak walidacji minimalnej liczby punktów lub różnicy - mecz można zakończyć w dowolnym momencie gdy wyniki nie są remisowe.

5. **Race conditions**: Obecne rozwiązanie (sprawdzenie statusu) jest wystarczające dla MVP. W przyszłości można dodać optymistic locking.

---

**Autor**: AI Assistant  
**Data**: 2025-12-01  
**Wersja**: 1.0
