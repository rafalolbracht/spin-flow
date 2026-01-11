# 🧪 Testing Quick Start – Spin Flow

Szybki przewodnik po testowaniu w projekcie Spin Flow.

---

## 🚀 Szybki start

### 1. Instalacja przeglądarki (jednorazowo)

```bash
npm run playwright:install
```

### 2. Uruchomienie testów

```bash
# Testy jednostkowe (watch mode)
npm test

# Wszystkie testy jednostkowe (single run)
npm run test:unit

# Testy E2E
npm run test:e2e

# Wszystkie testy
npm run test:all
```

---

## 📊 Dostępne komendy

### Testy jednostkowe (Vitest)

| Komenda                      | Opis                                                 |
| ---------------------------- | ---------------------------------------------------- |
| `npm test`                   | Watch mode – automatyczne uruchamianie przy zmianach |
| `npm run test:unit`          | Uruchom wszystkie testy jednostkowe (CI)             |
| `npm run test:unit:watch`    | Watch mode (alias: `npm test`)                       |
| `npm run test:unit:ui`       | UI mode – wizualna nawigacja po testach              |
| `npm run test:unit:coverage` | Raport pokrycia kodu testami                         |

### Testy E2E (Playwright)

| Komenda                    | Opis                                       |
| -------------------------- | ------------------------------------------ |
| `npm run test:e2e`         | Uruchom wszystkie testy E2E                |
| `npm run test:e2e:ui`      | UI mode – debugowanie testów z interfejsem |
| `npm run test:e2e:headed`  | Uruchom z widoczną przeglądarką            |
| `npm run test:e2e:debug`   | Debug mode – krok po kroku                 |
| `npm run test:e2e:codegen` | Codegen – nagrywaj testy interaktywnie     |

---

## 📁 Struktura testów

```
tests/
├── setup/                      # Konfiguracja testów
│   ├── vitest.setup.ts         # Setup Vitest (mocks, globals)
│   └── msw.setup.ts            # Mock Service Worker
├── unit/                       # Testy jednostkowe
│   ├── lib/
│   │   ├── services/           # Testy serwisów
│   │   ├── utils/              # Testy utils (✅ 2 pliki, 23 testy)
│   │   └── schemas/            # Testy walidacji Zod
│   └── components/             # Testy komponentów Angular
└── e2e/                        # Testy E2E
    ├── pages/                  # Page Object Models (✅ 2 pages)
    ├── landing.spec.ts         # ✅ Testy strony głównej
    └── auth.spec.ts            # ✅ Testy autoryzacji
```

---

## ✅ Status środowiska

### Zainstalowane narzędzia

- ✅ **Vitest 3.x** – testy jednostkowe
- ✅ **Playwright** – testy E2E (Chromium)
- ✅ **MSW** – mockowanie API
- ✅ **jsdom** – środowisko DOM
- ✅ **TypeScript 5.7** – dodane do devDependencies

### Konfiguracja

- ✅ `vitest.config.ts` – konfiguracja Vitest
- ✅ `playwright.config.ts` – konfiguracja Playwright (tylko Chromium)
- ✅ `tsconfig.test.json` – TypeScript dla testów
- ✅ `tests/setup/` – pliki setup
- ✅ `.gitignore` – artefakty testowe

### Przykładowe testy

- ✅ `tests/unit/lib/utils/logger.test.ts` (7 testów) ✅ PASSING
- ✅ `tests/unit/lib/utils/api-response.test.ts` (16 testów) ✅ PASSING
- ✅ `tests/e2e/landing.spec.ts` (6 testów E2E)
- ✅ `tests/e2e/auth.spec.ts` (6 testów E2E)

**Rezultat:** 23/23 testy jednostkowe przechodzą ✅

---

## 🎯 Następne kroki

### Dla developerów

1. **Pisz testy dla nowych funkcji:**

   ```bash
   # Utwórz plik testu
   tests/unit/lib/services/my-service.test.ts

   # Uruchom w watch mode
   npm test
   ```

2. **Dodaj testy E2E dla krytycznych scenariuszy:**

   ```bash
   # Nagraj interakcje
   npm run test:e2e:codegen

   # Utwórz Page Object
   tests/e2e/pages/my-page.page.ts

   # Utwórz test
   tests/e2e/my-feature.spec.ts
   ```

3. **Sprawdź coverage przed commitem:**
   ```bash
   npm run test:unit:coverage
   ```

### Priorytety testowania

#### P0 - Krytyczne (najpierw)

- ✅ Utils (logger, api-response) – DONE
- ⏳ Auth service
- ⏳ Match service (CRUD)
- ⏳ RLS policies (integracyjne – później)

#### P1 - Ważne

- ⏳ Point service
- ⏳ Set service
- ⏳ Zod schemas (walidacja)
- ⏳ Error handling

#### P2 - Średnie

- ⏳ Dictionary service
- ⏳ Theme service
- ⏳ Analytics service
- ⏳ Komponenty Angular (z Angular TestBed)

---

## 🐛 Debugowanie testów

### Vitest

```bash
# UI mode – najlepszy sposób na debugowanie
npm run test:unit:ui

# Pojedynczy plik
npx vitest tests/unit/lib/utils/logger.test.ts

# Filtruj po nazwie
npx vitest -t "should log error"
```

### Playwright

```bash
# Debug mode – krok po kroku
npm run test:e2e:debug

# Headed mode – zobacz przeglądarkę
npm run test:e2e:headed

# UI mode – wizualny debugger
npm run test:e2e:ui

# Trace viewer (po zakończeniu testu)
npx playwright show-trace trace.zip
```

---

## 📖 Dokumentacja

Pełna dokumentacja: [`tests/README.md`](./tests/README.md)

Linki:

- [Vitest Docs](https://vitest.dev/)
- [Playwright Docs](https://playwright.dev/)
- [Angular Testing Guide](https://angular.dev/guide/testing)
- [MSW Docs](https://mswjs.io/)

---

## 🎓 Best Practices

1. **Test behavior, not implementation** – testuj to, co widzi użytkownik
2. **Arrange-Act-Assert** – struktura testów
3. **Descriptive test names** – `it('should do X when Y')`
4. **Isolated tests** – każdy test niezależny
5. **Page Object Model** – dla testów E2E
6. **Mock external dependencies** – używaj MSW

---

## 🔄 CI/CD

Komendy dla pipeline:

```bash
# Install dependencies
npm ci

# Run all tests
npm run test:unit && npm run test:e2e

# Generate coverage
npm run test:unit:coverage

# Install Playwright browsers (CI only)
npm run playwright:install
```

---

**Happy Testing! 🎉**

Pytania? Sprawdź [`tests/README.md`](./tests/README.md) lub dokumentację narzędzi.
