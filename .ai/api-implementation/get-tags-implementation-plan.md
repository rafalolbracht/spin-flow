# API Endpoint Implementation Plan: GET /api/tags

## 1. Przegląd punktu końcowego

Endpoint GET /api/tags służy do pobierania wszystkich dostępnych tagów w systemie. Tagi są zasobem globalnym, współdzielonym pomiędzy wszystkimi użytkownikami. Endpoint nie wymaga autentykacji i zwraca pełną listę tagów posortowaną według pola `order_in_list`.

**Charakterystyka:**

- Zasób publiczny - dostępny bez autentykacji
- Dane read-only - tagi są zarządzane administracyjnie
- Zwraca zawsze pełną listę (brak paginacji)
- Sortowanie według `order_in_list ASC` dla zachowania kolejności UI

**Użycie:**

- Pobieranie listy tagów do przypisania punktom podczas rejestracji meczu
- Prezentacja tagów w interfejsie użytkownika (dropdown, checkboxes)
- Cache'owanie po stronie klienta ze względu na rzadkie zmiany

---

## 2. Szczegóły żądania

**Metoda HTTP:** GET

**Struktura URL:** `/api/tags`

**Parametry:**

- Wymagane: brak
- Opcjonalne: brak
- Query params: brak
- Path params: brak

**Request Headers:**

- Autentykacja: opcjonalna (endpoint publiczny)
- Content-Type: nie dotyczy (brak body)

**Request Body:** brak (metoda GET)

---

## 3. Wykorzystywane typy

Endpoint wykorzystuje typy zdefiniowane w `src/types.ts`:

**Response:**

- `TagListResponse` - typ odpowiedzi z listą tagów

**DTO:**

- `TagDto` - DTO pojedynczego tagu (alias dla `Tag` entity, mapping 1:1)

**Uwaga:** Endpoint nie wymaga Command Models, ponieważ nie przyjmuje parametrów wejściowych.

---

## 4. Szczegóły odpowiedzi

### 4.1. Sukces - 200 OK

**Status:** 200 OK

**Content-Type:** application/json

**Body Structure:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Błąd serwisu",
      "is_system": true,
      "order_in_list": 1,
      "created_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "name": "Błąd odbioru",
      "is_system": true,
      "order_in_list": 2,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Wykorzystywana funkcja:** `createListResponse()` z shared components

---

### 4.2. Błąd - 500 Internal Server Error

**Status:** 500 Internal Server Error

**Scenariusze:**

- Błąd połączenia z bazą danych
- Timeout query
- Nieoczekiwany błąd podczas wykonania zapytania

**Wykorzystywana funkcja:** `createInternalErrorResponse()` z shared components

---

## 5. Przepływ danych

### 5.1. Diagram przepływu

```
1. Request → GET /api/tags
2. Endpoint handler
3. Supabase query → SELECT * FROM tags ORDER BY order_in_list ASC
4. Database → zwraca tablicę Tag[]
5. Response formatting → ListResponseDto<TagDto>
6. Response → 200 OK { data: TagDto[] }
```

### 5.2. Szczegółowy przepływ

**Kroki:**

1. Pobranie Supabase client z context
2. Query do bazy danych z sortowaniem
3. Obsługa błędu query
4. Formatowanie odpowiedzi za pomocą funkcji z shared components
5. Zwrócenie Response object

### 5.3. Interakcje z bazą danych

**Query:**

```sql
SELECT id, name, is_system, order_in_list, created_at
FROM tags
ORDER BY order_in_list ASC;
```

**Tabela:** `tags`

**Kolumny:**

- `id` (BIGSERIAL, PK)
- `name` (VARCHAR(30), UNIQUE, NOT NULL)
- `is_system` (BOOLEAN, NOT NULL)
- `order_in_list` (SMALLINT, NOT NULL)
- `created_at` (TIMESTAMPTZ, NOT NULL)

