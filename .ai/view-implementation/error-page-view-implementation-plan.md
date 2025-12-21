# Plan implementacji widoku Strona błędu (404 / nieprawidłowy token)

## 1. Przegląd

Widok strony błędu (Error Page) to statyczna strona informacyjna wyświetlana w następujących sytuacjach:

- Użytkownik wchodzi na nieistniejącą ścieżkę URL (błąd 404)
- Użytkownik wchodzi na publiczny link do meczu z nieprawidłowym tokenem
- Użytkownik wchodzi na publiczny link do meczu, który został usunięty

Strona ma za zadanie:

- Wyświetlić przyjazny komunikat o błędzie w stylu wzorców PrimeBlocks Error Pages
- Poinformować użytkownika, że żądany zasób nie istnieje
- Umożliwić łatwą nawigację do strony głównej

Widok jest publiczny - nie wymaga autentykacji.

**Powiązane User Stories:**

- US-072: Obsługa nieważnego publicznego linku

## 2. Routing widoku

| Ścieżka                                            | Opis                                                              |
| -------------------------------------------------- | ----------------------------------------------------------------- |
| `/404`                                             | Strona błędu 404 - główna strona błędu                            |
| Dowolna nieistniejąca ścieżka                      | Automatyczne przekierowanie do `/404` przez Astro                 |
| `/public/matches/:token` (gdy token nieprawidłowy) | Wyświetlenie inline komunikatu błędu w `PublicMatchPageComponent` |

**Konfiguracja w Astro:**

- Plik `src/pages/404.astro` będzie automatycznie wyświetlany dla nieistniejących ścieżek
- Dla publicznych meczów z nieprawidłowym tokenem - komponent `PublicMatchPageComponent` renderuje błąd inline (bez przekierowania)

## 3. Struktura komponentów

```
404.astro (strona Astro)
└── ErrorPageComponent (standalone Angular component)
    ├── Sekcja ikony błędu (PrimeIcons)
    ├── Sekcja kodu błędu ("404")
    ├── Sekcja komunikatu (tytuł + opis)
    └── Sekcja akcji (p-button)
```

Widok oparty jest na wzorcu **PrimeBlocks Error Pages** - minimalistyczny layout z centralnie umieszczoną treścią, dużą ikoną, czytelnym komunikatem i wyraźnym przyciskiem akcji.

## 4. Szczegóły komponentów

### 4.1 ErrorPageComponent

**Opis komponentu:**
Główny i jedyny komponent strony błędu. Jest to standalone komponent Angular odpowiedzialny za wyświetlenie przyjaznego komunikatu błędu w stylu PrimeBlocks Error Pages. Komponent obsługuje trzy warianty komunikatu: ogólny błąd 404, błąd braku meczu oraz błąd nieprawidłowego linku.

**Lokalizacja pliku:**
`src/components/error-page/error-page.component.ts`

**Główne elementy:**

- Kontener fullscreen z centrowaniem (flexbox, min-h-screen)
- Sekcja ikony - duża ikona PrimeIcons w okręgu z tłem (`pi-exclamation-triangle`, `pi-times-circle`, `pi-link`)
- Sekcja kodu błędu - duży tekst "404" z kolorem `text-primary`
- Sekcja komunikatu:
  - Nagłówek `h1` z klasą `text-surface-900 dark:text-surface-0`
  - Tekst pomocniczy `p` z klasą `text-surface-600 dark:text-surface-400`
- Sekcja akcji - przycisk PrimeNG `p-button` z routerLink

**Struktura szablonu:**

- Kontener główny: `div` z klasami `min-h-screen flex items-center justify-center bg-surface-ground`
- Wewnętrzny kontener: `div` z klasami `text-center max-w-md mx-auto px-4`
- Ikona w okręgu: `div` z klasami `w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6`
- Wewnątrz okręgu: `i` z dynamiczną klasą ikony i `text-4xl text-primary`
- Kod błędu: `span` z klasami `text-8xl font-bold text-primary opacity-20 block mb-4`
- Nagłówek: `h1` z klasami `text-3xl font-bold mb-4`
- Opis: `p` z klasami `text-lg mb-8 leading-relaxed`
- Przycisk: `p-button` z atrybutami `label`, `icon`, `routerLink`, `size="large"`

