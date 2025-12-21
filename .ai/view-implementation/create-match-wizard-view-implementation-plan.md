# Plan implementacji widoku Wizard tworzenia meczu

## 1. Przegląd

Widok "Wizard tworzenia meczu" to wieloetapowy formularz umożliwiający trenerowi utworzenie nowego meczu tenisa stołowego. Wykorzystuje komponent PrimeNG Stepper do prowadzenia użytkownika przez 3 kroki:

1. Wprowadzenie nazw zawodników (zawodnik oceniany i rywal)
2. Wybór pierwszego serwującego w pierwszym secie
3. Konfiguracja opcji zaawansowanych (maksymalna liczba setów, złoty set, podsumowanie AI)

Po pomyślnym utworzeniu meczu użytkownik jest automatycznie przekierowywany do widoku meczu "W toku" (`/matches/:id/live`), gdzie może rozpocząć rejestrację punktów.

Widok jest częścią aplikacji dla zalogowanych użytkowników i korzysta ze współdzielonych elementów:

- **AppNavbarComponent** - nawigacja główna z logo, menu, dark mode toggle i menu użytkownika
- **ThemeService** - zarządzanie trybem kolorystycznym (dark/light mode)
- **httpErrorInterceptor** - centralny interceptor do obsługi błędów HTTP
- **Design tokens PrimeNG** - spójne stylowanie z użyciem klas `surface-*`, `text-surface-*`, `border-surface-*`

## 2. Routing widoku

| Właściwość     | Opis                                                           |
| -------------- | -------------------------------------------------------------- |
| **Ścieżka**    | `/matches/new`                                                 |
| **Dostęp**     | Chroniony (wymaga autentykacji - w przyszłości AuthGuard)      |
| **Typ strony** | Dynamiczna strona Astro z osadzonym komponentem Angular        |
| **Layout**     | Zawiera AppNavbarComponent jako część layoutu dla zalogowanych |

## 3. Struktura komponentów

### 3.1 Struktura layoutu strony

```
Layout (Astro)
└── <slot />
    └── CreateMatchWizardPageComponent (Angular, client:only="angular")
        ├── AppNavbarComponent (współdzielony - sticky top)
        │   ├── Logo "Spin Flow" → /matches
        │   ├── Menu "Mecze" (hover borders)
        │   ├── Dark Mode Toggle (ThemeService)
        │   └── User Menu (Avatar + Wyloguj)
        ├── p-toast (powiadomienia)
        └── <main> (zawartość wizarda)
            └── p-stepper ...
```

### 3.2 Struktura wizarda (PrimeNG Stepper)

```
CreateMatchWizardPageComponent (główny kontener - standalone)
├── AppNavbarComponent (współdzielony)
├── p-toast (powiadomienia)
└── <main class="container mx-auto p-4">
    └── p-stepper (PrimeNG Stepper z linear=true)
        ├── p-step-list (nagłówki kroków)
        │   ├── p-step [value=1] "Zawodnicy"
        │   ├── p-step [value=2] "Serwujący"
        │   └── p-step [value=3] "Opcje"
        └── p-step-panels (panele z zawartością)
            ├── p-step-panel [value=1] - formularz nazw
            ├── p-step-panel [value=2] - wybór serwującego
            └── p-step-panel [value=3] - opcje zaawansowane
```

### 3.3 Hierarchia zależności

```
CreateMatchWizardPageComponent
    ├── importuje AppNavbarComponent (współdzielony)
    ├── używa PrimeNG StepperModule
    ├── używa Router (Angular)
    ├── używa MessageService (PrimeNG Toast) - wstrzykiwany
    ├── używa HttpClient (z httpErrorInterceptor)
    ├── korzysta z ThemeService (dark mode - automatyczne przez PrimeNG)
    ├── zarządza stanem formularza (Reactive Forms)
    └── używa design tokens PrimeNG (klasy surface-*, text-surface-*)
```

## 4. Szczegóły komponentów

