# API Endpoint Implementation Plan: POST /api/sets/{id}/finish

## 1. Przegląd punktu końcowego

Endpoint służy do zakończenia seta w trwającym meczu. Waliduje poprawność wyniku (brak remisu), oznacza set jako zakończony, aktualizuje wynik meczowy i automatycznie tworzy następny set jeśli mecz nie jest jeszcze zakończony. Zwraca informacje o zakończonym secie oraz nowo utworzonym secie.

**Główne operacje:**

- Walidacja path parameter i request body
- Wywołanie `finishSet` z `set.service.ts` (logika opisana w shared-implementation-plan.md)
- Formatowanie response z wykorzystaniem utilities
- Obsługa błędów rzucanych przez service

## 2. Szczegóły żądania

### Metoda HTTP

POST

### Struktura URL

`/api/sets/{id}/finish`

### Path Parameters

- **id** (integer, required) - ID seta do zakończenia
  - Walidacja: `idParamSchema` z `common.schemas.ts`

### Request Headers

```
Authorization: Bearer {supabase_jwt_token}
Content-Type: application/json
```

### Request Body

```typescript
{
  coach_notes?: string | null
}
```

- **Typ:** `FinishSetCommandDto` z `types.ts`
- **Schema walidacji:** `finishSetCommandSchema` z `set.schemas.ts`

## 3. Wykorzystywane typy

Wszystkie typy są zdefiniowane w `src/types.ts`:

- `FinishSetCommandDto` - request body
- `FinishSetDto` - response DTO (finished_set + next_set)
- `FinishedSetDto` - informacje o zakończonym secie
- `CurrentSetDto` - informacje o nowym secie
- `FinishSetResponse` - `SingleItemResponseDto<FinishSetDto>`

## 4. Szczegóły odpowiedzi

### Success Response (200 OK)

```json
{
  "data": {
    "finished_set": {
      "id": 456,
      "is_finished": true,
      "winner": "player",
      "set_score_player": 11,
      "set_score_opponent": 8,
      "finished_at": "2024-01-15T14:45:00Z"
    },
    "next_set": {
      "id": 457,
      "sequence_in_match": 2,
      "is_golden": false,
      "set_score_player": 0,
      "set_score_opponent": 0,
      "is_finished": false,
      "current_server": "opponent"
    }
  }
}
```

- **Generowanie:** `createSuccessResponse` z `api-response.ts`
- **Status:** 200

### Error Responses

| Status | Kod błędu        | Komunikat                                                 | Kiedy                                    |
| ------ | ---------------- | --------------------------------------------------------- | ---------------------------------------- |
| 401    | UNAUTHORIZED     | Missing or invalid authentication token                   | Brak/nieprawidłowy token                 |
| 404    | NOT_FOUND        | Set not found                                             | Set nie istnieje lub brak dostępu        |
| 422    | VALIDATION_ERROR | Validation failed                                         | Nieprawidłowy format path param lub body |
| 422    | VALIDATION_ERROR | Set is already finished                                   | Set już zakończony                       |
| 422    | VALIDATION_ERROR | Cannot finish set: match is already finished              | Mecz zakończony                          |
| 422    | VALIDATION_ERROR | Cannot finish set: score is tied                          | Wynik remisowy                           |
| 422    | VALIDATION_ERROR | Cannot finish last set: use finish match endpoint instead | Ostatni możliwy set                      |
| 500    | DATABASE_ERROR   | Database operation failed                                 | Błąd bazy danych                         |
| 500    | INTERNAL_ERROR   | An unexpected error occurred                              | Nieoczekiwany błąd                       |

**Utilities:** Wszystkie z `api-response.ts`

## 5. Przepływ danych

### High-level flow

```
1. Request → Middleware (auth) → Handler
2. Walidacja path parameter (idParamSchema)
3. Walidacja request body (finishSetCommandSchema)
4. Wywołanie set.service.finishSet()
5. Zwrócenie response 200 z FinishSetDto
```

### Service layer

**Funkcja:** `finishSet` z `set.service.ts`

**Opis logiki:** Szczegółowa logika biznesowa, walidacje i operacje bazodanowe są opisane w shared-implementation-plan.md w sekcji Set Service.

**Obsługa błędów przez service:**

- Return `null` - set nie istnieje lub brak dostępu (handler zwróci 404)
- Throw `ApiError` (422) - walidacja biznesowa nie przeszła
- Throw `DatabaseError` (500) - błąd operacji bazodanowych

## 6. Względy bezpieczeństwa

### Autoryzacja

- **Middleware:** Weryfikacja JWT token, ekstrakcja user do context.locals
- **Service:** Weryfikacja user_id w każdym query

### Input validation

- Path parameter: Zod schema (`idParamSchema`)
- Request body: Zod schema (`finishSetCommandSchema`)

### Information disclosure prevention

- Return 404 dla both "not found" i "access denied"
- Nie ujawnianie szczegółów błędów bazodanowych

### Business logic validation

Walidacje wykonywane w service:

