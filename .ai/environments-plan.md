# Spin-Flow – Kontrakt środowiska i CI/CD

Dokument opisuje **stan docelowy** konfiguracji projektu Spin-Flow:

- struktury Git,
- środowisk Cloudflare,
- projektów Supabase,
- sekretów,
- zasad CI/CD.

Dokument jest przeznaczony do **jednoznacznego odtworzenia konfiguracji**
(np. do generowania GitHub Actions YAML).

---

## 1. Git – struktura branchy

### Branche

| Branch    | Przeznaczenie                 |
| --------- | ----------------------------- |
| `develop` | Rozwój dużych funkcjonalności |
| `fix`     | Hotfixy i małe zmiany         |
| `main`    | Produkcja (release-only)      |

---

## 2. Zasady pracy z branchami

### `develop`

- prace rozwojowe
- zmiany mogą być niestabilne
- **push uruchamia CI/CD DEV**
- **automatyczny deploy**
- **automatyczne migracje bazy DEV**

### `fix`

- hotfixy i drobne poprawki
- środowisko zbliżone do produkcji
- **push uruchamia CI/CD FIX**
- **automatyczny preview deploy**
- **automatyczne migracje bazy FIX**

### `main`

- branch produkcyjny
- **brak PR-ów**
- **brak automatycznego CI/CD**
- zmiany wchodzą **wyłącznie ręcznym merge’em admina**
- **deploy i migracje wyłącznie manualnie**

---

## 3. Branch protection rules

### `main`

- ❌ Require pull request before merging
- ❌ Require status checks
- ❌ Lock branch
- ❌ Allow force push
- ❌ Allow deletions
- ❌ Require signed commits
- ❌ Require deployments
- ✅ tylko admin/maintainer może push/merge (domyślne zachowanie GitHuba)

> `main` jest **świadomie kontrolowany**, nie automatyczny.

### `develop`

- brak restrykcji
- push = CI/CD DEV

### `fix`

- brak restrykcji
- push = CI/CD FIX

---

## 4. Supabase – konta i projekty

### Konto A (Free)

- **PROD** – produkcja
- **FIX** – pre-prod / hotfix / preview

### Konto B (Free)

- **DEV** – środowisko rozwojowe

---

## 5. Migracje bazy danych

| Branch    | Supabase projekt | Tryb         |
| --------- | ---------------- | ------------ |
| `develop` | DEV              | automatyczny |
| `fix`     | FIX              | automatyczny |
| `main`    | PROD             | **ręczny**   |

Migracje:

- wersjonowane w repo (`supabase/migrations`)
- PROD nigdy nie jest aktualizowany automatycznie

---

## 6. Cloudflare Pages

### Projekt: `spin-flow`

#### Production

- branch: `main`
- deploy: **tylko ręcznie (Deploy Hook)**
- domena: `https://spin-flow.app`
- Supabase: **PROD**

#### Preview

- branch: `fix`
- deploy: automatyczny
- URL: `https://fix.spin-flow.pages.dev`
- Supabase: **FIX**

### Projekt: `spin-flow-dev`

#### Production

- branch: `develop`
- deploy: automatyczny
- URL: `https://spin-flow-dev.pages.dev`
- Supabase: **DEV**

---

## 7. GitHub Environments

### Environments

- `DEV`
- `FIX`
- `PROD`

### Environment secrets (per environment)

```
SUPABASE_ACCESS_TOKEN_ACCOUNT
SUPABASE_KEY
SUPABASE_SERVICE_KEY
GOOGLE_CLIENT_SECRET
FACEBOOK_APP_SECRET
CLOUDFLARE_DEPLOY_HOOK_URL   (tylko PROD)
```

### Environment variables (per environment)

```
SUPABASE_PROJECT_REF
SUPABASE_URL
SITE_URL
TEST_USER_EMAIL
TEST_USER_ID
```

### Repository secret (globalny)

```
OPENROUTER_API_KEY
```

---

## 8. Zmienne aplikacji (Astro – stałe)

Nazwy **nie podlegają zmianie**:

```
SUPABASE_URL
SUPABASE_KEY
SUPABASE_SERVICE_KEY
OPENROUTER_API_KEY
SITE_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
FACEBOOK_APP_ID
FACEBOOK_APP_SECRET
TEST_USER_ID
TEST_USER_EMAIL
```

Źródła:

- Cloudflare (runtime)
- GitHub Environments (CI)
- `.env` lokalnie

---

## 9. CI/CD – logika (bez YAML)

### PR checks

- **tylko dla `develop` i `fix`**
- **brak PR-ów do `main`**
- environment: **DEV**
- wykonywane kroki:
  - `lint`
  - `test:unit`
  - `test:e2e`
  - `build`
- e2e:
  - uruchamiane lokalnie (`astro dev`)
  - wymagają sekretów (Supabase, OAuth, test user)

### Push `develop`

- migracje → Supabase DEV
- deploy → Cloudflare `spin-flow-dev`

### Push `fix`

- migracje → Supabase FIX
- deploy → Cloudflare Preview

### Release PROD

- ręczny (`workflow_dispatch`)
- tylko z `main`
- environment: `PROD` (approval)
- kolejność:
  1. lint
  2. unit tests
  3. build
  4. migracje → Supabase PROD
  5. Cloudflare Deploy Hook

---

## 10. Testy

### Unit

- `vitest run`

### E2E

- `playwright`
- używa:
  - `TEST_USER_EMAIL`
  - `TEST_USER_ID`
  - Supabase + OAuth
- PR: localhost
- po deploy (opcjonalnie): smoke testy na `SITE_URL`

---

## 11. Zasady bezpieczeństwa

- brak automatycznych operacji na PROD
- brak sekretów PROD w PR checks
- environment `PROD`:
  - ograniczenie do branch `main`
  - wymagany reviewer
- `OPENROUTER_API_KEY` jako repo secret (wspólny)

---

## 12. Filozofia

> **Develop i Fix są automatyczne i testowalne.  
> Main jest tylko punktem świadomego, ręcznego release’u.  
> Produkcja nigdy nie dzieje się sama.**
