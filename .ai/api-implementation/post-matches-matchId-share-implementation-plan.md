# API Endpoint Implementation Plan: POST /api/matches/{matchId}/share

## 1. Przegląd punktu końcowego

Endpoint służy do generowania lub pobierania publicznego linku udostępniania dla zakończonego meczu. Jeśli publiczny link już istnieje dla danego meczu, endpoint zwraca istniejący link (200 OK). Jeśli link nie istnieje, generuje nowy kryptograficznie bezpieczny token, przechowuje go w bazie danych i zwraca pełny URL (201 Created).

**Kluczowe cechy:**

- Idempotentność: wielokrotne wywołanie zwraca ten sam link
- Bezpieczeństwo: token generowany kryptograficznie (256 bitów entropii)
- Walidacja biznesowa: tylko zakończone mecze mogą być udostępniane
- Autoryzacja: tylko właściciel meczu może wygenerować link

## 2. Szczegóły żądania

### Metoda HTTP

POST

### Struktura URL

```
/api/matches/{matchId}/share
```

### Parametry

**Path Parameters:**

- `matchId` (integer, required) - ID meczu do udostępnienia
  - Walidacja: `idParamSchema` z `common.schemas.ts` (opisane w shared-implementation-plan.md)

**Headers:**

- `Authorization: Bearer {jwt_token}` (required)
  - Walidacja: automatyczna przez middleware Astro
  - Ekstrakcja userId z `context.locals.user`

**Request Body:**

- Brak (endpoint nie przyjmuje body)

## 3. Wykorzystywane typy

### Typy z types.ts:

- `PublicShareDto` - DTO dla response
- `MatchPublicShare` - typ encji z bazy danych
- `MatchPublicShareInsert` - typ dla INSERT operation
- `CreatePublicShareResponse` - wrapper response (SingleItemResponseDto<PublicShareDto>)
- `Match` - typ encji meczu
- `MatchStatusEnum` - enum dla statusu meczu

### Schemat walidacji:

- `idParamSchema` - opisany w shared-implementation-plan.md

## 4. Szczegóły odpowiedzi

### Sukces - Istniejący link (200 OK)

```json
{
  "data": {
    "id": 345,
    "match_id": 124,
    "public_url": "https://spinflow.app/public/matches/a7b3c9d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "token": "a7b3c9d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "created_at": "2024-01-15T16:05:00Z"
  }
}
```

### Sukces - Nowy link (201 Created)

```json
{
  "data": {
    "id": 346,
    "match_id": 125,
    "public_url": "https://spinflow.app/public/matches/b8c4d0e6f7g8h9i0j1k2l3m4n5o6p7q8",
    "token": "b8c4d0e6f7g8h9i0j1k2l3m4n5o6p7q8",
    "created_at": "2024-01-15T16:10:00Z"
  }
}
```

### Błędy

Wykorzystanie standardowych response utilities z shared-implementation-plan.md:

- **401 Unauthorized** - `createUnauthorizedResponse()`
- **403 Forbidden** - błąd ownership (obsługa przez NotFoundError)
- **404 Not Found** - `createNotFoundResponse('Match not found')`
- **422 Unprocessable Entity** - przez ApiError z serwisu
- **500 Internal Server Error** - `createInternalErrorResponse()`

## 5. Przepływ danych

### 5.1. Walidacja parametrów

1. Ekstrakcja `matchId` z path params
2. Walidacja `matchId` używając `idParamSchema`
3. Ekstrakcja `userId` z `context.locals.user.id`
4. Weryfikacja obecności userId (auth check)

### 5.2. Wywołanie serwisu

Wywołanie funkcji `createOrGetPublicShare` z share.service.ts (opisane w shared-implementation-plan.md):

- Weryfikacja ownership i statusu meczu
- Sprawdzenie istniejącego linku
- Generowanie nowego linku (jeśli nie istnieje)
- Zwrócenie `{ dto: PublicShareDto, isNew: boolean }`

### 5.3. Konstrukcja response

1. Określenie status code na podstawie `isNew`:
   - `isNew === true` → 201 Created
   - `isNew === false` → 200 OK
2. Użycie `createSuccessResponse(dto, statusCode)` z shared-implementation-plan.md

## 6. Względy bezpieczeństwa

### 6.1. Autoryzacja

- Weryfikacja JWT token przez middleware Astro
- Weryfikacja ownership przez share.service (opisane w shared-implementation-plan.md)
- Information disclosure prevention: return null zamiast szczegółowych błędów

### 6.2. Generowanie tokenu

Szczegóły w share.service (shared-implementation-plan.md):

- Użycie `crypto.randomBytes(32)` dla kryptograficznej losowości
- Kodowanie base64url (URL-safe, 43 znaki)
- 256 bitów entropii - odporność na brute force (~10^77 lat łamania)

### 6.3. Przechowywanie tokenu

Szczegóły w share.service (shared-implementation-plan.md):

- W bazie przechowywany plainToken (43 znaki base64url)
- Ten sam token zwracany przy każdym wywołaniu (idempotentność)
- Zgodne z praktykami Google Drive, Dropbox, GitHub Gists

### 6.4. Model bezpieczeństwa

- Token chroni przed zgadywaniem przez brute force
- Dane meczu są publiczne dla posiadacza linku
- Jeśli hacker ma dostęp do bazy, ma dostęp do wszystkich danych meczów
- Hashowanie nie dodałoby bezpieczeństwa w tym scenariuszu

