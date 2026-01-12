# 🧪 Dokumentacja testów – Spin Flow

Dokumentacja dotycząca testów jednostkowych (Vitest) i E2E (Playwright) w projekcie Spin Flow.

---

## 📋 Spis treści

- [Wprowadzenie](#wprowadzenie)
- [Testy jednostkowe (Vitest)](#testy-jednostkowe-vitest)
- [Testy E2E (Playwright)](#testy-e2e-playwright)
- [Skrypty testowe](#skrypty-testowe)
- [Struktura katalogów](#struktura-katalogów)
- [Best Practices](#best-practices)

---

## 🎯 Wprowadzenie

Projekt wykorzystuje następujący stack testowy:

- **Vitest 3.x** – testy jednostkowe i komponentów
- **Playwright** – testy E2E (tylko Chromium)
- **Angular TestBed** – testowanie komponentów Angular (wbudowane w Angular)
- **MSW (Mock Service Worker)** – mockowanie API

### Strategia testowania

- **60% testów jednostkowych** – serwisy, utils, komponenty
- **30% testów integracyjnych** – API endpoints, baza danych (do wdrożenia)
- **10% testów E2E** – krytyczne scenariusze użytkownika

### Cel: ≥ 80% code coverage

### 📊 Aktualny status testów (Styczeń 2026)

- **Testy E2E:** ✅ **64/64 przechodzą (100%)**
  - Landing page: ✅ 11/11
  - Auth flow: ✅ 23/23
  - Create match: ✅ 11/11
  - Live match: ✅ 14/14
  - Match summary: ✅ 3/3
  - Full match flow (z AI): ✅ 2/2
- **Testy jednostkowe:** 🔄 W trakcie rozwoju
- **Code coverage:** 🎯 Docelowo ≥ 80%

**Ostatnie usprawnienia (Styczeń 2026):**

- ✅ Naprawiono flaky set transitions (waitForResponse zamiast waitForTimeout)
- ✅ Naprawiono redirect do `/summary` po zakończeniu meczu
- ✅ Dodano extended timeout (60 min) dla AI report generation
- ✅ Naprawiono testowanie widoków publicznych (izolacja contextu)
- ✅ Używamy prawdziwej bazy testowej z Service Role Client
- ✅ Wszystkie 64 testy E2E przechodzą stabilnie

---

## 🔬 Testy jednostkowe (Vitest)

### Uruchamianie testów jednostkowych

```bash
# Uruchom wszystkie testy jednostkowe
npm run test:unit

# Watch mode - automatyczne uruchamianie przy zmianach
npm run test:unit:watch

# UI mode - wizualna nawigacja po testach
npm run test:unit:ui

# Coverage report
npm run test:unit:coverage
```

### Struktura testów jednostkowych

```
tests/unit/
├── lib/
│   ├── services/     # Testy serwisów biznesowych
│   ├── utils/        # Testy funkcji pomocniczych
│   └── schemas/      # Testy walidacji Zod
└── components/       # Testy komponentów Angular
```

### Przykład testu jednostkowego (funkcja/serwis)

```typescript
import { describe, it, expect, vi } from "vitest";
import { MyService } from "@/lib/services/my.service";

describe("MyService", () => {
  it("should perform action", () => {
    const service = new MyService();
    const result = service.calculate(5);
    expect(result).toBe(10);
  });
});
```

### Przykład testu komponentu Angular

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { MyComponent } from "@/components/my.component";

describe("MyComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MyComponent],
    });
  });

  it("should create component", () => {
    const fixture = TestBed.createComponent(MyComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it("should display title", () => {
    const fixture = TestBed.createComponent(MyComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector("h1")?.textContent).toContain("My Title");
  });
});
```

### Best Practices dla testów jednostkowych

1. **Używaj `vi.fn()` do mocków** – czytelne i łatwe w utrzymaniu
2. **Spy zamiast mocków** – gdy chcesz tylko monitorować wywołania
3. **Inline snapshots** – `toMatchInlineSnapshot()` dla czytelności
4. **Arrange-Act-Assert** – struktura testów
5. **Opisowe nazwy testów** – `it('should do something when condition')`

---

## 🎭 Testy E2E (Playwright)

### Uruchamianie testów E2E

```bash
# Uruchom wszystkie testy E2E
npm run test:e2e

# UI mode - debugowanie testów
npm run test:e2e:ui

# Headed mode - zobacz przeglądarkę podczas testów
npm run test:e2e:headed

# Debug mode - krok po kroku
npm run test:e2e:debug

# Codegen - nagrywaj testy
npm run test:e2e:codegen
```

### Instalacja przeglądarki Chromium

```bash
npm run playwright:install
```

### 🔐 Autentykacja w testach E2E

**Problem:** Aplikacja wymaga zalogowania przez OAuth Google.

**Rozwiązanie:** Tryb testowy w middleware + prawdziwa testowa baza danych.

#### Jak używać:

```typescript
// ✅ Import testu z fixture (automatyczna autentykacja)
import { test, expect } from "./fixtures/auth.fixture";

test("test z zalogowanym użytkownikiem", async ({ page }) => {
  // Użytkownik automatycznie zalogowany jako TEST_USER_ID z .env
  await page.goto("/matches/create");
  // Test działa!
});
```

#### Jak to działa:

1. **Playwright fixture** (`tests/e2e/fixtures/auth.fixture.ts`):
   - Automatycznie dodaje header `x-test-mode: true` do wszystkich requestów
   - Header jest dodawany do wszystkich requestów z poziomu przeglądarki

2. **Middleware** (`src/middleware/index.ts`):
   - Wykrywa header `x-test-mode: true` i włącza tryb testowy
   - Tworzy **Supabase Service Role Client** (pomija RLS)
   - Mockuje `locals.user` z ID z zmiennej środowiskowej `TEST_USER_ID`
   - Email testowy: `test@playwright.e2e`

3. **Testowa baza danych:**
   - Używamy **prawdziwej bazy Supabase** (ta sama co dev/prod)
   - Foreign keys i constraints działają normalnie
   - **Global Setup & Teardown** - automatyczne czyszczenie bazy (patrz sekcja poniżej)
   - Service Role Client pomija RLS, więc testy mogą swobodnie tworzyć/usuwać dane

4. **W testach:**
   - Import `test` z `./fixtures/auth.fixture` zamiast `@playwright/test`
   - Wszystko działa automatycznie!
   - Dane testowe są czyszczone automatycznie przez mechanizm setup/teardown

#### Wymagania środowiskowe (.env):

```bash
# Supabase
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...  # Wymagane do testów!

# Test User
TEST_USER_ID=test-user-id-e2e  # UUID użytkownika testowego
```

**Ważne:** `TEST_USER_ID` musi istnieć w tabeli `profiles` w bazie!

#### Debugging:

Jeśli test nie przechodzi przez autentykację:

1. Sprawdź czy importujesz `test` z `./fixtures/auth.fixture`
2. Szukaj `🔧 Test mode active` w logach middleware (Astro dev console)
3. Sprawdź czy endpoint nie jest na liście PUBLIC_PATHS
4. Sprawdź czy `TEST_USER_ID` jest w `.env` i istnieje w tabeli `profiles`
5. Sprawdź czy `SUPABASE_SERVICE_ROLE_KEY` jest ustawiony

#### Testowanie widoków publicznych:

Jeśli testujesz publiczny widok (np. `/public/matches/:uuid`):

```typescript
// Otwórz publiczny link w nowej karcie bez autentykacji testowej
const newPage = await context.newPage();

// Wyczyść cookies i storage state aby nie wysyłać x-test-mode header
await newPage.context().clearCookies();
await newPage.context().clearStorageState();

await newPage.goto(publicLink); // Teraz brak x-test-mode header
```

#### NODE_ENV w CI/CD:

W GitHub Actions można dodatkowo ustawić:

```yaml
- run: npm run test:e2e
  env:
    NODE_ENV: test # backup dla trybu testowego
    TEST_USER_ID: test-user-id-e2e
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

Lokalnie nie musisz ustawiać NODE_ENV - fixture załatwia wszystko.

### 🧹 Global Setup & Teardown

Testy E2E używają mechanizmu **Project Dependencies** z Playwright do automatycznego czyszczenia danych testowych.

#### Jak to działa:

**Konfiguracja** (`playwright.config.ts`):

```typescript
projects: [
  // Setup - uruchamia się przed testami, czyści bazę
  {
    name: "setup",
    testMatch: /global\.setup\.ts/,
    teardown: "cleanup",
  },
  // Cleanup - uruchamia się po testach (teardown dla setup)
  {
    name: "cleanup",
    testMatch: /global\.teardown\.ts/,
  },
  // Główny projekt z testami E2E
  {
    name: "chromium",
    use: { ...devices["Desktop Chrome"] },
    dependencies: ["setup"],
  },
];
```

**Pliki:**

- `tests/e2e/global.setup.ts` - Uruchamia się **przed** wszystkimi testami
  - Czyści dane testowe z bazy (`cleanupTestData()`)
  - Zapewnia czysty stan początkowy

- `tests/e2e/global.teardown.ts` - Uruchamia się **po** wszystkich testach
  - Czyści dane testowe z bazy (`cleanupTestData()`)
  - Usuwa dane wygenerowane podczas testów

**Zalety tego podejścia:**

- ✅ Automatyczne - nie musisz pamiętać o `beforeEach`/`afterEach`
- ✅ Widoczne w HTML report jako osobne projekty
- ✅ Pełne trace recording
- ✅ Zgodne z best practices Playwright
- ✅ Dane są czyszczone przed i po testach

**Czym różni się od globalSetup/globalTeardown:**

- Project dependencies są **rekomendowane** przez Playwright
- Obsługują fixtures, traces, screenshots
- Widoczne w raportach HTML
- Lepsze logowanie i debugging

**W testach:**

```typescript
import { test, expect } from "./fixtures/auth.fixture";

test.describe("My Test Suite", () => {
  // ✅ Nie musisz używać beforeEach/afterEach dla cleanup
  // ✅ Global setup wyczyści bazę przed testami
  // ✅ Global teardown wyczyści bazę po testach

  test("my test", async ({ page }) => {
    // Twój test
  });
});
```

**Dokumentacja:**

- [Playwright Global Setup/Teardown](https://playwright.dev/docs/test-global-setup-teardown)
- [Project Dependencies (rekomendowane)](https://playwright.dev/docs/test-global-setup-teardown#option-1-project-dependencies)

### Struktura testów E2E

```
tests/e2e/
├── fixtures/           # Playwright fixtures
│   └── auth.fixture.ts # Auto-login fixture
├── pages/              # Page Object Models
│   ├── landing.page.ts
│   ├── auth.page.ts
│   ├── create-match.page.ts
│   ├── live-match.page.ts
│   └── match-summary.page.ts
├── landing.spec.ts     # Testy strony głównej
├── auth.spec.ts        # Testy autoryzacji
└── full-match-flow.spec.ts  # Testy pełnego flow meczu
```

### Page Object Model (POM)

Wszystkie testy E2E używają wzorca Page Object Model dla lepszej maintainability:

```typescript
// page object
export class LandingPage {
  constructor(page: Page) {
    this.page = page;
    this.loginButton = page.getByRole("link", { name: /login/i });
  }

  async goto() {
    await this.page.goto("/");
  }
}

// test
test("should display landing page", async ({ page }) => {
  const landingPage = new LandingPage(page);
  await landingPage.goto();
  await landingPage.expectToBeVisible();
});
```

### Best Practices dla testów E2E

1. **Page Object Model** – izoluj logikę strony od testów
2. **Resilient locators** – używaj `getByRole`, `getByText`, class-based selectors

   ```typescript
   // ✅ Dobrze
   const dialog = page.getByRole("dialog", { name: /Zakończ set/i });
   const button = dialog.getByRole("button", { name: "Zapisz" });
   const header = page.locator(".match-header-card"); // specyficzna klasa

   // ❌ Źle
   const button = page.locator("button"); // zbyt ogólne
   const dialog = page.locator("div").nth(3); // kruche, zależne od struktury
   ```

3. **Unikaj `waitForTimeout`** – zawsze używaj specific waits

   ```typescript
   // ✅ Dobrze - czekaj na konkretną odpowiedź API
   await page.waitForResponse(
     (response) =>
       response.url().includes("/api/matches") && response.status() === 200,
     { timeout: 5000 }
   );

   // ✅ Dobrze - czekaj na widoczność elementu
   await expect(page.locator(".dialog")).toBeVisible({ timeout: 3000 });

   // ✅ Dobrze - czekaj na konkretny tekst
   await expect(page.locator(".score")).toHaveText("0", { timeout: 3000 });

   // ❌ Źle - arbitralny timeout
   await page.waitForTimeout(3000);
   ```

4. **Długie operacje (AI report)** – używaj extended timeouts

   ```typescript
   test.describe("Full Match Flow with AI", () => {
     test.setTimeout(60 * 60 * 1000); // 60 minut na AI report

     test("should generate AI report", async ({ page }) => {
       // Polling mechanism dla długich operacji
       await matchSummaryPage.waitForAiReportCompletion(3600 * 1000);
     });
   });
   ```

5. **Cleanup danych testowych** – automatyczny przez global setup/teardown

   ```typescript
   // ✅ Nie musisz ręcznie wywoływać cleanup - dzieje się automatycznie
   // ❌ Stare podejście (deprecated):
   // import { cleanupTestData } from '../setup/cleanup';
   // test.beforeEach(async () => {
   //   await cleanupTestData();
   // });
   ```

6. **Testowanie widoków publicznych** – izoluj context od autentykacji

   ```typescript
   // Nowa strona bez x-test-mode header
   const newPage = await context.newPage();
   await newPage.context().clearCookies();
   await newPage.context().clearStorageState();
   await newPage.goto(publicLink);
   ```

7. **Auto-wait** – Playwright automatycznie czeka na elementy (ale explicit wait jest lepszy dla clarity)
8. **Visual regression** – `toHaveScreenshot()` do porównań wizualnych
9. **API testing** – używaj `request` fixture do testowania API
10. **Parallel execution** – testy uruchamiają się równolegle (ale można wyłączyć dla stability)

---

## 🛠️ Skrypty testowe

### Wszystkie dostępne skrypty

| Skrypt                       | Opis                                      |
| ---------------------------- | ----------------------------------------- |
| `npm test`                   | Uruchom Vitest w watch mode (development) |
| `npm run test:unit`          | Uruchom testy jednostkowe                 |
| `npm run test:unit:watch`    | Watch mode dla testów jednostkowych       |
| `npm run test:unit:ui`       | UI mode dla testów jednostkowych          |
| `npm run test:unit:coverage` | Coverage report dla testów jednostkowych  |
| `npm run test:e2e`           | Uruchom testy E2E                         |
| `npm run test:e2e:ui`        | UI mode dla testów E2E                    |
| `npm run test:e2e:headed`    | Testy E2E z widoczną przeglądarką         |
| `npm run test:e2e:debug`     | Debug mode dla testów E2E                 |
| `npm run test:e2e:codegen`   | Codegen - nagrywaj testy                  |
| `npm run test:all`           | Uruchom wszystkie testy (unit + E2E)      |
| `npm run playwright:install` | Zainstaluj przeglądarkę Chromium          |

---

## 📁 Struktura katalogów

```
spin-flow/
├── tests/
│   ├── setup/               # Pliki konfiguracyjne
│   │   ├── vitest.setup.ts  # Setup dla Vitest
│   │   ├── msw.setup.ts     # Mock Service Worker
│   │   └── cleanup.ts       # Utility: czyszczenie danych testowych (używane przez E2E)
│   ├── unit/                # Testy jednostkowe
│   │   ├── lib/
│   │   │   ├── services/
│   │   │   ├── utils/
│   │   │   └── schemas/
│   │   └── components/
│   ├── e2e/                 # Testy E2E
│   │   ├── fixtures/        # Playwright fixtures
│   │   │   └── auth.fixture.ts  # Auto-login fixture
│   │   ├── pages/           # Page Object Models
│   │   ├── global.setup.ts  # Playwright: global setup (przed testami)
│   │   ├── global.teardown.ts # Playwright: global teardown (po testach)
│   │   ├── *.spec.ts        # Testy E2E
│   │   └── __snapshots__/   # Visual snapshots
│   └── README.md
├── vitest.config.ts         # Konfiguracja Vitest
├── playwright.config.ts     # Konfiguracja Playwright
├── tsconfig.test.json       # TypeScript config dla testów
└── package.json
```

---

## ✅ Best Practices

### Ogólne zasady

1. **Testuj zachowanie, nie implementację** – użytkownik nie wie jak działa kod
2. **Testy są dokumentacją** – nazwy testów powinny być self-explanatory
3. **DRY (Don't Repeat Yourself)** – używaj helpers i fixtures
4. **Izolacja testów** – każdy test powinien być niezależny
5. **Fast feedback** – testy powinny być szybkie
6. **CI/CD ready** – testy muszą działać w pipeline

### Przykłady dobrych nazw testów

✅ **Dobrze:**

- `should create match when valid data is provided`
- `should return 401 when user is not authenticated`
- `should display error message when API call fails`

❌ **Źle:**

- `test1`
- `it works`
- `should work correctly`

### Co testować?

**Priorytety (P0-P3):**

- **P0 (Krytyczne):**
  - Autoryzacja i bezpieczeństwo
  - Tworzenie i edycja meczów
  - RLS policies
- **P1 (Ważne):**
  - Obsługa błędów i edge cases
  - Walidacja danych (Zod schemas)
  - API endpoints
- **P2 (Średnie):**
  - UI components
  - Utils i helpers
  - Formatowanie danych
- **P3 (Nice to have):**
  - Visual regression
  - Performance tests
  - Accessibility tests

---

## 🚀 Uruchomienie w CI/CD

### GitHub Actions (przykład)

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"

      # Unit tests
      - run: npm ci
      - run: npm run test:unit:coverage

      # E2E tests
      - run: npm run playwright:install
      - run: npm run test:e2e

      # Upload coverage
      - uses: codecov/codecov-action@v3
```

---

## 📚 Dodatkowe zasoby

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Angular Testing Guide](https://angular.dev/guide/testing)
- [MSW Documentation](https://mswjs.io/)

---

## 🤝 Contributing

Przy dodawaniu nowych funkcji:

1. ✅ Napisz testy jednostkowe dla logiki biznesowej
2. ✅ Dodaj testy E2E dla krytycznych scenariuszy użytkownika
3. ✅ Upewnij się, że coverage ≥ 80%
4. ✅ Uruchom `npm run test:all` przed commitem
5. ✅ Zaktualizuj dokumentację jeśli potrzeba

---

**Happy Testing! 🎉**
