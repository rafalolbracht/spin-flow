# API Implementation: GET /api/matches/{matchId}/ai-report

## Przegląd

**Endpoint:** `/api/matches/{matchId}/ai-report`  
**Metoda:** GET  
**Cel:** Pobieranie raportu AI wygenerowanego dla zakończonego meczu  
**Prerender:** `false`  
**Dostępność:** Tylko dla meczów z `generate_ai_summary = true`

---

## Request

### Path Parameters

- `matchId` (integer, required) - ID meczu

**Schemat:** `idParamSchema` (shared-plan: Common Schemas)

---

## Response

### 200 OK

```typescript
{
  data: {
    id: number,
    match_id: number,
    ai_status: 'pending' | 'success' | 'error',
    ai_summary: string | null,
    ai_recommendations: string | null,
    ai_error: string | null,
    ai_generated_at: string | null,
    created_at: string
  }
}
```

**Możliwe statusy:**

- `pending` - AI jeszcze generuje raport
- `success` - Raport gotowy (ai_summary i ai_recommendations wypełnione)
- `error` - Błąd generowania (ai_error wypełnione)

### Błędy

- **404** - Mecz nie istnieje, brak dostępu, lub AI report niedostępny (różne komunikaty)
- **500** - Błąd serwera

---

## Implementacja

### Plik: `src/pages/api/matches/[matchId]/ai-report.ts`

```typescript
export const prerender = false;

export async function GET(context: APIContext) {
  // 1. Supabase client + userId
  const supabase = supabaseClient;
  const userId = DEFAULT_USER_ID;

  // 2. Walidacja matchId
  const paramResult = idParamSchema.safeParse({ id: context.params.matchId });
  if (!paramResult.success) {
    return createValidationErrorResponse(paramResult.error);
  }

  const matchId = paramResult.data.id;

  // 3. Pobranie AI report
  try {
    const report = await getAiReportByMatchId(supabase, userId, matchId);

    if (!report) {
      // Service zwraca null dla 3 scenariuszy - endpoint musi rozróżnić
      const match = await getMatchById(supabase, userId, matchId, undefined);

      if (!match) {
        return createNotFoundResponse("Match not found");
      }

      if (!match.generate_ai_summary) {
        return createNotFoundResponse("AI report not available for this match");
      }

      // Mecz istnieje i ma flagę, ale brak rekordu AI - data inconsistency
      return createNotFoundResponse("AI report not found");
    }

    return createSuccessResponse(report);
  } catch (error) {
    if (error instanceof DatabaseError) {
      logError("GET /api/matches/{matchId}/ai-report", error, { userId, matchId });
      return createInternalErrorResponse();
    }
    throw error;
  }
}
```

### Kluczowe kroki:

1. **Import clienta:** `supabaseClient, DEFAULT_USER_ID` z `src/db/supabase.client`
2. **Walidacja matchId:** `idParamSchema` na `context.params.matchId`
3. **Service:** `getAiReportByMatchId(supabase, userId, matchId)`
4. **Null handling:** Dodatkowe `getMatchById` dla rozróżnienia scenariuszy 404
5. **Response:** `createSuccessResponse(report)`

---

## Logika biznesowa

### Scenariusze null z service

Service zwraca `null` w 3 przypadkach:

1. Mecz nie istnieje / brak dostępu
2. `generate_ai_summary = false`
3. Rekord AI report nie istnieje

Endpoint rozróżnia je przez dodatkowe wywołanie `getMatchById`.

### Statusy AI

- **pending** - Rekord istnieje, generowanie w toku
- **success** - Raport wygenerowany pomyślnie
- **error** - Błąd podczas generowania (np. OpenRouter API timeout)

### Database queries

- **Success path:** 1 query (getAiReportByMatchId)
- **Not found path:** 2 queries (getAiReportByMatchId + getMatchById)

---

## Zależności

**Services:** `ai.service.getAiReportByMatchId`, `match.service.getMatchById`  
**Schemas:** `idParamSchema`  
**Utils:** `createSuccessResponse`, `createNotFoundResponse`, `createValidationErrorResponse`, `createInternalErrorResponse`, `logError`  
**Errors:** `DatabaseError`

---

**Wersja:** 3.0 (Optimized)
