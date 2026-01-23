# GitHub Actions - Quick Setup Guide

## 🚀 Szybki Start

### 1. Utwórz Environments w GitHub

Repository → Settings → Environments → New environment

#### DEV

```
Name: DEV
Deployment branches: develop
Required reviewers: (brak)
```

#### FIX

```
Name: FIX
Deployment branches: fix
Required reviewers: (brak)
```

#### PROD

```
Name: PROD
Deployment branches: main
Required reviewers: [wybierz maintainers]
Wait timer: 0 minutes
```

---

### 2. Dodaj Repository Secret (globalny)

Repository → Settings → Secrets and variables → Actions → New repository secret

```
OPENROUTER_API_KEY = [twój klucz OpenRouter]
```

---

### 3. Dodaj Secrets dla każdego Environment

Dla każdego z environments (DEV, FIX, PROD):

Repository → Settings → Environments → [Environment] → Add secret

#### DEV Environment Secrets

```
SUPABASE_KEY                    = [Supabase anon key - DEV]
SUPABASE_SERVICE_KEY            = [Supabase service role key - DEV]
SUPABASE_ACCESS_TOKEN_ACCOUNT   = [Supabase access token - Konto B]
SUPABASE_DB_PASSWORD            = [Postgres DB password - DEV]
GOOGLE_CLIENT_SECRET            = [Google OAuth secret]
FACEBOOK_APP_SECRET             = [Facebook OAuth secret]
CLOUDFLARE_API_TOKEN            = [Cloudflare API token]
CLOUDFLARE_ACCOUNT_ID           = [Cloudflare account ID]
```

#### FIX Environment Secrets

```
SUPABASE_KEY                    = [Supabase anon key - FIX]
SUPABASE_SERVICE_KEY            = [Supabase service role key - FIX]
SUPABASE_ACCESS_TOKEN_ACCOUNT   = [Supabase access token - Konto A]
SUPABASE_DB_PASSWORD            = [Postgres DB password - FIX]
GOOGLE_CLIENT_SECRET            = [Google OAuth secret]
FACEBOOK_APP_SECRET             = [Facebook OAuth secret]
CLOUDFLARE_API_TOKEN            = [Cloudflare API token]
CLOUDFLARE_ACCOUNT_ID           = [Cloudflare account ID]
```

#### PROD Environment Secrets

```
SUPABASE_KEY                    = [Supabase anon key - PROD]
SUPABASE_ACCESS_TOKEN_ACCOUNT   = [Supabase access token - Konto A]
SUPABASE_DB_PASSWORD            = [Postgres DB password - PROD]
CLOUDFLARE_DEPLOY_HOOK_URL      = [Cloudflare Deploy Hook URL]
```

---

### 4. Dodaj Variables dla każdego Environment

Repository → Settings → Environments → [Environment] → Add variable

#### DEV Environment Variables

```
SUPABASE_URL         = https://[project-ref].supabase.co
SUPABASE_PROJECT_REF = [project-ref-dev]
SITE_URL             = https://spin-flow-dev.pages.dev
GOOGLE_CLIENT_ID     = [Google OAuth client ID]
FACEBOOK_APP_ID      = [Facebook app ID]
TEST_USER_EMAIL      = [test user email]
TEST_USER_ID         = [test user UUID]
```

#### FIX Environment Variables

```
SUPABASE_URL         = https://[project-ref].supabase.co
SUPABASE_PROJECT_REF = [project-ref-fix]
SITE_URL             = https://spin-flow-fix.pages.dev
GOOGLE_CLIENT_ID     = [Google OAuth client ID]
FACEBOOK_APP_ID      = [Facebook app ID]
TEST_USER_EMAIL      = [test user email]
TEST_USER_ID         = [test user UUID]
```

#### PROD Environment Variables

```
SUPABASE_URL         = https://[project-ref].supabase.co
SUPABASE_PROJECT_REF = [project-ref-prod]
SITE_URL             = https://spin-flow.app
GOOGLE_CLIENT_ID     = [Google OAuth client ID]
FACEBOOK_APP_ID      = [Facebook app ID]
```

