# API Implementation: GET /api/dictionary/labels

## Przegląd

**Endpoint:** `/api/dictionary/labels`  
**Metoda:** GET  
**Cel:** Pobieranie etykiet UI dla enumów i wartości słownikowych  
**Prerender:** `false`  
**Autoryzacja:** Publiczny (bez uwierzytelniania)

---

## Request

### Query Parameters (opcjonalne)

- `domain` (string) - Filtruje wyniki po domenie (np. "side_enum", "match_status_enum")

**Schemat:** `dictionaryQuerySchema` (shared-plan: Dictionary Schemas)

---

## Response

### 200 OK

```typescript
{
  data: DictionaryLabelDto[]  // [{ id, domain, code, label }, ...]
}
```

### Błędy

- **422** - Walidacja query params
- **500** - Błąd bazy danych

**Uwaga:** Pusta tablica `[]` to poprawna odpowiedź (brak wyników dla domain)

---

## Implementacja

### Plik: `src/pages/api/dictionary/labels.ts`

```typescript
export const prerender = false;

export async function GET(context: APIContext) {
  // 1. Supabase client (bez userId - endpoint publiczny)
  const supabase = supabaseClient;

  // 2. Walidacja query params
  const result = parseQueryParams(context.url.searchParams, dictionaryQuerySchema);
  if (!result.success) {
    return createValidationErrorResponse(result.error);
  }

  // 3. Pobranie etykiet
  try {
    const labels = await getDictionaryLabels(supabase, result.data.domain);
    return createListResponse(labels);
  } catch (error) {
    if (error instanceof DatabaseError) {
      return createInternalErrorResponse("Failed to retrieve dictionary labels");
    }
    throw error;
  }
}
```

### Kluczowe kroki:

1. **Import clienta:** `supabaseClient` z `src/db/supabase.client`
2. **Walidacja:** `parseQueryParams` + `dictionaryQuerySchema`
3. **Service:** `getDictionaryLabels(supabase, domain?)`
4. **Response:** `createListResponse(labels)`

---

## Logika biznesowa

### Endpoint publiczny

- Brak wymagania uwierzytelniania
- Słownik jest taki sam dla wszystkich użytkowników
- Brak weryfikacji `user_id` w query (tabela globalna)

### Brak paginacji

- Słownik jest mały (~20-50 rekordów total)
- Z filtrem `domain`: zazwyczaj 2-10 rekordów

### Sortowanie

- `ORDER BY domain ASC, order_in_list ASC` (w service)

---

## Zależności

**Services:** `dictionary.service.getDictionaryLabels`  
**Schemas:** `dictionaryQuerySchema`  
**Utils:** `parseQueryParams`, `createListResponse`, `createValidationErrorResponse`, `createInternalErrorResponse`

---

**Wersja:** 3.0 (Optimized)
