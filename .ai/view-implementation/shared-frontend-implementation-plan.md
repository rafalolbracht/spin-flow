# Plan implementacji współdzielonych elementów frontendowych

Ten dokument zawiera specyfikację elementów UI i serwisów współdzielonych między widokami aplikacji dla zalogowanych użytkowników:

- Lista meczów (`/matches`)
- Kreator meczu (`/matches/new`)
- Widok meczu na żywo (`/matches/{id}/live`)
- Podsumowanie meczu (`/matches/{id}/summary`)

## 1. Przegląd

Współdzielone elementy zapewniają spójność UX w całej aplikacji:

- **Nawigacja główna** - stały header z logo, menu, dark mode toggle i menu użytkownika
- **System powiadomień** - globalne Toast notifications
- **Zarządzanie motywem** - przełączanie dark/light mode z persystencją
- **Obsługa błędów HTTP** - centralny interceptor z komunikatami

## 2. Struktura plików

```
src/
├── components/
│   └── shared/
│       ├── app-navbar.component.ts        # Nawigacja główna
│       ├── app-navbar.types.ts            # Typy nawigacji
│       └── sets-history-table.component.ts # Tabela setów (live-match, match-summary)
├── lib/
│   ├── services/
│   │   └── theme.service.ts               # Serwis dark mode
│   └── interceptors/
│       └── http-error.interceptor.ts      # Obsługa błędów HTTP
└── app.config.ts                          # Konfiguracja PrimeNG
```

## 3. AppNavbarComponent

### 3.1 Opis

