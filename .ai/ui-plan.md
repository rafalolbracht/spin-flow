# Architektura UI dla Spin Flow

## 1. Przegląd struktury UI

Spin Flow to webowa aplikacja dla trenerów tenisa stołowego, zaprojektowana przede wszystkim na smartfony w orientacji pionowej. Architektura UI opiera się na następujących założeniach:

### Stack technologiczny

- **Angular 20** z Signals dla reaktywności komponentów
- **PrimeNG 20** dla komponentów UI (dialogi, toast, accordion, progress spinner)
- **TailwindCSS 4** dla stylowania i responsywności
- **Astro 5** jako warstwa serwerowa

### Zasady projektowe

- **Mobile-first** - główny target to smartfon w pionie, z poprawnym działaniem na tablet i desktop
- **Pesymistyczne aktualizacje** - UI zamrożone z loaderem podczas każdej operacji API
- **Walidacja na backendzie** - frontend nie waliduje danych, błędy 422 obsługiwane inline
- **Dark mode** - obsługa jasnego i ciemnego motywu z przełącznikiem w nagłówku
- **Brak offline** - aplikacja wymaga połączenia z internetem

### Paleta kolorów (CSS variables)

- **Player** - niebieski (#3B82F6) dla zawodnika ocenianego
- **Opponent** - pomarańczowy (#F97316) dla rywala
- **Serwujący** - zielona kropka (#22C55E)
- **CTA** - teal/zielony dla głównych akcji
- **Error** - czerwony dla błędów
- **Warning** - żółty dla ostrzeżeń

---

## 2. Lista widoków

### 2.1 Landing Page

| Właściwość  | Opis                                                                |
| ----------- | ------------------------------------------------------------------- |
| **Ścieżka** | `/`                                                                 |
| **Cel**     | Prezentacja wartości produktu i umożliwienie logowania przez Google |
| **Dostęp**  | Publiczny                                                           |

**Kluczowe informacje:**

- Opis głównego problemu (trudność zapamiętania przebiegu meczu)
- Wartość aplikacji (rejestracja na żywo + analiza AI)
- Przycisk logowania przez Google

**Kluczowe komponenty:**

- `HeroSectionComponent` - główna sekcja z opisem wartości
- `AppScreenshotComponent` - mockup aplikacji w telefonie
- `GoogleLoginButtonComponent` - przycisk logowania (duży, wyraźny)
- `FooterComponent` - podstawowe informacje o aplikacji

**Względy UX:**

- Minimalistyczny i nowoczesny design, focus na CTA (logowanie)
- Screenshot pokazujący rzeczywisty wygląd aplikacji
- Szybkie zrozumienie wartości w 5 sekund

**Względy dostępności:**

- Alt text dla screenshota
- Wyraźny kontrast tekstu
- Przycisk logowania z odpowiednim rozmiarem (min 44px)

**Względy bezpieczeństwa:**

- Redirect do listy meczów jeśli użytkownik już zalogowany
- OAuth flow przez Supabase Auth

---

### 2.2 Lista meczów

| Właściwość  | Opis                                                                           |
| ----------- | ------------------------------------------------------------------------------ |
| **Ścieżka** | `/matches`                                                                     |
| **Cel**     | Przegląd wszystkich meczów użytkownika z możliwością filtrowania i zarządzania |
| **Dostęp**  | Chroniony (wymaga autentykacji)                                                |

**Kluczowe informacje:**

- Lista meczów użytkownika (nazwa zawodnika, rywala, status, data, wynik setów)
- Filtry po nazwie zawodnika i rywala
- Paginacja

**Kluczowe komponenty:**

- `MatchListPageComponent` - główny kontener strony
- `MatchFilterComponent` - inline filtry (2 inputy tekstowe)
- `MatchCardComponent` - karta pojedynczego meczu
- `PaginationComponent` - paginacja numeryczna (PrimeNG)
- `DeleteMatchDialogComponent` - modal potwierdzenia usunięcia
- `EmptyStateComponent` - komunikat gdy brak meczów

**Względy UX:**

- Wyróżnienie meczów "W toku" względem "Zakończonych" (badge kolorowy)
- Duże powierzchnie klikalne (cała karta jako link)
- Ikona usunięcia z potwierdzeniem
- Sortowanie domyślne: najnowsze na górze (-started_at)
- Responsywny grid: 1 kolumna mobile, 3 kolumny desktop, 2 kolumny tablet

**Względy dostępności:**

- Karty jako interaktywne elementy z focus visible
- Ikona kosza z aria-label "Usuń mecz"
- Status meczu jako tekst, nie tylko kolor

**Względy bezpieczeństwa:**

- AuthGuard - redirect do landing page dla niezalogowanych
- RLS w Supabase - widoczne tylko mecze użytkownika

**Powiązane endpointy API:**

- `GET /api/matches` - pobranie listy z paginacją i filtrami
- `DELETE /api/matches/{id}/delete` - usunięcie meczu

---

### 2.3 Wizard tworzenia meczu

| Właściwość  | Opis                                |
| ----------- | ----------------------------------- |
| **Ścieżka** | `/matches/new`                      |
| **Cel**     | Utworzenie nowego meczu w 3 krokach |
| **Dostęp**  | Chroniony                           |

**Kluczowe informacje:**

- Krok 1: Nazwy zawodnika ocenianego i rywala
- Krok 2: Wybór pierwszego serwującego (wizualnie: duże przyciski z imionami)
- Krok 3: Opcje zaawansowane (max setów, złoty set, podsumowanie AI)

**Kluczowe komponenty:**

- `CreateMatchWizardComponent` - główny kontener z logiką nawigacji
- `WizardStepperComponent` - wizualny indicator kroków (3 kropki)
- `Step1PlayerNamesComponent` - formularz nazw
- `Step2ServerSelectionComponent` - wybór serwującego (2 duże przyciski)
- `Step3OptionsComponent` - opcje zaawansowane (dropdown, checkboxy)
- `WizardNavigationComponent` - przyciski Wstecz/Dalej/Utwórz mecz

**Względy UX:**

- Jeden URL dla wszystkich kroków (brak deep linking do kroków)
- F5 powoduje utratę danych (świadoma decyzja, brak sessionStorage)
- Subtelne animacje między krokami (slide)
- Przyciski nawigacji na dole ekranu, duże i wyraźne
- Krok 2 - przyciski z imionami zawodników (nie radio buttons)
- Domyślne wartości: max_sets=5, golden_set=false, AI=true

**Względy dostępności:**

- Focus automatyczny na pierwszym polu każdego kroku
- Informacja o aktualnym kroku dla screen readerów
- Walidacja inline z komunikatami pod polami

**Względy bezpieczeństwa:**

- AuthGuard
- Walidacja na backendzie (Zod)
- Błędy 422 wyświetlane inline przy polach

**Powiązane endpointy API:**

- `POST /api/matches/create` - utworzenie meczu (po kroku 3)

---

### 2.4 Widok meczu "W toku"

| Właściwość  | Opis                                          |
| ----------- | --------------------------------------------- |
| **Ścieżka** | `/matches/:id/live`                           |
| **Cel**     | Rejestracja punktów i przebiegu meczu na żywo |
| **Dostęp**  | Chroniony                                     |

**Kluczowe informacje:**

- Wynik setowy meczu (wygrane sety player vs opponent)
- Wynik punktowy bieżącego seta
- Nazwy zawodników
- Aktualnie serwujący
- Dostępne tagi
- Tabela zakończonych i bieżącego seta

**Kluczowe komponenty:**

- `LiveMatchPageComponent` - główny kontener
- `ScoreboardComponent` - centrum ekranu:
  - Wynik setowy (badge, mniejsza czcionka, wyżej)
  - Wynik punktowy (duże cyfry, centrum)
  - Nazwy zawodników (po bokach, lustrzane odbicie)
  - Indicator serwującego (zielona kropka, na zewnątrz od wyniku)
- `TagSelectorComponent` - chipy z tagami (multi-select, responsywny grid 2-4 kolumny)
- `PointButtonsComponent` - duże przyciski +player/+opponent (kolorowe, min 60px wysokości)
- `MatchActionsComponent` - przyciski: Cofnij punkt, Zakończ set, Zakończ mecz
- `SetTableComponent` - tabela setów (stała szerokość kolumn, horizontal scroll)
- `FinishSetDialogComponent` - modal z textarea na uwagi do seta
- `FinishMatchDialogComponent` - modal z textarea na uwagi do meczu

**Względy UX:**

- Layout zoptymalizowany na jedną rękę (przyciski +point na dole)
- Scoreboard wyraźnie widoczny bez scrollowania
- Tagi resetowane automatycznie po zapisie punktu
- Przyciski disabled podczas operacji API
- Cofnij punkt - tylko dla ostatniego punktu w secie
- Zakończ set - disabled przy remisie i przy ostatnim secie meczu (max_sets osiągnięty)
- Zakończ mecz - disabled przy remisie setów/punktów

**Względy dostępności:**

- Duże touch targets (min 44px, preferowane 60px dla przycisków głównych)
- Kontrast kolorów player/opponent
- Aria-live region dla aktualizacji wyniku
- Focus trap w modalach

**Względy bezpieczeństwa:**

- AuthGuard
- Weryfikacja ownership meczu (403 → toast + redirect)
- Redirect do /summary jeśli mecz zakończony

**Powiązane endpointy API:**

- `GET /api/matches/{id}?include=sets,points,tags` - pobranie stanu meczu
- `GET /api/tags` - lista tagów
- `POST /api/sets/{setId}/points/create` - dodanie punktu
- `DELETE /api/sets/{setId}/points/delete` - cofnięcie punktu
- `POST /api/sets/{id}/finish` - zakończenie seta
- `POST /api/matches/{id}/finish` - zakończenie meczu

---

### 2.5 Widok meczu "Zakończony"

| Właściwość  | Opis                                                    |
| ----------- | ------------------------------------------------------- |
| **Ścieżka** | `/matches/:id/summary`                                  |
| **Cel**     | Przegląd zakończonego meczu, raportu AI i udostępnianie |
| **Dostęp**  | Chroniony                                               |

**Kluczowe informacje:**

- Nazwy zawodników
- Data i godzina startu meczu (w lokalnej strefie czasowej)
- Wynik setowy
- Tabela setów z wynikami punktowymi
- Uwagi trenera do meczu i setów
- Raport AI (opis meczu + zalecenia) - jeśli dostępny

**Kluczowe komponenty:**

- `MatchSummaryPageComponent` - główny kontener
- `MatchHeaderComponent` - nazwy, data, wynik setowy
- `SetTableComponent` - reużywalny z widoku "W toku"
- `CoachNotesAccordionComponent` - accordion z uwagami (PrimeNG Accordion)
- `AiReportComponent` - sekcja z raportem AI:
  - Stan "pending" - spinner + komunikat
  - Stan "success" - opis + zalecenia
  - Stan "error" - komunikat błędu
  - Przycisk "Odśwież" do ręcznego pobrania
- `ShareDialogComponent` - modal z linkiem publicznym i przyciskiem Kopiuj
- `EditMatchDialogComponent` - edycja nazw zawodników
- `EditSetNotesDialogComponent` - edycja uwag do seta
- `EditMatchNotesDialogComponent` - edycja uwag do meczu

**Względy UX:**

- Osobne przyciski edycji dla różnych sekcji (nie jeden "Edytuj wszystko")
- Accordion domyślnie zwinięty (rozwinięty tylko AI)
- Kopiowanie linku do schowka z feedback (toast "Skopiowano")
- Czas wyświetlany w lokalnej strefie przeglądarki

**Względy dostępności:**

- Accordion z odpowiednimi aria-expanded
- Focus management w modalach
- Komunikaty sukcesu/błędu dla operacji

**Względy bezpieczeństwa:**

- AuthGuard
- Weryfikacja ownership
- Redirect do /live jeśli mecz "W toku"

**Powiązane endpointy API:**

- `GET /api/matches/{id}?include=sets,ai_report` - dane meczu
- `GET /api/matches/{matchId}/ai-report` - raport AI (przycisk Odśwież)
- `PATCH /api/matches/{id}/update` - edycja metadanych
- `POST /api/matches/{matchId}/share` - generowanie linku

---

### 2.6 Widok publiczny meczu

| Właściwość  | Opis                                     |
| ----------- | ---------------------------------------- |
| **Ścieżka** | `/public/matches/:token`                 |
| **Cel**     | Podgląd zakończonego meczu bez logowania |
| **Dostęp**  | Publiczny (dostęp przez token)           |

**Kluczowe informacje:**

- Identyczne jak w widoku "Zakończony"
- Brak możliwości edycji
- Branding "Powered by Spin Flow"

**Kluczowe komponenty:**

- `PublicMatchPageComponent` - główny kontener
- Reużywalne z widoku "Zakończony":
  - `MatchHeaderComponent`
  - `SetTableComponent`
  - `CoachNotesAccordionComponent`
  - `AiReportComponent` (bez przycisku Odśwież)
- `PoweredByFooterComponent` - branding aplikacji

**Względy UX:**

- Brak przycisków edycji
- Brak przycisku udostępniania
- Brak nawigacji powrotnej (użytkownik nie jest zalogowany)
- Subtelny branding na dole strony

**Względy dostępności:**

- Takie same jak widok "Zakończony"

**Względy bezpieczeństwa:**

- Brak AuthGuard
- Walidacja tokenu przez backend
- Ten sam błąd dla nieprawidłowego tokenu i usuniętego meczu (zapobieganie enumeracji)

**Powiązane endpointy API:**

- `GET /api/public/matches/{token}` - wszystkie dane meczu

---

### 2.7 Strona błędu (404 / nieprawidłowy token)

| Właściwość  | Opis                                                         |
| ----------- | ------------------------------------------------------------ |
| **Ścieżka** | `/404` lub dowolna nieistniejąca                             |
| **Cel**     | Informacja o nieistniejącej stronie lub nieprawidłowym linku |
| **Dostęp**  | Publiczny                                                    |

**Kluczowe komponenty:**

- `ErrorPageComponent` - przyjazna strona błędu
- Komunikat "Mecz nie istnieje" lub "Strona nie znaleziona"
- Link do strony głównej (dla zalogowanych: lista meczów)

---

## 3. Mapa podróży użytkownika

### 3.1 Główny przepływ - rejestracja meczu na żywo

```
┌─────────────────┐
│  Landing Page   │
│       (/)       │
└────────┬────────┘
         │ Klik "Zaloguj przez Google"
         ▼
┌─────────────────┐
│  Google OAuth   │
│    (external)   │
└────────┬────────┘
         │ Sukces
         ▼
┌─────────────────┐
│  Lista meczów   │
│   (/matches)    │
└────────┬────────┘
         │ Klik "Nowy mecz"
         ▼
┌─────────────────┐
│ Wizard Krok 1   │
│ (/matches/new)  │──────┐
└────────┬────────┘      │ Nawigacja
         │ Dalej         │ Wstecz/Dalej
         ▼               │
┌─────────────────┐      │
│ Wizard Krok 2   │◄─────┤
└────────┬────────┘      │
         │ Dalej         │
         ▼               │
┌─────────────────┐      │
│ Wizard Krok 3   │◄─────┘
└────────┬────────┘
         │ Klik "Utwórz mecz"
         │ POST /api/matches/create
         ▼
┌─────────────────┐
│  Mecz "W toku"  │
│ (/matches/:id/  │
│     live)       │
└────────┬────────┘
         │
         │ ┌──────────────────────────────────────┐
         │ │ PĘTLA REJESTRACJI:                   │
         │ │ 1. Wybór tagów (opcjonalne)          │
         │ │ 2. Klik +player lub +opponent        │
         │ │ 3. POST .../points/create            │
         │ │ 4. Aktualizacja UI                   │
         │ │ [Opcjonalnie: Cofnij punkt]          │
         │ │ [Po zakończeniu seta: Modal → POST]  │
         │ └──────────────────────────────────────┘
         │
         │ Klik "Zakończ mecz" → Modal
         │ POST /api/matches/:id/finish
         ▼
┌─────────────────┐
│ Mecz "Zakończ." │
│ (/matches/:id/  │
│    summary)     │
└────────┬────────┘
         │
         ├──────────────────────┐
         │ Klik "Udostępnij"    │ Edycja danych
         ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│ Modal z linkiem │    │ Modal edycji    │
│ POST .../share  │    │ PATCH .../update│
└─────────────────┘    └─────────────────┘
```

### 3.2 Przepływ widoku publicznego

```
┌─────────────────┐
│ Otrzymanie linku│
│ (email, SMS)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Widok publiczny │
│ (/public/       │
│ matches/:token) │
└────────┬────────┘
         │
         ├─────────────────────┐
         │ Token prawidłowy    │ Token nieprawidłowy
         ▼                     ▼
┌─────────────────┐    ┌─────────────────┐
│ Wyświetlenie    │    │ Strona błędu    │
│ danych meczu    │    │ "Mecz nie       │
│                 │    │  istnieje"      │
└─────────────────┘    └─────────────────┘
```

### 3.3 Przepływ powrotu do meczu "W toku"

```
┌─────────────────┐
│  Lista meczów   │
└────────┬────────┘
         │ Klik meczu "W toku"
         ▼
┌─────────────────┐
│  Mecz "W toku"  │
│ (odtworzenie    │
│  stanu z API)   │
└─────────────────┘
```

### 3.4 Przepływ przeglądu historii

```
┌─────────────────┐
│  Lista meczów   │
└────────┬────────┘
         │ Klik meczu "Zakończony"
         ▼
┌─────────────────┐
│ Mecz "Zakończ." │
│ (przegląd,      │
│  edycja,        │
│  udostępnianie) │
└─────────────────┘
```

---

## 4. Układ i struktura nawigacji

### 4.1 Globalny layout

```
┌─────────────────────────────────────────┐
│              HeaderComponent            │
│  ┌─────┐                    ┌────┐ ┌──┐│
│  │Logo │                    │Dark│ │Wy││
│  │     │                    │Mode│ │lo││
│  └─────┘                    └────┘ └──┘│
├─────────────────────────────────────────┤
│                                         │
│            <router-outlet>              │
│                                         │
│           (główna zawartość)            │
│                                         │
└─────────────────────────────────────────┘
```

### 4.2 HeaderComponent

| Element               | Widoczność     | Akcja                                        |
| --------------------- | -------------- | -------------------------------------------- |
| Logo (Spin Flow)      | Zawsze         | Klik → `/matches` (jeśli zalogowany) lub `/` |
| Przełącznik Dark Mode | Zawsze         | Toggle motywu                                |
| Przycisk Wyloguj      | Gdy zalogowany | Wylogowanie → redirect do `/`                |
| Przycisk Zaloguj      | Landing page   | OAuth flow                                   |

### 4.3 Nawigacja kontekstowa per widok

| Widok             | Nawigacja kontekstowa                              |
| ----------------- | -------------------------------------------------- |
| Landing Page      | Brak (tylko login w header)                        |
| Lista meczów      | Przycisk "Nowy mecz" (FAB lub button)              |
| Wizard            | Wstecz / Dalej / Utwórz mecz (na dole)             |
| Mecz "W toku"     | Przycisk "Powrót do listy" (w header lub na górze) |
| Mecz "Zakończony" | Przycisk "Powrót do listy", "Udostępnij"           |
| Widok publiczny   | Brak nawigacji (tylko branding na dole)            |

### 4.4 Guards i redirecty

| Ścieżka                  | Guard                                | Redirect (jeśli nieautoryzowany) |
| ------------------------ | ------------------------------------ | -------------------------------- |
| `/`                      | Brak (jeśli zalogowany → `/matches`) | -                                |
| `/matches`               | AuthGuard                            | `/`                              |
| `/matches/new`           | AuthGuard                            | `/`                              |
| `/matches/:id/live`      | AuthGuard + OwnershipGuard           | `/` lub `/matches`               |
| `/matches/:id/summary`   | AuthGuard + OwnershipGuard           | `/` lub `/matches`               |
| `/public/matches/:token` | Brak                                 | -                                |

---

## 5. Kluczowe komponenty

### 5.1 Komponenty globalne

| Komponent                 | Opis                                                | Użycie                 |
| ------------------------- | --------------------------------------------------- | ---------------------- |
| `HeaderComponent`         | Nagłówek aplikacji z logo, dark mode toggle, logout | Wszystkie widoki       |
| `LoadingOverlayComponent` | Fullscreen overlay z spinnerem blokujący UI         | Podczas operacji API   |
| `ToastComponent`          | Powiadomienia (PrimeNG Toast)                       | Błędy, sukces operacji |
| `ConfirmDialogComponent`  | Modal potwierdzenia (PrimeNG ConfirmDialog)         | Usuwanie meczu         |

### 5.2 Komponenty formularzy

| Komponent            | Opis                              | Props                            |
| -------------------- | --------------------------------- | -------------------------------- |
| `TextInputComponent` | Input tekstowy z walidacją inline | `label`, `errorMessage`, `value` |
| `SelectComponent`    | Dropdown (PrimeNG Dropdown)       | `options`, `value`               |
| `CheckboxComponent`  | Checkbox (PrimeNG Checkbox)       | `label`, `checked`               |

### 5.3 Komponenty meczu (reużywalne)

| Komponent                      | Opis                                                  | Użycie                            |
| ------------------------------ | ----------------------------------------------------- | --------------------------------- |
| `ScoreboardComponent`          | Wyświetlanie wyniku setowego, punktowego, serwującego | Mecz "W toku"                     |
| `SetTableComponent`            | Tabela setów z wynikami                               | "W toku", "Zakończony", publiczny |
| `TagSelectorComponent`         | Multi-select tagów jako chipy                         | Mecz "W toku"                     |
| `MatchHeaderComponent`         | Nagłówek z nazwami, datą, wynikiem                    | "Zakończony", publiczny           |
| `CoachNotesAccordionComponent` | Accordion z uwagami trenera                           | "Zakończony", publiczny           |
| `AiReportComponent`            | Sekcja raportu AI (pending/success/error)             | "Zakończony", publiczny           |

### 5.4 Komponenty dialogów (PrimeNG Dialog)

| Komponent                       | Opis                          | Trigger                    |
| ------------------------------- | ----------------------------- | -------------------------- |
| `DeleteMatchDialogComponent`    | Potwierdzenie usunięcia meczu | Ikona kosza na liście      |
| `FinishSetDialogComponent`      | Zakończenie seta z uwagami    | Przycisk "Zakończ set"     |
| `FinishMatchDialogComponent`    | Zakończenie meczu z uwagami   | Przycisk "Zakończ mecz"    |
| `ShareDialogComponent`          | Link publiczny do skopiowania | Przycisk "Udostępnij"      |
| `EditMatchDialogComponent`      | Edycja nazw zawodników        | Przycisk edycji danych     |
| `EditSetNotesDialogComponent`   | Edycja uwag do seta           | Przycisk edycji uwag seta  |
| `EditMatchNotesDialogComponent` | Edycja uwag do meczu          | Przycisk edycji uwag meczu |

### 5.5 Serwisy Angular

| Serwis                    | Opis                                    | Signals                       |
| ------------------------- | --------------------------------------- | ----------------------------- |
| `LoadingService`          | Zarządzanie globalnym stanem ładowania  | `isLoading: Signal<boolean>`  |
| `ThemeService`            | Zarządzanie dark/light mode             | `isDarkMode: Signal<boolean>` |
| `MatchStateService`       | Stan aktualnego meczu w widoku "W toku" | `match`, `currentSet`, `tags` |
| `CreateMatchStateService` | Dane wizarda (czyszczone po sukcesie)   | `step`, `formData`            |
| `ToastService`            | Wyświetlanie powiadomień                | -                             |

### 5.6 Interceptory HTTP

| Interceptor          | Opis                                                               |
| -------------------- | ------------------------------------------------------------------ |
| `LoadingInterceptor` | Ustawia `isLoading=true` przy request, `false` przy response       |
| `ErrorInterceptor`   | Przechwytuje błędy 4xx/5xx, wyświetla toast (oprócz 422 z details) |
| `AuthInterceptor`    | Dodaje token JWT do requestów (po implementacji auth)              |

---

## 6. Mapowanie User Stories do komponentów

| User Story                     | Widok             | Komponenty                                        |
| ------------------------------ | ----------------- | ------------------------------------------------- |
| US-001 Logowanie               | Landing Page      | `GoogleLoginButtonComponent`                      |
| US-002 Ochrona widoków         | Globalnie         | `AuthGuard`                                       |
| US-003 Wylogowanie             | Header            | `HeaderComponent`                                 |
| US-010 Strona startowa         | Landing Page      | `HeroSectionComponent`, `AppScreenshotComponent`  |
| US-020 Lista meczów            | Lista meczów      | `MatchListPageComponent`, `MatchCardComponent`    |
| US-021 Filtrowanie             | Lista meczów      | `MatchFilterComponent`                            |
| US-022 Usuwanie meczu          | Lista meczów      | `DeleteMatchDialogComponent`                      |
| US-023 Wejście do "W toku"     | Lista meczów      | `MatchCardComponent` (link)                       |
| US-024 Wejście do "Zakończony" | Lista meczów      | `MatchCardComponent` (link)                       |
| US-030 Tworzenie meczu         | Wizard            | `CreateMatchWizardComponent`, `Step1-3Components` |
| US-040 Przegląd stanu          | Mecz "W toku"     | `LiveMatchPageComponent`, `ScoreboardComponent`   |
| US-041 Punkt zawodnika         | Mecz "W toku"     | `PointButtonsComponent`                           |
| US-042 Punkt rywala            | Mecz "W toku"     | `PointButtonsComponent`                           |
| US-043 Tagi                    | Mecz "W toku"     | `TagSelectorComponent`                            |
| US-044 Serwujący               | Mecz "W toku"     | `ScoreboardComponent` (indicator)                 |
| US-045 Cofnięcie punktu        | Mecz "W toku"     | `MatchActionsComponent`                           |
| US-046 Zakończenie seta        | Mecz "W toku"     | `FinishSetDialogComponent`                        |
| US-047 Auto start seta         | Mecz "W toku"     | Logika w `MatchStateService`                      |
| US-048 Zakończenie meczu       | Mecz "W toku"     | `FinishMatchDialogComponent`                      |
| US-049 Przerwanie meczu        | Mecz "W toku"     | Przycisk "Powrót do listy"                        |
| US-050 Zachowanie stanu        | Mecz "W toku"     | API fetch przy inicjalizacji                      |
| US-060 Przegląd zakończonego   | Mecz "Zakończony" | `MatchSummaryPageComponent`                       |
| US-061 Edycja metadanych       | Mecz "Zakończony" | `EditMatchDialogComponent`                        |
| US-070 Publiczny link          | Mecz "Zakończony" | `ShareDialogComponent`                            |
| US-071 Podgląd publiczny       | Widok publiczny   | `PublicMatchPageComponent`                        |
| US-072 Nieważny link           | Strona błędu      | `ErrorPageComponent`                              |
| US-080 Raport AI               | Mecz "Zakończony" | `AiReportComponent`                               |
| US-081 Błąd AI                 | Mecz "Zakończony" | `AiReportComponent` (stan error)                  |
| US-082 Wyłączenie AI           | Wizard Krok 3     | `Step3OptionsComponent` (checkbox)                |
| US-100 Loader                  | Globalnie         | `LoadingOverlayComponent`                         |
| US-101 Błędy zapisu            | Globalnie         | `ToastComponent`, `ErrorInterceptor`              |
| US-110 Czas lokalny            | Wszystkie z datą  | Pipe `localDate`                                  |

---

## 7. Obsługa stanów i błędów

### 7.1 Stany ładowania

| Stan                       | Komponent                 | Zachowanie                |
| -------------------------- | ------------------------- | ------------------------- |
| Inicjalne ładowanie strony | Skeleton / Spinner        | Wyświetlenie przed danymi |
| Operacja API               | `LoadingOverlayComponent` | Blokada całego UI         |
| Ładowanie raportu AI       | `AiReportComponent`       | Spinner wewnątrz sekcji   |

### 7.2 Stany pustych danych

| Stan            | Widok             | Komunikat                                                        |
| --------------- | ----------------- | ---------------------------------------------------------------- |
| Brak meczów     | Lista meczów      | "Nie masz jeszcze żadnych meczów. Utwórz pierwszy mecz!"         |
| Brak raportu AI | Mecz "Zakończony" | "Raport AI w trakcie generowania..." lub "Raport AI niedostępny" |
| AI wyłączone    | Mecz "Zakończony" | Sekcja AI niewidoczna                                            |

### 7.3 Obsługa błędów HTTP

| Kod           | Typ          | Obsługa                                      |
| ------------- | ------------ | -------------------------------------------- |
| 401           | Unauthorized | Redirect do `/`, toast "Sesja wygasła"       |
| 403           | Forbidden    | Toast "Brak dostępu", redirect do `/matches` |
| 404           | Not Found    | Toast "Nie znaleziono" lub strona błędu      |
| 422           | Validation   | Przekazanie do komponentu, walidacja inline  |
| 500           | Server Error | Toast "Błąd serwera, spróbuj ponownie"       |
| Network Error | -            | Toast "Błąd połączenia"                      |

### 7.4 Edge cases meczu

| Sytuacja                                  | Zachowanie UI                        |
| ----------------------------------------- | ------------------------------------ |
| Wynik remisowy przy zakończeniu           | Przycisk disabled + tooltip          |
| Ostatni możliwy set                       | Przycisk "Zakończ set" disabled      |
| 10:10 w secie                             | Automatyczna zmiana trybu serwowania |
| Golden set                                | Serwowanie co 1 punkt (automatyczne) |
| Brak punktów w secie                      | Przycisk "Cofnij" disabled           |
| Mecz już zakończony przy wejściu na /live | Redirect do /summary                 |
| Mecz "W toku" przy wejściu na /summary    | Redirect do /live                    |

---

## 8. Responsywność

### 8.1 Breakpoints (TailwindCSS defaults)

| Breakpoint | Szerokość | Target           |
| ---------- | --------- | ---------------- |
| Mobile     | < 640px   | Smartfon pionowo |
| sm         | ≥ 640px   | Smartfon poziomo |
| md         | ≥ 768px   | Tablet           |
| lg         | ≥ 1024px  | Desktop          |

### 8.2 Adaptacje per widok

| Widok         | Mobile                           | Tablet                   | Desktop                  |
| ------------- | -------------------------------- | ------------------------ | ------------------------ |
| Lista meczów  | 1 kolumna kart                   | 2 kolumny kart           | 3 kolumny kart           |
| Wizard        | Fullwidth form                   | Max-width 480px centered | Max-width 480px centered |
| Mecz "W toku" | Single column, przyciski na dole | Side panels możliwe      | Side panels możliwe      |
| Tabela setów  | Horizontal scroll                | Pełna szerokość          | Pełna szerokość          |
| Tagi          | Grid 2 kolumny                   | Grid 3-4 kolumny         | Grid 3-4 kolumny         |

### 8.3 Touch targets

- Przyciski główne (+ point): min 60px wysokości
- Przyciski akcji: min 44px wysokości
- Karty meczów: cała powierzchnia klikalna
- Chipy tagów: min 40px wysokości

---

## 9. Motywy kolorystyczne

### 9.1 CSS Variables (globals.css)

```css
:root {
  /* Player (zawodnik oceniany) */
  --color-player: #3b82f6;
  --color-player-light: #93c5fd;

  /* Opponent (rywal) */
  --color-opponent: #f97316;
  --color-opponent-light: #fdba74;

  /* Serving indicator */
  --color-serving: #22c55e;

  /* CTA */
  --color-cta: #14b8a6;
  --color-cta-hover: #0d9488;

  /* Status */
  --color-in-progress: #fbbf24;
  --color-finished: #22c55e;

  /* Semantic */
  --color-error: #ef4444;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
}

[data-theme="dark"] {
  /* Adjusted for dark mode */
  --color-player: #60a5fa;
  --color-opponent: #fb923c;
  /* ... */
}
```

### 9.2 Użycie kolorów

| Element                | Kolor                 |
| ---------------------- | --------------------- |
| Przyciski +player      | `--color-player`      |
| Przyciski +opponent    | `--color-opponent`    |
| Indicator serwującego  | `--color-serving`     |
| Badge "W toku"         | `--color-in-progress` |
| Badge "Zakończony"     | `--color-finished`    |
| Przycisk "Utwórz mecz" | `--color-cta`         |
| Błędy walidacji        | `--color-error`       |

---

## 10. Podsumowanie kluczowych decyzji

1. **Jeden URL dla wizarda** - prostota, brak deep linking do kroków
2. **Pesymistyczne aktualizacje** - niezawodność, jeden źródło prawdy (backend)
3. **Angular Signals** - nowoczesna reaktywność, prostota vs RxJS
4. **Brak offline** - uproszczenie MVP, zawsze wymagane połączenie
5. **Walidacja na BE** - jeden punkt walidacji, błędy 422 inline
6. **Dark mode z przełącznikiem** - preferencje użytkownika
7. **Lustrzane odbicie scoreboard** - intuicyjne UX dla player/opponent
8. **Auto-reset tagów** - mniej kliknięć dla trenera
9. **Brak pollingu AI** - przycisk "Odśwież" na żądanie
10. **Token w URL dla publicznego widoku** - prostota, bezpieczeństwo przez entropię
