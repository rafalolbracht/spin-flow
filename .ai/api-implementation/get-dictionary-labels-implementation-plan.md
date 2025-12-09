# API Endpoint Implementation Plan: GET /api/dictionary/labels

## 1. Przegląd punktu końcowego

Endpoint służy do pobierania etykiet UI dla enumów i wartości słownikowych używanych w aplikacji Spin Flow. Endpoint jest publiczny (nie wymaga uwierzytelniania) i zwraca listę etykiet z tabeli `dic_lookup_labels`. Obsługuje opcjonalne filtrowanie po domenie (np. "side_enum", "match_status_enum").

**Główne cechy:**

- Dostęp publiczny (bez uwierzytelniania)
- Proste zapytanie SELECT z opcjonalnym filtrem WHERE
- Zwraca kompletną listę (bez paginacji - słownik jest mały)
- Używane przez frontend do wyświetlania tłumaczeń enumów

## 2. Szczegóły żądania

### Metoda HTTP

GET

### Struktura URL

```
/api/dictionary/labels
```

### Parametry

#### Query Parameters (opcjonalne):

- `domain` (string, optional) - Filtruje wyniki po domenie
  - Przykłady: "side_enum", "match_status_enum", "analytics_event_type_enum", "ai_status_enum"
  - Walidacja: zgodnie z `dictionaryQuerySchema` ze shared components

#### Request Headers:

Brak wymaganych nagłówków. Autoryzacja jest opcjonalna (endpoint publiczny).

#### Request Body:

Brak (GET request)

## 3. Wykorzystywane typy

### Z types.ts:

**Entity:**

- `DictionaryLabelDto` - DTO dla etykiet słownikowych

**Query DTO:**

- `DictionaryQueryDto` - typ dla query parameters

**Response:**

- `DictionaryLabelsResponse = ListResponseDto<DictionaryLabelDto>` - finalna odpowiedź API

## 4. Szczegóły odpowiedzi

### Response 200 OK

```json
{
  "data": [
    {
      "id": 1,
      "domain": "side_enum",
      "code": "player",
      "label": "Zawodnik"
    },
    {
      "id": 2,
      "domain": "side_enum",
      "code": "opponent",
      "label": "Rywal"
    }
  ]
}
```

**Użycie:** `createListResponse` ze shared components

