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

## 7. Bezpieczeństwo

- Dane zabezpieczone przez:
  - autoryzację użytkowników w Supabase,
  - polityki RLS na tabelach,
  - brak bezpośredniego dostępu frontendu do kluczy Supabase i OpenRouter.
- Wrażliwe klucze (Supabase, OpenRouter) przechowywane są w zmiennych środowiskowych po stronie backendu i w konfiguracji CI/CD.

---

## 8. Uzasadnienie wyboru

- **Szybki start** – gotowe komponenty UI + BaaS (Supabase) ograniczają ilość kodu, który trzeba napisać od zera.
- **Skalowalność** – serverless (Cloudflare + Astro) i zarządzany Postgres w Supabase dobrze radzą sobie z rosnącym obciążeniem.
- **Koszt** – wykorzystanie usług z darmowymi lub tanimi progami startowymi.
- **Elastyczność** – możliwość dalszej rozbudowy zarówno frontendu (Angular), jak i backendu (Astro + Supabase + OpenRouter) bez zmiany fundamentów architektury.
