# API Implementation: POST /api/analytics/events

## Przegląd

**Endpoint:** `/api/analytics/events`  
**Metoda:** POST  
**Cel:** Rejestrowanie zdarzeń analitycznych (login, match_created, match_finished)  
**Prerender:** `false`

---

## Request

### Body: CreateAnalyticsEventCommandDto

```typescript
{
  user_id: string,        // UUID
  type: AnalyticsEventTypeEnum,  // 'login' | 'match_created' | 'match_finished'
  match_id?: number | null       // Wymagane dla match_created/match_finished
}
```

**Schemat:** `createAnalyticsEventCommandSchema` (shared-plan: Analytics Schemas)

---

## Response

### 201 Created

```typescript
{
  data: {
    id: number,
    user_id: string,
    type: string,
    match_id: number | null,
    created_at: string
  }
}
```

### Błędy

- **422** - Walidacja nie przeszła
- **500** - Błąd bazy danych

---

## Implementacja

### Plik: `src/pages/api/analytics/events.ts`

```typescript
export const prerender = false;

export async function POST(context: APIContext) {
  // 1. Supabase client + userId
  const supabase = supabaseClient;
  const userId = DEFAULT_USER_ID;

  // 2. Walidacja body
  const result = await parseRequestBody(context.request, createAnalyticsEventCommandSchema);
  if (!result.success) {
    return createValidationErrorResponse(result.error);
  }

  // 3. Utworzenie eventu
  try {
    const event = await createAnalyticsEvent(supabase, result.data);
    return createSuccessResponse(event, 201);
  } catch (error) {
    if (error instanceof DatabaseError) {
      return createInternalErrorResponse("Failed to create analytics event");
    }
    throw error;
  }
}
```

### Kluczowe kroki:

1. **Import clienta:** `supabaseClient, DEFAULT_USER_ID` z `src/db/supabase.client`
2. **Walidacja:** `parseRequestBody` + `createAnalyticsEventCommandSchema`
3. **Service:** `createAnalyticsEvent(supabase, command)`
4. **Response:** `createSuccessResponse(event, 201)`

---

## Logika biznesowa

### Walidacja warunkowa match_id

- `type = 'login'` → `match_id` opcjonalny
- `type = 'match_created' | 'match_finished'` → `match_id` wymagany

**Realizacja:** Schemat Zod z `.refine()` (shared-plan: Analytics Schemas)

### Fire-and-forget vs Internal API

- **`trackEvent`** - używany wewnątrz innych endpointów (no await)
- **`createAnalyticsEvent`** - endpoint z walidacją i zwracaniem danych

---

## Zależności

**Services:** `analytics.service.createAnalyticsEvent`  
**Schemas:** `createAnalyticsEventCommandSchema`  
**Utils:** `parseRequestBody`, `createSuccessResponse`, `createValidationErrorResponse`, `createInternalErrorResponse`

---

**Wersja:** 3.0 (Optimized)