### 4.1 CreateMatchWizardPageComponent

**Opis komponentu:**
Główny standalone komponent wizarda implementujący kompletny przepływ tworzenia meczu. Wykorzystuje PrimeNG Stepper z właściwością `linear=true` do wymuszenia sekwencyjnego przechodzenia przez kroki. Zarządza formularzami reaktywnymi, walidacją i komunikacją z API. Zawiera AppNavbarComponent jako współdzielony element nawigacji.

**Główne elementy:**

- `<app-navbar>` - współdzielony komponent nawigacji głównej
- `<p-toast position="top-center">` - komponent powiadomień (konfiguracja: 3s domyślnie, closable)
- `<main>` - kontener z klasami `container mx-auto p-4` dla zawartości
- `<p-stepper>` z `[linear]="true"` i `[(value)]="activeStep"` - główny kontener wizarda
- `<p-step-list>` z trzema `<p-step>` - nagłówki kroków z ikonami:
  - Krok 1: `pi-users` + "Zawodnicy"
  - Krok 2: `pi-flag` + "Serwujący"
  - Krok 3: `pi-cog` + "Opcje"
- `<p-step-panels>` z trzema `<p-step-panel>` - zawartość kroków
- Każdy panel zawiera template `#content` z `let-activateCallback`
- `<p-button>` do nawigacji (Wstecz/Dalej/Utwórz mecz)
- Overlay loading z `<p-progressSpinner>` podczas wysyłania do API

**Obsługiwane interakcje:**

- `activateCallback(n)` - przejście do kroku n (po walidacji)
- `onSubmit()` - utworzenie meczu (krok 3)
- Nawigacja między krokami przez przyciski w panelach

**Obsługiwana walidacja:**

- Przed przejściem do następnego kroku - walidacja formularza bieżącego kroku
- Przed wysłaniem - walidacja wszystkich kroków
- Przycisk "Dalej" / "Utwórz mecz" disabled gdy formularz bieżącego kroku jest nieprawidłowy

**Typy:**

- `CreateMatchFormModel` (FormGroup agregujący dane ze wszystkich kroków)
- `CreateMatchCommandDto` (request do API - z `types.ts`)
- `CreateMatchResponse` (odpowiedź z API - z `types.ts`)

**Propsy:**

- Brak (komponent główny, otrzymuje dane z API)

---

### 4.2 Krok 1: Panel nazw zawodników

**Opis:**
Zawartość pierwszego panelu steppera - formularz do wprowadzenia nazw zawodnika ocenianego i rywala. Wykorzystuje PrimeNG FloatLabel dla nowoczesnego UX.

**Główne elementy:**

- `<p-card>` jako kontener formularza z klasami `surface-card border-surface-200`
- Dwa pola `<p-floatlabel>` z `<input pInputText>`:
  - "Nazwa zawodnika ocenianego"
  - "Nazwa rywala"
- `<small>` z klasą `text-red-500` dla komunikatów błędów walidacji
- `<p-button>` "Dalej" z ikoną `pi-arrow-right`

**Obsługiwane interakcje:**

- Wprowadzanie tekstu w polach
- Blur - wyzwolenie walidacji touched
- Focus automatyczny na pierwszym polu przy wejściu
- Kliknięcie "Dalej" - walidacja i przejście do kroku 2

**Obsługiwana walidacja:**

- `player_name`: Validators.required, Validators.maxLength(200)
- `opponent_name`: Validators.required, Validators.maxLength(200)
- Komunikaty błędów:
  - "Nazwa zawodnika jest wymagana"
  - "Nazwa rywala jest wymagana"
  - "Maksymalnie 200 znaków"

**Typy:**

- Część `FormGroup` z polami `player_name` i `opponent_name`

---

### 4.3 Krok 2: Panel wyboru serwującego

**Opis:**
Zawartość drugiego panelu steppera - wybór pierwszego serwującego za pomocą PrimeNG SelectButton. Wyświetla dwa przyciski z imionami zawodników pobranymi z kroku 1.

