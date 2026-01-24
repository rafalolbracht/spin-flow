# GitHub Actions Workflows - Dokumentacja

## Przegląd

Projekt wykorzystuje 4 workflow pliki GitHub Actions:

1. **pull-request.yml** - CI dla Pull Requestów do `develop` i `fix`
2. **push-develop.yml** - CI oraz migracje bazy danych dla środowiska DEV (deploy automatyczny via Cloudflare Pages Integration)
3. **push-fix.yml** - CI oraz migracje bazy danych dla środowiska FIX (deploy automatyczny via Cloudflare Pages Integration)
4. **prod-release.yml** - Ręczny deploy do środowiska PROD (w tym migracje)

---

## 1. Pull Request CI (`pull-request.yml`)

### Trigger

- Pull requesty do branchy: `develop`, `fix`

### Struktura jobów

```
lint
 ├─→ unit-test (równolegle)
 ├─→ e2e-test (równolegle)
 └─→ build (równolegle)
      └─→ status-comment
```

### Joby

#### `lint`

- Lintowanie kodu
- Używa ESLint zgodnie z konfiguracją projektu

#### `unit-test`

- Testy jednostkowe z Vitest
- Generuje coverage report
- Upload artefaktu coverage

#### `e2e-test`

- Testy end-to-end z Playwright
- Instaluje przeglądarki (tylko Chromium wg `playwright.config.ts`)
- Używa środowiska DEV lub FIX (w zależności od target brancha)
- Wymaga dostępu do sekretów środowiskowych
- Upload raportów Playwright

#### `build`

- Buduje aplikację produkcyjną (`npm run build`)
- Weryfikuje czy build się udaje przed merge
- **Ważne:** Testuje produkcyjny build, podczas gdy E2E używa dev server
- Waliduje obecność katalogu `dist/`
- **Nie wymaga zmiennych środowiskowych** - używa wbudowanych fallbacks
- Rzeczywiste wartości są wstrzykiwane w runtime przez Cloudflare

#### `status-comment`

- Uruchamia się tylko jeśli wszystkie poprzednie joby przeszły (`needs: [lint, unit-test, e2e-test, build]`)
- Publikuje komentarz do PR ze statusem wszystkich testów
- Używa `marocchino/sticky-pull-request-comment@v2`

### Wymagane sekrety i zmienne

**Environment**: `DEV` lub `FIX` (automatycznie wybierany na podstawie target brancha)

**Secrets**:

- `SUPABASE_KEY`
- `SUPABASE_SERVICE_KEY`
- `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_APP_SECRET`
- `OPENROUTER_API_KEY` (repository secret)

**Variables**:

- `SUPABASE_URL`
- `SITE_URL`
- `GOOGLE_CLIENT_ID`
- `FACEBOOK_APP_ID`
- `TEST_USER_ID`
- `TEST_USER_EMAIL`

---

## 2. Push to Develop (`push-develop.yml`)

### Trigger

- Push do brancha: `develop`

### Struktura jobów

```
lint
 ├─→ unit-test (równolegle)
 ├─→ e2e-test (równolegle)
 └─→ build (równolegle)
      └─→ migrate
           └─→ deploy
```

### Joby

#### `lint`, `unit-test`, `e2e-test`

- Identyczne jak w pull-request.yml
- E2E używa środowiska `DEV`

#### `build`

- Buduje aplikację produkcyjną
- Upload artefaktu build (7 dni retention)
- Build jest używany przez job `deploy`

### Joby

#### `migrate`

- Uruchamia migracje bazy danych Supabase DEV
- Używa Supabase CLI
- Automatyczne po przejściu testów i buildu

#### `deploy` (obsługiwany poza Workflow)

- Deployment aplikacji odbywa się **automatycznie** dzięki integracji Cloudflare Pages z repozytorium GitHub
- Workflow jedynie przygotowuje build artifact jako backup i punkt odniesienia

### Wymagane sekrety i zmienne

**Environment**: `DEV`

**Secrets**:

- `SUPABASE_KEY`
- `SUPABASE_SERVICE_KEY`
- `SUPABASE_ACCESS_TOKEN_ACCOUNT` (do migracji)
- `SUPABASE_DB_PASSWORD` (do linkowania projektu)
- `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_APP_SECRET`
- `OPENROUTER_API_KEY` (repository secret)