### Response 400 Bad Request

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "domain",
        "message": "Domain cannot be empty"
      }
    ]
  }
}
```

**Użycie:** `createValidationErrorResponse` ze shared components

### Response 500 Internal Server Error

```json
{
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Failed to retrieve dictionary labels"
  }
}
```

**Użycie:** `createInternalErrorResponse` ze shared components

### Uwagi:

- Pusta tablica `data: []` to poprawna odpowiedź 200 (brak wyników dla podanego domain)
- Brak odpowiedzi 401/404 - endpoint jest publiczny i zawsze zwraca listę

## 5. Przepływ danych

### Krok po kroku:

1. **Parsowanie i walidacja query parameters:**
   - Wykorzystanie `parseQueryParams` i `dictionaryQuerySchema` ze shared components
   - Jeśli fail: zwrócenie `createValidationErrorResponse`

2. **Wywołanie dictionary service:**
   - Funkcja `getDictionaryLabels` ze shared components
   - Service wykonuje SELECT z opcjonalnym filtrem WHERE domain

3. **Formatowanie odpowiedzi:**
   - Wykorzystanie `createListResponse` ze shared components
   - Zwrócenie Response z kodem 200

### Interakcje:

- **Supabase Client:** z `context.locals.supabase` (dostarczone przez middleware)
- **Tabela:** `dic_lookup_labels` - globalna, tylko do odczytu
- **Brak user_id:** Słownik jest publiczny dla wszystkich użytkowników

## 6. Względy bezpieczeństwa

### Autoryzacja:

- **NIE WYMAGA uwierzytelniania** - endpoint publiczny
- Słownik jest taki sam dla wszystkich użytkowników (brak wrażliwych danych)
- Middleware przekaże request nawet bez tokenu

### Walidacja danych wejściowych:

- Wykorzystanie Zod schema ze shared components
- Zapobieganie SQL injection (Supabase używa parametryzowanych queries)

### Rate Limiting:

Endpoint publiczny może być narażony na abuse. Rekomendacje:

- Rozważyć dodanie rate limiting na poziomie infrastruktury
- **Uwaga:** Poza zakresem tego planu

### Information Disclosure:

- Brak wrażliwych danych (słownik jest publiczny)
- Komunikaty błędów są ogólne (nie ujawniają struktury bazy)

## 7. Obsługa błędów

### Wykorzystanie shared components:

Wszystkie utilities i error handling pochodzą ze shared components:

- `createValidationErrorResponse` - błędy walidacji Zod
- `createInternalErrorResponse` - błędy serwera
- `logError` - strukturalne logowanie błędów
- `DatabaseError` - błędy operacji bazodanowych

### Scenariusze błędów:

#### 1. Nieprawidłowe query parameters (400)

**Trigger:** Walidacja Zod failuje

**Handling:** zgodnie ze shared components

#### 2. Błąd bazy danych (500)

**Trigger:** Supabase query failuje

**Handling:** zgodnie ze shared components, z logowaniem kontekstu

#### 3. Brak wyników (200 OK z pustą tablicą)

**Trigger:** Podany `domain` nie istnieje w bazie

**Handling:** To nie jest błąd - zwracamy pustą tablicę

## 8. Wydajność

### Optymalizacje:

#### Database Query:

- Prosty SELECT - bardzo szybka operacja (microseconds)
- Brak JOINów - tabela jest standalone
- Sortowanie wykorzystuje indexy (jeśli istnieją w migracji)

#### Caching (do rozważenia w przyszłości):

- Słownik rzadko się zmienia → idealny kandydat do cachingu
- Opcje: Redis cache, In-memory cache, HTTP Cache-Control headers
- **Uwaga:** Poza zakresem tego planu

#### Wielkość odpowiedzi:

- Słownik jest mały (~20-50 rekordów total)
- Z filtrem `domain`: 2-10 rekordów
- Brak potrzeby paginacji

### Metryki wydajności (szacunki):

- Query time: < 10ms
- Total response time: < 50ms
- Throughput: > 1000 req/s

## 9. Etapy implementacji

### Krok 1: Utworzenie Zod schema dla walidacji

**Plik:** `src/lib/schemas/dictionary.schemas.ts`

**Zadania:**

- Utworzenie pliku schemas dla dictionary
- Implementacja `dictionaryQuerySchema` zgodnie ze shared components
- Export typu `ValidatedDictionaryQuery`

**Weryfikacja:** TypeScript kompiluje się bez błędów

---

### Krok 2: Implementacja Dictionary Service

**Plik:** `src/lib/services/dictionary.service.ts`

**Zadania:**

- Utworzenie pliku service
- Implementacja funkcji `getDictionaryLabels` zgodnie ze shared components
- Import zależności

**Weryfikacja:** TypeScript kompiluje się bez błędów

---

### Krok 3: Implementacja endpoint handler

**Plik:** `src/pages/api/dictionary/labels.ts`

**Zadania:**

- Utworzenie katalogu `src/pages/api/dictionary/` (jeśli nie istnieje)
- Utworzenie pliku `labels.ts`
- Dodanie `export const prerender = false`
- Implementacja funkcji `GET`:
  - Ekstrakcja supabase client z `context.locals.supabase`
  - Parsowanie i walidacja query params (wykorzystując shared components)
  - Wywołanie `getDictionaryLabels` ze shared components
  - Formatowanie odpowiedzi przez `createListResponse` ze shared components
  - Error handling: try-catch z wykorzystaniem utilities ze shared components
- Import wszystkich zależności

**Struktura pliku:**

```typescript
import type { APIContext } from "astro";
import { getDictionaryLabels } from "../../../lib/services/dictionary.service";
import { parseQueryParams } from "../../../lib/utils/zod-helpers";
import {
  createListResponse,
  createValidationErrorResponse,
  createInternalErrorResponse,
} from "../../../lib/utils/api-response";
import { dictionaryQuerySchema } from "../../../lib/schemas/dictionary.schemas";
import { logError } from "../../../lib/utils/logger";
import type { DictionaryLabelDto } from "../../../types";

export const prerender = false;