**Główne elementy:**

- `<p-card>` jako kontener z nagłówkiem "Kto serwuje pierwszy?" (klasy `text-surface-900`)
- `<p-selectbutton>` z opcjami dynamicznymi:
  - Opcja 1: wartość `'player'`, label = wartość `player_name` z kroku 1
  - Opcja 2: wartość `'opponent'`, label = wartość `opponent_name` z kroku 1
- Custom template dla przycisków z większymi rozmiarami (min 60px wysokości)
- `<p-button>` "Wstecz" (severity="secondary", icon="pi-arrow-left")
- `<p-button>` "Dalej" (icon="pi-arrow-right")

**Obsługiwane interakcje:**

- Kliknięcie opcji SelectButton - wybór serwującego
- Kliknięcie "Wstecz" - powrót do kroku 1
- Kliknięcie "Dalej" - walidacja i przejście do kroku 3

**Obsługiwana walidacja:**

- `first_server_first_set`: Validators.required
- Komunikat błędu: "Wybierz pierwszego serwującego"

**Typy:**

- Pole `first_server_first_set` typu `SideEnum | null` w FormGroup

---

### 4.4 Krok 3: Panel opcji zaawansowanych

**Opis:**
Zawartość trzeciego panelu steppera - konfiguracja opcji meczu. Wszystkie pola mają wartości domyślne, więc formularz jest zawsze valid.

**Główne elementy:**

- `<p-card>` jako kontener z klasami surface-card
- `<p-floatlabel>` z `<p-select>` dla maksymalnej liczby setów:
  - Opcje: 1, 3, 5, 7 (domyślnie 5)
  - Etykieta: "Maksymalna liczba setów"
- `<p-toggleswitch>` dla "Złoty set" z labelem obok:
  - Domyślnie: wyłączony (false)
  - Opis pomocniczy (klasa `text-surface-500`): "Dodatkowy set przy remisie"
- `<p-toggleswitch>` dla "Podsumowanie AI":
  - Domyślnie: włączony (true)
  - Opis pomocniczy: "Wygeneruj analizę po meczu"
- `<p-button>` "Wstecz" (severity="secondary")
- `<p-button>` "Utwórz mecz" (severity="success", icon="pi-check", loading podczas wysyłania)

**Obsługiwane interakcje:**

- Wybór liczby setów z dropdown
- Toggle switch dla opcji boolowskich
- Kliknięcie "Wstecz" - powrót do kroku 2
- Kliknięcie "Utwórz mecz" - wysłanie do API

**Obsługiwana walidacja:**

- `max_sets`: Validators.required (zawsze spełnione przez domyślną wartość)
- `golden_set_enabled`: bez walidacji (boolean)
- `generate_ai_summary`: bez walidacji (boolean)
- Formularz zawsze valid dzięki wartościom domyślnym

**Typy:**

- Pola `max_sets`, `golden_set_enabled`, `generate_ai_summary` w FormGroup

## 5. Typy

### 5.1 Typy istniejące (z types.ts)

```typescript
// Enum dla strony (zawodnik/rywal)
type SideEnum = "player" | "opponent";

// Command DTO dla tworzenia meczu (request body)
interface CreateMatchCommandDto {
  player_name: string;
  opponent_name: string;
  max_sets: number;
  golden_set_enabled: boolean;
  first_server_first_set: SideEnum;
  generate_ai_summary: boolean;
}

// DTO dla odpowiedzi po utworzeniu meczu
interface CreateMatchDto extends MatchDetailDto {
  current_set: CurrentSetDto;
}

// Response wrapper
type CreateMatchResponse = SingleItemResponseDto<CreateMatchDto>;
```

### 5.2 Nowe typy ViewModel (do utworzenia w komponencie)

```typescript
// Opcja dla dropdownu liczby setów
interface MaxSetsOption {
  label: string;
  value: number;
}

// Opcja dla SelectButton serwującego
interface ServerOption {
  label: string;
  value: SideEnum;
}

// Typ dla stanu komponentu
interface WizardState {
  activeStep: number;
  isSubmitting: boolean;
}
```

