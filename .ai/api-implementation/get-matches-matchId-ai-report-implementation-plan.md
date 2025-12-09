# API Endpoint Implementation Plan: GET /api/matches/{matchId}/ai-report

## 1. Przegląd punktu końcowego

Endpoint służy do pobierania raportu AI wygenerowanego dla zakończonego meczu. Raport zawiera podsumowanie meczu oraz rekomendacje treningowe utworzone przez AI na podstawie przebiegu gry.

**Kluczowe cechy:**

- Wymaga autoryzacji (JWT token)
- Weryfikuje ownership meczu
- Zwraca różne statusy AI: pending, success, error
- Dostępny tylko dla meczów z flagą `generate_ai_summary = true`

## 2. Szczegóły żądania

- **Metoda HTTP:** GET
- **Struktura URL:** `/api/matches/{matchId}/ai-report`
- **Parametry:**
  - **Wymagane:**
    - `matchId` (path parameter, integer) - ID meczu
  - **Opcjonalne:** Brak
- **Request Headers:**
  - `Authorization: Bearer {supabase_jwt_token}` (wymagany)
- **Request Body:** Brak (metoda GET)

## 3. Wykorzystywane typy

- **Response type:** `AiReportResponse` (zdefiniowany w `types.ts`)
- **DTO:** `AiReportDto` (zdefiniowany w `types.ts`)
- **Validation schema:** `idParamSchema` (zdefiniowany w `common.schemas.ts` zgodnie z shared-implementation-plan.md)

## 4. Szczegóły odpowiedzi

### Sukces (200 OK):

**Struktura:** `AiReportResponse` (opakowuje `AiReportDto` w `data` wrapper zgodnie z `SingleItemResponseDto`)

**Przykład - AI generation success:**

```json
{
  "data": {
    "id": 789,
    "match_id": 124,
    "ai_status": "success",
    "ai_summary": "Mecz był wyrównany...",
    "ai_recommendations": "1. Trenować odbiór...",
    "ai_error": null,
    "ai_generated_at": "2024-01-15T16:01:30Z",
    "created_at": "2024-01-15T16:00:00Z"
  }
}
```

**Przykład - AI generation pending:**

```json
{
  "data": {
    "id": 789,
    "match_id": 124,
    "ai_status": "pending",
    "ai_summary": null,
    "ai_recommendations": null,
    "ai_error": null,
    "ai_generated_at": null,
    "created_at": "2024-01-15T16:00:00Z"
  }
}
```

**Przykład - AI generation failed:**

```json
{
  "data": {
    "id": 789,
    "match_id": 124,
    "ai_status": "error",
    "ai_summary": null,
    "ai_recommendations": null,
    "ai_error": "OpenRouter API timeout",
    "ai_generated_at": null,
    "created_at": "2024-01-15T16:00:00Z"
  }
}
```

### Błędy:

Struktura błędów zgodna z `ErrorResponseDto` opisaną w shared-implementation-plan.md

| Kod | Scenariusz               | Message                                   |
| --- | ------------------------ | ----------------------------------------- |
| 401 | Brak/nieprawidłowy token | "Missing or invalid authentication token" |
| 404 | Mecz nie istnieje        | "Match not found"                         |
| 404 | Brak dostępu do meczu    | "Match not found"                         |
| 404 | AI report niedostępny    | "AI report not available for this match"  |
| 500 | Błąd serwera             | "An unexpected error occurred"            |

## 5. Przepływ danych

### Sekwencja operacji:

1. **Walidacja path parameter** - użycie `idParamSchema` z shared components
2. **Weryfikacja autoryzacji** - sprawdzenie `context.locals.user` (middleware)
3. **Wywołanie AI Service** - `getAiReportByMatchId()` (logika opisana w shared-implementation-plan.md)
4. **Obsługa null result** - rozróżnienie scenariuszy 404 przez dodatkowe wywołanie `getMatchById`
5. **Zwrócenie odpowiedzi** - opakowanie w response wrapper z shared components

### Interakcje z bazą danych:

**Logika queries jest opisana w AI Service w shared-implementation-plan.md**

**Kluczowe punkty:**

- Maksymalnie 2-3 queries (w zależności od scenariusza not found)
- Weryfikacja ownership na poziomie DB queries
- Brak N+1 problem

## 6. Względy bezpieczeństwa

### Autoryzacja i ownership:

- **JWT Token** - weryfikacja przez middleware
- **Database-level verification** - wszystkie queries zawierają `user_id = userId`
- **Information disclosure prevention** - jednolite komunikaty 404 dla różnych scenariuszy

### Ochrona:

- **SQL Injection** - chronione przez Supabase client (parametryzowane queries)
- **Path traversal** - walidacja matchId przez Zod schema
- **Information disclosure** - brak różnicowania między "not found" a "forbidden"

### Najlepsze praktyki:

Zgodne z guidelines opisanymi w shared-implementation-plan.md - nie ujawniać istnienia zasobów należących do innych użytkowników

## 7. Obsługa błędów

### Wykorzystanie shared components:

**Response utilities** - wszystkie funkcje z `api-response.ts` opisane w shared-implementation-plan.md

**Error classes** - `DatabaseError`, `NotFoundError` z `api-errors.ts` opisane w shared-implementation-plan.md

**Logging** - `logError()` z `logger.ts` opisany w shared-implementation-plan.md

### Mapowanie błędów:

| Error Type          | HTTP Status | Response Function                                    |
| ------------------- | ----------- | ---------------------------------------------------- |
| ZodError            | 422         | createValidationErrorResponse                        |
| user === null       | 401         | createUnauthorizedResponse                           |
| Service return null | 404         | createNotFoundResponse (z rozróżnieniem scenariuszy) |
| DatabaseError       | 500         | createInternalErrorResponse                          |
| Inne błędy          | 500         | createInternalErrorResponse                          |

### Try-catch structure:

Standardowa struktura zgodna z innymi endpointami - walidacja → autoryzacja → service call → error handling

## 8. Wydajność

### Optymalizacje:

- Maksymalnie 2 queries do bazy danych (opisane w AI Service w shared-implementation-plan.md)
- Early returns dla autoryzacji i walidacji
- Indexed queries (primary keys i unique constraints)

### Potencjalne wąskie gardła:

**Brak** - endpoint jest bardzo prosty (2 queries typu SELECT)

### Monitoring:

- Logowanie błędów zgodnie z shared components
- Czas odpowiedzi: oczekiwany < 100ms

## 9. Etapy implementacji

### Krok 1: Rozszerzenie AI Service

**Plik:** `src/lib/services/ai.service.ts`

**Implementacja nowej metody `getAiReportByMatchId`**

Szczegółowa logika implementacji, parametry, error handling i uwagi są opisane w AI Service w shared-implementation-plan.md.

**Kluczowe aspekty:**

- Weryfikacja ownership meczu
- Sprawdzenie flagi `generate_ai_summary`
- Pobranie AI report z mapowaniem na DTO
- Return null dla różnych scenariuszy not found (endpoint rozróżni je)

### Krok 2: Utworzenie pliku endpointu

**Plik:** `src/pages/api/matches/[matchId]/ai-report.ts`

**Wymagane:**

- `export const prerender = false` - zgodnie z guidelines dla API routes w Astro

### Krok 3: Implementacja handlera GET

**Funkcja:** `GET(context: APIContext)`

**Sekwencja operacji:**

1. **Walidacja path parameter** - użycie `idParamSchema` z common.schemas.ts
2. **Weryfikacja autoryzacji** - sprawdzenie `context.locals.user`
3. **Wywołanie service** - `getAiReportByMatchId(supabase, userId, matchId)`
4. **Obsługa null result:**
   - Service zwraca null dla trzech scenariuszy: mecz nie istnieje/brak dostępu, generate_ai_summary=false, AI report nie istnieje
   - Endpoint musi rozróżnić te scenariusze poprzez dodatkowe wywołanie `getMatchById`
   - Zwrócenie odpowiedniego komunikatu 404 dla każdego scenariusza
5. **Zwrócenie sukcesu** - opakowanie w `createSuccessResponse`
6. **Error handling** - zgodnie z shared components (logowanie i mapowanie błędów)

### Krok 4: Dodanie importów

**W pliku endpointu:**

- Astro types (`APIContext`)
- Services: `getAiReportByMatchId`, `getMatchById`
- Schemas: `idParamSchema` z common.schemas.ts
- Response utilities z api-response.ts (5 funkcji)
- Error classes: `DatabaseError`
- Logger: `logError`

**W ai.service.ts:**

- Importy zgodne z shared-implementation-plan.md (SupabaseClient, typy, error classes)

### Krok 5: Weryfikacja typów

**Sprawdzenie zgodności:**

- `AiReportDto` poprawnie definiuje wszystkie pola z `matches_ai_reports`
- `AiReportResponse` używa `SingleItemResponseDto<AiReportDto>`
- Wszystkie typy są eksportowane z `types.ts`

**TypeScript compilation:**

```bash
npx tsc --noEmit
```

### Krok 6: Obsługa linter errors

**Uruchomienie lintera:**

```bash
npm run lint
```

**Poprawienie błędów:**

- Unused imports
- Naming conventions
- Code formatting

### Krok 7: Code review

**Sprawdzenie:**

- Zgodność z coding guidelines
- Error handling we wszystkich scenariuszach
- Security best practices (information disclosure prevention)
- Proper typing
- Consistent naming

---

## Podsumowanie

Endpoint GET /api/matches/{matchId}/ai-report jest prostym endpointem odczytu, który:

- Pobiera raport AI dla meczu
- Weryfikuje ownership na poziomie bazy danych
- Obsługuje różne statusy AI (pending/success/error)
- Implementuje information disclosure prevention
- Wykorzystuje istniejące shared components
- Wymaga tylko 1 nowej metody w AI Service

**Złożoność:** Niska  
**Szacowany czas implementacji:** 1-2 godziny  
**Zależności:** AI Service (rozszerzenie)