Komponent nawigacji głównej aplikacji, inspirowany wzorcem [PrimeBlocks Stacked Layout "Hover Borders"](https://primeblocks.org/application/stackedlayout). Jest komponentem współdzielonym między wszystkimi widokami aplikacji dla zalogowanych użytkowników.

### 3.2 Lokalizacja

`src/components/shared/app-navbar.component.ts`

### 3.3 Główne elementy

- Kontener nawigacji (flexbox, sticky top, z-index wysoki)
- **Lewa sekcja**:
  - Logo "Spin Flow" (tekst lub SVG) - klikalny link do `/matches`
- **Środkowa sekcja** (menu główne):
  - Element "Mecze" z efektem hover border (border-bottom przy hover i gdy aktywny)
  - Na razie tylko jeden element, ale struktura przygotowana na rozbudowę
  - Efekt "Hover Borders": `border-b-2 border-transparent hover:border-primary transition-colors`
- **Prawa sekcja**:
  - Przycisk Dark Mode Toggle (p-button icon-only)
    - Ikona `pi-sun` w trybie dark → przełącza na light
    - Ikona `pi-moon` w trybie light → przełącza na dark
  - User Menu:
    - `<p-avatar>` z ikoną `pi-user` i opcjonalnie inicjałami/imieniem użytkownika
    - `<p-menu>` popup z opcją "Wyloguj się" (pi-sign-out)

### 3.4 Obsługiwane interakcje

| Interakcja                       | Element               | Rezultat                                                                       |
| -------------------------------- | --------------------- | ------------------------------------------------------------------------------ |
| Kliknięcie logo "Spin Flow"      | Link/Button           | Router.navigate → `/matches`                                                   |
| Kliknięcie elementu menu "Mecze" | Link z hover border   | Router.navigate → `/matches` (jeśli już nie jesteśmy na tej stronie)           |
| Kliknięcie ikony słońca/księżyca | Button (icon-only)    | ThemeService.toggleDarkMode() → zmiana klasy na html → zapis do localStorage   |
| Kliknięcie Avatar użytkownika    | Avatar + Menu trigger | Otwarcie popup Menu z opcjami użytkownika                                      |
| Kliknięcie "Wyloguj się"         | MenuItem w Menu       | Wywołanie logout (placeholder, szczegóły auth w przyszłości) → redirect do `/` |

### 3.5 Propsy

| Prop           | Typ       | Opis                                         |
| -------------- | --------- | -------------------------------------------- |
| `userName`     | `string?` | Opcjonalna nazwa użytkownika do wyświetlenia |
| `userInitials` | `string?` | Inicjały użytkownika dla Avatar              |

### 3.6 Zależności PrimeNG

- `ButtonModule` - przycisk dark mode toggle
- `AvatarModule` - avatar użytkownika
- `MenuModule` - popup menu użytkownika
- `RippleModule` - efekt ripple na elementach menu
- `RouterModule` - nawigacja

### 3.7 Selector komponentu

`app-navbar`

### 3.8 Przykład użycia w komponencie strony

```typescript
@Component({
  selector: "app-match-list-page",
  standalone: true,
  imports: [AppNavbarComponent, ToastModule /* ... */],
  template: `
    <app-navbar
      [userName]="userName()"
      [userInitials]="userInitials()"
    ></app-navbar>
    <p-toast></p-toast>
    <main class="container mx-auto p-4">
      <!-- zawartość strony -->
    </main>
  `,
})
export class MatchListPageComponent {
  // dane użytkownika (w przyszłości z AuthService)
  userName = signal<string | undefined>(undefined);
  userInitials = signal<string | undefined>(undefined);
}
```

### 3.9 Wzorzec integracji z widokami

Każdy główny komponent strony (`*PageComponent`) powinien:

1. **Importować** `AppNavbarComponent` jako standalone w tablicy `imports`
2. **Umieszczać** `<app-navbar>` jako pierwszy element w template
3. **Przekazywać** dane użytkownika przez propsy (w przyszłości z AuthService)
4. **Zawierać** `<p-toast>` dla powiadomień (po navbar, przed main)
5. **Stosować** konwencję nazewnictwa `*PageComponent` dla głównych komponentów widoków

**Struktura template każdego widoku:**

```html
<app-navbar
  [userName]="userName()"
  [userInitials]="userInitials()"
></app-navbar>
<p-toast></p-toast>
<main class="container mx-auto p-4">
  <!-- specyficzna zawartość widoku -->
</main>
```

## 4. ThemeService

### 4.1 Opis

Serwis Angular zarządzający trybem kolorystycznym (dark/light mode). Przechowuje preferencje w localStorage i synchronizuje stan z DOM.

### 4.2 Lokalizacja

`src/lib/services/theme.service.ts`

### 4.3 API serwisu

| Element              | Typ               | Opis                           |
| -------------------- | ----------------- | ------------------------------ |
| `isDarkMode`         | `Signal<boolean>` | Aktualny stan trybu (readonly) |
| `toggleDarkMode()`   | `void`            | Przełączanie trybu             |
| `setDarkMode(value)` | `void`            | Ustawienie konkretnego trybu   |

### 4.4 Konfiguracja

- Klucz localStorage: `spin-flow-dark-mode`
- Klasa CSS na `<html>`: `.app-dark`
- Fallback: `window.matchMedia('(prefers-color-scheme: dark)')`

### 4.5 Integracja z PrimeNG

PrimeNG automatycznie wspiera dark mode przez CSS custom properties. Wystarczy dodać/usunąć klasę `.app-dark` na elemencie `<html>`.

### 4.6 Przepływ inicjalizacji

1. Przy starcie aplikacji ThemeService sprawdza localStorage
2. Jeśli brak wartości → sprawdza `prefers-color-scheme` systemu
3. Ustawia odpowiednią klasę na `document.documentElement`
4. Przy toggle → aktualizuje klasę + zapisuje do localStorage

## 5. SetsHistoryTable (komponent współdzielony)

### 5.1 Opis

Reużywalna tabela setów zbudowana z `p-table` (PrimeNG DataTable). Wyświetla listę setów z wynikami punktowymi. Komponent współdzielony między widokami:

- **Mecz "W toku"** (`/matches/{id}/live`) - z wyróżnieniem bieżącego seta
- **Mecz "Zakończony"** (`/matches/{id}/summary`) - bez wyróżnienia (wszystkie sety zakończone)

### 5.2 Lokalizacja

`src/components/shared/sets-history-table.component.ts`

### 5.3 Selector

`app-sets-history-table`

### 5.4 Propsy

| Prop           | Typ                       | Opis                                              |
| -------------- | ------------------------- | ------------------------------------------------- |
| `sets`         | `input<SetDetailDto[]>()` | Lista setów do wyświetlenia                       |
| `currentSetId` | `input<number \| null>()` | ID bieżącego seta do wyróżnienia (null w summary) |
| `playerName`   | `input<string>()`         | Nazwa zawodnika (nagłówek kolumny)                |
| `opponentName` | `input<string>()`         | Nazwa rywala (nagłówek kolumny)                   |

### 5.5 Główne elementy

- PrimeNG Table z opcjami: `size="small"`, `stripedRows`, `scrollable`
- Kolumny: Nr seta, Zawodnik (wynik), Rywal (wynik), Zwycięzca/Status
- Wyróżnienie bieżącego seta (inny kolor tła - np. klasa `bg-primary-50`)
- Kolumna zwycięzcy z PrimeNG Tag (success dla player, warn dla opponent)
- Responsive: horizontal scroll na małych ekranach

### 5.6 Zależności PrimeNG

- `TableModule` - tabela
- `TagModule` - badge zwycięzcy

## 6. Typy współdzielone

### 6.1 Lokalizacja

`src/components/shared/app-navbar.types.ts`

### 6.2 Definicje typów

```typescript
/**
 * Element menu nawigacji
 */
export interface NavMenuItem {
  label: string; // tekst wyświetlany
  routerLink: string; // ścieżka nawigacji
  icon?: string; // ikona PrimeIcons (opcjonalna)
  active?: boolean; // czy element jest aktywny (computed)
}

/**
 * Element menu użytkownika (popup)
 */
export interface UserMenuItem {
  label: string; // tekst wyświetlany
  icon: string; // ikona PrimeIcons
  command: () => void; // akcja do wykonania
  separator?: boolean; // czy dodać separator przed elementem
}
```

## 7. Konfiguracja PrimeNG

### 7.1 Dark Mode

W pliku `app.config.ts` należy skonfigurować:

```typescript
providePrimeNG({
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: ".app-dark",
    },
  },
});
```

### 7.2 Konfiguracja Tailwind CSS

W pliku `tailwind.config.js` należy ustawić:

```javascript
module.exports = {
  darkMode: ["selector", ".app-dark"],
  // ...
};
```

## 8. System powiadomień (Toast)

### 8.1 Konfiguracja

Każdy widok główny zawiera komponent `<p-toast>` na poziomie głównego komponentu strony.

### 8.2 Użycie

Serwis `MessageService` z PrimeNG jest wstrzykiwany do komponentów potrzebujących wyświetlać powiadomienia:

| Typ         | Severity  | Przykład użycia          |
| ----------- | --------- | ------------------------ |
| Sukces      | `success` | "Mecz został usunięty"   |
| Błąd        | `error`   | "Wystąpił błąd serwera"  |
| Ostrzeżenie | `warn`    | "Sesja wkrótce wygaśnie" |
| Info        | `info`    | "Dane zostały zapisane"  |

### 8.3 Czas wyświetlania

- Domyślny czas: 3000ms (3 sekundy)
- Błędy: 5000ms (5 sekund)
- Możliwość zamknięcia przez użytkownika (closable)

## 9. Obsługa błędów HTTP

### 9.1 Centralny interceptor

Zalecane utworzenie `httpErrorInterceptor` w `src/lib/interceptors/http-error.interceptor.ts` dla spójnej obsługi błędów we wszystkich widokach.

### 9.2 Mapowanie błędów HTTP

| Kod | Typ           | Obsługa w UI                                                        |
| --- | ------------- | ------------------------------------------------------------------- |
| 401 | Unauthorized  | Toast "Sesja wygasła. Zaloguj się ponownie." + Router.navigate('/') |
| 403 | Forbidden     | Toast "Brak dostępu do tego zasobu"                                 |
| 404 | Not Found     | Toast z kontekstowym komunikatem                                    |
| 422 | Validation    | Toast z komunikatem z response.error.message                        |
| 500 | Server Error  | Toast "Wystąpił błąd serwera. Spróbuj ponownie później."            |
| 0   | Network Error | Toast "Błąd połączenia. Sprawdź połączenie z internetem."           |

## 10. Stylowanie

### 10.1 Design Tokens PrimeNG

Używane klasy Tailwind zgodne z tokenami PrimeNG:

- Kolory tła: `surface-0`, `surface-50`, `surface-100`, `surface-ground`
- Kolory tekstu: `text-surface-900`, `text-surface-700`, `text-surface-500`
- Ramki: `border-surface-200`, `border-surface-300`
- Primary: `text-primary`, `bg-primary`, `border-primary`

### 10.2 Stylowanie nawigacji (PrimeBlocks "Hover Borders")

- Elementy menu z border-bottom przezroczystym
- Hover i aktywny stan z border-primary
- Płynne transicje CSS (transition-colors)
- Klasy: `border-b-2 border-transparent hover:border-primary transition-colors duration-200`

### 10.3 Dark Mode

- Automatyczna obsługa przez klasę `.app-dark` na `<html>`
- PrimeNG komponenty automatycznie reagują na zmianę
- Tailwind klasy dark:\* działają z selektorem `.app-dark`

## 11. Dostępność (a11y)

### 11.1 Nawigacja

- Logo z `aria-label="Spin Flow - strona główna"`
- Elementy menu z odpowiednim focus ring
- Menu użytkownika z focus trap

### 11.2 Dark Mode Toggle

- Przycisk z `aria-label` zmieniającym się w zależności od stanu:
  - "Przełącz na tryb jasny" (gdy dark mode aktywny)
  - "Przełącz na tryb ciemny" (gdy light mode aktywny)

### 11.3 Toast

- Powiadomienia z `role="alert"` (wbudowane w PrimeNG)
- Automatyczny focus management

## 12. Kroki implementacji

### Krok 1: Utworzenie ThemeService

1. Utworzenie pliku `src/lib/services/theme.service.ts`
2. Implementacja serwisu jako `providedIn: 'root'`
3. Zdefiniowanie signal `isDarkMode`
4. Implementacja inicjalizacji (localStorage + prefers-color-scheme)
5. Implementacja `toggleDarkMode()` i `setDarkMode()`

### Krok 2: Konfiguracja PrimeNG dla Dark Mode

1. W `app.config.ts` ustawienie `darkModeSelector: '.app-dark'`
2. Konfiguracja Tailwind CSS z `darkMode: ['selector', '.app-dark']`

### Krok 3: Utworzenie typów nawigacji

1. Utworzenie pliku `src/components/shared/app-navbar.types.ts`
2. Zdefiniowanie interfejsów `NavMenuItem` i `UserMenuItem`

### Krok 4: Implementacja AppNavbarComponent

1. Utworzenie pliku `src/components/shared/app-navbar.component.ts`
2. Standalone komponent z importami PrimeNG
3. Wstrzyknięcie Router i ThemeService
4. Implementacja template z trzema sekcjami
5. Stylowanie zgodne z PrimeBlocks "Hover Borders"

### Krok 5: Utworzenie HTTP Error Interceptor

1. Utworzenie pliku `src/lib/interceptors/http-error.interceptor.ts`
2. Implementacja mapowania błędów na komunikaty Toast
3. Rejestracja interceptora w `app.config.ts`

### Krok 6: Implementacja SetsHistoryTable

1. Utworzenie pliku `src/components/shared/sets-history-table.component.ts`
2. Standalone komponent z importami PrimeNG (TableModule, TagModule)
3. Implementacja propsów jako signals (`input<T>()`)
4. Stylowanie zgodne z design tokens PrimeNG

## 13. Przyszłe rozszerzenia

- Implementacja AuthGuard po ustaleniu szczegółów autentykacji
- Dodanie serwisu autentykacji (AuthService) i integracja z Supabase Auth (Google)
- Rozbudowa menu głównego o dodatkowe elementy (np. "Statystyki", "Ustawienia")
- Wyświetlanie prawdziwego imienia/avatara użytkownika z Supabase Auth
- Breadcrumbs dla głębszej nawigacji
- Notyfikacje w czasie rzeczywistym (WebSocket)