### 5.3 FormGroup Model

FormGroup z trzema grupami kontrolek odpowiadającymi krokom wizarda:

```typescript
interface CreateMatchFormModel {
  // Krok 1
  player_name: FormControl<string>;
  opponent_name: FormControl<string>;
  // Krok 2
  first_server_first_set: FormControl<SideEnum | null>;
  // Krok 3
  max_sets: FormControl<number>;
  golden_set_enabled: FormControl<boolean>;
  generate_ai_summary: FormControl<boolean>;
}
```

## 6. Zarządzanie stanem

### 6.1 Stan lokalny komponentu

Komponent używa lokalnego stanu opartego na Angular Signals:

```typescript
// Aktywny krok steppera (1-3)
activeStep = signal<number>(1);

// Stan wysyłania do API
isSubmitting = signal<boolean>(false);

// Reactive Form z wszystkimi polami
form: FormGroup<CreateMatchFormModel>;

// Dane użytkownika (w przyszłości z AuthService)
userName = signal<string | undefined>(undefined);
userInitials = signal<string | undefined>(undefined);
```

### 6.2 Inicjalizacja formularza

FormGroup inicjalizowany z wartościami domyślnymi:

- `player_name`: '' (puste)
- `opponent_name`: '' (puste)
- `first_server_first_set`: null (wymaga wyboru)
- `max_sets`: 5 (domyślnie)
- `golden_set_enabled`: false (domyślnie)
- `generate_ai_summary`: true (domyślnie)

### 6.3 Walidacja per krok

Komponent implementuje metody do walidacji poszczególnych kroków:

- `isStep1Valid()`: sprawdza `player_name` i `opponent_name`
- `isStep2Valid()`: sprawdza `first_server_first_set`
- `isStep3Valid()`: zawsze true (wartości domyślne)

### 6.4 Computed signals

```typescript
// Dynamiczne opcje dla SelectButton serwującego
serverOptions = computed(() => [
  {
    label: this.form.get("player_name")?.value || "Zawodnik",
    value: "player" as SideEnum,
  },
  {
    label: this.form.get("opponent_name")?.value || "Rywal",
    value: "opponent" as SideEnum,
  },
]);

// Czy można przejść do następnego kroku
canProceedFromStep1 = computed(() => this.isStep1Valid());
canProceedFromStep2 = computed(() => this.isStep2Valid());
```

### 6.5 Integracja z ThemeService

Komponent korzysta automatycznie z dark mode poprzez:

- Konfigurację PrimeNG z `darkModeSelector: '.app-dark'`
- Użycie design tokens PrimeNG (klasy `surface-*`, `text-surface-*`)
- Tailwind CSS z `darkMode: ['selector', '.app-dark']`

Klasa `.app-dark` jest zarządzana przez `ThemeService` (współdzielony serwis) na elemencie `<html>`.

## 7. Integracja API

### 7.1 Endpoint

| Właściwość       | Wartość                            |
| ---------------- | ---------------------------------- |
| **Metoda**       | POST                               |
| **URL**          | `/api/matches/create`              |
| **Autoryzacja**  | Bearer token (JWT) - w przyszłości |
| **Content-Type** | application/json                   |

### 7.2 Request

Typ: `CreateMatchCommandDto`

```json
{
  "player_name": "Jan Kowalski",
  "opponent_name": "Adam Nowak",
  "max_sets": 5,
  "golden_set_enabled": false,
  "first_server_first_set": "player",
  "generate_ai_summary": true
}
```

### 7.3 Response (201 Created)

Typ: `CreateMatchResponse`