---

### 5. Konfiguracja Cloudflare Pages

#### Projekt: spin-flow-dev

```
Production branch: develop
Build command: npm run build
Build output directory: dist
Root directory: /
```

**Environment variables (w Cloudflare):**

```
SUPABASE_URL         = [z DEV]
SUPABASE_KEY         = [z DEV]
SITE_URL             = https://spin-flow-dev.pages.dev
GOOGLE_CLIENT_ID     = [z DEV]
FACEBOOK_APP_ID      = [z DEV]
```

#### Projekt: spin-flow (Production)

```
Production branch: main
Build command: npm run build
Build output directory: dist
Root directory: /
```

**Preview branches:**

- fix → https://spin-flow-fix.pages.dev

**Environment variables (Production - w Cloudflare):**

```
SUPABASE_URL         = [z PROD]
SUPABASE_KEY         = [z PROD]
SITE_URL             = https://spin-flow.app
GOOGLE_CLIENT_ID     = [z PROD]
FACEBOOK_APP_ID      = [z PROD]
```

**Environment variables (Preview: fix - w Cloudflare):**

```
SUPABASE_URL         = [z FIX]
SUPABASE_KEY         = [z FIX]
SITE_URL             = https://spin-flow-fix.pages.dev
GOOGLE_CLIENT_ID     = [z FIX]
FACEBOOK_APP_ID      = [z FIX]
```

#### Deploy Hook (tylko PROD)

Cloudflare Pages → spin-flow → Settings → Builds & deployments → Deploy hooks

```
Name: Production Deploy
Branch: main
```

Skopiuj wygenerowany URL i dodaj jako `CLOUDFLARE_DEPLOY_HOOK_URL` w PROD environment secrets.

---

### 6. Konfiguracja Supabase

#### Struktura projektów

**Konto A (Free):**

- PROD - produkcja
- FIX - pre-prod/hotfix

**Konto B (Free):**

- DEV - środowisko developerskie

#### Access Tokens

Dla każdego konta wygeneruj Access Token:

- Supabase Dashboard → Account → Access Tokens → Generate new token
- Scope: wszystkie (full access)
- Dodaj jako `SUPABASE_ACCESS_TOKEN_ACCOUNT` w odpowiednich environments

#### Project Ref

Znajdź w: Project Settings → General → Reference ID
Dodaj jako `SUPABASE_PROJECT_REF` w variables

---

### 7. Branch Protection Rules

#### main

Repository → Settings → Branches → Add branch protection rule

```
Branch name pattern: main
☑️ Require status checks to pass before merging (opcjonalne)
☐ Require pull request reviews
☐ Lock branch
☐ Allow force pushes (TYLKO dla adminów)
☐ Allow deletions
```

> Główna ochrona: tylko admin/maintainer może pushować

#### develop i fix

Bez protection rules - automatyczny CI/CD

---

### 8. OAuth Configuration

#### Google OAuth

1. Google Cloud Console → APIs & Credentials → OAuth 2.0 Client IDs
2. Authorized redirect URIs:
   ```
   https://[project-ref-dev].supabase.co/auth/v1/callback
   https://[project-ref-fix].supabase.co/auth/v1/callback
   https://[project-ref-prod].supabase.co/auth/v1/callback
   ```
3. Skopiuj Client ID i Client Secret

#### Facebook OAuth

1. Facebook Developers → App → Settings → Basic
2. Add Platform → Website
3. Site URL:
   ```
   https://[project-ref-dev].supabase.co
   https://[project-ref-fix].supabase.co
   https://[project-ref-prod].supabase.co
   ```
4. Skopiuj App ID i App Secret

---

### 9. Test User Setup

#### Utwórz test usera w Supabase DEV i FIX:

1. Authentication → Users → Invite user
2. Email: `test@spin-flow.app` (lub inny)
3. Potwierdź email
4. Skopiuj User UUID
5. Dodaj jako `TEST_USER_EMAIL` i `TEST_USER_ID` w variables

