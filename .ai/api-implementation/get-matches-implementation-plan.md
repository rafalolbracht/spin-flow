# API Implementation: GET /api/matches

## Przegląd

**Endpoint:** `/api/matches`  
**Metoda:** GET  
**Cel:** Pobieranie spaginowanej listy meczów z filtrowaniem i sortowaniem  
**Prerender:** `false`

**Operacje:**

- Server-side pagination
- Filtrowanie po player_name, opponent_name, status
- Sortowanie (domyślnie: `-started_at`)
- Zwraca uproszczone dane meczu (bez zagnieżdżonych relacji)

---

## Request

### Query Parameters (wszystkie opcjonalne)

- `page` (integer, default: 1, min: 1) - Numer strony
- `limit` (integer, default: 20, min: 1, max: 100) - Elementy na stronę
- `player_name` (string, min: 1 po trim) - Filtr case-insensitive, częściowe dopasowanie (ILIKE)
- `opponent_name` (string, min: 1 po trim) - Filtr case-insensitive, częściowe dopasowanie (ILIKE)
- `status` (enum: 'in_progress' | 'finished') - Filtr po statusie
- `sort` (string, default: `-started_at`) - Format: `[-]field_name`. Prefix `-` = malejąco. Dozwolone: `started_at`, `ended_at`, `created_at`, `player_name`, `opponent_name`

**Schemat:** `matchListQuerySchema` (shared-plan: Match Schemas)

---

## Response

### 200 OK

```typescript
{
  data: MatchListItemDto[],   // Aktualna strona
  pagination: {
    total: number               // Całkowita liczba meczów (dla wszystkich stron)
  }
}
```

**MatchListItemDto:**

```typescript
{
  id: number,
  player_name: string,
  opponent_name: string,
  max_sets: number,
  golden_set_enabled: boolean,
  first_server_first_set: SideEnum,
  generate_ai_summary: boolean,
  sets_won_player: number,
  sets_won_opponent: number,
  status: MatchStatusEnum,
  coach_notes: string | null,
  started_at: string,
  ended_at: string | null,
  created_at: string
}
```

**Uwaga:** Bez `user_id`, bez zagnieżdżonych relacji (sets, points)

### Błędy

- **422** - Walidacja query params (page=abc, limit=200, status=invalid, sort=invalid_field)
- **500** - Błąd serwera

---

## Implementacja

### Plik: `src/pages/api/matches/index.ts` (współdzielony z POST)

```typescript
export const prerender = false;

export async function GET(context: APIContext) {
  // 1. Supabase client + userId
  const supabase = supabaseClient;
  const userId = DEFAULT_USER_ID;

  // 2. Walidacja query params
  const queryResult = parseQueryParams(context.url.searchParams, matchListQuerySchema);
  if (!queryResult.success) {
    return createValidationErrorResponse(queryResult.error);
  }

  const query = queryResult.data;

  // 3. Pobranie meczów z paginacją
  try {
    const result = await getMatchesPaginated(supabase, userId, query);
    return createPaginatedResponse(result.data, result.pagination.total, 200);
  } catch (error) {
    if (error instanceof DatabaseError) {
      logError("GET /api/matches", error, { userId, query });
      return createInternalErrorResponse();
    }
    throw error;
  }
}
```

### Kluczowe kroki:

1. **Import clienta:** `supabaseClient, DEFAULT_USER_ID` z `src/db/supabase.client`
2. **Walidacja query:** `parseQueryParams` + `matchListQuerySchema`
3. **Service:** `getMatchesPaginated(supabase, userId, query)`
4. **Response:** `createPaginatedResponse(data, total, 200)`

---

## Logika biznesowa

### Algorytm w getMatchesPaginated service

1. **Budowanie query:**
   - WHERE user_id = userId (lub RLS)
   - WHERE player_name ILIKE `%${player_name}%` (jeśli podano)
   - WHERE opponent_name ILIKE `%${opponent_name}%` (jeśli podano)
   - WHERE status = status (jeśli podano)
   - ORDER BY sort field (ASC/DESC)
   - RANGE (offset, offset + limit - 1)

2. **COUNT query:**
   - Te same filtry co SELECT
   - Zwraca `total` (całkowita liczba meczów)

3. **Response:**
   - `{ data: MatchListItemDto[], pagination: { total: number } }`

### Database queries

2 queries:

1. SELECT COUNT (\*) - dla total
2. SELECT \* FROM matches - z filtrami, sortowaniem i paginacją

### Paginacja

**Offset:** `(page - 1) * limit`  
**Range:** `(offset, offset + limit - 1)`

**Client-side management:**

- Klient zarządza stanem paginacji (current page, rows per page)
- Klient oblicza `total_pages` na podstawie `total` i `limit`
- Backend zwraca tylko `total`

### Filtrowanie

**ILIKE (case-insensitive, partial match):**

- `player_name` → `ILIKE '%value%'`
- `opponent_name` → `ILIKE '%value%'`

**Exact match:**

- `status` → `= 'value'`

### Sortowanie

**Format:** `[-]field_name`

- `-started_at` → ORDER BY started_at DESC (default)
- `player_name` → ORDER BY player_name ASC

**Whitelisting:** Tylko predefiniowane pola (`started_at`, `ended_at`, `created_at`, `player_name`, `opponent_name`)

---

## Zależności

**Services:** `match.service.getMatchesPaginated`  
**Schemas:** `matchListQuerySchema`  
**Utils:** `parseQueryParams`, `createPaginatedResponse`, `createValidationErrorResponse`, `createInternalErrorResponse`, `logError`  
**Errors:** `DatabaseError`

---

**Wersja:** 3.0 (Optimized)