```json
{
  "data": {
    "id": 124,
    "player_name": "Jan Kowalski",
    "opponent_name": "Adam Nowak",
    "max_sets": 5,
    "golden_set_enabled": false,
    "first_server_first_set": "player",
    "generate_ai_summary": true,
    "sets_won_player": 0,
    "sets_won_opponent": 0,
    "status": "in_progress",
    "coach_notes": null,
    "started_at": "2024-01-15T14:30:00Z",
    "ended_at": null,
    "created_at": "2024-01-15T14:30:00Z",
    "current_set": {
      "id": 456,
      "sequence_in_match": 1,
      "is_golden": false,
      "set_score_player": 0,
      "set_score_opponent": 0,
      "is_finished": false,
      "current_server": "player"
    }
  }
}
```

### 7.4 Wywołanie API

Komponent używa Angular HttpClient z automatycznym przechwytywaniem błędów przez `httpErrorInterceptor`:

```typescript
// W metodzie onSubmit()
this.http.post<CreateMatchResponse>("/api/matches/create", command).subscribe({
  next: (response) => {
    this.router.navigate(["/matches", response.data.id, "live"]);
  },
  error: (error) => {
    // Obsługa specyficznych błędów (422 z detalami)
    // Pozostałe błędy obsługiwane przez httpErrorInterceptor
    this.handleValidationError(error);
  },
});
```

## 8. Interakcje użytkownika

### 8.1 Nawigacja między krokami

| Akcja                        | Zachowanie                                                        |
| ---------------------------- | ----------------------------------------------------------------- |
| Klik "Dalej" (krok 1 → 2)    | Walidacja nazw, jeśli valid → `activateCallback(2)`               |
| Klik "Dalej" (krok 2 → 3)    | Walidacja wyboru serwującego, jeśli valid → `activateCallback(3)` |
| Klik "Wstecz" (dowolny krok) | `activateCallback(poprzedni_krok)`, zachowanie danych             |
| Klik "Utwórz mecz"           | Walidacja wszystkich kroków, wysłanie requestu, redirect          |

### 8.2 Obsługa formularzy

| Akcja                        | Zachowanie                                   |
| ---------------------------- | -------------------------------------------- |
| Wprowadzenie tekstu w pole   | Aktualizacja FormControl, walidacja          |
| Blur na polu                 | Oznaczenie jako touched, pokazanie błędów    |
| Wybór w SelectButton         | Ustawienie wartości `first_server_first_set` |
| Zmiana w Select/ToggleSwitch | Aktualizacja odpowiedniego FormControl       |

### 8.3 Nawigacja główna (AppNavbarComponent)

| Akcja                      | Zachowanie                    |
| -------------------------- | ----------------------------- |
| Klik logo "Spin Flow"      | Router.navigate → `/matches`  |
| Klik "Mecze" w menu        | Router.navigate → `/matches`  |
| Klik ikony słońca/księżyca | ThemeService.toggleDarkMode() |
| Klik Avatar użytkownika    | Otwarcie popup Menu           |
| Klik "Wyloguj się"         | Wylogowanie + redirect do `/` |

### 8.4 Zachowanie przy błędach

| Akcja                            | Zachowanie                                                     |
| -------------------------------- | -------------------------------------------------------------- |
| Walidacja frontend nieprawidłowa | Przycisk "Dalej"/"Utwórz mecz" disabled, błędy inline          |
| Błąd walidacji API (422)         | Toast z komunikatem błędu (5s)                                 |
| Błąd sieci                       | Toast "Błąd połączenia. Sprawdź połączenie z internetem." (5s) |
| Błąd serwera (500)               | Toast "Wystąpił błąd serwera. Spróbuj ponownie później." (5s)  |
| Odświeżenie strony (F5)          | Utrata danych formularza (brak sessionStorage)                 |

## 9. Warunki i walidacja

### 9.1 Walidacja po stronie frontendu

