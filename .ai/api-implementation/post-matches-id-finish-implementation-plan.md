# API Implementation: POST /api/matches/{id}/finish

## Przegląd

**Endpoint:** `/api/matches/{id}/finish`  
**Metoda:** POST  
**Cel:** Zakończenie trwającego meczu  
**Prerender:** `false`

**Operacje:**

- Waliduje wynik bieżącego seta i wynik ogólny (brak remisu)
- Finalizuje ostatni set
- Aktualizuje status meczu na 'finished'
- Opcjonalnie triggeruje generację raportu AI (asynchroniczne)
- Rejestruje zdarzenie analityczne 'match_finished'

---

## Request

### Path Parameters

- `id` (integer, required) - ID meczu

**Schemat:** `idParamSchema` (shared-plan: Common Schemas)

### Body: FinishMatchCommandDto

```typescript
{
  coach_notes?: string | null
}
```

**Schemat:** `finishMatchCommandSchema` (shared-plan: Match Schemas)

---

## Response

### 200 OK

```typescript
{
  data: {
    id: number,
    status: 'finished',
    sets_won_player: number,
    sets_won_opponent: number,
    ended_at: string,
    ai_report_status: 'pending' | null  // 'pending' jeśli generate_ai_summary=true
  }
}
```

### Błędy

- **404** - Mecz nie istnieje lub brak dostępu
- **422** - Walidacja biznesowa:
  - "Match is already finished"
  - "Cannot finish match: current set score is tied"
  - "Cannot finish match: overall score is tied"
- **500** - Błąd serwera

---

## Implementacja

### Plik: `src/pages/api/matches/[id]/finish.ts`

```typescript
export const prerender = false;

export async function POST(context: APIContext) {
  // 1. Supabase client + userId
  const supabase = supabaseClient;
  const userId = DEFAULT_USER_ID;

  // 2. Walidacja id
  const paramResult = idParamSchema.safeParse({ id: context.params.id });
  if (!paramResult.success) {
    return createValidationErrorResponse(paramResult.error);
  }

  const matchId = paramResult.data.id;

  // 3. Walidacja body
  const bodyResult = await parseRequestBody(context.request, finishMatchCommandSchema);
  if (!bodyResult.success) {
    return createValidationErrorResponse(bodyResult.error);
  }

  const command = bodyResult.data;

  // 4. Zakończenie meczu
  try {
    const result = await finishMatch(supabase, userId, matchId, command);

    if (!result) {
      return createNotFoundResponse("Match not found");
    }

    return createSuccessResponse(result);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createNotFoundResponse("Match not found");
    }
    if (error instanceof ApiError) {
      return createErrorResponse(error.code, error.message, error.statusCode);
    }
    if (error instanceof DatabaseError) {
      logError("POST /api/matches/{id}/finish", error, { userId, matchId, command });
      return createInternalErrorResponse();
    }
    throw error;
  }
}
```

### Kluczowe kroki:

1. **Import clienta:** `supabaseClient, DEFAULT_USER_ID` z `src/db/supabase.client`
2. **Walidacja id:** `idParamSchema` na `context.params.id`
3. **Walidacja body:** `parseRequestBody` + `finishMatchCommandSchema`
4. **Service:** `finishMatch(supabase, userId, matchId, command)`
5. **Response:** `createSuccessResponse(result)`

---

## Logika biznesowa

### Walidacje w service

- Mecz w statusie 'in_progress' (nie można zakończyć już zakończonego)
- Wynik bieżącego seta nie jest remisowy
- Wynik ogólny (po doliczeniu bieżącego seta) nie jest remisowy

### Algorytm zakończenia

1. Pobierz mecz i bieżący set (nieukończony)
2. Waliduj warunki
3. Określ zwycięzcę bieżącego seta
4. UPDATE set: `is_finished=true, winner, finished_at`
5. Przelicz `sets_won_player/opponent` z COUNT GROUP BY winner
6. Waliduj że wynik ogólny nie remisowy
7. UPDATE match: `status='finished', ended_at, sets_won_*, coach_notes`

### AI Report (fire-and-forget)

```typescript
if (match.generate_ai_summary) {
  await createAiReportRecord(supabase, matchId, userId);
  Promise.resolve().then(() => generateAiReport(supabase, matchId)); // async, no await
}
```

### Analytics (fire-and-forget)

```typescript
trackEvent(supabase, userId, "match_finished", matchId); // no await
```

### Database queries

6-7 queries w service:

1. SELECT match
2. SELECT current set
3. UPDATE set
4. SELECT sets_won (COUNT GROUP BY)
5. UPDATE match
6. INSERT AI report (jeśli enabled)
7. INSERT analytics event

---

## Zależności

**Services:** `match.service.finishMatch`  
**Schemas:** `idParamSchema`, `finishMatchCommandSchema`  
**Utils:** `parseRequestBody`, `createSuccessResponse`, `createNotFoundResponse`, `createValidationErrorResponse`, `createErrorResponse`, `createInternalErrorResponse`, `logError`  
**Errors:** `NotFoundError`, `ApiError`, `DatabaseError`

---

**Wersja:** 3.0 (Optimized)
