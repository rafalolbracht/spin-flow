# Strategia zarządzania zmiennymi środowiskowymi

## Problem

Aplikacja działa w trzech różnych środowiskach, z których każde udostępnia zmienne środowiskowe w inny sposób:

1. **Localhost (development)** - zmienne z pliku `.env` dostępne przez `import.meta.env`
2. **CI/CD (GitHub Actions)** - zmienne ustawione w workflow dostępne przez `process.env`
3. **Cloudflare Workers (production)** - zmienne z env bindings dostępne przez `context.locals.runtime.env`

## Rozwiązanie

### Uniwersalna funkcja `getEnvVariable`

Zaimplementowano funkcję w `src/db/supabase.client.ts`, która próbuje pobrać zmienną środowiskową z trzech źródeł w kolejności:

```typescript
function getEnvVariable(key: string, runtimeEnv?: RuntimeEnv): string {
  // 1. Cloudflare Workers runtime (production)
  if (runtimeEnv?.[key]) {
    return runtimeEnv[key]!;
  }

  // 2. Vite/Astro import.meta.env (development with .env file)
  if (import.meta.env[key]) {
    return import.meta.env[key];
  }

  // 3. Node.js process.env (CI/CD, tests)
  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key]!;
  }

  return "";
}
```

### Jak to działa w poszczególnych środowiskach

#### 1. Localhost (Development)

- Deweloper tworzy plik `.env` z lokalnymi kluczami
- Astro/Vite automatycznie ładuje zmienne z `.env` do `import.meta.env`
- Funkcja `getEnvVariable` znajduje zmienne w `import.meta.env`

**Przykład `.env`:**

```env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=sb_publishable_...
SUPABASE_SERVICE_KEY=sb_secret_...
```

#### 2. CI/CD (GitHub Actions)

- Zmienne są ustawione w workflow jako `env:` lub `secrets:`
- Zmienne są dostępne w `process.env` podczas wykonywania testów
- Playwright uruchamia dev server, który dziedziczy `process.env`
- Funkcja `getEnvVariable` znajduje zmienne w `process.env`
- **Migracje bazy danych** używają dodatkowych zmiennych (np. `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`)

**Przykład workflow (testy):**

```yaml
env:
  NODE_ENV: test
  SUPABASE_URL: ${{ vars.SUPABASE_URL }}
  SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
```

**Przykład workflow (migracje):**

```yaml
env:
  SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN_ACCOUNT }}
  SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
  SUPABASE_PROJECT_REF: ${{ vars.SUPABASE_PROJECT_REF }}
```

**Ważne:** Nie trzeba tworzyć pliku `.env` w CI/CD - kod automatycznie czyta z `process.env`.

#### 3. Cloudflare Workers (Production)

- Zmienne są ustawione w Cloudflare dashboard jako Environment Variables
- Zmienne są dostępne przez `context.locals.runtime.env` w runtime
- Middleware przekazuje `runtimeEnv` do `createSupabaseServerInstance`
- Funkcja `getEnvVariable` znajduje zmienne w `runtimeEnv`

**Przykład middleware:**

```typescript
const runtimeEnv = context.locals.runtime?.env;
const supabase = createSupabaseServerInstance({
  cookies: context.cookies,
  headers: context.request.headers,
  runtimeEnv, // Cloudflare env bindings
});
```

## Bezpieczeństwo

### Co commitować do repo

✅ **TAK:**

- `.env.example` - przykładowy plik z nazwami zmiennych (bez wartości)
- Dokumentacja zmiennych środowiskowych

❌ **NIE:**

- `.env` - zawiera rzeczywiste klucze (dodany do `.gitignore`)
- `.env.production` - zawiera produkcyjne sekrety

### Gdzie przechowywać sekrety

- **Localhost:** Plik `.env` lokalnie (git-ignored)
- **CI/CD:** GitHub Secrets i Variables w Settings → Secrets and variables → Actions
- **Production:** Cloudflare Environment Variables w dashboard projektu

## Wymagane zmienne środowiskowe

### Wszystkie środowiska

```env
NODE_ENV=development|test|production
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJhbG...  # Anon/Public key
SUPABASE_SERVICE_KEY=eyJhbG...  # Service role key (tylko backend!)
```

### Opcjonalne / Specyficzne dla CI/CD

```env
SITE_URL=https://spin-flow.app
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
FACEBOOK_APP_ID=xxx
FACEBOOK_APP_SECRET=xxx
TEST_USER_ID=uuid  # Wymagane dla testów E2E
TEST_USER_EMAIL=test@example.com  # Wymagane dla testów E2E
OPENROUTER_API_KEY=xxx
SUPABASE_PROJECT_REF=xxx  # Wymagane dla migracji (CI/CD)
SUPABASE_DB_PASSWORD=xxx  # Wymagane dla migracji (CI/CD Secrets)
SUPABASE_ACCESS_TOKEN_ACCOUNT=xxx # Wymagane dla migracji (CI/CD Secrets)
CLOUDFLARE_API_TOKEN=xxx # Wymagane dla deploymentu PROD (CI/CD Secrets)
CLOUDFLARE_ACCOUNT_ID=xxx # Wymagane dla deploymentu PROD (CI/CD Secrets)
```

## Testowanie lokalnie

Aby przetestować czy zmienne są prawidłowo czytane, możesz uruchomić:

```bash
# Test 1: Normalny dev server (czyta z .env)
npm run dev

# Test 2: Dev server z nadpisanymi zmiennymi (symulacja CI/CD)
export SUPABASE_URL=http://127.0.0.1:54321
npm run dev

# Test 3: Testy E2E (czyta z .env lub process.env)
npm run test:e2e
```

## Debugging

Jeśli zmienne nie są poprawnie czytane, sprawdź:

1. **Czy plik `.env` istnieje i zawiera wszystkie wymagane zmienne**

   ```bash
   cat .env
   ```

2. **Czy zmienne są dostępne w process.env (CI/CD)**
   Dodaj do testu:

   ```typescript
   console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
   ```

3. **Czy zmienne są dostępne w import.meta.env**
   Dodaj do middleware:

   ```typescript
   console.log("SUPABASE_URL:", import.meta.env.SUPABASE_URL);
   ```

4. **Sprawdź logi podczas testów E2E**
   Funkcja `getEnvVariable` loguje ostrzeżenia dla wybranych zmiennych w trybie testowym.

## Dalsze kroki

Jeśli dodajesz nową zmienną środowiskową:

1. ✅ Dodaj do `.env.example`
2. ✅ Dodaj do lokalnego `.env`
3. ✅ Dodaj do GitHub Secrets/Variables dla środowisk DEV/FIX/PROD
4. ✅ Dodaj do Cloudflare Environment Variables
5. ✅ Zaktualizuj ten dokument