**Uwagi:**

- Brak filtrowania według `user_id` - tagi są globalne
- Brak paginacji - zwracane są wszystkie tagi
- Order by `order_in_list` zapewnia spójną kolejność w UI
- Query jest bardzo szybkie (small dataset, index na PK)

### 5.4. Nie wykorzystuje external services

Endpoint nie komunikuje się z żadnymi zewnętrznymi serwisami:

- Brak wywołań AI
- Brak analytics tracking
- Brak notyfikacji
- Tylko proste query do Supabase

---

## 6. Względy bezpieczeństwa

### 6.1. Autentykacja

**Status:** Opcjonalna (endpoint publiczny)

**Uzasadnienie:**

- Tagi są zasobem globalnym, współdzielonym
- Dane są read-only dla użytkowników
- Brak wrażliwych informacji w tagach
- Umożliwia szybkie ładowanie UI bez logowania

**Implementacja:**

- Brak sprawdzania tokenu JWT
- Brak wywołania `context.locals.supabase.auth.getUser()`
- Endpoint dostępny dla wszystkich (authenticated i anonymous)

### 6.2. Autoryzacja

**Status:** Nie dotyczy

**Uzasadnienie:**

- Tagi nie należą do konkretnego użytkownika
- Brak weryfikacji ownership
- RLS może być permissive lub disabled dla tabeli `tags`

### 6.3. Row Level Security (RLS)

**Polityka dla tabeli tags:**

- SELECT: public read access (authenticated + anonymous) LUB RLS disabled
- INSERT/UPDATE/DELETE: tylko dla service role (admin)

**Konfiguracja RLS (sugerowana):**

```sql
ALTER TABLE tags DISABLE ROW LEVEL SECURITY;
```

### 6.4. Walidacja danych wejściowych

**Status:** Minimalna

**Powód:**

- Endpoint nie przyjmuje parametrów
- Brak query params do walidacji
- Brak body do parsowania

**Implementacja:**

- Jedyna walidacja: sprawdzenie metody HTTP (GET)

### 6.5. Rate Limiting

**Zalecenie:** Standardowe rate limiting na poziomie API Gateway

**Uwagi:**

- Endpoint może być cache'owany po stronie klienta
- Rzadkie zmiany w danych → długi TTL cache (1h+)
- Niskie obciążenie serwera

---

## 7. Obsługa błędów

### 7.1. Scenariusze błędów

| Scenariusz           | Kod | Error Code     | Message                      | Handling                    |
| -------------------- | --- | -------------- | ---------------------------- | --------------------------- |
| Błąd bazy danych     | 500 | INTERNAL_ERROR | An unexpected error occurred | createInternalErrorResponse |
| Timeout zapytania    | 500 | INTERNAL_ERROR | An unexpected error occurred | createInternalErrorResponse |
| Supabase niedostępny | 500 | INTERNAL_ERROR | An unexpected error occurred | createInternalErrorResponse |

### 7.2. Szczegółowa obsługa błędów

#### 7.2.1. Błąd bazy danych (500)

**Warunek:**

- Supabase query zwraca error
- Timeout połączenia
- Nieoczekiwany błąd podczas operacji

**Implementacja:**

```typescript
const { data, error } = await supabase.from("tags").select("*").order("order_in_list", { ascending: true });

if (error) {
  console.error("[GET /api/tags] Database error:", error);
  return createInternalErrorResponse();
}
```

**Response:**

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

**Logowanie:**

- Console.error z kontekstem błędu
- Opcjonalnie wykorzystanie Logger Utility z shared components

### 7.3. Global error handler

**Implementacja catch-all:**

```typescript
try {
  // główna logika endpointu
} catch (error) {
  console.error("[GET /api/tags] Unexpected error:", error);
  return createInternalErrorResponse();
}
```

**Uwagi:**