| Pole                     | Walidatory               | Komunikat błędu                                            |
| ------------------------ | ------------------------ | ---------------------------------------------------------- |
| `player_name`            | required, maxLength(200) | "Nazwa zawodnika jest wymagana" / "Maksymalnie 200 znaków" |
| `opponent_name`          | required, maxLength(200) | "Nazwa rywala jest wymagana" / "Maksymalnie 200 znaków"    |
| `first_server_first_set` | required                 | "Wybierz pierwszego serwującego"                           |
| `max_sets`               | required                 | (dropdown - zawsze prawidłowy)                             |
| `golden_set_enabled`     | brak                     | (toggle - zawsze prawidłowy)                               |
| `generate_ai_summary`    | brak                     | (toggle - zawsze prawidłowy)                               |

### 9.2 Walidacja po stronie backendu (422)

Backend wykonuje identyczną walidację. W przypadku błędów 422 frontend otrzymuje:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "player_name", "message": "Player name is required" },
      { "field": "max_sets", "message": "Max sets must be between 1 and 7" }
    ]
  }
}
```

### 9.3 Wpływ walidacji na UI

| Stan                              | Efekt UI                                                       |
| --------------------------------- | -------------------------------------------------------------- |
| Formularz kroku nieprawidłowy     | Przycisk "Dalej" / "Utwórz mecz" disabled                      |
| Pole z błędem (touched + invalid) | Klasa `ng-invalid`, czerwona ramka, komunikat pod polem        |
| Wszystkie kroki prawidłowe        | Przycisk "Utwórz mecz" aktywny                                 |
| Podczas wysyłania                 | Przycisk "Utwórz mecz" z `[loading]="true"`, wszystko disabled |

## 10. Obsługa błędów

### 10.1 Centralny httpErrorInterceptor

Widok korzysta z centralnego interceptora błędów HTTP (`src/lib/interceptors/http-error.interceptor.ts`) zgodnie z `shared-frontend-implementation-plan.md`:

| Kod | Typ           | Obsługa w UI                                                        |
| --- | ------------- | ------------------------------------------------------------------- |
| 401 | Unauthorized  | Toast "Sesja wygasła. Zaloguj się ponownie." + Router.navigate('/') |
| 403 | Forbidden     | Toast "Brak dostępu do tego zasobu"                                 |
| 404 | Not Found     | Toast z kontekstowym komunikatem                                    |
| 422 | Validation    | Przekazanie do komponentu (nie przechwytywane przez interceptor)    |
| 500 | Server Error  | Toast "Wystąpił błąd serwera. Spróbuj ponownie później."            |
| 0   | Network Error | Toast "Błąd połączenia. Sprawdź połączenie z internetem."           |

### 10.2 Obsługa błędów 422 w komponencie

Błędy walidacji (422) są obsługiwane bezpośrednio w komponencie, aby wyświetlić szczegółowe komunikaty:

1. Przechwycenie błędu w subscribe error callback
2. Sprawdzenie czy error.status === 422
3. Wyświetlenie Toast z error.error.message (czas: 5000ms)
4. Opcjonalnie: mapowanie error.error.details na pola formularza

### 10.3 Konfiguracja Toast

Zgodnie z `shared-frontend-implementation-plan.md`:

- Domyślny czas wyświetlania: 3000ms (3 sekundy)
- Błędy (severity="error"): 5000ms (5 sekund)
- Możliwość zamknięcia przez użytkownika (closable: true)

## 11. Kroki implementacji

### Faza 0: Wymagania wstępne

Przed implementacją widoku należy upewnić się, że zaimplementowane są współdzielone elementy z `shared-frontend-implementation-plan.md`:

- [ ] ThemeService (`src/lib/services/theme.service.ts`)
- [ ] AppNavbarComponent (`src/components/shared/app-navbar.component.ts`)
- [ ] httpErrorInterceptor (`src/lib/interceptors/http-error.interceptor.ts`)
- [ ] Konfiguracja PrimeNG z `darkModeSelector: '.app-dark'` (`app.config.ts`)
- [ ] Konfiguracja Tailwind z `darkMode: ['selector', '.app-dark']`

### Faza 1: Przygotowanie struktury (1h)

1. **Utworzenie strony Astro**
   - Plik: `src/pages/matches/new.astro`
   - Import layoutu bazowego
   - Osadzenie głównego komponentu Angular: `<app-create-match-wizard-page client:only="angular">`

2. **Utworzenie struktury plików Angular**
   ```
   src/components/create-match-wizard/
   └── create-match-wizard-page.component.ts (standalone, z inline template i styles)
   ```

### Faza 2: Implementacja komponentu (3h)

3. **Utworzenie CreateMatchWizardPageComponent**
   - Standalone component z importami:
     - `AppNavbarComponent` (współdzielony)
     - `StepperModule` (PrimeNG)
     - `ButtonModule` (PrimeNG)
     - `InputTextModule` (PrimeNG)
     - `FloatLabelModule` (PrimeNG)
     - `SelectButtonModule` (PrimeNG)
     - `SelectModule` (PrimeNG)
     - `ToggleSwitchModule` (PrimeNG)
     - `CardModule` (PrimeNG)
     - `ToastModule` (PrimeNG)
     - `ProgressSpinnerModule` (PrimeNG)
     - `ReactiveFormsModule` (Angular)
     - `CommonModule` (Angular)
   - Inject: `HttpClient`, `Router`, `MessageService`
   - Definicja FormGroup z walidatorami
   - Implementacja computed signals dla opcji serwującego
   - Metody walidacji per krok

4. **Implementacja template**
   - `<app-navbar>` jako pierwszy element
   - `<p-toast position="top-center">`
   - `<main class="container mx-auto p-4">` - kontener zawartości
   - `<p-stepper [linear]="true" [(value)]="activeStep()">`
   - Trzy `<p-step>` z ikonami i labelami
   - Trzy `<p-step-panel>` z templatem `#content`

