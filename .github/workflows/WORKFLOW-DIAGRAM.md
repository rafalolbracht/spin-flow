# GitHub Actions Workflows - Diagram Flow

## Przegląd Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                         SPIN-FLOW CI/CD                          │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │   Git Branches   │
                    └──────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
    ┌───▼────┐         ┌────▼───┐         ┌────▼────┐
    │ develop│         │  fix   │         │  main   │
    └───┬────┘         └────┬───┘         └────┬────┘
        │                   │                   │
        │                   │                   │
```

---

## 1. Pull Request Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  PR → develop / fix                                              │
│  Trigger: pull_request                                           │
│  File: pull-request.yml                                          │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────┐
                    │   LINT   │
                    │  ESLint  │
                    └────┬─────┘
                         │
            ┌────────────┼────────────┐
            │            │            │
    ┌───────▼────────┐   │   ┌───────▼────────┐
    │  UNIT TESTS    │   │   │   E2E TESTS    │
    │   - Vitest     │   │   │  - Playwright  │
    │   - Coverage   │   │   │  - Chromium    │
    │   - Upload     │   │   │  - Reports     │
    └───────┬────────┘   │   └───────┬────────┘
            │            │            │
            │      ┌─────▼─────┐      │
            │      │   BUILD   │      │
            │      │  Validate │      │
            │      │   dist/   │      │
            │      └─────┬─────┘      │
            │            │            │
            └────────────┼────────────┘
                         │
                   ┌─────▼──────┐
                   │   STATUS   │
                   │  COMMENT   │
                   │ (if all 4✅)│
                   └────────────┘
                         │
                   ✅ PR Ready

Environment: DEV (develop) / FIX (fix)
Duration: ~5-8 min
```

---

## 2. Push to Develop Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  Push → develop                                                  │
│  Trigger: push                                                   │
│  File: push-develop.yml                                          │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────┐
                    │   LINT   │
                    └────┬─────┘
                         │
            ┌────────────┼────────────┐
            │            │            │
    ┌───────▼────────┐   │   ┌───────▼────────┐
    │  UNIT TESTS    │   │   │   E2E TESTS    │
    │  + Coverage    │   │   │  + Reports     │
    └───────┬────────┘   │   └───────┬────────┘
            │            │            │
            │      ┌─────▼─────┐      │
            │      │   BUILD   │      │
            │      │  + Upload │      │
            │      │  Artifact │      │
            │      └─────┬─────┘      │
            │            │            │
            └────────────┼────────────┘
                         │
                   ┌─────▼──────┐
                   │  MIGRATE   │
                   │  Supabase  │
                   │    DEV     │
                   └─────┬──────┘
                         │
                   ┌─────▼──────┐
                   │   DEPLOY   │
                   │ Download   │
                   │  Artifact  │
                   │ Cloudflare │
                   │ spin-flow- │
                   │    dev     │
                   └─────┬──────┘
                         │
              ✅ DEV Environment Updated
              🌐 https://spin-flow-dev.pages.dev

Environment: DEV
Duration: ~8-12 min
Auto-trigger: każdy push do develop
```

---

## 3. Push to Fix Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  Push → fix                                                      │
│  Trigger: push                                                   │
│  File: push-fix.yml                                              │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────┐
                    │   LINT   │
                    └────┬─────┘
                         │
            ┌────────────┼────────────┐
            │            │            │
    ┌───────▼────────┐   │   ┌───────▼────────┐
    │  UNIT TESTS    │   │   │   E2E TESTS    │
    │  + Coverage    │   │   │  + Reports     │
    └───────┬────────┘   │   └───────┬────────┘
            │            │            │
            │      ┌─────▼─────┐      │
            │      │   BUILD   │      │
            │      │  + Upload │      │
            │      │  Artifact │      │
            │      └─────┬─────┘      │
            │            │            │
            └────────────┼────────────┘
                         │
                   ┌─────▼──────┐
                   │  MIGRATE   │
                   │  Supabase  │
                   │    FIX     │
                   └─────┬──────┘
                         │
                   ┌─────▼──────┐
                   │   DEPLOY   │
                   │ Download   │
                   │  Artifact  │
                   │ Cloudflare │
                   │  Preview   │
                   │   (fix)    │
                   └─────┬──────┘
                         │
              ✅ FIX Environment Updated
              🌐 https://fix.spin-flow.pages.dev

Environment: FIX
Duration: ~8-12 min
Auto-trigger: każdy push do fix
```

---