- Catch owijający całą logikę endpointu
- Zapobiega niezłapanym błędom (500 bez response body)
- Logowanie błędu dla debugowania

### 7.4. Wykorzystywane funkcje z shared components

Szczegóły implementacji funkcji znajdują się w shared-implementation-plan.md:

- `createListResponse()` - formatowanie odpowiedzi z listą
- `createInternalErrorResponse()` - odpowiedź błędu 500
- `createErrorResponse()` - odpowiedź błędu z kodem i wiadomością (opcjonalnie)

---

## 8. Wydajność

### 8.1. Charakterystyka wydajności

**Szacunkowy czas odpowiedzi:** < 50ms

**Czynniki wpływające na wydajność:**

- Rozmiar tabeli tags: mała (10-50 rekordów)
- Query bez JOIN: bardzo szybkie
- Sortowanie po integer: minimalne overhead
- Brak autentykacji: brak dodatkowego roundtrip

### 8.2. Optymalizacje

#### 8.2.1. Database Query

**Aktualna strategia:**

- SELECT wszystkich kolumn
- ORDER BY order_in_list
- Brak WHERE clause

**Potencjalne optymalizacje:**

- Index na `order_in_list` (opcjonalnie, dataset jest mały)
- Materialized view (niepotrzebne dla small dataset)

#### 8.2.2. Caching

**Client-side caching:**

- HTTP Cache-Control headers: `Cache-Control: public, max-age=3600`
- ETag support (opcjonalnie)
- Długi TTL ze względu na rzadkie zmiany

**Server-side caching:**

- Opcjonalnie: Redis cache dla wyników query
- TTL: 1h+
- Invalidacja przy INSERT/UPDATE/DELETE tagów (przez admina)

**Zalecenia:**

- Priorytet: client-side caching (HTTP headers)
- Server-side cache tylko jeśli RPS > 1000

#### 8.2.3. Response size

**Szacunkowy rozmiar:**

- Jeden tag: ~150 bytes JSON
- 30 tagów: ~4.5 KB
- Z HTTP compression (gzip): ~1-2 KB

**Optymalizacje:**

- Kompresja HTTP (gzip/brotli) na poziomie reverse proxy
- Minifikacja JSON (Astro domyślnie)

---

## 9. Kroki implementacji

### Krok 1: Utworzenie pliku endpointu

**Lokalizacja:** `src/pages/api/tags/index.ts`

**Struktura katalogów:**

```
src/pages/api/
  tags/
    index.ts          ← nowy plik
```

**Uwagi:**

- Nazwa pliku: `index.ts` (obsługuje GET /api/tags)
- Astro routing: automatyczne mapowanie na /api/tags

---

### Krok 2: Import zależności

**Importy:**

```typescript
import type { APIContext } from "astro";
import type { TagDto, TagListResponse } from "../../../types";
import { createListResponse, createInternalErrorResponse } from "../../../lib/utils/api-response";
```

**Uwagi:**

- `APIContext` - type dla Astro endpoint
- Typy response i funkcje pomocnicze z shared components

---

### Krok 3: Konfiguracja Astro prerender

**Implementacja:**

```typescript
export const prerender = false;
```

**Uzasadnienie:**

- Endpoint musi być renderowany po stronie serwera (SSR)
- Dane są dynamiczne (choć rzadko się zmieniają)
- Wymagany dostęp do Supabase w runtime

---

### Krok 4: Implementacja GET handler

**Struktura funkcji:**

```typescript
export async function GET(context: APIContext): Promise<Response> {
  try {
    // Krok 4.1: Pobranie Supabase client
    // Krok 4.2: Query do bazy danych
    // Krok 4.3: Obsługa błędu query
    // Krok 4.4: Formatowanie odpowiedzi
    // Krok 4.5: Zwrócenie response
  } catch (error) {
    // Krok 4.6: Global error handling
  }
}
```

---

#### Krok 4.1: Pobranie Supabase client