### 6.5. Walidacja biznesowa

Obsługiwane przez share.service (shared-implementation-plan.md):

- Tylko zakończone mecze mogą być udostępniane
- Weryfikacja statusu przed utworzeniem linku
- Guard clauses: early return dla invalid states

## 7. Obsługa błędów

### 7.1. Hierarchy błędów

Wykorzystanie klas błędów z shared-implementation-plan.md:

- `ApiError` - błędy walidacji biznesowej (422)
- `NotFoundError` - zasób nie istnieje lub brak dostępu (404)
- `DatabaseError` - błędy operacji bazodanowych (500)

### 7.2. Scenariusze błędów i odpowiedzi

| Scenariusz         | Error Type    | Status | Handling                        |
| ------------------ | ------------- | ------ | ------------------------------- |
| Brak JWT token     | -             | 401    | `createUnauthorizedResponse()`  |
| Mecz nie istnieje  | NotFoundError | 404    | `createNotFoundResponse()`      |
| Brak ownership     | NotFoundError | 404    | `createNotFoundResponse()`      |
| Mecz niezakończony | ApiError      | 422    | `createErrorResponse()`         |
| Błąd DB            | DatabaseError | 500    | `createInternalErrorResponse()` |

### 7.3. Logowanie błędów

Wykorzystanie `logError` z shared-implementation-plan.md z kontekstem:

- endpoint path
- userId
- matchId
- error details

## 8. Wydajność

### 8.1. Database queries

Szczegóły w share.service (shared-implementation-plan.md):

**Optymistyczny flow (link istnieje):** 2 queries

1. SELECT match (weryfikacja ownership + status)
2. SELECT matches_public_share (pobranie istniejącego linku)

**Pesymistyczny flow (nowy link):** 3 queries

1. SELECT match (weryfikacja ownership + status)
2. SELECT matches_public_share (sprawdzenie czy istnieje)
3. INSERT matches_public_share (utworzenie nowego)

### 8.2. Optymalizacje

- Weryfikacja ownership i status w jednym query
- Indeksy automatyczne przez UNIQUE constraints w DB
- Brak N+1 problem - operacje na pojedynczych rekordach

## 9. Kroki implementacji

### Krok 1: Utworzenie endpointu API

**Lokalizacja:** `src/pages/api/matches/[matchId]/share.ts`

**Implementacja funkcji POST:**

1. **Auth check**
   - Weryfikacja `context.locals.user`
   - Return `createUnauthorizedResponse()` jeśli brak

2. **Walidacja path params**
   - Użycie `idParamSchema.safeParse(context.params)`
   - Return `createValidationErrorResponse()` jeśli błąd

3. **Try-catch block**
   - Wywołanie `createOrGetPublicShare(supabase, userId, matchId)`
   - Otrzymanie `{ dto, isNew }`
   - Określenie statusCode: `isNew ? 201 : 200`
   - Return `createSuccessResponse(dto, statusCode)`

4. **Error handling**
   - Catch `NotFoundError` → return `createNotFoundResponse('Match not found')`
   - Catch `ApiError` → return `createErrorResponse(error.code, error.message, error.statusCode)`
   - Catch `DatabaseError` → logowanie + return `createInternalErrorResponse()`
   - Catch-all → logowanie + return `createInternalErrorResponse()`

### Krok 2: Weryfikacja implementacji

1. **TypeScript compilation**
   - Uruchomienie `npx tsc --noEmit`
   - Weryfikacja braku błędów typowania

2. **Linting**
   - Uruchomienie linter
   - Naprawa wszystkich błędów i ostrzeżeń

3. **Code review**
   - Sprawdzenie zgodności z coding guidelines
   - Weryfikacja error handling
   - Sprawdzenie security considerations

---

## Podsumowanie

Plan implementacji endpointu POST /api/matches/{matchId}/share wykorzystuje shared components:

1. **Share Service** (shared-implementation-plan.md) - cała logika biznesowa
2. **API Response Utilities** (shared-implementation-plan.md) - formatowanie odpowiedzi
3. **API Error Utilities** (shared-implementation-plan.md) - obsługa błędów
4. **Common Schemas** (shared-implementation-plan.md) - walidacja parametrów
5. **Logger** (shared-implementation-plan.md) - logowanie błędów

**Kluczowe aspekty:**

- **Bezpieczeństwo**: Kryptograficznie bezpieczne tokeny (256 bitów entropii)
- **Wydajność**: 2-3 queries, brak N+1 problem
- **Idempotentność**: Wielokrotne wywołanie zwraca ten sam link
- **Prostota**: Token zapisywany bezpośrednio (bez hashowania) dla uproszczenia
- **Error handling**: Kompleksowa obsługa wszystkich scenariuszy
- **Type safety**: Pełne typowanie TypeScript

**Decyzja architektoniczna:**
Token nie jest hashowany w bazie danych, zgodnie z praktykami branżowymi (Google Drive, Dropbox, GitHub Gists). Model bezpieczeństwa zakłada, że dane są publiczne dla posiadacza linku, a 256 bitów entropii chroni przed zgadywaniem.

Implementacja powinna zająć około 30-60 minut (głównie endpoint, serwis już opisany w shared-implementation-plan.md).