---

### 10. Veryfikacja

#### Sprawdź czy workflows są aktywne:

```bash
# Lokalnie
git checkout develop
git push origin develop

# Sprawdź w GitHub:
# Repository → Actions → "Push to Develop" powinien się uruchomić
```

#### Test Pull Request workflow:

```bash
git checkout -b feature/test
git commit --allow-empty -m "test: workflow check"
git push origin feature/test

# Utwórz PR do develop w GitHub
# Sprawdź: Actions → "Pull Request CI" powinien się uruchomić
```

---

## 📋 Checklist przed pierwszym deployment

### DEV Environment

- [ ] Environment utworzony
- [ ] Secrets dodane (8 secrets)
- [ ] Variables dodane (8 variables)
- [ ] Cloudflare projekt `spin-flow-dev` skonfigurowany
- [ ] Supabase DEV (Konto B) skonfigurowany
- [ ] Test user utworzony

### FIX Environment

- [ ] Environment utworzony
- [ ] Secrets dodane (8 secrets)
- [ ] Variables dodane (8 variables)
- [ ] Cloudflare preview branch `fix` skonfigurowany
- [ ] Supabase FIX (Konto A) skonfigurowany
- [ ] Test user utworzony

### PROD Environment

- [ ] Environment utworzony z required reviewers
- [ ] Secrets dodane (3 secrets)
- [ ] Variables dodane (5 variables)
- [ ] Cloudflare projekt `spin-flow` skonfigurowany
- [ ] Deploy Hook utworzony i dodany do secrets
- [ ] Supabase PROD (Konto A) skonfigurowany
- [ ] Domena `spin-flow.app` skonfigurowana

### Repository

- [ ] Repository secret `OPENROUTER_API_KEY` dodany
- [ ] Branch protection dla `main` ustawiony
- [ ] Workflow permissions sprawdzone
- [ ] `.nvmrc` exists (Node 22.21.1)

### OAuth

- [ ] Google OAuth skonfigurowany dla wszystkich środowisk
- [ ] Facebook OAuth skonfigurowany dla wszystkich środowisk
- [ ] Redirect URIs dodane

---

## 🎯 Quick Test Scenarios

### Test DEV deployment

```bash
git checkout develop
echo "// test change" >> src/test.ts
git add .
git commit -m "test: dev deployment"
git push origin develop

# Sprawdź: https://spin-flow-dev.pages.dev
```

### Test FIX deployment

```bash
git checkout fix
git merge develop
git push origin fix

# Sprawdź: https://spin-flow-fix.pages.dev
```

### Test PROD deployment

```bash
# W GitHub Actions:
# Actions → "Production Release" → Run workflow
# Branch: main
# Input: PROD
# Confirm → Run

# Po approval przez reviewera sprawdź: https://spin-flow.app
```

---

## 🆘 Common Issues

### "Resource not accessible by integration"

- Sprawdź: Settings → Actions → General → Workflow permissions
- Ustaw: "Read and write permissions"

### "Environment not found"

- Sprawdź czy environment jest utworzony
- Sprawdź czy nazwa się zgadza (case-sensitive)

### "Secret not found"

- Sprawdź czy secret jest dodany w ODPOWIEDNIM environment (nie repository)
- Sprawdź nazwę (case-sensitive)

### Playwright fails to install browsers

- Sprawdź czy `playwright.config.ts` istnieje
- Sprawdź czy `npm run playwright:install` działa lokalnie

### Deploy Hook nie działa

- Sprawdź czy URL jest prawidłowy
- Sprawdź czy ma uprawnienia do branch `main`
- Sprawdź logi HTTP response w workflow

---

## 📚 Dodatkowe zasoby

- [GitHub Environments Documentation](https://docs.github.com/en/actions/deployment/targeting-different-environments)
- [Cloudflare Pages Deployment](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Playwright CI](https://playwright.dev/docs/ci)
- [Vitest Coverage](https://vitest.dev/guide/coverage.html)
