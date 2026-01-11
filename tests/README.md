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

### Struktura testów E2E

```
tests/e2e/
├── pages/           # Page Object Models
│   ├── landing.page.ts
│   └── auth.page.ts
├── landing.spec.ts  # Testy strony głównej
└── auth.spec.ts     # Testy autoryzacji
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
2. **Resilient locators** – używaj `getByRole`, `getByText`
3. **Auto-wait** – Playwright automatycznie czeka na elementy
4. **Visual regression** – `toHaveScreenshot()` do porównań wizualnych
5. **API testing** – używaj `request` fixture do testowania API
6. **Parallel execution** – testy uruchamiają się równolegle

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
│   │   └── msw.setup.ts     # Mock Service Worker
│   ├── unit/                # Testy jednostkowe
│   │   ├── lib/
│   │   │   ├── services/
│   │   │   ├── utils/
│   │   │   └── schemas/
│   │   └── components/
│   ├── e2e/                 # Testy E2E
│   │   ├── pages/           # Page Object Models
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