**Obsługiwane interakcje:**

| Interakcja                 | Element  | Rezultat                        |
| -------------------------- | -------- | ------------------------------- |
| Kliknięcie "Strona główna" | p-button | Nawigacja do `/` (landing page) |

**Obsługiwana walidacja:**

- Brak walidacji formularzy (widok tylko-do-odczytu)

**Typy:**

- `ErrorType` - typ określający wariant błędu
- `ErrorPageConfig` - interfejs konfiguracji widoku

**Propsy (Input):**

| Nazwa           | Typ                   | Domyślnie     | Opis                                                          |
| --------------- | --------------------- | ------------- | ------------------------------------------------------------- |
| `errorType`     | `ErrorType`           | `'not_found'` | Typ błędu do wyświetlenia                                     |
| `customMessage` | `string \| undefined` | `undefined`   | Opcjonalny niestandardowy komunikat nadpisujący domyślny opis |

**Zależności PrimeNG:**

- `ButtonModule` - przycisk nawigacji
- `RippleModule` - efekt ripple na przycisku
- `RouterModule` - nawigacja (routerLink)

## 5. Typy

### 5.1 ErrorType

Typ określający wariant błędu do wyświetlenia:

| Wartość           | Opis                                  | Użycie                                         |
| ----------------- | ------------------------------------- | ---------------------------------------------- |
| `not_found`       | Ogólny błąd 404 - strona nie istnieje | Nieistniejące ścieżki URL                      |
| `match_not_found` | Mecz nie istnieje lub został usunięty | Nieprawidłowy token w `/public/matches/:token` |
| `invalid_token`   | Nieprawidłowy token publicznego linku | Alternatywny komunikat dla błędu tokenu        |

Definicja typu: `type ErrorType = 'not_found' | 'match_not_found' | 'invalid_token'`

### 5.2 ErrorPageConfig

Interfejs konfiguracji widoku błędu:

| Pole          | Typ         | Opis                           |
| ------------- | ----------- | ------------------------------ |
| `errorType`   | `ErrorType` | Typ błędu                      |
| `title`       | `string`    | Tekst nagłówka                 |
| `description` | `string`    | Tekst pomocniczy               |
| `buttonLabel` | `string`    | Etykieta przycisku             |
| `buttonRoute` | `string`    | Ścieżka docelowa przycisku     |
| `buttonIcon`  | `string`    | Ikona PrimeIcons dla przycisku |
| `errorIcon`   | `string`    | Główna ikona błędu             |

### 5.3 ERROR_PAGE_CONFIGS

Stała mapa konfiguracji dla każdego typu błędu:

**not_found:**

- title: "Strona nie znaleziona"
- description: "Przepraszamy, strona której szukasz nie istnieje lub została przeniesiona."
- buttonLabel: "Strona główna"
- buttonRoute: "/"
- buttonIcon: "pi pi-home"
- errorIcon: "pi pi-exclamation-triangle"

**match_not_found:**

- title: "Mecz nie istnieje"
- description: "Ten mecz nie istnieje lub został usunięty przez trenera."
- buttonLabel: "Strona główna"
- buttonRoute: "/"
- buttonIcon: "pi pi-home"
- errorIcon: "pi pi-times-circle"

**invalid_token:**

- title: "Nieprawidłowy link"
- description: "Link do meczu jest nieprawidłowy lub wygasł."
- buttonLabel: "Strona główna"
- buttonRoute: "/"
- buttonIcon: "pi pi-home"
- errorIcon: "pi pi-link"

## 6. Zarządzanie stanem

Widok jest prosty i nie wymaga złożonego zarządzania stanem. Używamy Angular Signals dla reaktywności:

**Sygnały w komponencie:**

- `errorType` - input signal z typem błędu (domyślnie `'not_found'`)
- `customMessage` - input signal z opcjonalnym niestandardowym komunikatem
- `config` - computed signal zwracający odpowiednią konfigurację na podstawie `errorType`