5. **Implementacja zawartości kroków**
   - Krok 1: Card z dwoma FloatLabel + InputText
   - Krok 2: Card z SelectButton (dynamiczne opcje)
   - Krok 3: Card z Select + 2x ToggleSwitch
   - Użycie klas design tokens: `surface-card`, `text-surface-900`, `text-surface-500`, `border-surface-200`

### Faza 3: Integracja API (1.5h)

6. **Implementacja wywołania API**
   - Metoda `getCommandDto()` mapująca formularz na `CreateMatchCommandDto`
   - Metoda `onSubmit()` z wywołaniem POST
   - Obsługa sukcesu (redirect do `/matches/:id/live`)
   - Obsługa błędów 422 (Toast z MessageService)
   - Pozostałe błędy obsługiwane przez httpErrorInterceptor

7. **Obsługa stanów loading**
   - Signal `isSubmitting` dla stanu wysyłania
   - `[loading]="isSubmitting()"` na przycisku submit
   - `[disabled]="isSubmitting()"` na wszystkich kontrolkach podczas wysyłania

### Faza 4: Stylowanie i UX (1.5h)

8. **Stylowanie z design tokens PrimeNG**
   - Mobile-first layout (max-width: 32rem centered)
   - Użycie klas `surface-ground`, `surface-card`, `surface-0`
   - Kolory tekstu: `text-surface-900`, `text-surface-700`, `text-surface-500`
   - Ramki: `border-surface-200`, `border-surface-300`
   - Primary: `text-primary`, `bg-primary`, `border-primary`
   - Responsywność - dostosowanie dla tablet/desktop
   - Duże touch targets (min 44px, przyciski główne 48-60px)

9. **Dostępność (a11y)**
   - Focus automatyczny na pierwszym polu każdego kroku
   - `aria-label` dla przycisków nawigacji
   - `aria-describedby` dla pól z błędami
   - Prawidłowa kolejność tabowania
   - Focus ring na elementach interaktywnych

### Faza 5: Integracja i testy (1h)

10. **Integracja z Astro**
    - Rejestracja komponentu w Angular
    - Konfiguracja routingu Astro
    - Test przepływu Astro → Angular

