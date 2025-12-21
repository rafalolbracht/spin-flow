# Plan implementacji widoku Lista meczów

> **Uwaga**: Ten widok korzysta ze współdzielonych elementów frontendowych opisanych w [shared-frontend-implementation-plan.md](./shared-frontend-implementation-plan.md):
>
> - AppNavbarComponent (nawigacja główna)
> - ThemeService (dark mode)
> - System powiadomień Toast
> - Obsługa błędów HTTP

## 1. Przegląd

Widok Lista meczów (`/matches`) jest głównym ekranem aplikacji dla zalogowanych użytkowników. Umożliwia przegląd, filtrowanie, nawigację i zarządzanie wszystkimi meczami danego trenera.

Kluczowe funkcje:

- Wyświetlanie listy meczów w responsywnym layoucie (grid/list) z wykorzystaniem PrimeNG DataView
- Filtrowanie po nazwie zawodnika ocenianego i rywala z debounce
- Paginacja wyników (server-side)
- Usuwanie pojedynczych meczów z potwierdzeniem (PrimeNG ConfirmDialog)
- Nawigacja do szczegółów meczu (różna ścieżka w zależności od statusu)
- Przycisk tworzenia nowego meczu

Widok jest chroniony i wymaga autentykacji. Niezalogowani użytkownicy są przekierowywani na landing page. Szczegóły implementacji autentykacji (AuthGuard, serwis autentykacji) zostaną określone w przyszłości.

## 2. Routing widoku

| Właściwość     | Wartość                         |
| -------------- | ------------------------------- |
| Ścieżka        | `/matches`                      |
| Plik           | `src/pages/matches/index.astro` |
| Dostęp         | Chroniony (wymaga autentykacji) |
| Przekierowanie | Niezalogowani użytkownicy → `/` |

## 3. Struktura komponentów

