# API Implementation: POST /api/matches/{matchId}/share

## Przegląd

**Endpoint:** `/api/matches/{matchId}/share`
**Metoda:** POST
**Cel:** Generowanie lub pobieranie publicznego linku udostępniania dla zakończonego meczu
**Prerender:** `false`
**Idempotentność:** Wielokrotne wywołanie zwraca ten sam link

---

## Request

### Path Parameters

- `matchId` (integer, required) - ID meczu do udostępnienia

**Schemat:** `idParamSchema` (shared-plan: Common Schemas)

### Body

Brak (endpoint nie przyjmuje body)

---

## Response

### 200 OK - Istniejący link

```typescript
{
  data: {
    id: number,
    match_id: number,
    public_url: string,  // "https://spin-flow.app/public/matches/{token}"
    token: string,       // 43 znaki base64url
    created_at: string
  }
}
```

### 201 Created - Nowy link

Taka sama struktura jak 200, ale nowo utworzony rekord.

### Błędy

- **404** - Mecz nie istnieje lub brak dostępu (ten sam komunikat)
- **422** - Mecz niezakończony (tylko zakończone mecze można udostępniać)
- **500** - Błąd serwera

---

## Implementacja

### Plik: `src/pages/api/matches/[matchId]/share.ts`

```typescript
export const prerender = false;

export async function POST(context: APIContext) {
  // 1. Supabase client + userId
  const supabase = supabaseClient;
  const userId = DEFAULT_USER_ID;

  // 2. Walidacja matchId
  const paramResult = idParamSchema.safeParse({ id: context.params.matchId });
  if (!paramResult.success) {
    return createValidationErrorResponse(paramResult.error);
  }

  const matchId = paramResult.data.id;

  // 3. Utworzenie lub pobranie linku
  try {
    const result = await createOrGetPublicShare(supabase, userId, matchId);

    if (!result) {
      return createNotFoundResponse("Match not found");
    }

    const statusCode = result.isNew ? 201 : 200;
    return createSuccessResponse(result.dto, statusCode);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createNotFoundResponse("Match not found");
    }
    if (error instanceof ApiError) {
      return createErrorResponse(error.code, error.message, error.statusCode);
    }
    if (error instanceof DatabaseError) {
      logError("POST /api/matches/{matchId}/share", error, { userId, matchId });
      return createInternalErrorResponse();
    }
    throw error;
  }
}
```

### Kluczowe kroki:

1. **Import clienta:** `supabaseClient, DEFAULT_USER_ID` z `src/db/supabase.client`
2. **Walidacja matchId:** `idParamSchema` na `context.params.matchId`
3. **Service:** `createOrGetPublicShare(supabase, userId, matchId)` → `{ dto, isNew }`
4. **Response:** `createSuccessResponse(dto, isNew ? 201 : 200)`

---

## Logika biznesowa

### Idempotentność

- Pierwsze wywołanie: generuje nowy token → 201 Created
- Kolejne wywołania: zwraca istniejący token → 200 OK

### Walidacja biznesowa

Service weryfikuje:

- Ownership meczu (user_id = userId)
- Status meczu (must be 'finished')
- Throw ApiError(422) jeśli mecz niezakończony

### Token security

- Generowany przez `crypto.randomBytes(32)` → base64url (43 znaki)
- 256 bitów entropii = niemożliwy brute force
- Zapisywany plaintext w DB (idempotentność, zgodność z praktykami branżowymi)

### Database queries

- **Link istnieje:** 2 queries (verify match + get share)
- **Nowy link:** 3 queries (verify match + check share + insert share)

---

## Zależności

**Services:** `share.service.createOrGetPublicShare`
**Schemas:** `idParamSchema`
**Utils:** `createSuccessResponse`, `createNotFoundResponse`, `createValidationErrorResponse`, `createErrorResponse`, `createInternalErrorResponse`, `logError`
**Errors:** `NotFoundError`, `ApiError`, `DatabaseError`

---

**Wersja:** 3.0 (Optimized)