**Logika computed:**

1. Pobierz bazową konfigurację z `ERROR_PAGE_CONFIGS` na podstawie `errorType()`
2. Jeśli `customMessage()` jest zdefiniowany, nadpisz pole `description` w konfiguracji
3. Zwróć finalną konfigurację

**Brak integracji z serwisami:**

- Widok nie wymaga żadnych serwisów (ani ThemeService, ani AuthService)
- Dark mode obsługiwany automatycznie przez tokeny CSS PrimeNG

## 7. Integracja API

**Ten widok NIE wywołuje bezpośrednio żadnych endpointów API.**

Widok jest wyświetlany jako rezultat błędów z innych części aplikacji:

| Scenariusz            | Źródło błędu                                 | Akcja                                                            |
| --------------------- | -------------------------------------------- | ---------------------------------------------------------------- |
| Nieistniejąca ścieżka | Astro routing                                | Automatyczne wyświetlenie `404.astro` z `ErrorPageComponent`     |
| Nieprawidłowy token   | `GET /api/public/matches/{token}` zwraca 404 | `PublicMatchPageComponent` renderuje `ErrorPageComponent` inline |
| Usunięty mecz         | `GET /api/public/matches/{token}` zwraca 404 | j.w.                                                             |

**Uwaga dotycząca bezpieczeństwa:**
Zgodnie z api-plan.md i PRD, ten sam komunikat błędu jest wyświetlany dla nieprawidłowego tokenu i usuniętego meczu. Nie ujawniamy czy mecz istniał, ale został usunięty vs. token był zawsze nieprawidłowy.

## 8. Interakcje użytkownika

| Interakcja                                | Element               | Akcja                    | Rezultat                             |
| ----------------------------------------- | --------------------- | ------------------------ | ------------------------------------ |
| Kliknięcie przycisku "Strona główna"      | p-button z routerLink | Nawigacja Angular Router | Przekierowanie na landing page (`/`) |
| Kliknięcie logo (jeśli widoczne w layout) | Link w nagłówku       | Nawigacja                | Przekierowanie na stronę główną      |

**Uwagi UX:**

- Przycisk ma rozmiar `large` dla lepszej widoczności i łatwiejszego kliknięcia na mobile
- Przycisk zawiera ikonę `pi-home` dla szybkiego rozpoznania funkcji
- Cała strona jest responsywna i dobrze wygląda na urządzeniach mobilnych
- Brak nawigacji powrotnej w nagłówku (strona błędu nie powinna mieć skomplikowanej nawigacji)

## 9. Warunki i walidacja

**Ten widok nie zawiera formularzy ani walidacji danych wejściowych.**

Jedyna logika warunkowa dotyczy wyboru konfiguracji na podstawie typu błędu:

| Warunek                           | Komponent          | Wpływ na UI                                                      |
| --------------------------------- | ------------------ | ---------------------------------------------------------------- |
| `errorType === 'not_found'`       | ErrorPageComponent | Wyświetla ogólny komunikat 404 z ikoną `pi-exclamation-triangle` |
| `errorType === 'match_not_found'` | ErrorPageComponent | Wyświetla komunikat o braku meczu z ikoną `pi-times-circle`      |
| `errorType === 'invalid_token'`   | ErrorPageComponent | Wyświetla komunikat o nieprawidłowym linku z ikoną `pi-link`     |
| `customMessage !== undefined`     | ErrorPageComponent | Nadpisuje domyślny tekst opisu                                   |

## 10. Obsługa błędów

### 10.1 Scenariusze błędów

| Scenariusz                                     | Obsługa                                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Użytkownik wchodzi na `/404` ręcznie           | Wyświetlenie standardowej strony 404 z typem `not_found`                                   |
| Użytkownik wchodzi na nieistniejącą ścieżkę    | Astro automatycznie renderuje `404.astro`                                                  |
| Błąd sieci podczas ładowania publicznego meczu | `PublicMatchPageComponent` wyświetla `ErrorPageComponent` inline z typem `match_not_found` |
| Token nieprawidłowy (API zwraca 404)           | `PublicMatchPageComponent` wyświetla `ErrorPageComponent` inline z typem `match_not_found` |

