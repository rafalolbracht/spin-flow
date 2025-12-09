# API Endpoint Implementation Plan: GET /api/public/matches/{token}

## 1. Przegląd punktu końcowego

Endpoint służy do publicznego udostępniania szczegółowych danych meczu bez wymagania uwierzytelnienia. Użytkownicy (zawodnicy, rodzice, kibice) mogą przeglądać kompletne informacje o meczu, w tym wszystkie sety, punkty, tagi oraz raport AI. Dostęp jest kontrolowany poprzez unikalny token.

**Kluczowe cechy:**

- Brak wymaganego uwierzytelnienia (publiczny dostęp)
- Kontrola dostępu przez unikalny token (43 znaki base64url)
- Zwraca kompletne dane meczu (mecz + sety + punkty + tagi + raport AI)
- Tagi zwracane jako array stringów (nazwy tagów)
- Nie ujawnia wrażliwych danych (np. user_id)

## 2. Szczegóły żądania

**Metoda HTTP:** GET

**Struktura URL:** `/api/public/matches/{token}`

**Path Parameters:**

- `token` (string, required) - Publiczny token udostępniania meczu (43 znaki base64url)

**Query Parameters:** Brak

**Request Headers:** Brak wymaganych (brak uwierzytelnienia)

**Request Body:** Brak (metoda GET)

## 3. Wykorzystywane typy

**Response DTOs z `src/types.ts`:**

- `PublicMatchResponseDto` - główna struktura odpowiedzi (ApiResponse)
- `PublicMatchDto` - dane meczu bez wrażliwych informacji
- `PublicSetDto` - dane seta z zagnieżdżonymi punktami
- `PublicPointDto` - dane punktu z tagami jako string[]
- `PublicAIReportDto` - raport AI (jeśli dostępny)
- `PublicMatchDataDto` - kontener dla match + sets + ai_report

**Pola wykluczane z publicznych DTOs:**

- `user_id` (właściciel meczu)
- `first_server_first_set` (szczegół implementacyjny)
- `generate_ai_summary` (szczegół implementacyjny)
- `created_at` timestamps (ujawniają czas utworzenia rekordu)

**Command Models:** Brak (endpoint read-only)

## 4. Szczegóły odpowiedzi

**Success Response (200 OK):**

Struktura zgodna ze specyfikacją API zawierająca:

- `match` - dane meczu
- `sets[]` - array setów z zagnieżdżonymi punktami
- `ai_report` - raport AI z polami: ai_status, ai_summary, ai_recommendations

Response wykorzystuje helper `createSuccessResponse` z shared components.

**Kody statusu:**

- `200 OK` - Pomyślne pobranie danych meczu
- `404 Not Found` - Token nieprawidłowy, mecz nie istnieje lub został usunięty
- `500 Internal Server Error` - Nieoczekiwany błąd serwera

## 5. Przepływ danych

**Główny przepływ:**

1. **Walidacja tokenu** - sprawdzenie formatu (43 znaki base64url)
2. **Wywołanie serwisu** - użycie `PublicMatchService.getPublicMatchByToken()` z shared components
3. **Zwrócenie odpowiedzi** - użycie `createSuccessResponse()` dla kodu 200

**Szczegóły logiki biznesowej w `PublicMatchService` (shared components):**

- Weryfikacja istnienia tokenu w bazie (plaintext)
- Pobieranie kompletnych danych meczu z optymalizacją (nested select)
- Transformacja danych na publiczne DTOs

## 6. Względy bezpieczeństwa

**Uwierzytelnienie:** Endpoint jest publiczny - brak wymaganego uwierzytelnienia

**Ochrona danych:**

- Publiczne DTOs wykluczają wrażliwe pola (szczegóły w `PublicMatchService`)
- Token przechowywany jako plaintext w bazie (43 znaki base64url)
- 256 bitów entropii chroni przed brute force
- Jednolite komunikaty błędów 404 zapobiegają enumeracji tokenów

**Walidacja tokenu:**

- Format: 43 znaki base64url `[A-Za-z0-9_-]{43}`
- Walidacja przez `tokenParamSchema` z shared components
- Bezpośrednie wyszukiwanie w bazie (bez hashowania)

## 7. Obsługa błędów

**Wykorzystanie shared components:**

- `NotFoundError` - dla błędów 404
- `createErrorResponse` - dla formatowania błędów
- `logError` - dla logowania błędów serwera (tylko 500)

**Scenariusze błędów:**

### 7.1. Token nieprawidłowy lub mecz usunięty (404)

Identyczna odpowiedź dla obu przypadków (zapobieganie enumeracji):

