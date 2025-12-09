# API Endpoint Implementation Plan: DELETE /api/sets/{setId}/points/last

## 1. Przegląd punktu końcowego

Endpoint do cofnięcia ostatniego zdobytego punktu w secie. Usuwa punkt i jego powiązania z tagami, przelicza wynik seta i określa aktualnego serwera na podstawie usuwanego punktu.

**Główne funkcje:**

- Weryfikacja uprawnień i stanu meczu/seta
- Znalezienie i usunięcie ostatniego punktu z jego tagami
- Aktualizacja wyniku seta
- Zwrócenie zaktualizowanego stanu seta z nowym current_server

**Kluczowe założenia biznesowe:**

- Można cofnąć punkt tylko w meczu będącym w trakcie (status = 'in_progress')
- Nie można cofnąć punktu w zakończonym secie
- Set musi mieć co najmniej jeden punkt do cofnięcia
- Serwer po cofnięciu = served_by z usuwanego punktu (nie wymaga ponownego obliczania)

---

## 2. Szczegóły żądania

### Metoda HTTP

DELETE

### Struktura URL

```
DELETE /api/sets/{setId}/points/last
```

### Path Parameters

- `setId` (integer, required) - ID seta, w którym cofamy ostatni punkt

### Request Headers

```
Authorization: Bearer {supabase_jwt_token}
```

### Query Parameters

Brak

### Request Body

Brak

---

## 3. Wykorzystywane typy

### Typy z types.ts

**Response DTOs:**

- `UndoPointDto` - struktura zawierająca ID usuniętego punktu i stan seta
- `SetStateDto` - stan seta po operacji
- `UndoPointResponse = SingleItemResponseDto<UndoPointDto>` - finalna odpowiedź API

**Schema Validation:**

- `idParamSchema` z common.schemas.ts - walidacja path parametru setId

---

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)

**Content-Type:** `application/json`

**Body:**

```json
{
  "data": {
    "deleted_point_id": 1003,
    "set_state": {
      "id": 456,
      "set_score_player": 7,
      "set_score_opponent": 5,
      "current_server": "player"
    }
  }
}
```

### Błędy

#### 401 Unauthorized

Brak lub nieprawidłowy JWT token (obsługa przez middleware).

#### 404 Not Found

Set nie znaleziony lub brak dostępu.

#### 422 Unprocessable Entity

**Możliwe komunikaty:**

- "Cannot undo point: match is already finished"
- "Cannot undo point: set is already finished"
- "Cannot undo point: set has no points"

#### 500 Internal Server Error

Nieoczekiwany błąd serwera lub bazy danych.

---

## 5. Przepływ danych

### Krok 1: Walidacja żądania

1. Middleware weryfikuje JWT token i wyciąga userId
2. Handler waliduje path parameter `setId` za pomocą `idParamSchema`

### Krok 2: Wywołanie Service

Handler wywołuje `undoLastPoint(supabase, userId, setId)` z point.service.ts (logika zaimplementowana zgodnie z shared-implementation-plan.md).

### Krok 3: Formatowanie odpowiedzi

Handler opakowuje rezultat w `createSuccessResponse(undoPointDto, 200)` i zwraca Response.

### Obsługa błędów

Wykorzystanie funkcji z api-response.ts:

- `ApiError` → `createErrorResponse`
- `NotFoundError` → `createNotFoundResponse`
- `DatabaseError` → `createInternalErrorResponse`
- Nieznane błędy → `createInternalErrorResponse` + logowanie

---

## 6. Względy bezpieczeństwa

### Uwierzytelnianie

JWT token weryfikowany przez middleware Astro zgodnie z shared-implementation-plan.md.

### Autoryzacja

Weryfikacja ownership na poziomie bazy danych - wszystkie queries zawierają warunek `user_id = userId`. Brak dostępu do seta zwracany jako 404 (information disclosure prevention).

### Walidacja danych wejściowych

Path parameter `setId` walidowany przez `idParamSchema` (liczba całkowita dodatnia).

### Zapobieganie race conditions

Operacje DELETE i UPDATE są atomowe w PostgreSQL. W przypadku równoczesnych wywołań undo, każdy request usuwa faktycznie ostatni punkt w momencie wykonania (MAX sequence_in_set).

---

## 7. Obsługa błędów

### Walidacja parametrów (422)

Nieprawidłowy format setId (np. string zamiast liczby) zwraca szczegółowy błąd walidacji zgodnie z shared-implementation-plan.md.

### Autoryzacja (401)

Brak tokenu JWT obsługiwany przez middleware.

### Not Found (404)

Set nie istnieje lub user nie jest właścicielem - oba scenariusze zwracają 404.

### Walidacja biznesowa (422)

- Match jest zakończony
- Set jest zakończony
- Brak punktów w secie

### Database Errors (500)

Błędy komunikacji z bazą danych logowane i zwracane jako ogólny błąd serwera.

---

## 8. Rozważania dotyczące wydajności

### Database Queries

Maksymalnie 6 queries zgodnie z implementacją w shared-implementation-plan.md:

1. SELECT set (weryfikacja ownership)
2. SELECT match (weryfikacja statusu)
3. SELECT last point (ORDER BY sequence_in_set DESC LIMIT 1)
4. DELETE point_tags
5. DELETE point
6. UPDATE set (zmniejszenie wyniku)

### Response Time Target

Cel: < 200ms dla 95 percentile (typowo 50-100ms).

---

## 9. Etapy implementacji

### Krok 1: Rozszerzenie Point Service

**Lokalizacja:** `src/lib/services/point.service.ts`

Dodanie funkcji `undoLastPoint` zgodnie ze specyfikacją w shared-implementation-plan.md.

### Krok 2: Utworzenie Astro Endpoint

**Lokalizacja:** `src/pages/api/sets/[setId]/points/last.ts`

1. Konfiguracja endpointa:

   ```typescript
   export const prerender = false;
   ```

2. Implementacja handler funkcji `DELETE`:
   - Import dependencies (services, schemas, utils)
   - Wyciągnięcie userId z `context.locals.user`
   - Check autoryzacji (401 jeśli brak user)
   - Walidacja path param `setId` przez `idParamSchema`
   - Try-catch block

3. Try block:
   - Wywołanie `undoLastPoint(supabase, userId, setId)`
   - Zwrot `createSuccessResponse(result, 200)`

4. Catch block zgodnie z shared-implementation-plan.md:
   - `ApiError` → `createErrorResponse`
   - `NotFoundError` → `createNotFoundResponse`
   - `DatabaseError` → logowanie + `createInternalErrorResponse`
   - Inne błędy → logowanie + `createInternalErrorResponse`

### Krok 3: Integracja z Shared Components

Wykorzystanie komponentów z shared-implementation-plan.md:

- Response utilities z api-response.ts
- Error classes z api-errors.ts
- Schema `idParamSchema` z common.schemas.ts
- Funkcja `getSetById` z set.service.ts
- Logger z logger.ts

### Krok 4: Weryfikacja typu odpowiedzi

Upewnić się że handler zwraca `UndoPointResponse` zgodnie z types.ts.

### Krok 5: Linting i Type Checking

1. TypeScript compiler: `npx tsc --noEmit`
2. Linter: `npm run lint`
3. Poprawić wszystkie błędy i warningi

### Krok 6: Code Review Checklist

- [ ] Kod zgodny z coding guidelines
- [ ] Error handling kompletny
- [ ] Używa shared components
- [ ] Wszystkie queries zawierają warunek `user_id`
- [ ] Response format zgodny z types.ts
- [ ] TypeScript kompiluje się bez błędów
- [ ] Linter nie zgłasza błędów
- [ ] Logowanie błędów zaimplementowane
- [ ] Endpoint handler używa `export const prerender = false`
- [ ] Używa `context.locals.supabase` zamiast importu klienta

---

## 10. Zależności

### Services

- point.service.ts - rozszerzenie o `undoLastPoint` (szczegóły w shared-implementation-plan.md)
- set.service.ts - wykorzystanie `getSetById`

### Utilities

- api-response.ts - formatowanie odpowiedzi
- api-errors.ts - klasy błędów
- logger.ts - logowanie błędów

### Schemas

- common.schemas.ts - walidacja setId

### Types

- types.ts - wszystkie typy DTO i response types

### Middleware

- src/middleware/index.ts - już zaimplementowany

---

## 11. Przykładowy flow request → response

### Request

```http
DELETE /api/sets/456/points/last HTTP/1.1
Host: localhost:4321
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Processing

1. Middleware weryfikuje JWT → wyciąga userId
2. Handler waliduje setId (456) → OK
3. Service wykonuje logikę zgodnie z shared-implementation-plan.md:
   - Weryfikuje set i mecz
   - Znajduje ostatni punkt (MAX sequence_in_set)
   - Zapisuje served_by jako currentServerAfterUndo
   - Usuwa point_tags
   - Usuwa punkt
   - Aktualizuje wynik seta
4. Handler opakowuje: `createSuccessResponse(undoPointDto, 200)`

### Response

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "deleted_point_id": 1003,
    "set_state": {
      "id": 456,
      "set_score_player": 7,
      "set_score_opponent": 5,
      "current_server": "player"
    }
  }
}
```

---

## 12. Uwagi dodatkowe

### Current server logic

`current_server` w response to serwer, który będzie serwował następny punkt. Po usunięciu punktu jest to `served_by` z usuwanego punktu (nie wymaga ponownego obliczania zgodnie z regułami tenisa stołowego).

### Różnice vs POST point

POST point oblicza served_by na podstawie całej historii punktów, DELETE point wykorzystuje zapisany served_by z usuwanego punktu (prostsze i wydajniejsze).

### Transakcje

Endpoint nie wymaga explicit transaction - pojedyncze operacje DELETE i UPDATE są atomowe w PostgreSQL.

---

**Autor planu:** AI Assistant  
**Data utworzenia:** 2025-12-07  
**Wersja:** 1.1  
**Endpoint:** DELETE /api/sets/{setId}/points/last