export async function GET(context: APIContext): Promise<Response> {
  // Implementation
}
```

**Weryfikacja:**

- TypeScript kompiluje się bez błędów
- Endpoint jest dostępny pod URL `/api/dictionary/labels`

---

### Krok 4: Weryfikacja integracji z middleware

**Zadania:**

- Sprawdzenie że middleware przekazuje `supabase` client w `context.locals`
- Sprawdzenie że middleware nie blokuje publicznych endpointów
- Endpoint `/api/dictionary/labels` powinien działać bez tokenu

**Weryfikacja:** Request bez nagłówka Authorization zwraca 200 OK (nie 401)

---

### Krok 5: Weryfikacja lintowania i formatowania

**Zadania:**

- Uruchomienie lintera na nowych plikach
- Poprawienie ewentualnych błędów/ostrzeżeń

**Polecenia:**

```bash
npm run lint
```

**Weryfikacja:** Brak błędów lintowania

---

### Krok 6: Code review i refactoring

**Zadania:**

- Przegląd kodu pod kątem:
  - Zgodności z planem implementacji
  - Poprawności error handling
  - Wykorzystania shared components
  - Type safety
- Refactoring jeśli potrzebny

**Weryfikacja:** Kod jest czytelny i zgodny z guidelines

---

## 10. Checklist implementacji

### Przed rozpoczęciem:

- [ ] Przeczytanie całego planu implementacji
- [ ] Sprawdzenie że shared components są zaimplementowane
- [ ] Sprawdzenie struktury bazy danych (tabela dic_lookup_labels istnieje)

### Podczas implementacji:

#### Krok 1: Schema

- [ ] Plik `src/lib/schemas/dictionary.schemas.ts` utworzony
- [ ] Schema `dictionaryQuerySchema` zaimplementowany zgodnie ze shared components
- [ ] Typ `ValidatedDictionaryQuery` wyeksportowany
- [ ] TypeScript kompiluje się bez błędów

#### Krok 2: Service

- [ ] Plik `src/lib/services/dictionary.service.ts` utworzony
- [ ] Funkcja `getDictionaryLabels` zaimplementowana zgodnie ze shared components
- [ ] TypeScript kompiluje się bez błędów

#### Krok 3: Endpoint Handler

- [ ] Katalog `src/pages/api/dictionary/` utworzony
- [ ] Plik `labels.ts` utworzony
- [ ] `export const prerender = false` dodane
- [ ] Funkcja `GET` zaimplementowana
- [ ] Wykorzystano utilities ze shared components
- [ ] TypeScript kompiluje się bez błędów

#### Krok 4: Middleware Integration

- [ ] Middleware przekazuje supabase client w context.locals
- [ ] Endpoint działa bez tokenu Authorization (publiczny)

#### Krok 5: Linting

- [ ] `npm run lint` wykonane
- [ ] Wszystkie błędy/ostrzeżenia poprawione

#### Krok 6: Code Review

- [ ] Kod zgodny z planem
- [ ] Kod zgodny z guidelines
- [ ] Error handling poprawny
- [ ] Type safety zachowany

### Po zakończeniu:

- [ ] Endpoint dostępny pod `/api/dictionary/labels`
- [ ] Dokumentacja zaktualizowana (jeśli potrzebna)
- [ ] Commit z opisowym message

---

## 11. Uwagi końcowe

### Odniesienia do shared components:

- Wszystkie utilities z `api-response.ts`
- `parseQueryParams` z `zod-helpers.ts`
- `DatabaseError` z `api-errors.ts`
- `logError` z `logger.ts`
- `getDictionaryLabels` z `dictionary.service.ts`
- `dictionaryQuerySchema` z `dictionary.schemas.ts`

### Różnice od innych endpointów:

- **Brak autoryzacji** - endpoint publiczny
- **Brak paginacji** - słownik jest mały
- **Read-only** - tylko operacja SELECT
- **Globalny zasób** - dane są takie same dla wszystkich użytkowników

### Możliwe rozszerzenia (poza zakresem tego planu):

- Caching (Redis lub in-memory)
- HTTP Cache-Control headers
- Rate limiting
- Kompresja response (gzip)

### Zależności:

- Wymaga: shared components (utilities, schemas, services)
- Nie wymaga: żaden inny service (niezależny endpoint)
- Wykorzystywany przez: Frontend (wszystkie widoki potrzebujące tłumaczeń enumów)

---

**Autor:** AI Assistant  
**Data utworzenia:** 2025-12-07  
**Wersja:** 1.1  
**Status:** Gotowy do implementacji
