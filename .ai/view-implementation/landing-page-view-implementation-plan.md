# Plan implementacji widoku Landing Page

## 1. Przegląd

Landing Page to strona startowa aplikacji Spin Flow, której głównym celem jest prezentacja wartości produktu oraz umożliwienie użytkownikom zalogowania się przez Google. Widok jest publiczny i dostępny dla wszystkich użytkowników.

Kluczowe funkcje:

- Prezentacja głównego problemu (trudność zapamiętania przebiegu meczu)
- Przedstawienie wartości aplikacji (rejestracja na żywo + analiza AI)
- Duży, widoczny przycisk logowania przez Google
- Podgląd aplikacji (screenshot desktopowy lub kompozycja desktop+mobile)

### Podejście do implementacji

Widok jest inspirowany blokiem **[PrimeBlocks Marketing > Landing](https://primeblocks.org/marketing/landing)** i wykorzystuje:

- **Preset Aura** z PrimeNG 20+
- **Układ z PrimeBlocks** - Hero z obrazem aplikacji, sekcja features, gradient tła
- **Komponenty PrimeNG** - Button, Ripple
- **TailwindCSS** z tokenami tailwindcss-primeui

> **Uwaga dotycząca autentykacji**: W obecnej wersji przycisk logowania jest zaślepką (placeholder). Pełna integracja z Supabase Auth zostanie dodana w późniejszym etapie projektu.

## 2. Routing widoku

| Właściwość     | Wartość                 |
| -------------- | ----------------------- |
| Ścieżka        | `/`                     |
| Plik           | `src/pages/index.astro` |
| Dostęp         | Publiczny               |
| Przekierowanie | Brak                    |

## 3. Struktura komponentów

Widok jest zbudowany jako jeden komponent Angular `LandingPageComponent`, inspirowany układem z PrimeBlocks, **bez menu nawigacyjnego**.

```
index.astro (Astro Page)
└── Layout.astro
    └── LandingPageComponent (Angular, client:only="angular")
        │
        ├── [Topbar - minimalny]
        │   ├── Logo "Spin Flow"
        │   └── GoogleLoginButtonComponent (mały, outlined)
        │
        ├── [Sekcja Hero]
        │   ├── Lewa kolumna (tekst)
        │   │   ├── Badge "Dla trenerów tenisa stołowego"
        │   │   ├── Nagłówek H1
        │   │   ├── Podnagłówek (opis problemu)
        │   │   ├── GoogleLoginButtonComponent (duży CTA)
        │   │   └── Mini-features (3 ikony z tekstem)
        │   │
        │   └── Prawa kolumna
        │       └── Screenshot aplikacji
        │
        ├── [Sekcja Features]
        │   ├── Nagłówek "Dlaczego Spin Flow?"
        │   └── Grid 3 kart korzyści (FeatureCardComponent)
        │
        └── [Footer]
            └── Copyright "© 2025 Spin Flow"
```

## 4. Szczegóły komponentów

### 4.1 LandingPageComponent

- **Opis**: Główny kontener widoku oparty na układzie z PrimeBlocks Marketing > Landing. Zawiera wszystkie sekcje strony.

- **Główne elementy**:
  - Header - minimalny topbar z logo po lewej i przyciskiem logowania po prawej
  - Sekcja Hero - dwukolumnowy układ: tekst z CTA po lewej, obraz aplikacji po prawej
  - Sekcja Features - nagłówek + grid 3 kart z korzyściami
  - Footer - minimalistyczny z copyright

- **Stylowanie inspirowane PrimeBlocks**:
  - Gradient tło dla Hero (from-surface-50 to-surface-0)
  - Duży obraz aplikacji z cieniem (shadow-2xl, rounded-xl)
  - Responsywność: kolumna na mobile, rząd na desktop

- **Obsługiwane interakcje**: Delegacja kliknięcia do GoogleLoginButtonComponent

- **Propsy**: Brak (komponent samodzielny)

### 4.2 GoogleLoginButtonComponent

- **Opis**: Przycisk logowania przez Google z ikoną Google (inline SVG) i tekstem. Wykorzystuje p-button z PrimeNG. Obecnie placeholder.

- **Główne elementy**: p-button z customową zawartością - ikona Google SVG + tekst

- **Obsługiwane interakcje**: click → console.log (placeholder dla przyszłej implementacji OAuth)

- **Propsy**:
  - `size` - 'small' | 'large' (domyślnie 'large')
  - `label` - tekst przycisku (domyślnie 'Zaloguj przez Google')
  - `outlined` - boolean, czy przycisk ma być outlined (true dla topbar)
  - `styleClass` - dodatkowe klasy CSS

### 4.3 FeatureCardComponent

- **Opis**: Karta pojedynczej korzyści/funkcji. Ikona w kolorowym kółku na górze, nagłówek i opis.

- **Główne elementy**:
  - Kontener z cieniem i zaokrąglonymi rogami
  - Ikona PrimeIcons w kolorowym kółku (różne kolory dla różnych funkcji)
  - Nagłówek H3
  - Tekst opisu

- **Obsługiwane interakcje**: Hover - efekt podniesienia (shadow-md)

- **Propsy**:
  - `icon` - klasa PrimeIcons (np. 'pi pi-stopwatch')
  - `iconBgClass` - klasa tła ikony (np. 'bg-blue-100')
  - `iconColorClass` - klasa koloru ikony (np. 'text-blue-600')
  - `title` - nagłówek karty
  - `description` - opis funkcjonalności

## 5. Typy

### 5.1 GoogleLoginButtonProps

Interfejs propsów dla przycisku logowania: size, label, outlined, styleClass.

### 5.2 FeatureCardData

Dane karty funkcjonalności: icon, iconBgClass, iconColorClass, title, description.

### 5.3 MiniFeature

Mini-feature dla Hero: icon, text.

### 5.4 HeroConfig

Konfiguracja sekcji Hero: badge, headline, subheadline, ctaLabel, miniFeatures, appScreenshotUrl, appScreenshotAlt.

## 6. Zarządzanie stanem

Landing Page jest w większości statyczny. Jedyny stan:

- `isLoginLoading` - signal boolean dla stanu ładowania przycisku (placeholder dla przyszłej implementacji)

Dane (heroConfig, features) są zdefiniowane jako stałe w komponencie.

## 7. Integracja API

Landing Page **nie korzysta z żadnych endpointów API**. Widok jest w pełni statyczny.

Autentykacja z Supabase Auth zostanie zaimplementowana w późniejszym etapie.

## 8. Interakcje użytkownika

| Interakcja                                 | Element                    | Rezultat                  |
| ------------------------------------------ | -------------------------- | ------------------------- |
| Kliknięcie "Zaloguj przez Google" (topbar) | GoogleLoginButtonComponent | Placeholder: console.log  |
| Kliknięcie "Zaloguj przez Google" (CTA)    | GoogleLoginButtonComponent | Placeholder: console.log  |
| Hover na kartach Features                  | FeatureCardComponent       | Efekt podniesienia (cień) |

## 9. Warunki i walidacja

Landing Page nie wymaga walidacji. Wszystkie warunki biznesowe dotyczące autentykacji będą zaimplementowane w późniejszym etapie.

## 10. Obsługa błędów

W obecnej wersji (placeholder) widok nie wymaga obsługi błędów.

Po implementacji autentykacji należy obsłużyć błędy OAuth (access_denied, network_error, server_error) za pomocą Toast z PrimeNG.

## 11. Kroki implementacji

### Krok 1: Utworzenie struktury katalogów

Utworzyć katalog `src/components/landing/` z plikami:

- `landing-page.component.ts`
- `google-login-button.component.ts`
- `feature-card.component.ts`
- `types.ts`

### Krok 2: Zdefiniowanie typów

W pliku `types.ts` zdefiniować interfejsy: GoogleLoginButtonProps, FeatureCardData, MiniFeature, HeroConfig.

### Krok 3: Implementacja GoogleLoginButtonComponent

- Standalone komponent Angular
- Użyć p-button z PrimeNG z template dla custom content
- Dodać ikonę Google jako inline SVG (oficjalne kolory Google)
- Propsy jako Input signals
- Obsługa click jako placeholder (console.log)

### Krok 4: Implementacja FeatureCardComponent

- Standalone komponent Angular
- Przyjmować dane przez Input signal
- Stylowanie: kontener z cieniem, ikona w kolorowym kółku, nagłówek, opis
- Efekt hover na cień

### Krok 5: Implementacja LandingPageComponent

**Sekcja Topbar:**

- Flex container z justify-between
- Logo po lewej (obraz + tekst "Spin Flow")
- GoogleLoginButtonComponent po prawej (size="small", outlined)

**Sekcja Hero:**

- Grid 2 kolumny (1 na mobile)
- Gradient tło (from-surface-50 to-surface-0)
- Lewa kolumna: badge, H1, podnagłówek, CTA button, mini-features
- Prawa kolumna: obraz aplikacji z cieniem

**Sekcja Features:**

- Max-width container
- Nagłówek "Dlaczego Spin Flow?"
- Grid 3 kolumny (1 na mobile) z FeatureCardComponent

**Footer:**

- Tło surface-50
- Tekst copyright wycentrowany

**Dane statyczne:**

- heroConfig z tekstami i ścieżką do obrazu
- features - 3 karty: "Rejestracja na żywo", "Analiza AI", "Udostępnianie"

### Krok 6: Modyfikacja index.astro

- Usunąć obecną zawartość demo
- Osadzić LandingPageComponent z client:only="angular"
- Ustawić title strony

### Krok 7: Aktualizacja Layout.astro

- Zaktualizować meta tagi dla SEO (description)
- Dostosować klasy body do tokenów PrimeUI (bg-surface-0, text-surface-900)

### Krok 8: Dodanie assetów

- Logo: `/public/logo.svg`
- Screenshot aplikacji: `/public/app-screenshot.png` (desktop lub kompozycja desktop+mobile, ~1200x800px)

### Krok 9: Testowanie

- Responsywność (mobile, tablet, desktop)
- Dark mode (tokeny PrimeUI)
- Dostępność (alt text, aria-labels, kontrast)
- Placeholder przycisku logowania
- Zgodność z układem PrimeBlocks

### Krok 10: (Przyszły) Integracja autentykacji

Osobny etap projektu - implementacja serwisu auth, konfiguracja Supabase, podłączenie przycisku.

## 12. Zależności

### Moduły PrimeNG

- ButtonModule
- RippleModule

### Assety

- `/public/logo.svg` - logo aplikacji
- `/public/app-screenshot.png` - screenshot aplikacji

## 13. Uwagi końcowe

### Inspiracja PrimeBlocks

Układ bezpośrednio inspirowany blokiem PrimeBlocks Marketing > Landing:

- Hero dwukolumnowy z obrazem
- Badge nad nagłówkiem
- Mini-features pod CTA
- Karty features w gridzie
- Gradient tła, cienie, zaokrąglenia

### Dostępność

- Alt text dla obrazów
- Kontrast WCAG AA (zapewniony przez Aura)
- aria-label dla przycisku logowania
- Semantyczne znaczniki HTML

### Wydajność

- Screenshot z loading="eager" (above the fold)
- client:only dla hydratacji po stronie klienta

### SEO

- Meta tagi w Layout.astro
- Semantyczna struktura HTML
- Prawidłowa hierarchia nagłówków