- Mecz jest in_progress
- Wynik nie jest remisowy
- To nie ostatni możliwy set
- Set nie jest już zakończony

## 7. Obsługa błędów

### 7.1. Walidacja wejściowa (422)

**Path parameter:**

- Walidacja używając `idParamSchema.safeParse()`
- Return `createValidationErrorResponse()` jeśli niepoprawny

**Request body:**

- Walidacja używając `parseRequestBody()` z `finishSetCommandSchema`
- Return `createValidationErrorResponse()` dla ZodError
- Return 400 dla invalid JSON

### 7.2. Autoryzacja (401)

- Sprawdzenie czy `context.locals.user` istnieje
- Return `createUnauthorizedResponse()` jeśli brak

### 7.3. Service errors

**Try block:**

- Wywołanie `finishSet()` z service
- Return 404 jeśli result jest null
- Return 200 z result jeśli sukces

**Catch block:**

- `NotFoundError` → return `createNotFoundResponse()`
- `ApiError` → logowanie + return error z odpowiednim statusCode
- `DatabaseError` → logowanie + return `createInternalErrorResponse()`
- Unexpected errors → logowanie + return `createInternalErrorResponse()`

## 8. Wydajność

### Database queries

Liczba queries wykonywanych przez service: 6

Szczegóły operacji bazodanowych opisane w shared-implementation-plan.md w sekcji Set Service, funkcja `finishSet`.

### Response size

Estimate: ~200-400 bytes JSON (finished_set + next_set)

## 9. Etapy wdrożenia

### Krok 1: Utworzenie pliku endpointu

- Lokalizacja: `src/pages/api/sets/[id]/finish.ts`
- Export `prerender = false`

### Krok 2: Implementacja POST handler

**Struktura funkcji:**

- Export async function POST przyjmującej APIContext
- Try-catch block dla obsługi błędów

**Logika w try block:**

1. Auth check - pobranie user z context.locals, return 401 jeśli brak
2. Path param validation - walidacja ID używając idParamSchema
3. Request body validation - walidacja body używając finishSetCommandSchema
4. Service call - wywołanie finishSet z set.service.ts
5. Success response - zwrócenie 200 z użyciem createSuccessResponse

**Logika w catch block:**

- Obsługa NotFoundError → 404
- Obsługa ApiError → zwrócenie error.statusCode z error.message
- Obsługa DatabaseError → 500 z logowaniem
- Catch-all dla unexpected errors → 500 z logowaniem

### Krok 3: Weryfikacja implementacji service

Sprawdzić czy `finishSet` w `set.service.ts` jest zaimplementowany zgodnie ze specyfikacją w shared-implementation-plan.md.

### Krok 4: Testowanie manualne

**Test cases:**

1. **Happy path** - POST z valid token i body → 200 OK z finished_set i next_set
2. **Invalid ID** - POST /api/sets/abc/finish → 422 Validation error
3. **Unauthorized** - POST bez tokenu → 401 Unauthorized
4. **Set not found** - POST z non-existent ID → 404 Not Found
5. **Score tied** - POST gdzie wynik 10:10 → 422 Cannot finish set: score is tied
6. **Match finished** - POST gdzie mecz finished → 422 Cannot finish set: match is already finished
7. **Last set** - POST gdzie to ostatni możliwy set → 422 Cannot finish last set: use finish match endpoint
8. **Already finished** - POST gdzie set.is_finished=true → 422 Set is already finished
9. **With coach_notes** - POST z coach_notes → 200 OK z notatkami
10. **Without coach_notes** - POST z {} → 200 OK bez notatek

### Krok 5: Code review

**Checklist:**

- [ ] Wszystkie importy poprawne
- [ ] TypeScript types używane wszędzie
- [ ] Error handling kompletny
- [ ] Logging dla wszystkich błędów
- [ ] Wykorzystanie shared components
- [ ] Zgodność z coding guidelines
- [ ] Proper HTTP status codes
- [ ] Response format zgodny z API spec

### Krok 6: Linting i build

```bash
npm run lint
npm run format
npm run build
```

---

## Podsumowanie

**Wykorzystywane shared components:**

- ✅ `api-response.ts` - response utilities
- ✅ `api-errors.ts` - error classes
- ✅ `zod-helpers.ts` - parseRequestBody
- ✅ `logger.ts` - logError
- ✅ `common.schemas.ts` - idParamSchema
- ✅ `set.schemas.ts` - finishSetCommandSchema
- ✅ `set.service.ts` - finishSet (logika w shared-implementation-plan.md)

**Do utworzenia:**

- 🆕 `src/pages/api/sets/[id]/finish.ts` - endpoint handler

**Estymowany czas:** ~1.5 godziny (handler: 45 min, testy: 30 min, review: 15 min)

**Uwagi:**

- Service logic szczegółowo opisany w shared-implementation-plan.md
- Handler skupia się tylko na routing, validation i response formatting
- Wszystkie typy DTO zdefiniowane w types.ts