Widok wykorzystuje maksymalnie komponenty z ekosystemu PrimeNG, minimalizując liczbę customowych komponentów. Nawigacja jest inspirowana wzorcem [PrimeBlocks Stacked Layout "Hover Borders"](https://primeblocks.org/application/stackedlayout).

```
matches/index.astro (Astro Page)
├── Layout.astro
│   └── <slot />
│       └── MatchListPageComponent (Angular, client:only="angular", selector: app-match-list-page)
│           ├── AppNavbarComponent (selector: app-navbar) - nawigacja główna (współdzielona)
│           │   ├── Logo "Spin Flow" (lewy obszar)
│           │   ├── Menu główne (środkowy obszar)
│           │   │   └── MenuItem "Mecze" (aktywny, z hover border effect)
│           │   └── Prawy obszar
│           │       ├── Dark Mode Toggle (ikony pi-sun / pi-moon)
│           │       └── User Menu (Avatar + Menu popup)
│           │
│           ├── [PrimeNG Toast] - globalne powiadomienia
│           ├── [PrimeNG ConfirmDialog] - potwierdzenie usunięcia
│           │
│           ├── <main> - kontener zawartości
│           │   ├── PageHeader (sekcja nagłówka strony)
│           │   │   ├── Tytuł strony "Moje mecze"
│           │   │   └── [PrimeNG Button] "Nowy mecz" (severity="primary", icon="pi-plus")
│           │   │
│           │   ├── FilterSection (sekcja filtrów)
│           │   │   ├── [PrimeNG IconField + InputText] - filtr "Zawodnik"
│           │   │   ├── [PrimeNG IconField + InputText] - filtr "Rywal"
│           │   │   └── [PrimeNG Button] "Wyczyść" (outlined, widoczny gdy aktywne filtry)
│           │   │
│           │   ├── [PrimeNG DataView] - główna lista meczów
│           │   │   ├── ng-template #list - responsywny grid kart meczów
│           │   │   │   └── MatchCard (dla każdego meczu)
│           │   │   │       ├── [PrimeNG Tag] - badge statusu
│           │   │   │       ├── Nazwy zawodników (player vs opponent)
│           │   │   │       ├── Wynik setowy
│           │   │   │       ├── Data rozpoczęcia (sformatowana lokalnie)
│           │   │   │       └── [PrimeNG Button] - ikona usunięcia (icon-only, severity="danger")
│           │   │   │
│           │   │   ├── ng-template #empty - EmptyState
│           │   │   │   ├── Ikona (pi-inbox)
│           │   │   │   ├── Komunikat "Nie masz jeszcze żadnych meczów"
│           │   │   │   └── [PrimeNG Button] "Utwórz pierwszy mecz"
│           │   │   │
│           │   │   └── ng-template #loading - SkeletonCards
│           │   │       └── [PrimeNG Skeleton] × 6 (symulacja kart)
│           │   │
│           │   └── [PrimeNG Paginator] - paginacja (zewnętrzna, server-side)
```

## 4. Szczegóły komponentów

### 4.1 Elementy współdzielone

Widok korzysta z następujących współdzielonych elementów opisanych w [shared-frontend-implementation-plan.md](./shared-frontend-implementation-plan.md):

| Element                    | Opis                                                               |
| -------------------------- | ------------------------------------------------------------------ |
| `AppNavbarComponent`       | Nawigacja główna z logo, menu, dark mode toggle i menu użytkownika |
| `ThemeService`             | Serwis zarządzający trybem dark/light mode                         |
| `Toast` + `MessageService` | System powiadomień                                                 |
| HTTP Error Interceptor     | Centralna obsługa błędów API                                       |

### 4.2 MatchListPageComponent

- **Opis**: Główny komponent strony listy meczów. Zarządza stanem widoku (filtry, paginacja, loading), pobiera dane z API, obsługuje usuwanie meczów i nawigację. Zawiera AppNavbarComponent jako współdzielony element nawigacji zgodnie ze wzorcem z [shared-frontend-implementation-plan.md](./shared-frontend-implementation-plan.md#39-wzorzec-integracji-z-widokami).

- **Selector**: `app-match-list-page`

- **Główne elementy** (zgodnie ze wzorcem shared-frontend):
  - `<app-navbar>` - komponent nawigacji głównej (współdzielony)
  - `<p-toast>` - globalny komponent powiadomień PrimeNG
  - `<p-confirmDialog>` - dialog potwierdzenia usunięcia
  - `<main>` - kontener zawartości strony z klasami `container mx-auto p-4`
    - Sekcja nagłówka z tytułem i przyciskiem "Nowy mecz"
    - Sekcja filtrów z dwoma polami tekstowymi (IconField + InputText)
    - `<p-dataView>` - główny komponent listy z trzema template'ami
    - `<p-paginator>` - zewnętrzny paginator (server-side pagination)

- **Obsługiwane interakcje**:
  - `onFilterChange()` - zmiana wartości filtrów (z debounce 300ms)
  - `onClearFilters()` - wyczyszczenie wszystkich filtrów
  - `onPageChange(event: PaginatorState)` - zmiana strony/liczby elementów
  - `onMatchClick(match: MatchListItemDto)` - nawigacja do szczegółów meczu
  - `onDeleteClick(event: Event, match: MatchListItemDto)` - otwarcie dialogu potwierdzenia
  - `onNewMatchClick()` - nawigacja do tworzenia meczu

- **Obsługiwana walidacja**: Brak walidacji formularzy - filtry akceptują dowolny tekst

- **Typy**:
  - `MatchListItemDto` - pojedynczy mecz z API
  - `MatchListFilters` - stan filtrów (ViewModel)
  - `MatchListState` - pełny stan widoku (ViewModel)

- **Propsy**: Brak (komponent główny strony)

- **Zależności PrimeNG**:
  - `DataViewModule` - wyświetlanie listy
  - `ButtonModule` - przyciski akcji
  - `TagModule` - badge statusu
  - `InputTextModule` - pola filtrów
  - `IconFieldModule`, `InputIconModule` - ikony w polach
  - `PaginatorModule` - paginacja
  - `ConfirmDialogModule` - dialog usunięcia
  - `ToastModule` - powiadomienia
  - `SkeletonModule` - stan ładowania
  - `RippleModule` - efekt ripple na kartach

### 4.3 MatchCard (template w DataView)

- **Opis**: Template dla pojedynczej karty meczu wewnątrz DataView. Nie jest osobnym komponentem Angular - to ng-template renderowany przez DataView dla każdego elementu.

- **Główne elementy** (w ramach ng-template #list):
  - `<article>` - klikalna karta meczu z efektem hover i ripple
  - `<p-tag>` - badge statusu meczu:
    - "W toku" → `severity="warn"` (żółty)
    - "Zakończony" → `severity="success"` (zielony)
  - Sekcja zawodników: nazwa zawodnika ocenianego vs nazwa rywala
  - Wynik setowy w formacie "X : Y" (sets_won_player : sets_won_opponent)
  - Data i godzina rozpoczęcia (sformatowana przez DatePipe z locale 'pl-PL')
  - `<p-button>` - przycisk usunięcia (icon="pi pi-trash", severity="danger", text=true)

- **Obsługiwane interakcje**:
  - Kliknięcie karty → nawigacja do `/matches/{id}/live` lub `/matches/{id}/summary`
  - Kliknięcie ikony kosza → wywołanie ConfirmationService (stopPropagation)

- **Stylowanie**:
  - Responsywny grid: 1 kolumna (mobile), 2 kolumny (tablet md), 3 kolumny (desktop lg)
  - Hover effect z cieniem i lekkim przesunięciem
  - Tailwind klasy zgodne z design tokenami PrimeNG (surface-_, border-surface-_)

### 4.4 EmptyState (template w DataView)

- **Opis**: Template wyświetlany gdy lista meczów jest pusta. Renderowany przez DataView gdy `matches.length === 0`.

- **Główne elementy** (w ramach ng-template #empty):
  - Kontener z wycentrowaną zawartością (flexbox, justify-center, items-center)
  - Ikona `pi pi-inbox` (duża, text-surface-400)
  - Nagłówek "Nie masz jeszcze żadnych meczów"
  - Tekst pomocniczy "Utwórz swój pierwszy mecz, aby rozpocząć rejestrowanie"
  - `<p-button>` "Utwórz pierwszy mecz" (severity="primary", icon="pi pi-plus")

- **Obsługiwane interakcje**:
  - Kliknięcie przycisku → nawigacja do `/matches/new`

### 4.5 LoadingSkeleton (template w DataView)

- **Opis**: Template wyświetlający skeleton podczas ładowania danych. Wykorzystuje PrimeNG Skeleton dla spójnego wyglądu.

- **Główne elementy** (w ramach ng-template #loading lub warunkowe renderowanie):
  - Grid 6 kart skeleton (2 rzędy × 3 kolumny na desktop)
  - Każda karta zawiera:
    - `<p-skeleton>` dla badge'a statusu (width="4rem", height="1.5rem")
    - `<p-skeleton>` dla nazw zawodników (width="100%", height="1.5rem")
    - `<p-skeleton>` dla wyniku (width="3rem", height="2rem")
    - `<p-skeleton>` dla daty (width="8rem", height="1rem")

## 5. Typy

### 5.1 Typy z API (src/types.ts) - istniejące

```typescript
// Pojedynczy mecz na liście (z API)
export type MatchListItemDto = Omit<Match, "user_id">;
// Zawiera: id, player_name, opponent_name, max_sets, golden_set_enabled,
// first_server_first_set, generate_ai_summary, sets_won_player, sets_won_opponent,
// status, coach_notes, started_at, ended_at, created_at

// Parametry zapytania listy meczów
export interface MatchListQueryDto {
  page?: number; // numer strony (domyślnie 1)
  limit?: number; // elementy na stronę (domyślnie 20, max 100)
  player_name?: string; // filtr po nazwie zawodnika (partial match)
  opponent_name?: string; // filtr po nazwie rywala (partial match)
  status?: MatchStatusEnum; // filtr po statusie
  sort?: string; // sortowanie (domyślnie '-started_at')
}

// Odpowiedź API listy meczów
export type MatchListResponse = PaginatedResponseDto<MatchListItemDto>;
// Struktura: { data: MatchListItemDto[], pagination: { total: number } }

// Enum statusu meczu
export type MatchStatusEnum = "in_progress" | "finished";
```

### 5.2 Typy współdzielone

Typy dla nawigacji (`NavMenuItem`, `UserMenuItem`) są zdefiniowane w [shared-frontend-implementation-plan.md](./shared-frontend-implementation-plan.md#62-definicje-typów).

### 5.3 Typy ViewModel dla widoku (nowy plik: src/components/matches/match-list.types.ts)

```typescript
/**
 * Stan filtrów listy meczów
 */
export interface MatchListFilters {
  playerName: string; // filtr po zawodniku (pusty string = brak filtra)
  opponentName: string; // filtr po rywalu (pusty string = brak filtra)
}

/**
 * Stan paginacji listy meczów
 */
export interface MatchListPagination {
  page: number; // aktualna strona (0-based dla PrimeNG Paginator)
  limit: number; // elementy na stronę
  total: number; // całkowita liczba rekordów z API
}

/**
 * Pełny stan widoku listy meczów
 */
export interface MatchListState {
  matches: MatchListItemDto[]; // lista meczów
  filters: MatchListFilters; // aktualne filtry
  pagination: MatchListPagination; // stan paginacji
  isLoading: boolean; // czy trwa ładowanie listy
  isDeleting: boolean; // czy trwa usuwanie meczu
  error: string | null; // komunikat błędu (jeśli wystąpił)
}

/**
 * Domyślne wartości stanu
 */
export const DEFAULT_MATCH_LIST_FILTERS: MatchListFilters = {
  playerName: "",
  opponentName: "",
};

export const DEFAULT_MATCH_LIST_PAGINATION: MatchListPagination = {
  page: 0, // 0-based dla PrimeNG
  limit: 20,
  total: 0,
};

export const DEFAULT_MATCH_LIST_STATE: MatchListState = {
  matches: [],
  filters: DEFAULT_MATCH_LIST_FILTERS,
  pagination: DEFAULT_MATCH_LIST_PAGINATION,
  isLoading: false,
  isDeleting: false,
  error: null,
};

/**
 * Opcje liczby elementów na stronie dla paginatora
 */
export const ROWS_PER_PAGE_OPTIONS = [10, 20, 50] as const;
```

## 6. Zarządzanie stanem

### 6.1 Podejście

Stan widoku zarządzany jest lokalnie w komponencie `MatchListPageComponent` przy użyciu Angular Signals. Nie ma potrzeby tworzenia osobnego serwisu stanu, ponieważ:

- Stan jest lokalny dla tego widoku
- Nie jest współdzielony z innymi komponentami
- Jest prosty i nie wymaga złożonej logiki

### 6.2 Struktura stanu w komponencie

Komponent definiuje następujące sygnały:

**Signals podstawowe:**

- `matches` - signal z listą meczów z API
- `filters` - signal ze stanem filtrów
- `pagination` - signal ze stanem paginacji
- `isLoading` - signal boolean dla stanu ładowania
- `isDeleting` - signal boolean dla stanu usuwania
- `error` - signal z komunikatem błędu

**Computed signals:**

- `isEmpty` - computed: `!isLoading() && matches().length === 0`
- `hasActiveFilters` - computed: filtr zawodnika lub rywala nie jest pusty
- `paginatorFirst` - computed: `pagination().page * pagination().limit` (dla PrimeNG)

### 6.3 Serwisy Angular

Komponent wykorzystuje następujące serwisy:

**HttpClient** - do komunikacji z API:

- GET /api/matches - pobieranie listy
- DELETE /api/matches/{id}/delete - usuwanie meczu

**Router** - do nawigacji:

- `/matches/new` - tworzenie meczu
- `/matches/{id}/live` - mecz w toku
- `/matches/{id}/summary` - mecz zakończony

**ConfirmationService (PrimeNG)** - do obsługi dialogu potwierdzenia usunięcia

**MessageService (PrimeNG)** - do wyświetlania powiadomień Toast

**ThemeService** - do zarządzania trybem dark/light (szczegóły w [shared-frontend-implementation-plan.md](./shared-frontend-implementation-plan.md#4-themeservice))

### 6.4 Przepływ danych

```
1. Inicjalizacja widoku (ngOnInit)
   → loadMatches()
   → GET /api/matches?page=1&limit=20&sort=-started_at
   → Aktualizacja signals (matches, pagination)

2. Zmiana filtrów (z debounce 300ms)
   → setFilters(filters)
   → resetPage(0)
   → loadMatches()

3. Zmiana strony/limitu (PaginatorState)
   → setPagination(page, limit)
   → loadMatches()

4. Usunięcie meczu
   → ConfirmationService.confirm()
   → [Potwierdzenie użytkownika]
   → DELETE /api/matches/{id}/delete
   → loadMatches() (odświeżenie listy)
   → MessageService.add() (toast sukcesu)
```

## 7. Integracja API

### 7.1 Pobieranie listy meczów

**Endpoint**: `GET /api/matches`

**Parametry zapytania (MatchListQueryDto)**:

- `page` - numer strony (1-based w API, 0-based w Paginator)
- `limit` - elementy na stronę (domyślnie 20, max 100)
- `player_name` - filtr po zawodniku (partial match, case-insensitive)
- `opponent_name` - filtr po rywalu (partial match, case-insensitive)
- `sort` - sortowanie (domyślnie '-started_at')

**Odpowiedź sukcesu (200 OK) - MatchListResponse**:

- `data: MatchListItemDto[]` - lista meczów
- `pagination: { total: number }` - całkowita liczba rekordów

**Mapowanie parametrów (frontend → API)**:

- PrimeNG Paginator używa 0-based indexing
- API używa 1-based page numbering
- Należy dodać +1 przy wysyłaniu i -1 przy odbieraniu

**Obsługa błędów**:

- `401 Unauthorized` → Toast "Sesja wygasła" + redirect do `/`
- `400 Bad Request` → Toast z błędem walidacji
- `500 Internal Server Error` → Toast "Błąd serwera"

### 7.2 Usuwanie meczu

**Endpoint**: `DELETE /api/matches/{id}/delete`

**Parametry ścieżki**:

- `id` (integer, required) - ID meczu do usunięcia

**Odpowiedź sukcesu**: `204 No Content` (brak body)

**Obsługa błędów**:

- `401 Unauthorized` → Toast "Sesja wygasła" + redirect do `/`
- `403 Forbidden` → Toast "Brak dostępu do tego meczu"
- `404 Not Found` → Toast "Mecz nie został znaleziony"
- `500 Internal Server Error` → Toast "Błąd serwera"

### 7.3 Przykładowa implementacja wywołań API

**Pobieranie meczów:**

- Budowanie HttpParams z filtrami (pomijanie pustych wartości)
- Dodanie +1 do numeru strony (konwersja 0-based → 1-based)
- Subskrypcja z obsługą sukcesu i błędu
- Aktualizacja signals po otrzymaniu odpowiedzi

**Usuwanie meczu:**

- Wywołanie DELETE bez body
- Po sukcesie: odświeżenie listy, wyświetlenie toast
- Po błędzie: wyświetlenie toast z komunikatem

## 8. Interakcje użytkownika

### 8.1 Interakcje nawigacji (AppNavbarComponent)

Interakcje nawigacji są opisane w [shared-frontend-implementation-plan.md](./shared-frontend-implementation-plan.md#34-obsługiwane-interakcje).

### 8.2 Interakcje listy meczów

| Interakcja                          | Element                        | Rezultat                                                                            |
| ----------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------- |
| Wpisanie tekstu w filtr "Zawodnik"  | IconField + InputText          | Debounce 300ms → wywołanie API z nowym filtrem → aktualizacja listy                 |
| Wpisanie tekstu w filtr "Rywal"     | IconField + InputText          | Debounce 300ms → wywołanie API z nowym filtrem → aktualizacja listy                 |
| Kliknięcie "Wyczyść"                | Button (outlined)              | Wyczyszczenie filtrów → wywołanie API → aktualizacja listy                          |
| Kliknięcie karty meczu "W toku"     | article (karta)                | Router.navigate → `/matches/{id}/live`                                              |
| Kliknięcie karty meczu "Zakończony" | article (karta)                | Router.navigate → `/matches/{id}/summary`                                           |
| Kliknięcie ikony kosza              | Button (icon-only)             | stopPropagation → ConfirmationService.confirm() → otwarcie dialogu                  |
| Kliknięcie "Usuń" w dialogu         | ConfirmDialog accept           | isDeleting=true → DELETE API → isDeleting=false → toast sukcesu → odświeżenie listy |
| Kliknięcie "Anuluj" w dialogu       | ConfirmDialog reject           | Zamknięcie dialogu (brak akcji)                                                     |
| Zmiana strony w paginatorze         | Paginator (onPageChange)       | Wywołanie API z nową stroną → aktualizacja listy                                    |
| Zmiana liczby elementów             | Paginator (rowsPerPageOptions) | Reset strony do 0 → wywołanie API z nowym limitem                                   |
| Kliknięcie "Nowy mecz"              | Button (primary)               | Router.navigate → `/matches/new`                                                    |
| Kliknięcie "Utwórz pierwszy mecz"   | Button w EmptyState            | Router.navigate → `/matches/new`                                                    |

### Przepływy szczegółowe

**Przepływ filtrowania (z RxJS Subject + debounceTime)**:

1. Użytkownik wpisuje tekst w pole filtra
2. Subject emituje nową wartość
3. debounceTime(300) opóźnia emisję
4. distinctUntilChanged() filtruje duplikaty
5. Po 300ms bez zmian → aktualizacja signal filters
6. Effect reaguje na zmianę → reset strony do 0 + loadMatches()

**Przepływ usuwania meczu**:

1. Użytkownik klika ikonę kosza (event.stopPropagation())
2. ConfirmationService.confirm() otwiera dialog
3. Dialog wyświetla: "Czy na pewno chcesz usunąć mecz {player} vs {opponent}?"
4. Użytkownik klika "Usuń"
5. isDeleting.set(true) - dialog pokazuje loading
6. DELETE request do API
7. Po sukcesie: isDeleting.set(false), loadMatches(), toast "Mecz został usunięty"
8. Po błędzie: isDeleting.set(false), toast z komunikatem błędu

## 9. Warunki i walidacja

### 9.1 Warunki wyświetlania elementów UI

| Warunek                               | Element            | Zachowanie                                                 |
| ------------------------------------- | ------------------ | ---------------------------------------------------------- |
| `isLoading() === true`                | DataView           | Wyświetlenie skeleton cards (ng-template #loading lub @if) |
| `isEmpty() === true`                  | DataView           | Wyświetlenie EmptyState (ng-template #empty)               |
| `matches().length > 0`                | DataView           | Wyświetlenie gridu kart meczów                             |
| `hasActiveFilters() === true`         | Przycisk "Wyczyść" | Widoczny (w przeciwnym razie ukryty)                       |
| `match.status === 'in_progress'`      | p-tag              | severity="warn", value="W toku"                            |
| `match.status === 'finished'`         | p-tag              | severity="success", value="Zakończony"                     |
| `isDeleting() === true`               | ConfirmDialog      | Przycisk "Usuń" w stanie loading                           |
| `pagination.total > pagination.limit` | Paginator          | Widoczny (gdy więcej niż 1 strona)                         |

### 9.2 Warunki nawigacji

| Stan meczu                 | Akcja kliknięcia | Docelowa ścieżka        |
| -------------------------- | ---------------- | ----------------------- |
| `status === 'in_progress'` | Kliknięcie karty | `/matches/{id}/live`    |
| `status === 'finished'`    | Kliknięcie karty | `/matches/{id}/summary` |

### 9.3 Warunki dostępu do widoku

| Warunek                   | Zachowanie                                                  |
| ------------------------- | ----------------------------------------------------------- |
| Użytkownik niezalogowany  | Redirect do `/` (obsługiwane w przyszłości przez AuthGuard) |
| Sesja wygasła (401 z API) | Toast "Sesja wygasła" + redirect do `/`                     |

### 9.4 Walidacja parametrów API (backend)

API waliduje następujące parametry (frontend nie wykonuje walidacji):

- `page` - musi być liczbą całkowitą >= 1
- `limit` - musi być liczbą całkowitą 1-100
- `player_name`, `opponent_name` - opcjonalne stringi
- `id` w DELETE - musi być liczbą całkowitą, mecz musi należeć do użytkownika

## 10. Obsługa błędów

### 10.1 Błędy HTTP i ich obsługa

| Kod | Typ           | Obsługa w UI                                                        |
| --- | ------------- | ------------------------------------------------------------------- |
| 401 | Unauthorized  | Toast "Sesja wygasła. Zaloguj się ponownie." + Router.navigate('/') |
| 403 | Forbidden     | Toast "Brak dostępu do tego zasobu"                                 |
| 404 | Not Found     | Toast "Mecz nie został znaleziony"                                  |
| 422 | Validation    | Toast z komunikatem z response.error.message                        |
| 500 | Server Error  | Toast "Wystąpił błąd serwera. Spróbuj ponownie później."            |
| 0   | Network Error | Toast "Błąd połączenia. Sprawdź połączenie z internetem."           |

### 10.2 Implementacja obsługi błędów

Obsługa błędów realizowana jest przez:

1. **Centralny error handler** - httpErrorInterceptor (do utworzenia) przechwytuje błędy 4xx/5xx
2. **MessageService (PrimeNG)** - wyświetla Toast z komunikatem błędu
3. **Signal error** - przechowuje komunikat błędu (opcjonalnie wyświetlany w UI)

### 10.3 Stany błędów w UI

| Scenariusz           | Zachowanie UI                                                                |
| -------------------- | ---------------------------------------------------------------------------- |
| Błąd ładowania listy | Toast z błędem, lista pozostaje pusta lub z poprzednimi danymi               |
| Błąd usuwania        | Toast z błędem, dialog pozostaje otwarty, użytkownik może spróbować ponownie |
| Timeout połączenia   | Toast "Błąd połączenia", możliwość ręcznego odświeżenia (F5)                 |

## 11. Kroki implementacji

### Krok 0: Implementacja elementów współdzielonych (prerequisite)

Przed implementacją tego widoku należy zaimplementować elementy współdzielone zgodnie z [shared-frontend-implementation-plan.md](./shared-frontend-implementation-plan.md):

- ThemeService
- Konfiguracja PrimeNG dla Dark Mode
- AppNavbarComponent

### Krok 1: Utworzenie struktury plików widoku

Utworzenie następujących plików:

- `src/components/matches/match-list-page.component.ts` - główny komponent
- `src/components/matches/match-list.types.ts` - typy ViewModel
- `src/pages/matches/index.astro` - strona Astro

### Krok 2: Definicja typów ViewModel

W pliku `match-list.types.ts`:

- Zdefiniowanie interfejsu `MatchListFilters`
- Zdefiniowanie interfejsu `MatchListPagination`
- Zdefiniowanie interfejsu `MatchListState`
- Zdefiniowanie stałych DEFAULT\_\* z wartościami domyślnymi
- Zdefiniowanie ROWS_PER_PAGE_OPTIONS

### Krok 3: Implementacja MatchListPageComponent - struktura

1. Utworzenie komponentu standalone z importami:
   - `AppNavbarComponent` (współdzielony z `src/components/shared/`)
   - PrimeNG: DataViewModule, ButtonModule, TagModule
   - PrimeNG: InputTextModule, IconFieldModule, InputIconModule
   - PrimeNG: PaginatorModule, ConfirmDialogModule, ToastModule
   - PrimeNG: SkeletonModule, RippleModule
   - Angular: CommonModule
2. Wstrzyknięcie serwisów: HttpClient, Router, ConfirmationService, MessageService
3. Zdefiniowanie signals dla stanu (w tym userName, userInitials dla navbar)
4. Zdefiniowanie computed signals

### Krok 4: Implementacja MatchListPageComponent - logika

1. Implementacja `ngOnInit()` - inicjalne ładowanie danych
2. Implementacja `loadMatches()` - pobieranie z API z parametrami
3. Implementacja obsługi filtrów z debounce (RxJS Subject)
4. Implementacja `onPageChange()` - obsługa paginacji
5. Implementacja `onDeleteClick()` - wywołanie ConfirmationService
6. Implementacja `deleteMatch()` - wywołanie DELETE API
7. Implementacja nawigacji: `navigateToMatch()`, `navigateToNewMatch()`

### Krok 5: Implementacja MatchListPageComponent - template

1. Dodanie `<app-navbar>` jako pierwszego elementu (zgodnie ze wzorcem shared-frontend)
2. Dodanie `<p-toast>` i `<p-confirmDialog>` po navbar
3. Dodanie `<main class="container mx-auto p-4">` jako kontenera zawartości
4. Implementacja sekcji nagłówka z tytułem i przyciskiem "Nowy mecz"
5. Implementacja sekcji filtrów z IconField + InputText
6. Implementacja `<p-dataView>` z trzema template'ami:
   - `#list` - grid kart meczów z responsywnym layoutem
   - `#empty` - EmptyState
   - Warunkowe renderowanie skeleton (@if isLoading)
7. Implementacja `<p-paginator>` z powiązaniem do signals

### Krok 6: Stylowanie zgodne z PrimeNG Design Tokens

1. Użycie klas Tailwind zgodnych z PrimeNG:
   - Kolory: `surface-0`, `surface-50`, `surface-100`, `surface-border`
   - Tekst: `text-surface-900`, `text-surface-500`
   - Dark mode: klasy `dark:*`
2. Stylowanie kart meczów:
   - Hover effect: `hover:shadow-lg hover:border-primary-500`
   - Responsywny grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
   - Gap: `gap-4` lub `gap-6`
3. Stylowanie badge'ów statusu (PrimeNG Tag severity)

### Krok 7: Utworzenie strony Astro

1. Utworzenie `src/pages/matches/index.astro`
2. Import i użycie Layout.astro
3. Dodanie sprawdzenia sesji (placeholder dla przyszłej implementacji auth)
4. Osadzenie `MatchListPageComponent` z `client:only="angular"`

### Krok 8: Konfiguracja providerów PrimeNG

1. Dodanie ConfirmationService i MessageService do providerów komponentu
2. Sprawdzenie konfiguracji modułów PrimeNG w głównej konfiguracji Angular

### Krok 9: Testowanie i poprawki

1. Testowanie pobierania listy meczów (happy path)
2. Testowanie filtrowania (debounce, czyszczenie)
3. Testowanie paginacji (zmiana strony, zmiana limitu)
4. Testowanie nawigacji do szczegółów meczu
5. Testowanie usuwania meczu (sukces i błąd)
6. Testowanie pustego stanu
7. Testowanie responsywności (mobile, tablet, desktop)

Testowanie elementów współdzielonych (dark mode, nawigacja) powinno być wykonane przy implementacji shared-frontend-implementation-plan.

## 12. Podsumowanie wykorzystania PrimeNG

### Komponenty PrimeNG specyficzne dla widoku

| Komponent             | Użycie                                                            |
| --------------------- | ----------------------------------------------------------------- |
| DataView              | Główny kontener listy meczów z obsługą layout'u grid/list         |
| Paginator             | Paginacja server-side                                             |
| Button                | Przyciski: "Nowy mecz", "Wyczyść", "Usuń", "Utwórz pierwszy mecz" |
| Tag                   | Badge statusu meczu (W toku / Zakończony)                         |
| InputText             | Pola filtrów tekstowych                                           |
| IconField + InputIcon | Ikony w polach filtrów                                            |
| ConfirmDialog         | Dialog potwierdzenia usunięcia                                    |
| Skeleton              | Stan ładowania (skeleton cards)                                   |
| Ripple                | Efekt ripple na kartach meczów                                    |

### Elementy współdzielone

Komponenty i serwisy współdzielone (AppNavbarComponent, ThemeService, Toast, Avatar, Menu) są opisane w [shared-frontend-implementation-plan.md](./shared-frontend-implementation-plan.md).

### Serwisy PrimeNG użyte w widoku

| Serwis              | Użycie                                     |
| ------------------- | ------------------------------------------ |
| ConfirmationService | Programowe wywołanie dialogu potwierdzenia |
| MessageService      | Programowe wyświetlanie powiadomień Toast  |

### Stylowanie

- Użycie design tokenów PrimeNG (surface-_, border-surface-_, text-surface-\*)
- Integracja z Tailwind CSS 4 dla layoutu i responsywności
- Szczegóły stylowania (dark mode, design tokens) w [shared-frontend-implementation-plan.md](./shared-frontend-implementation-plan.md#9-stylowanie)

## 13. Uwagi końcowe

### 13.1 Dostępność (a11y)

- Karty meczów jako `<article>` z odpowiednim role i focus
- Przycisk usunięcia z `aria-label="Usuń mecz {player} vs {opponent}"`
- Tag statusu z tekstem, nie tylko kolorem
- Pola filtrów z `<label>` (PrimeNG IconField)
- Dialog z focus trap (wbudowane w PrimeNG ConfirmDialog)
- Paginator z aria-labels (wbudowane w PrimeNG)

### 13.2 Wydajność

- Debounce 300ms na filtrach (redukcja zapytań API)
- Server-side pagination (kontrolowane ładowanie danych)
- Skeleton loading zamiast prostego spinnera (lepszy UX)
- trackBy w @for dla optymalnej re-renderacji kart

### 13.3 Responsywność

| Breakpoint              | Kolumny kart | Breakpoint Tailwind |
| ----------------------- | ------------ | ------------------- |
| < 768px (mobile)        | 1            | default             |
| 768px - 1024px (tablet) | 2            | md:                 |
| > 1024px (desktop)      | 3            | lg:                 |

### 13.4 Formatowanie daty

Data rozpoczęcia meczu formatowana w lokalnej strefie czasowej przeglądarki:

- Użycie Angular DatePipe z locale 'pl-PL'
- Format: "dd.MM.yyyy, HH:mm"
- Przykład: "15.01.2024, 14:30"

### 13.5 Przyszłe rozszerzenia

- Rozszerzenie filtrów o status meczu
- Możliwość eksportu listy meczów
- Sortowanie po różnych polach (data, nazwa zawodnika)

Rozszerzenia związane z nawigacją i autentykacją są opisane w [shared-frontend-implementation-plan.md](./shared-frontend-implementation-plan.md#12-przyszłe-rozszerzenia).
