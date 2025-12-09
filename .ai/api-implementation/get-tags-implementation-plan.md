# API Implementation: GET /api/tags

## Przegląd

**Endpoint:** `/api/tags`  
**Metoda:** GET  
**Cel:** Pobieranie wszystkich dostępnych tagów w systemie  
**Prerender:** `false`  
**Autoryzacja:** Publiczny (tagi są zasobem globalnym)

---

## Request

### Parametry

Brak (endpoint nie przyjmuje żadnych parametrów)

---

## Response

### 200 OK

```typescript
{
  data: TagDto[]  // [{ id, name, is_system, order_in_list, created_at }, ...]
}
```

**Sortowanie:** `order_in_list ASC`

### Błędy

- **500** - Błąd bazy danych

---

## Implementacja

### Plik: `src/pages/api/tags/index.ts`

```typescript
export const prerender = false;

export async function GET(context: APIContext) {
  // 1. Supabase client (bez userId - endpoint publiczny)
  const supabase = supabaseClient;

  // 2. Query do bazy danych
  try {
    const { data, error } = await supabase.from("tags").select("*").order("order_in_list", { ascending: true });

    if (error) {
      logError("GET /api/tags", error);
      return createInternalErrorResponse();
    }

    const tags: TagDto[] = data;
    return createListResponse(tags);
  } catch (error) {
    logError("GET /api/tags", error);
    return createInternalErrorResponse();
  }
}
```

### Kluczowe kroki:

1. **Import clienta:** `supabaseClient` z `src/db/supabase.client`
2. **Query:** SELECT z sortowaniem po `order_in_list ASC`
3. **Response:** `createListResponse(tags)`

---

## Logika biznesowa

### Zasób globalny

- Tagi są współdzielone pomiędzy wszystkimi użytkownikami
- Brak filtrowania po `user_id`
- Dane read-only dla użytkowników (zarządzane administracyjnie)

### Brak paginacji

- Zawsze zwracana pełna lista tagów
- Dataset jest mały (~10-50 rekordów)

### Sortowanie UI

- Sortowanie według `order_in_list` zapewnia spójną kolejność w interfejsie

### Caching (opcjonalnie)

Client-side caching zalecany:

```typescript
const response = createListResponse(tags);
response.headers.set("Cache-Control", "public, max-age=3600");
return response;
```

---

## Zależności

**Services:** Brak (bezpośrednie query do DB)  
**Utils:** `createListResponse`, `createInternalErrorResponse`, `logError`

---

**Wersja:** 3.0 (Optimized)