**Implementacja:**

```typescript
const supabase = context.locals.supabase;
```

**Uwagi:**

- Supabase client dostępny w `context.locals` (wstrzyknięty przez middleware)
- Nie wymaga ręcznego tworzenia klienta
- Client skonfigurowany dla public access (RLS permissive dla tags)

---

#### Krok 4.2: Query do bazy danych

**Implementacja:**

```typescript
const { data, error } = await supabase.from("tags").select("*").order("order_in_list", { ascending: true });
```

**Uwagi:**

- SELECT wszystkich kolumn z tabeli tags
- Sortowanie rosnące według order_in_list

---

#### Krok 4.3: Obsługa błędu query

**Implementacja:**

```typescript
if (error) {
  console.error("[GET /api/tags] Database error:", error);
  return createInternalErrorResponse();
}
```

**Uwagi:**

- Early return przy błędzie
- Wykorzystanie funkcji z shared components

---

#### Krok 4.4: Formatowanie odpowiedzi

**Implementacja:**

```typescript
const tags: TagDto[] = data;
return createListResponse<TagDto>(tags, 200);
```

**Uwagi:**

- Prosty casting data na `TagDto[]` (mapping 1:1)
- Wykorzystanie funkcji z shared components

---

#### Krok 4.5: Global error handling

**Implementacja:**

```typescript
} catch (error) {
  console.error('[GET /api/tags] Unexpected error:', error);
  return createInternalErrorResponse();
}
```

**Uwagi:**

- Catch-all dla nieoczekiwanych błędów
- Zapobiega niezłapanym exceptions
- Zawsze zwraca valid Response

---

### Krok 5: Dodanie Cache-Control headers (opcjonalnie)

**Implementacja:**

```typescript
const response = createListResponse<TagDto>(tags, 200);
response.headers.set("Cache-Control", "public, max-age=3600");
return response;
```

**Uwagi:**

- Dodanie cache headers do Response object
- Zalecany TTL: 3600s (1 godzina)

---

### Krok 6: Weryfikacja typów TypeScript

**Polecenie:**

```bash
npx tsc --noEmit
```

**Sprawdzenie:**

- Brak błędów kompilacji TypeScript
- Poprawne typy dla wszystkich zmiennych
- Poprawne typy dla funkcji z shared components

---

### Krok 7: Weryfikacja linter

**Polecenie:**

```bash
npm run lint
```

**Sprawdzenie:**

- Brak błędów ESLint
- Brak ostrzeżeń ESLint (lub tylko akceptowalne)
- Kod zgodny z coding guidelines

---

### Krok 8: Code review (self-review)

**Checklist:**

- [ ] Endpoint zwraca poprawny format odpowiedzi
- [ ] Obsługa błędów jest kompletna
- [ ] Sortowanie tagów według order_in_list
- [ ] Kod zgodny z guidelines
- [ ] Wykorzystano funkcje z shared components
- [ ] Kod jest czytelny

---

## 11. Checklist implementacji

**Przed rozpoczęciem:**

- [ ] Shared components są zaimplementowane
- [ ] Typy są zdefiniowane w types.ts
- [ ] Middleware Astro jest skonfigurowany

**Podczas implementacji:**

- [ ] Utworzono plik `src/pages/api/tags/index.ts`
- [ ] Dodano `export const prerender = false`
- [ ] Zaimplementowano funkcję GET
- [ ] Dodano obsługę błędów (try-catch + error handling)
- [ ] Dodano logowanie błędów
- [ ] Dodano JSDoc documentation

**Po implementacji:**

- [ ] TypeScript kompiluje się bez błędów
- [ ] Linter nie zgłasza błędów
- [ ] Code review (self-review) wykonany
- [ ] Cache headers dodane (opcjonalnie)

---

**Autor:** AI Assistant  
**Data:** 2024-12-07  
**Wersja:** 1.0