- Message: "Shared match not found"
- Code: "SHARED_MATCH_NOT_FOUND"
- Logowanie: Brak (normalny przypadek biznesowy)

### 7.2. Błąd serwera (500)

- Message: "Internal server error"
- Code: "INTERNAL_SERVER_ERROR"
- Logowanie: TAK - kontekst zawiera endpoint i skróconą wersję tokenu

**Logowanie błędów:**
Wykorzystanie `logError` utility tylko dla błędów 500, z kontekstem:

- endpoint: 'GET /api/public/matches/{token}'
- token: pierwsze 8 znaków + '...' (dla bezpieczeństwa)

## 8. Rozważania dotyczące wydajności

**Optymalizacje w `PublicMatchService`:**

- Nested select Supabase zamiast N+1 queries
- Maksymalnie 4 queries niezależnie od wielkości meczu
- Sortowanie na poziomie bazy danych

## 9. Etapy wdrożenia

### 9.1. Utworzenie typów DTO

**Plik:** `src/types.ts`

Zdefiniować publiczne DTOs dla response (jeśli jeszcze nie istnieją):

- `PublicMatchDto` - pola z tabeli `matches` minus wrażliwe pola
- `PublicSetDto` - pola z tabeli `sets` minus wrażliwe pola, plus zagnieżdżone `points`
- `PublicPointDto` - pola z tabeli `points` minus wrażliwe pola, plus `tags: string[]`
- `PublicAIReportDto` - pola: ai_status, ai_summary, ai_recommendations
- `PublicMatchDataDto` - kontener: match, sets, ai_report
- `PublicMatchResponseDto` - typ `ApiResponse<PublicMatchDataDto>`

### 9.2. Implementacja PublicMatchService (jeśli nie istnieje)

**Uwaga:** Szczegóły w shared-implementation-plan.md

**Plik:** `src/lib/services/public-match.service.ts`

Service implementuje:

- `getPublicMatchByToken()` - główna funkcja pobierająca dane
- Funkcje pomocnicze do mapowania na publiczne DTOs

Service wykorzystuje:

- `NotFoundError` z api-errors
- Nested select Supabase dla optymalizacji wydajności
- Transformacja usuwająca wrażliwe pola
- Bezpośrednie wyszukiwanie tokenu (plaintext, bez hashowania)

### 9.3. Utworzenie Astro API route

**Plik:** `src/pages/api/public/matches/[token].ts`

**Struktura handlera GET:**

1. **Prerender:** Dodać `export const prerender = false`

2. **Walidacja tokenu:**
   - Pobranie tokenu z `context.params.token`
   - Walidacja za pomocą `tokenParamSchema` (43 znaki base64url)
   - Rzucenie `NotFoundError` jeśli nieprawidłowy format

3. **Pobranie danych:**
   - Pobranie Supabase client z `context.locals.supabase`
   - Wywołanie `PublicMatchService.getPublicMatchByToken(supabase, token)`

4. **Zwrócenie odpowiedzi:**
   - Użycie `createSuccessResponse(matchData, 200)`

5. **Obsługa błędów:**
   - Catch `NotFoundError` → return odpowiedź 404
   - Catch inne błędy → logowanie + return odpowiedź 500
   - Użycie `createErrorResponse()` dla wszystkich błędów

**Best practices:**

- Użycie `context.locals.supabase` zgodnie z regułami Astro
- Try-catch dla globalnej obsługi błędów
- Early returns dla przypadków błędów (guard clauses)
- Logowanie tylko błędów 500, nie 404

### 9.4. Weryfikacja implementacji

**Sprawdzenia:**

1. TypeScript kompiluje się bez błędów
2. Linter nie zgłasza błędów (error handling, early returns)
3. Struktura response zgodna ze specyfikacją API
4. Brak wrażliwych pól (user_id, created_at) w response
5. Sortowanie setów i punktów prawidłowe
6. Tagi zwracane jako array stringów

## 10. Uwagi końcowe

**Zależności:**

- Endpoint zakłada, że token został utworzony przez `POST /api/matches/{matchId}/share`
- Token zapisywany i wyszukiwany jako plaintext (43 znaki base64url)

**Model bezpieczeństwa:**

- 256 bitów entropii zapewnia odporność na brute force
- Zgodny z praktykami branżowymi (Google Drive, Dropbox, GitHub Gists)
- Dane meczu są publiczne dla posiadacza tokenu

**Zgodność:**

- Endpoint realizuje wymaganie publicznego udostępniania wyników meczów
- Zgodny z modelem danych (tabela matches_public_share)
- Zgodny z zasadami bezpieczeństwa (brak user_id w response)