## 4. Production Release Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  Manual Trigger → main                                           │
│  Trigger: workflow_dispatch                                      │
│  File: prod-release.yml                                          │
│  Input: "PROD" confirmation                                      │
└─────────────────────────────────────────────────────────────────┘

                   ┌──────────┐
                   │ VALIDATE │
                   │ - "PROD" │
                   │ - main   │
                   └────┬─────┘
                        │
                   ┌────▼─────┐
                   │   LINT   │
                   └────┬─────┘
                        │
                   ┌────▼─────┐
                   │   UNIT   │
                   │  TESTS   │
                   └────┬─────┘
                        │
                   ┌────▼─────┐
                   │  BUILD   │
                   │ + Upload │
                   │ Artifact │
                   └────┬─────┘
                        │
                   ┌────▼─────┐
                   │ MIGRATE  │
                   │ Supabase │
                   │   PROD   │
                   │ (Manual  │
                   │ Approval)│
                   └────┬─────┘
                        │
                   ┌────▼─────┐
                   │  DEPLOY  │
                   │Cloudflare│
                   │   Hook   │
                   │  + Wait  │
                   └────┬─────┘
                        │
                   ┌────▼─────┐
                   │  NOTIFY  │
                   │  Status  │
                   │ Summary  │
                   └────┬─────┘
                        │
              ✅ PRODUCTION Released!
              🌐 https://spin-flow.app

Environment: PROD (requires approval)
Duration: ~10-15 min (+ approval time)
Trigger: Manual only
Branch: main only
```

---

## Environments Mapping

```
┌───────────────────────────────────────────────────────────────┐
│                    ENVIRONMENTS FLOW                           │
└───────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   DEVELOP   │────▶│     FIX     │────▶│    MAIN     │
└─────────────┘     └─────────────┘     └─────────────┘
      │                    │                    │
      │                    │                    │
┌─────▼─────┐       ┌──────▼──────┐      ┌─────▼─────┐
│    DEV    │       │     FIX     │      │   PROD    │
│ Supabase  │       │  Supabase   │      │ Supabase  │
│ (Konto B) │       │  (Konto A)  │      │ (Konto A) │
└───────────┘       └─────────────┘      └───────────┘
      │                    │                    │
┌─────▼─────┐       ┌──────▼──────┐      ┌─────▼─────┐
│Cloudflare │       │ Cloudflare  │      │Cloudflare │
│spin-flow- │       │  spin-flow  │      │spin-flow  │
│    dev    │       │  (preview)  │      │(production)│
└───────────┘       └─────────────┘      └───────────┘
      │                    │                    │
      ▼                    ▼                    ▼
spin-flow-       fix.spin-flow.         spin-flow.app
dev.pages.dev    pages.dev
```

---

## Secrets & Variables Distribution

```
┌────────────────────────────────────────────────────────────────┐
│                    SECRETS HIERARCHY                            │
└────────────────────────────────────────────────────────────────┘

Repository Level (Global)
├── OPENROUTER_API_KEY                    [All workflows]
│
├── DEV Environment
│   ├── Secrets (8)
│   │   ├── SUPABASE_KEY
│   │   ├── SUPABASE_SERVICE_KEY
│   │   ├── SUPABASE_ACCESS_TOKEN_ACCOUNT
│   │   ├── GOOGLE_CLIENT_SECRET
│   │   ├── FACEBOOK_APP_SECRET
│   │   ├── CLOUDFLARE_API_TOKEN
│   │   └── CLOUDFLARE_ACCOUNT_ID
│   └── Variables (8)
│       ├── SUPABASE_URL
│       ├── SUPABASE_PROJECT_REF
│       ├── SITE_URL
│       ├── GOOGLE_CLIENT_ID
│       ├── FACEBOOK_APP_ID
│       ├── TEST_USER_EMAIL
│       └── TEST_USER_ID
│
├── FIX Environment
│   ├── Secrets (8)                       [Same as DEV]
│   └── Variables (8)                     [Same as DEV]
│
└── PROD Environment
    ├── Secrets (3)
    │   ├── SUPABASE_KEY
    │   ├── SUPABASE_ACCESS_TOKEN_ACCOUNT
    │   └── CLOUDFLARE_DEPLOY_HOOK_URL    [Unique to PROD]
    └── Variables (5)
        ├── SUPABASE_URL
        ├── SUPABASE_PROJECT_REF
        ├── SITE_URL
        ├── GOOGLE_CLIENT_ID
        └── FACEBOOK_APP_ID
```

---

## Job Dependencies Visualization

### Pull Request

```
        lint
       / | \
      /  |  \
     /   |   \
unit-test | e2e-test
     \   |   /
      \  |  /
       build
         |
    status-comment
    (if all 4 success)
```

### Push (develop/fix)

```
        lint
       / | \
      /  |  \
     /   |   \
unit-test | e2e-test
     \   |   /
      \  |  /
       build
         |
      migrate
         |
      deploy
  (uses artifact)