**Variables**:

- `SUPABASE_URL`
- `SUPABASE_PROJECT_REF`
- `SITE_URL`
- `GOOGLE_CLIENT_ID`
- `FACEBOOK_APP_ID`
- `TEST_USER_ID`
- `TEST_USER_EMAIL`

---

## 3. Push to Fix (`push-fix.yml`)

### Trigger

- Push do brancha: `fix`

### Struktura jobów

Identyczna jak `push-develop.yml`, ale używa środowiska `FIX`

```
lint
 ├─→ unit-test (równolegle)
 ├─→ e2e-test (równolegle)
 └─→ build (równolegle)
      └─→ migrate
           └─→ deploy
```

### Różnice od push-develop

#### `build`

- Upload artefaktu `build-fix` (7 dni retention)

#### `deploy`

- Pobiera artefakt build z poprzedniego joba
- Deploy do Cloudflare Pages jako preview: `--project-name=spin-flow --branch=fix`
- URL: `https://spin-flow-fix.pages.dev`

### Wymagane sekrety i zmienne

**Environment**: `FIX`

Identyczne jak w `push-develop.yml`, ale z wartościami dla środowiska FIX

---

## 4. Production Release (`prod-release.yml`)

### Trigger

- **Ręczny** (`workflow_dispatch`)
- Tylko z brancha `main`
- Wymaga potwierdzenia wpisując "PROD"

### Struktura jobów

```
validate
 └─→ lint
      └─→ unit-test
           └─→ migrate
                └─→ deploy
                     └─→ notify
```

### Joby

#### `validate`

- Waliduje potwierdzenie "PROD"
- Sprawdza czy workflow uruchomiony z brancha `main`

#### `lint`, `unit-test`

- Standardowe kroki walidacji kodu

#### `migrate`

- **Ręczne** migracje bazy danych Supabase PROD
- Wymaga environment approval
- Szczegółowe logi migracji

#### `deploy`

- Buduje aplikację produkcyjną w środowisku CI (`npm run build`)
- Publikuje zbudowaną aplikację bezpośrednio do Cloudflare Pages za pomocą `wrangler-action`
- Nie korzysta z Deploy Hooka - build następuje na GitHub Actions

#### `notify`

- Podsumowanie całego procesu
- Status wszystkich kroków
- Link do aplikacji produkcyjnej

### Wymagane sekrety i zmienne

**Environment**: `PROD` (wymaga manual approval)

**Secrets**:

- `SUPABASE_KEY`
- `SUPABASE_ACCESS_TOKEN_ACCOUNT`
- `SUPABASE_DB_PASSWORD` (do linkowania projektu)
- `CLOUDFLARE_API_TOKEN` (Wrangler deploy)
- `CLOUDFLARE_ACCOUNT_ID` (Wrangler deploy)
- `OPENROUTER_API_KEY` (repository secret)

**Variables**:

