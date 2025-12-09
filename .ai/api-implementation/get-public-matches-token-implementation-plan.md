# API Implementation: GET /api/public/matches/{token}

## Przegląd

**Endpoint:** `/api/public/matches/{token}`  
**Metoda:** GET  
**Cel:** Publiczne udostępnianie szczegółowych danych meczu bez uwierzytelnienia  
**Prerender:** `false`  
**Autoryzacja:** Publiczny (dostęp przez unikalny token)

---

## Request

### Path Parameters

- `token` (string, required) - Publiczny token (43 znaki base64url)

**Schemat:** `tokenParamSchema` (shared-plan: Common Schemas)

---

## Response

### 200 OK

```typescript
{
  data: {
    match: PublicMatchDto,      // Bez user_id, first_server_first_set, generate_ai_summary, created_at
    sets: PublicSetDto[],        // Bez match_id, user_id, is_finished, created_at + zagnieżdżone points
    ai_report: PublicAIReportDto | null  // Tylko ai_status, ai_summary, ai_recommendations
  }
}
```

### Błędy

- **404** - Token nieprawidłowy lub mecz nie istnieje (ten sam komunikat dla obu)
- **500** - Błąd serwera

**Uwaga:** Identyczna odpowiedź 404 dla "token invalid" i "match deleted" (zapobieganie enumeracji)

---

## Implementacja

### Plik: `src/pages/api/public/matches/[token].ts`

```typescript
export const prerender = false;

export async function GET(context: APIContext) {
  // 1. Supabase client (bez userId - endpoint publiczny)
  const supabase = supabaseClient;

  // 2. Walidacja tokenu (path param)
  const tokenResult = tokenParamSchema.safeParse({ token: context.params.token });
  if (!tokenResult.success) {
    return createNotFoundResponse("Shared match not found");
  }

  // 3. Pobranie danych meczu
  try {
    const matchData = await getPublicMatchByToken(supabase, tokenResult.data.token);

    if (!matchData) {
      return createNotFoundResponse("Shared match not found");
    }

    return createSuccessResponse(matchData);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createNotFoundResponse("Shared match not found");
    }
    // Log tylko błędy 500, nie 404
    logError("GET /api/public/matches/{token}", error, { token: token.substring(0, 8) + "..." });
    return createInternalErrorResponse();
  }
}
```

### Kluczowe kroki:

1. **Import clienta:** `supabaseClient` z `src/db/supabase.client`
2. **Walidacja tokenu:** `tokenParamSchema` na `context.params.token`
3. **Service:** `getPublicMatchByToken(supabase, token)`
4. **Response:** `createSuccessResponse(matchData)`

---

## Logika biznesowa

### Token plaintext

- Token zapisany i wyszukiwany jako plaintext (bez hashowania)
- 256 bitów entropii = niemożliwy brute force
- Model bezpieczeństwa: dane meczu publiczne dla posiadacza tokenu

### Optymalizacja pobierania danych

Service używa nested select (4 queries max zamiast N+1):

```typescript
// W public-match.service.ts
supabase
  .from("sets")
  .select(
    `
  *,
  points(
    *,
    point_tags(tags(name))
  )
`
  )
  .eq("match_id", matchId);
```

### Wykluczenie wrażliwych danych

Publiczne DTOs nie zawierają:

- `user_id`
- `first_server_first_set`
- `generate_ai_summary`
- `created_at` timestamps (niektóre)

### Jednolite komunikaty błędów

"Shared match not found" dla:

- Token nieprawidłowy format
- Token nie istnieje w bazie
- Mecz został usunięty

---

## Zależności

**Services:** `public-match.service.getPublicMatchByToken`  
**Schemas:** `tokenParamSchema`  
**Utils:** `createSuccessResponse`, `createNotFoundResponse`, `createInternalErrorResponse`, `logError`  
**Errors:** `NotFoundError`

---

**Wersja:** 3.0 (Optimized)