```

### Production

```
   validate
      |
    lint
      |
  unit-test
      |
    build
      |
   migrate      [requires approval]
      |
   deploy       [deploy hook]
      |
   notify       [summary]
```

---

## Timeline Comparison

```
┌────────────────────────────────────────────────────────────────┐
│                     WORKFLOW DURATION                           │
└────────────────────────────────────────────────────────────────┘

Pull Request:
├─ Lint:          1-2 min     ███
├─ Unit Tests:    2-3 min     ██████
├─ E2E Tests:     3-5 min     ██████████
├─ Build:         2-3 min     ██████
└─ Comment:       <10 sec     █
   Total:         ~6-10 min

Push Develop/Fix:
├─ Lint:          1-2 min     ███
├─ Unit Tests:    2-3 min     ██████
├─ E2E Tests:     3-5 min     ██████████
├─ Build:         2-3 min     ██████
├─ Migrate:       1-2 min     ███
└─ Deploy:        1 min       ███
   Total:         ~9-13 min

Production:
├─ Validate:      <10 sec     █
├─ Lint:          1-2 min     ███
├─ Unit Tests:    2-3 min     ██████
├─ Build:         2-3 min     ██████
├─ Approval:      manual      ⏸️
├─ Migrate:       1-2 min     ███
├─ Deploy:        2-3 min     ██████
├─ Wait:          1 min       ███
└─ Notify:        <10 sec     █
   Total:         ~10-15 min (+ approval)
```

---

## CI/CD Decision Tree

```
                    ┌──────────┐
                    │  Action  │
                    └────┬─────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
    │   PR    │    │  Push   │    │ Manual  │
    └────┬────┘    └────┬────┘    └────┬────┘
         │              │              │
         │         ┌────┴────┐         │
         │         │         │         │
         │    ┌────▼────┐ ┌──▼───┐    │
         │    │ develop │ │ fix  │    │
         │    └────┬────┘ └──┬───┘    │
         │         │         │         │
    ┌────▼────┐    │         │    ┌────▼────┐
    │PR checks│    │         │    │  Prod   │
    │+ comment│    │         │    │ Release │
    └─────────┘    │         │    └─────────┘
                   │         │
              ┌────▼────┐ ┌──▼───┐
              │DEV auto │ │FIX   │
              │deploy   │ │auto  │
              └─────────┘ └──────┘
```

---

## Node.js & Dependencies Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    DEPENDENCY SETUP                             │
└────────────────────────────────────────────────────────────────┘

All Workflows:
  ├─ Checkout Code          [actions/checkout@v4]
  ├─ Setup Node.js          [actions/setup-node@v4]
  │  ├─ version: .nvmrc (22.21.1)
  │  └─ cache: npm
  ├─ Install Dependencies   [npm ci]
  └─ Run Task               [npm run ...]

E2E Specific:
  └─ Install Browsers       [npm run playwright:install]
     └─ Chromium only       [from playwright.config.ts]
```

---

## Artifacts & Reports

```
┌────────────────────────────────────────────────────────────────┐
│                    ARTIFACTS FLOW                               │
└────────────────────────────────────────────────────────────────┘

Unit Tests:
  └─ coverage/              [7 days retention]
     ├─ coverage-unit-dev   [push-develop]
     ├─ coverage-unit-fix   [push-fix]
     └─ coverage-unit-prod  [30 days, prod-release]

E2E Tests:
  ├─ playwright-report/     [7 days retention]
  │  ├─ HTML report
  │  └─ Screenshots
  └─ test-results/          [7 days retention]
     ├─ Videos
     └─ Traces

Build Artifacts:
  ├─ build-dev/             [7 days retention]
  ├─ build-fix/             [7 days retention]
  └─ production-build/      [30 days retention]
     └─ dist/

**Why build artifacts?**
- Ensures consistency between what was tested and what is deployed
- Saves time (build once, deploy multiple times if needed)
- Deploy uses the exact same build that passed all tests
```

---

## Security & Permissions

```
┌────────────────────────────────────────────────────────────────┐
│                    SECURITY MODEL                               │
└────────────────────────────────────────────────────────────────┘

GitHub Permissions:
  ├─ contents: read         [All workflows]
  ├─ actions: read          [All workflows]
  └─ pull-requests: write   [PR comment only]

Branch Protection:
  ├─ main
  │  └─ Admin/Maintainer only
  ├─ develop
  │  └─ No restrictions
  └─ fix
     └─ No restrictions

Environment Protection:
  ├─ DEV:  No approval
  ├─ FIX:  No approval
  └─ PROD: Required reviewers ✅

Secrets Access:
  ├─ Repository:  OPENROUTER_API_KEY (all)
  ├─ DEV:         8 secrets, 8 variables
  ├─ FIX:         8 secrets, 8 variables
  └─ PROD:        3 secrets, 5 variables
```