### 10.2 Komunikaty błędów

Wszystkie komunikaty są w języku polskim (zgodnie z PRD). Pełna lista komunikatów:

| Typ błędu         | Tytuł                 | Opis                                                                       |
| ----------------- | --------------------- | -------------------------------------------------------------------------- |
| `not_found`       | Strona nie znaleziona | Przepraszamy, strona której szukasz nie istnieje lub została przeniesiona. |
| `match_not_found` | Mecz nie istnieje     | Ten mecz nie istnieje lub został usunięty przez trenera.                   |
| `invalid_token`   | Nieprawidłowy link    | Link do meczu jest nieprawidłowy lub wygasł.                               |

### 10.3 Zapobieganie ujawnianiu informacji

Zgodnie z api-plan.md:

- Ten sam komunikat błędu dla nieprawidłowego tokenu i usuniętego meczu
- Nie ujawniamy czy mecz istniał, ale został usunięty vs. token był zawsze nieprawidłowy
- Backend zwraca identyczny kod 404 w obu przypadkach

## 11. Kroki implementacji

### Krok 1: Utworzenie struktury plików

Utworzenie katalogu i plików komponentu:

- `src/components/error-page/error-page.component.ts` - główny komponent standalone
- `src/components/error-page/error-page.types.ts` - typy ErrorType i ErrorPageConfig
- `src/components/error-page/error-page.config.ts` - stała ERROR_PAGE_CONFIGS

### Krok 2: Implementacja typów

W pliku `error-page.types.ts`:

- Zdefiniowanie typu `ErrorType` jako union type trzech wartości
- Zdefiniowanie interfejsu `ErrorPageConfig` z polami: errorType, title, description, buttonLabel, buttonRoute, buttonIcon, errorIcon

### Krok 3: Implementacja stałych konfiguracyjnych

W pliku `error-page.config.ts`:

- Import typu `ErrorType` i `ErrorPageConfig`
- Zdefiniowanie stałej `ERROR_PAGE_CONFIGS` jako `Record<ErrorType, ErrorPageConfig>`
- Uzupełnienie konfiguracji dla każdego typu błędu z polskimi komunikatami

### Krok 4: Implementacja komponentu Angular

W pliku `error-page.component.ts`:

- Utworzenie standalone komponentu z importami: `CommonModule`, `RouterModule`, `ButtonModule`, `RippleModule`
- Zdefiniowanie input signals: `errorType` i `customMessage`
- Zdefiniowanie computed signal `config` zwracającego konfigurację
- Implementacja szablonu inline zgodnego z wzorcem PrimeBlocks Error Pages:
  - Kontener fullscreen z centrowaniem (flex, items-center, justify-center, min-h-screen)
  - Tło z tokenem `bg-surface-ground`
  - Ikona w okręgu z tłem `bg-primary/10`
  - Kod "404" z dużą czcionką i niskim opacity
  - Nagłówek i opis z odpowiednimi tokenami kolorów
  - Przycisk PrimeNG z routerLink

### Krok 5: Utworzenie strony Astro 404

Utworzenie pliku `src/pages/404.astro`:

- Import layoutu `Layout.astro`
- Osadzenie komponentu `ErrorPageComponent` z wartością `errorType="not_found"`
- Ustawienie odpowiedniego title dla strony

### Krok 6: Integracja z PublicMatchPageComponent

Aktualizacja komponentu publicznego meczu (jeśli jeszcze nie zaimplementowany):

- Import `ErrorPageComponent`
- Dodanie sygnału `errorType` typu `ErrorType | null`
- W przypadku błędu 404 z API - ustawienie `errorType.set('match_not_found')`
- Warunkowe renderowanie `ErrorPageComponent` gdy `errorType()` nie jest null

### Krok 7: Stylowanie z tokenami PrimeNG

Użycie tokenów projektowych PrimeNG w szablonie:

- Tło strony: `bg-surface-ground` (automatycznie zmienia się w dark mode)
- Tekst nagłówka: `text-surface-900 dark:text-surface-0`
- Tekst opisu: `text-surface-600 dark:text-surface-400`
- Akcent kolorystyczny: `text-primary`, `bg-primary/10`
- Przycisk: standardowy `p-button` z size="large"

### Krok 8: Testowanie

1. **Test ścieżki 404:**
   - Wejście na nieistniejącą ścieżkę np. `/xyz123`
   - Weryfikacja wyświetlenia strony błędu z komunikatem "Strona nie znaleziona"
   - Weryfikacja działania przycisku "Strona główna"

2. **Test nieprawidłowego tokenu:**
   - Wejście na `/public/matches/invalid-token-123`
   - Weryfikacja wyświetlenia komunikatu "Mecz nie istnieje"
   - Weryfikacja działania przycisku powrotu

3. **Test responsywności:**
   - Weryfikacja wyświetlania na różnych rozmiarach ekranu (mobile 320px, tablet 768px, desktop 1024px+)
   - Weryfikacja czytelności tekstu i dostępności przycisku na mobile

4. **Test dark mode:**
   - Przełączenie motywu na ciemny (klasa `.app-dark` na `<html>`)
   - Weryfikacja poprawności kolorów i kontrastu w dark mode
   - Weryfikacja automatycznej zmiany kolorów bez dodatkowej konfiguracji

### Krok 9: Weryfikacja dostępności

- Sprawdzenie kontrastu kolorów (WCAG AA minimum)
- Weryfikacja focus visible na przycisku (domyślnie obsługiwane przez PrimeNG)
- Weryfikacja semantycznego HTML (h1 dla nagłówka, p dla opisu, button dla akcji)
- Sprawdzenie aria-label na przycisku (jeśli potrzebny)

## Dodatkowe uwagi implementacyjne

### Wzorzec PrimeBlocks Error Pages

Komponent jest oparty na wzorcu PrimeBlocks Error Pages, który charakteryzuje się:

- Minimalistycznym layoutem z centralnie umieszczoną treścią
- Dużą ikoną lub ilustracją błędu
- Czytelnym kodem błędu (404) z niskim opacity jako element dekoracyjny
- Wyraźnym nagłówkiem i zwięzłym opisem
- Pojedynczym, wyraźnym przyciskiem akcji

### Dark Mode

Komponent automatycznie wspiera dark mode dzięki użyciu tokenów CSS PrimeNG:

- `bg-surface-ground` - automatycznie zmienia tło
- `text-surface-900 dark:text-surface-0` - automatycznie zmienia kolor tekstu
- `text-surface-600 dark:text-surface-400` - automatycznie zmienia kolor tekstu pomocniczego
- `text-primary` i `bg-primary/10` - używa koloru primary z motywu

### Responsywność

Layout jest domyślnie responsywny dzięki:

- Flexbox centering (`flex items-center justify-center`)
- Maksymalnej szerokości kontenera (`max-w-md`)
- Padding na mobile (`px-4`)
- Skalowalnym rozmiarom czcionek (rem/em)

### Reużywalność

Komponent `ErrorPageComponent` może być użyty:

1. Jako standalone strona 404 w Astro (`src/pages/404.astro`)
2. Inline w `PublicMatchPageComponent` dla błędów związanych z meczem
3. W dowolnym innym miejscu aplikacji wymagającym komunikatu błędu

### Brak AuthGuard

Strona błędu nie wymaga AuthGuard - jest w pełni publiczna. Przycisk zawsze prowadzi do landing page (`/`), niezależnie od stanu autentykacji użytkownika.

### Przyszłe rozszerzenia

W przyszłości, po implementacji serwisu autentykacji, można rozważyć:

- Dynamiczne zmienianie docelowej ścieżki przycisku (zalogowani → `/matches`, niezalogowani → `/`)
- Personalizację komunikatu dla zalogowanych użytkowników
- Dodanie przycisku "Zaloguj się" dla niezalogowanych użytkowników na stronie 404