11. **Testy manualne**
    - Przepływ przez wszystkie kroki
    - Walidacja formularzy (valid/invalid states)
    - Obsługa błędów API (mock 422, 500)
    - Responsywność (mobile, tablet, desktop)
    - Dark mode (przełączanie motywu przez AppNavbar)
    - Nawigacja (logo, menu, wylogowanie)

### Podsumowanie czasowe

| Faza                                           | Czas    |
| ---------------------------------------------- | ------- |
| Wymagania wstępne (jeśli nie zaimplementowane) | zależne |
| Przygotowanie struktury                        | 1h      |
| Implementacja komponentu                       | 3h      |
| Integracja API                                 | 1.5h    |
| Stylowanie i UX                                | 1.5h    |
| Integracja i testy                             | 1h      |
| **RAZEM**                                      | **~8h** |

## 12. Komponenty PrimeNG wykorzystywane w widoku

| Komponent                             | Moduł                 | Użycie                  |
| ------------------------------------- | --------------------- | ----------------------- |
| Stepper                               | StepperModule         | Główny kontener wizarda |
| Step, StepList, StepPanel, StepPanels | StepperModule         | Elementy steppera       |
| Button                                | ButtonModule          | Przyciski nawigacji     |
| InputText                             | InputTextModule       | Pola tekstowe           |
| FloatLabel                            | FloatLabelModule      | Etykiety unoszące się   |
| SelectButton                          | SelectButtonModule    | Wybór serwującego       |
| Select                                | SelectModule          | Dropdown liczby setów   |
| ToggleSwitch                          | ToggleSwitchModule    | Opcje boolean           |
| Card                                  | CardModule            | Kontener dla formularzy |
| Toast                                 | ToastModule           | Powiadomienia           |
| ProgressSpinner                       | ProgressSpinnerModule | Loading overlay         |

### Komponenty współdzielone (z shared-frontend-implementation-plan)

| Komponent            | Lokalizacja              | Użycie w widoku                         |
| -------------------- | ------------------------ | --------------------------------------- |
| AppNavbarComponent   | `src/components/shared/` | Nawigacja główna (w layout Astro)       |
| ThemeService         | `src/lib/services/`      | Dark mode (automatycznie przez PrimeNG) |
| httpErrorInterceptor | `src/lib/interceptors/`  | Obsługa błędów HTTP                     |

## 13. Stylowanie - Design Tokens PrimeNG

### 13.1 Klasy tła

- `surface-ground` - tło strony
- `surface-card` - tło karty/panelu
- `surface-0` - najjaśniejsze tło
- `surface-50`, `surface-100` - jasne tła

### 13.2 Klasy tekstu

- `text-surface-900` - tekst główny
- `text-surface-700` - tekst drugorzędny
- `text-surface-500` - tekst pomocniczy/placeholder
- `text-primary` - tekst akcentowy

### 13.3 Klasy ramek

- `border-surface-200` - jasna ramka
- `border-surface-300` - średnia ramka
- `border-primary` - ramka akcentowa

### 13.4 Dark Mode

Wszystkie powyższe klasy automatycznie dostosowują się do dark mode dzięki:

- Konfiguracji PrimeNG: `darkModeSelector: '.app-dark'`
- Konfiguracji Tailwind: `darkMode: ['selector', '.app-dark']`
- ThemeService zarządzającemu klasą `.app-dark` na `<html>`

## 14. Uwagi dotyczące autentykacji

Obecnie widok nie implementuje pełnego mechanizmu autentykacji. W przyszłości zostanie dodany:

- AuthGuard na poziomie routingu Astro lub Angular
- Przekierowanie na stronę logowania dla niezalogowanych użytkowników
- Przekazywanie tokenu JWT w nagłówku Authorization do API
- Integracja z Supabase Auth (Google)

Elementy już przygotowane w `shared-frontend-implementation-plan.md`:

- AppNavbarComponent z przyciskiem "Wyloguj się" (placeholder)
- httpErrorInterceptor z obsługą błędu 401 (redirect do `/`)