- `SUPABASE_URL`
- `SUPABASE_PROJECT_REF`
- `SITE_URL` (https://spin-flow.app)
- `GOOGLE_CLIENT_ID`
- `FACEBOOK_APP_ID`

---

## Konfiguracja GitHub

### Environments

Utwórz 3 environments w GitHub Repository Settings → Environments:

#### DEV

- Brak wymagania approval
- Deployment branch rule: `develop`
- Sekrety i zmienne dla środowiska developerskiego

#### FIX

- Brak wymagania approval
- Deployment branch rule: `fix`
- Sekrety i zmienne dla środowiska pre-prod

#### PROD

- **Wymaga manual approval** (Required reviewers: maintainers)
- Deployment branch rule: `main`
- Sekrety i zmienne dla środowiska produkcyjnego

### Repository Secrets (globalne)

```
OPENROUTER_API_KEY
```

### Branch Protection Rules

#### `main`

- ❌ Bez automatycznych PR-ów
- ❌ Bez automatycznego CI/CD
- ✅ Tylko admin/maintainer może push/merge

#### `develop` i `fix`

- Brak restrykcji
- Push automatycznie uruchamia CI/CD

### Permissions

Workflow wymaga następujących uprawnień:

- **pull-requests: write** - dla `status-comment` w pull-request.yml
- **contents: read** - dla checkout (domyślne)
- **actions: read** - dla artifacts (domyślne)

---

## Node.js i zależności

### Wersja Node.js

Wszystkie workflow używają Node.js z pliku `.nvmrc` (obecnie: 22.21.1)

```yaml
uses: actions/setup-node@v4
with:
  node-version-file: ".nvmrc"
  cache: "npm"
```

### Instalacja zależności

Wszystkie workflow używają `npm ci` (czystsza instalacja niż `npm install`)

### Playwright

Instalacja przeglądarek: `npm run playwright:install` (tylko Chromium zgodnie z config)

---

## Artefakty

### Coverage Reports

- **unit-test**: `coverage-unit` (7 dni retention)
- **e2e-test**: Raporty Playwright (7 dni retention)
- **prod**: coverage z 30 dni retention

### Build Artifacts

- **push-develop**: `build-dev` (7 dni retention)
- **push-fix**: `build-fix` (7 dni retention)
- **prod-release**: `production-build` (30 dni retention)

**Dlaczego build artifacts?**

- Weryfikacja procesu budowania w środowisku CI
- Backup wersji, która przeszła testy
- Możliwość pobrania i uruchomienia zbudowanej wersji lokalnie do debugowania
- (Deployment Cloudflare Pages buduje aplikację niezależnie z tego samego commitu)

---

## Migracje Supabase

### Automatyczne (DEV i FIX)

```bash
supabase link --project-ref $SUPABASE_PROJECT_REF --password $SUPABASE_DB_PASSWORD
supabase db push
```

### Manualne (PROD)

- Wymaga approval environment
- Szczegółowe logi
- Uruchamiane tylko przez workflow_dispatch

---

## Deployment

### DEV

- **Projekt Cloudflare**: `spin-flow-dev`
- **URL**: https://spin-flow-dev.pages.dev
- **Trigger**: automatyczny push do `develop`

### FIX (Preview)

- **Projekt Cloudflare**: `spin-flow` (branch: fix)
- **URL**: https://spin-flow-fix.pages.dev
- **Trigger**: automatyczny push do `fix`

### PROD

- **Domena**: https://spin-flow.app
- **Trigger**: Deploy via Wrangler (GitHub Actions)
- **Wymaga**: potwierdzenia "PROD" + approval

---

## Best Practices

1. **Zawsze testuj na DEV** przed merge do `fix`
2. **Używaj FIX** do finalnej walidacji przed PROD
3. **PROD deployment** tylko przez admina, z pełną walidacją
4. **Monitoruj logi** workflow w zakładce Actions
5. **Sprawdzaj coverage** - artefakty dostępne przez 7/30 dni
6. **Używaj semantic commit messages** dla czytelności historii

---

## Troubleshooting

### E2E testy nie przechodzą w CI

- Sprawdź czy wszystkie sekrety są ustawione w environment
- Sprawdź logi Playwright report (artefakt)
- Zweryfikuj `TEST_USER_EMAIL` i `TEST_USER_ID`

### Deployment się nie udaje

- Sprawdź logi Cloudflare
- Zweryfikuj `CLOUDFLARE_API_TOKEN` i `CLOUDFLARE_ACCOUNT_ID`
- Sprawdź czy build przeszedł pomyślnie

### Migracje Supabase fail

- Zweryfikuj `SUPABASE_ACCESS_TOKEN_ACCOUNT`
- Sprawdź czy projekt ref jest poprawny
- Sprawdź logi Supabase CLI

### Status comment nie pojawia się

- Zweryfikuj uprawnienia `pull-requests: write`
- Sprawdź czy `GITHUB_TOKEN` ma odpowiednie scope
- Sprawdź logi job `status-comment`

---

## Aktualizacje

### Wersje akcji (stan na 2026-01-19)

- `actions/checkout@v4`
- `actions/setup-node@v4`
- `actions/upload-artifact@v4`
- `cloudflare/wrangler-action@v3`
- `marocchino/sticky-pull-request-comment@v2`

### Sprawdzanie najnowszych wersji

```bash
curl -s https://api.github.com/repos/actions/checkout/releases/latest | jq .tag_name
```
