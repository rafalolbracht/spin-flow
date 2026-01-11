# Tech Stack – Spin Flow (MVP)

Dokument opisuje docelowy stack technologiczny aplikacji **Spin Flow** w ujęciu technicznym.

---

## 1. Podsumowanie

**Frontend:**

- Angular 20
- PrimeNG 20
- TailwindCSS 4 (+ integracja z PrimeNG)

**Backend:**

- Astro (API + logika serwerowa)

**Dane i autoryzacja:**

- Supabase (Postgres)
- Supabase Auth (Google)
- RLS (Row-Level Security)

**AI:**

- OpenRouter (dostęp do modeli AI)

**Hosting i CI/CD:**

- Cloudflare Pages
- GitHub Actions

**Testy:**

- Vitest 3.0+ (testy jednostkowe i integracyjne)
- Playwright 1.40+ (testy E2E)
- Angular TestBed (testy komponentów)
- MSW 2+ (Mock Service Worker)
- Testcontainers (izolowane środowiska testowe)

---

## 2. Frontend

- **Angular 20** – główny framework SPA.
- **PrimeNG 20** – biblioteka komponentów UI przyspieszająca tworzenie interfejsu.
- **TailwindCSS 4** – warstwa layoutu i stylów, ułatwia budowę RWD i spójnego wyglądu.

Taki zestaw pozwala szybko tworzyć i rozwijać interfejs użytkownika, z dużą elastycznością w wyglądzie i zachowaniu.

---

## 3. Backend – Astro

- Astro pełni rolę backendu aplikacji:
  - udostępnia endpointy HTTP/JSON,
  - realizuje logikę serwerową,
  - integruje się z Supabase oraz OpenRouter.
- Może być uruchamiany w modelu serverless (np. jako funkcje w Cloudflare Pages), co ułatwia skalowanie i obniża koszty.

---

## 4. Dane i autoryzacja – Supabase + Google Auth + RLS

- **Supabase (Postgres)** – przechowywanie danych w relacyjnej bazie.
- **Supabase Auth z Google** – logowanie użytkowników przy użyciu kont Google.
- **RLS** – reguły bezpieczeństwa na poziomie wierszy, pozwalające precyzyjnie kontrolować, które dane są widoczne i modyfikowalne dla danego użytkownika.

Supabase łączy funkcje bazy danych, autoryzacji i polityk bezpieczeństwa, dzięki czemu redukuje ilość kodu backendowego.

---

## 5. AI – OpenRouter

- OpenRouter służy jako brama do modeli AI.
- Astro wywołuje OpenRouter po stronie serwera, z ukryciem kluczy API.
- Szczegóły promptów i modeli mogą być modyfikowane bez ingerencji w frontend.

---

## 6. Hosting i CI/CD – Cloudflare Pages + GitHub Actions

- **Cloudflare Pages**:
  - hosting zbudowanej aplikacji frontendowej,
  - obsługa funkcji serwerowych Astro.
- **GitHub Actions**:
  - pipeline do automatycznego buildowania,
  - testowanie i deployment na Cloudflare po zmianach w repozytorium.

---

## 7. Testy – Vitest + Playwright + Angular TestBed

- **Vitest**:
  - framework testowy kompatybilny z Vite/Astro,
  - testy jednostkowe serwisów biznesowych, utils i walidacji,
  - testy integracyjne z rzeczywistą bazą danych,
  - built-in code coverage (c8/istanbul),
  - szybkie wykonywanie testów z ESM support.
- **Playwright**:
  - testy end-to-end pełnych scenariuszy użytkownika,
  - multi-browser support (Chrome, Firefox, Safari),
  - auto-wait i network interception,
  - parallel execution dla szybszego testowania.
- **Angular TestBed**:
  - testowanie komponentów Angular,
  - wbudowane narzędzie Angular do testów,
  - pełna kompatybilność z Angular 20.
- **MSW (Mock Service Worker)**:
  - mockowanie API requests w testach,
  - działa zarówno w Node.js jak i przeglądarce,
  - type-safe mocking dla OpenRouter i innych zewnętrznych API.
- **Testcontainers**:
  - izolowane środowiska testowe (PostgreSQL),
  - automatyczne czyszczenie po testach,
  - pełna kompatybilność z Supabase dla testów integracyjnych.

**Strategia testowania:**

- Piramida testów: 60% unit, 30% integration, 10% E2E
- Testy jednostkowe: serwisy, komponenty, utils, walidacja (Zod schemas)
- Testy integracyjne: API endpoints, RLS policies, współpraca z bazą danych
- Testy E2E: krytyczne scenariusze użytkownika (flow meczu, autoryzacja, udostępnianie)
- Code coverage ≥ 80%
- Automatyzacja w GitHub Actions z merge gates
- Priorytetyzacja testów według krytyczności funkcji (P0-P3)

---

## 8. Bezpieczeństwo

- Dane zabezpieczone przez:
  - autoryzację użytkowników w Supabase,
  - polityki RLS na tabelach,
  - brak bezpośredniego dostępu frontendu do kluczy Supabase i OpenRouter.
- Wrażliwe klucze (Supabase, OpenRouter) przechowywane są w zmiennych środowiskowych po stronie backendu i w konfiguracji CI/CD.

---

## 9. Uzasadnienie wyboru

- **Szybki start** – gotowe komponenty UI + BaaS (Supabase) ograniczają ilość kodu, który trzeba napisać od zera.
- **Skalowalność** – serverless (Cloudflare + Astro) i zarządzany Postgres w Supabase dobrze radzą sobie z rosnącym obciążeniem.
- **Koszt** – wykorzystanie usług z darmowymi lub tanimi progami startowymi.
- **Elastyczność** – możliwość dalszej rozbudowy zarówno frontendu (Angular), jak i backendu (Astro + Supabase + OpenRouter) bez zmiany fundamentów architektury.
