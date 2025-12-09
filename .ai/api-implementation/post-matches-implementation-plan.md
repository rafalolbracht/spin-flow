# API Implementation: POST /api/matches

## Przegląd

**Endpoint:** `/api/matches`  
**Metoda:** POST  
**Cel:** Utworzenie nowego meczu i automatyczne rozpoczęcie pierwszego seta  
**Prerender:** `false`

**Operacje:**

- Utworzenie rekordu meczu
- Automatyczne utworzenie pierwszego seta
- Rejestracja zdarzenia analitycznego 'match_created' (fire-and-forget)

---

## Request

### Body: CreateMatchCommandDto

```typescript
{
  player_name: string,              // 1-200 chars
  opponent_name: string,            // 1-200 chars
  max_sets: number,                 // 1-7 (integer)
  golden_set_enabled: boolean,
  first_server_first_set: 'player' | 'opponent',
  generate_ai_summary: boolean
}
```

**Schemat:** `createMatchCommandSchema` (shared-plan: Match Schemas)

**Uwaga:** Wszystkie pola wymagane

---

## Response

### 201 Created

```typescript
{
  data: {
    // Match fields
    id: number,
    player_name: string,
    opponent_name: string,
    max_sets: number,
    golden_set_enabled: boolean,
    first_server_first_set: SideEnum,
    generate_ai_summary: boolean,
    sets_won_player: 0,           // Auto-initialized
    sets_won_opponent: 0,         // Auto-initialized
    status: 'in_progress',        // Auto-set
    coach_notes: null,            // Auto-initialized
    started_at: string,           // Auto-set (now)
    ended_at: null,               // Auto-initialized
    created_at: string,           // Auto-set (now)

    // First set (always created)
    current_set: {
      id: number,
      sequence_in_match: 1,
      is_golden: false,           // First set never golden
      set_score_player: 0,
      set_score_opponent: 0,
      is_finished: false,
      current_server: SideEnum    // Copied from first_server_first_set
    }
  }
}
```

### Błędy

- **422** - Walidacja (puste nazwy, max_sets poza zakresem, nieprawidłowy enum)
- **400** - Invalid JSON
- **500** - Błąd serwera

---

## Implementacja

### Plik: `src/pages/api/matches/index.ts`

```typescript
export const prerender = false;

export async function POST(context: APIContext) {
  // 1. Supabase client + userId
  const supabase = supabaseClient;
  const userId = DEFAULT_USER_ID;

  // 2. Walidacja body
  const bodyResult = await parseRequestBody(context.request, createMatchCommandSchema);
  if (!bodyResult.success) {
    // JSON parse error
    if (bodyResult.error instanceof Error) {
      return createErrorResponse("INVALID_JSON", bodyResult.error.message, 400);
    }
    // Zod validation error
    return createValidationErrorResponse(bodyResult.error);
  }

  const command = bodyResult.data;

  // 3. Utworzenie meczu
  try {
    const result = await createMatch(supabase, userId, command);
    return createSuccessResponse(result, 201);
  } catch (error) {
    if (error instanceof DatabaseError) {
      logError("POST /api/matches", error, { userId, command });
      return createInternalErrorResponse();
    }
    throw error;
  }
}
```

### Kluczowe kroki:

1. **Import clienta:** `supabaseClient, DEFAULT_USER_ID` z `src/db/supabase.client`
2. **Walidacja body:** `parseRequestBody` + `createMatchCommandSchema`
3. **Service:** `createMatch(supabase, userId, command)`
4. **Response:** `createSuccessResponse(result, 201)`

---

## Logika biznesowa

### Algorytm w createMatch service

1. **INSERT match:**
   - Wszystkie pola z command
   - `user_id` = userId (z DEFAULT_USER_ID)
   - `status` = 'in_progress'
   - `sets_won_player` = 0
   - `sets_won_opponent` = 0
   - `coach_notes` = null
   - `started_at` = now()
   - `ended_at` = null

2. **Utworzenie pierwszego seta:**
   - Wywołanie `createFirstSet(supabase, matchId, userId, first_server_first_set, isGolden=false)`
   - Service zwraca `CurrentSetDto`

3. **Analytics (fire-and-forget):**

   ```typescript
   trackEvent(supabase, userId, "match_created", matchId); // no await
   ```

4. **Response:**
   - Mapowanie na `CreateMatchDto` (match + current_set)

### Database queries

2-3 queries:

1. INSERT match
2. INSERT set (pierwszy)
3. INSERT analytics_events (fire-and-forget, może fail bez przerywania)

### First set characteristics

- `sequence_in_match` = 1
- `is_golden` = false (pierwszy set nigdy nie jest golden)
- `is_finished` = false
- `set_score_player` = 0
- `set_score_opponent` = 0
- `current_server` = `first_server_first_set` z command

---

## Zależności

**Services:** `match.service.createMatch` (używa `set.service.createFirstSet`, `analytics.service.trackEvent`)  
**Schemas:** `createMatchCommandSchema`  
**Utils:** `parseRequestBody`, `createSuccessResponse`, `createValidationErrorResponse`, `createErrorResponse`, `createInternalErrorResponse`, `logError`  
**Errors:** `DatabaseError`

---

**Wersja:** 3.0 (Optimized)
