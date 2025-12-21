# Plan implementacji widoku Publiczny mecz (Public Match)

## 1. Przegląd

Widok publiczny meczu służy do prezentacji zakończonego meczu tenisa stołowego osobom nieposiadającym konta w aplikacji. Jest dostępny poprzez publiczny link z unikalnym tokenem (43 znaki base64url, 256 bitów entropii), wygenerowany przez trenera. Widok prezentuje te same informacje co widok "Zakończony" dla trenera, ale w trybie read-only, bez możliwości edycji i bez wymagania logowania.

**Główne funkcjonalności:**

- Wyświetlanie danych ogólnych meczu (nazwy zawodników, data, wynik setowy)
- Prezentacja tabeli setów z wynikami punktowymi
- Wyświetlanie uwag trenera do meczu i poszczególnych setów
- Prezentacja raportu AI (opis meczu i zalecenia) - jeśli dostępny
- Subtelny branding aplikacji "Powered by Spin Flow"
- Obsługa błędów dla nieprawidłowego lub nieaktualnego tokenu

**Kluczowe różnice względem widoku "Zakończony":**

- Brak wymagania autentykacji
- Brak możliwości edycji jakichkolwiek danych
- Brak funkcji udostępniania (link jest już udostępniony)
- Brak przycisku odświeżania raportu AI
- Brak nawigacji powrotnej do aplikacji (użytkownik nie jest zalogowany)
- Dodanie brandingu "Powered by Spin Flow"

**User Stories:**

- US-071: Podgląd meczu poprzez publiczny link bez logowania
- US-072: Obsługa nieważnego publicznego linku

## 2. Routing widoku

- **Ścieżka:** `/public/matches/:token`
- **Plik Astro:** `src/pages/public/matches/[token].astro`
- **Dostęp:** Publiczny - brak wymagania autentykacji (bez AuthGuard)
- **Token:** 43-znakowy ciąg base64url (256 bitów entropii)
- **Walidacja:** Backend weryfikuje poprawność tokenu i zwraca dane meczu lub błąd 404

## 3. Struktura komponentów

Struktura oparta na wzorcach PrimeBlocks i komponentach PrimeNG:

```
PublicMatchPage (Astro)
└── PublicMatchContainer (Angular - root component)
    ├── [Stan: loading]
    │   └── MatchSkeleton (PrimeNG Skeleton)
    │       ├── Skeleton dla hero section
    │       ├── Skeleton dla tabeli setów
    │       └── Skeleton dla sekcji raportu
    │
    ├── [Stan: error]
    │   └── NotFoundState (wzorzec PrimeBlocks Empty State)
    │       ├── Ikona błędu (pi-exclamation-circle)
    │       ├── Nagłówek "Mecz nie istnieje"
    │       ├── Tekst pomocniczy
    │       └── Link do strony głównej (opcjonalnie)
    │
    ├── [Stan: success]
    │   └── PublicMatchContent
    │       ├── MatchScoreHero (wzorzec PrimeBlocks Stats/Hero)
    │       │   ├── Nazwy zawodników (player vs opponent)
    │       │   ├── Data i godzina startu
    │       │   └── Wynik setowy jako główna statystyka
    │       │
    │       ├── SetsHistoryTable (współdzielony z src/components/shared/)
    │       │   └── Lista setów z wynikami punktowymi
    │       │
    │       ├── CoachNotesPanel (PrimeNG Accordion)
    │       │   ├── Panel uwag do meczu
    │       │   └── Panele uwag do setów
    │       │
    │       └── AiReportSection (wzorzec PrimeBlocks Feature Section)
    │           ├── [pending] ProgressSpinner + komunikat
    │           ├── [success] Opis meczu + Zalecenia (Card/Panel)
    │           └── [error] Komunikat niedostępności
    │
    └── BrandingFooter (wzorzec PrimeBlocks Footer)
        └── "Powered by Spin Flow" z linkiem
```

## 4. Szczegóły komponentów

### 4.1 PublicMatchContainer

**Opis:**
Główny komponent kontenera Angular, zarządzający całym widokiem publicznego meczu. Odpowiada za pobranie tokenu z inputa (przekazanego z Astro), walidację tokenu, wywołanie API, zarządzanie stanem (loading/success/error) i renderowanie odpowiednich komponentów dzieci.

**Główne elementy:**

- Kontener flexbox z `min-h-screen` dla pełnej wysokości strony
- Główna sekcja treści z `max-w-5xl mx-auto` dla responsywnej szerokości
- Padding responsywny `p-4 md:p-6 lg:p-8`
- Warunkowe renderowanie stanu z `@switch` lub `@if`
- BrandingFooter zawsze na dole z `mt-auto`

**Obsługiwane interakcje:**

- Inicjalizacja - pobranie tokenu z `@Input()` i danych meczu z API
- Brak innych interakcji (widok read-only)

**Obsługiwana walidacja:**

- Walidacja formatu tokenu (43 znaki, wzorzec base64url: `[A-Za-z0-9_-]`)
- Obsługa błędu 404 dla nieprawidłowego lub nieaktualnego tokenu
- Obsługa błędów sieciowych (timeout, brak połączenia)

**Typy:**

- `PublicMatchDto` - dane z API
- `PublicMatchViewModel` - ViewModel ze stanami

**Propsy:**

- `token: string` - token z URL przekazany przez Astro

### 4.2 MatchSkeleton

**Opis:**
Komponent wyświetlający placeholder podczas ładowania danych. Wykorzystuje PrimeNG Skeleton do stworzenia szkieletu odpowiadającego docelowemu layoutowi strony.

**Główne elementy:**

- Skeleton dla sekcji hero (prostokąt dla nagłówka, kwadraty dla statystyk)
- Skeleton dla tabeli setów (linie reprezentujące wiersze)
- Skeleton dla sekcji raportu AI (prostokąty dla tekstu)
- Animacja pulsowania (domyślna w PrimeNG Skeleton)

**Obsługiwane interakcje:**

- Brak - komponent prezentacyjny

**Obsługiwana walidacja:**

- Brak

**Typy:**

- Brak specyficznych typów

**Propsy:**

- Brak

### 4.3 NotFoundState

**Opis:**
Komponent wyświetlany gdy token jest nieprawidłowy lub mecz nie istnieje. Oparty na wzorcu PrimeBlocks "Empty State" - centrowany na ekranie, z ikoną, nagłówkiem i tekstem pomocniczym.

**Główne elementy:**

- Kontener centrowany (flexbox, items-center, justify-center)
- Duża ikona błędu (PrimeIcons `pi-exclamation-circle`) z kolorem `text-surface-400`
- Nagłówek "Mecz nie istnieje" (duża czcionka, `text-surface-900`)
- Tekst pomocniczy "Sprawdź poprawność linku lub skontaktuj się z osobą, która go udostępniła." (mniejsza czcionka, `text-surface-600`)
- Opcjonalny przycisk/link "Przejdź do strony głównej" (PrimeNG Button, outlined)

**Obsługiwane interakcje:**

- Kliknięcie linku do strony głównej (nawigacja do `/`)

**Obsługiwana walidacja:**

- Brak

**Typy:**

- Brak specyficznych typów

**Propsy:**

- `showHomeLink: boolean` (opcjonalny, domyślnie `false`)

### 4.4 MatchScoreHero

**Opis:**
Sekcja hero prezentująca podstawowe informacje o meczu w atrakcyjnej formie. Inspirowana wzorcem PrimeBlocks "Stats" i "Hero sections". Wyświetla nazwy zawodników, wynik setowy jako główną statystykę oraz datę meczu.

**Główne elementy:**

- Kontener z tłem `surface-ground` lub gradientem dla wyróżnienia
- Sekcja górna:
  - Data i godzina startu meczu (formatowana w lokalnej strefie czasowej użytkownika)
  - Format: "15 stycznia 2024, 14:30"
- Sekcja środkowa (główna):
  - Nazwa zawodnika (player) - lewa strona, kolor `--color-player`
  - Wynik setowy w formacie "X : Y" - centrum, duża czcionka (48-64px)
  - Nazwa rywala (opponent) - prawa strona, kolor `--color-opponent`
- Layout responsywny: na mobile nazwy nad/pod wynikiem, na desktop obok

**Obsługiwane interakcje:**

- Brak (komponent prezentacyjny)

**Obsługiwana walidacja:**

- Brak

**Typy:**

- `SideEnum` dla kolorowania zawodników

**Propsy:**

- `playerName: string`
- `opponentName: string`
- `startedAt: string` (ISO date string)
- `setsWonPlayer: number`
- `setsWonOpponent: number`

### 4.5 SetsHistoryTable (współdzielony)

**Lokalizacja:** `src/components/shared/sets-history-table.component.ts`

**Opis:**
Tabela PrimeNG Table wyświetlająca listę setów z wynikami punktowymi. Komponent współdzielony między widokami "W toku" (Live Match), "Zakończony" (Match Summary) i widokiem publicznym.

**Główne elementy:**

- PrimeNG Table z opcjami: `size="small"`, `stripedRows`, `scrollable`
- Kolumny: Nr seta, Zawodnik (wynik), Rywal (wynik), Zwycięzca/Status
- Wyróżnienie bieżącego seta (inny kolor tła - np. klasa `bg-primary-50`) - w widoku publicznym `currentSetId` będzie `null`
- Kolumna zwycięzcy z PrimeNG Tag (success dla player, warn dla opponent)
- Znacznik złotego seta (pi-star lub badge "Złoty set") jeśli `is_golden === true`
- Responsive: horizontal scroll na małych ekranach

**Obsługiwane interakcje:**

- Brak bezpośrednich interakcji (komponent prezentacyjny)

**Obsługiwana walidacja:**

- Brak

**Typy:**

- `SetDetailDto[]` lub `PublicSetDto[]` (kompatybilne struktury)

**Propsy:**

- `sets: SetDetailDto[]` - lista setów do wyświetlenia
- `currentSetId: number | null` - ID bieżącego seta (do wyróżnienia, w widoku publicznym zawsze `null`)
- `playerName: string` - nazwa zawodnika (nagłówek kolumny)
- `opponentName: string` - nazwa rywala (nagłówek kolumny)

### 4.6 CoachNotesPanel

**Opis:**
Accordion (PrimeNG Accordion) prezentujący uwagi trenera do meczu i poszczególnych setów. Wersja read-only bez żadnych przycisków edycji.

**Główne elementy:**

- PrimeNG Accordion (`p-accordion`) z wieloma panelami (`p-accordionpanel`)
- Panel "Uwagi do meczu" - widoczny tylko jeśli `matchNotes` nie jest pusty
  - Nagłówek z ikoną pi-comment
  - Treść uwag w formacie tekstu (whitespace-pre-wrap)
- Panele "Uwagi do seta X" - dla każdego seta z niepustymi uwagami
  - Nagłówek "Set X - Uwagi" z ikoną pi-comment
  - Treść uwag
- Placeholder "Brak uwag" gdy wszystkie uwagi są puste (lub ukrycie całego accordionu)
- Domyślnie wszystkie panele zwinięte
- Opcja `multiple` pozwalająca na rozwinięcie wielu paneli jednocześnie

**Obsługiwane interakcje:**

- Rozwijanie/zwijanie paneli accordion (kliknięcie nagłówka)

**Obsługiwana walidacja:**

- Brak

**Typy:**

- `PublicSetDto[]`

**Propsy:**

- `matchNotes: string | null`
- `sets: PublicSetDto[]`

### 4.7 AiReportSection

**Opis:**
Sekcja prezentująca raport AI wygenerowany po zakończeniu meczu. Obsługuje trzy stany: pending, success, error. Wzorowana na PrimeBlocks "Feature Section" z dwoma kolumnami dla opisu i zaleceń.

**Główne elementy:**

- Nagłówek sekcji "Analiza AI" (z ikoną pi-sparkles lub podobną)
- **Stan `pending`:**
  - PrimeNG ProgressSpinner w centrum
  - Tekst "Raport AI jest generowany..."
  - Subtelna animacja oczekiwania
- **Stan `success`:**
  - Layout dwukolumnowy na desktop (grid-cols-2), jedna kolumna na mobile
  - Podsekcja "Opis meczu":
    - Ikona pi-file-text lub pi-align-left
    - Tekst opisu (5-7 zdań)
  - Podsekcja "Zalecenia dla zawodnika":
    - Ikona pi-lightbulb
    - Tekst zaleceń (5-7 zdań)
  - Karty (PrimeNG Card lub div z surface-card) dla każdej podsekcji
- **Stan `error`:**
  - Komunikat "Raport AI nie jest dostępny"
  - Ikona pi-info-circle
  - Subtelny styl (text-surface-500)
- Brak przycisku "Odśwież" (widok publiczny nie może wyzwalać generowania)

**Obsługiwane interakcje:**

- Brak (komponent prezentacyjny)

**Obsługiwana walidacja:**

- Brak

**Typy:**

- `PublicAiReportDto | null`
- `AiStatusEnum`

**Propsy:**

- `report: PublicAiReportDto | null`

### 4.8 BrandingFooter

**Opis:**
Stopka z subtelnym brandingiem aplikacji "Powered by Spin Flow". Wzorowana na minimalistycznych footerach z PrimeBlocks. Umieszczona zawsze na dole strony (nie sticky, ale z mt-auto w flex container).

**Główne elementy:**

- Kontener pełnej szerokości z padding
- Centrowany tekst "Powered by Spin Flow"
- Logo/ikona Spin Flow (opcjonalnie)
- Link do strony głównej aplikacji (otwierany w nowej karcie)
- Mały rozmiar fontu (text-sm)
- Subtelna kolorystyka (text-surface-500)
- Separator górny (border-top lub margin-top)

**Obsługiwane interakcje:**

- Kliknięcie "Spin Flow" - nawigacja do strony głównej (`/`) w nowej karcie (`target="_blank"`)

**Obsługiwana walidacja:**

- Brak

**Typy:**

- Brak specyficznych typów

**Propsy:**

- `homeUrl: string` (opcjonalny, domyślnie `/`)

## 5. Typy

### 5.1 Typy z API (istniejące w types.ts)

**PublicMatchDto** - odpowiedź GET /api/public/matches/{token}:

- `match` - obiekt PublicMatchInfo (bez user_id i generate_ai_summary)
- `sets` - tablica PublicSetDto z punktami
- `ai_report` - PublicAiReportDto lub null

**PublicMatchInfo** (część match w PublicMatchDto):

- `id: number`
- `player_name: string`
- `opponent_name: string`
- `max_sets: number`
- `golden_set_enabled: boolean`
- `first_server_first_set: SideEnum`
- `sets_won_player: number`
- `sets_won_opponent: number`
- `status: MatchStatusEnum` (zawsze 'finished')
- `coach_notes: string | null`
- `started_at: string` (ISO date)
- `ended_at: string | null`
- `created_at: string`

**PublicSetDto**:

- `id: number`
- `match_id: number`
- `sequence_in_match: number`
- `is_golden: boolean`
- `set_score_player: number`
- `set_score_opponent: number`
- `winner: SideEnum | null`
- `is_finished: boolean`
- `coach_notes: string | null`
- `finished_at: string | null`
- `created_at: string`
- `points: PointWithTagsDto[]`

**PublicAiReportDto**:

- `ai_status: AiStatusEnum` ('pending' | 'success' | 'error')
- `ai_summary: string | null`
- `ai_recommendations: string | null`

**PointWithTagsDto**:

- `id: number`
- `set_id: number`
- `sequence_in_set: number`
- `scored_by: SideEnum`
- `served_by: SideEnum`
- `created_at: string`
- `tags: string[]`

**Typy enum**:

- `SideEnum: 'player' | 'opponent'`
- `MatchStatusEnum: 'in_progress' | 'finished'`
- `AiStatusEnum: 'pending' | 'success' | 'error'`

### 5.2 ViewModel dla widoku

**PublicMatchViewModel** - główny model widoku:

- `state: 'loading' | 'success' | 'error'` - aktualny stan widoku
- `matchData: PublicMatchDto | null` - dane meczu (gdy success)
- `errorMessage: string | null` - komunikat błędu (gdy error)

**Computed properties (Angular computed signals)**:

- `match` - computed z matchData?.match
- `sets` - computed z matchData?.sets
- `aiReport` - computed z matchData?.ai_report
- `playerName` - computed z match?.player_name
- `opponentName` - computed z match?.opponent_name
- `startedAt` - computed z match?.started_at
- `setsWonPlayer` - computed z match?.sets_won_player
- `setsWonOpponent` - computed z match?.sets_won_opponent
- `matchNotes` - computed z match?.coach_notes
- `aiReportState` - computed określający stan raportu ('hidden' | 'pending' | 'success' | 'error')
- `hasCoachNotes` - computed sprawdzający czy są jakiekolwiek uwagi
- `setsWithNotes` - computed filtrujący sety z uwagami

**FormattedDateTime** - typ pomocniczy dla formatowania dat:

- `date: string` (np. "15 stycznia 2024")
- `time: string` (np. "14:30")
- `full: string` (np. "15 stycznia 2024, 14:30")

## 6. Zarządzanie stanem

### 6.1 Podejście - Angular Signals

Widok wykorzystuje Angular Signals do zarządzania stanem. Serwis stanowy może być providedIn: 'root' lub scoped do komponentu (preferowane dla izolacji).

**Główne sygnały:**

- `_state: WritableSignal<'loading' | 'success' | 'error'>` - stan główny
- `_matchData: WritableSignal<PublicMatchDto | null>` - dane z API
- `_errorMessage: WritableSignal<string | null>` - komunikat błędu

**Computed signals (readonly):**

- Wszystkie computed properties wymienione w sekcji 5.2

**Metody:**

- `setLoading()` - ustawia stan loading, czyści dane i błędy
- `setSuccess(data: PublicMatchDto)` - ustawia stan success z danymi
- `setError(message?: string)` - ustawia stan error z komunikatem
- `reset()` - resetuje stan do początkowego

### 6.2 Przepływ stanu

1. **Inicjalizacja (ngOnInit):**
   - Stan początkowy: `loading`
   - Komponent pobiera token z `@Input()`
   - Walidacja formatu tokenu (regex: `^[A-Za-z0-9_-]{43}$`)
   - Jeśli format nieprawidłowy → natychmiastowo `error`

2. **Pobranie danych:**
   - Wywołanie `GET /api/public/matches/{token}`
   - Sukces (200) → `success` + dane
   - Błąd 404 → `error` + "Mecz nie istnieje"
   - Błąd sieciowy → `error` + "Błąd połączenia"
   - Timeout → `error` + "Wystąpił problem z połączeniem"

3. **Renderowanie:**
   - Stan `loading` → MatchSkeleton
   - Stan `success` → PublicMatchContent (z wszystkimi podkomponentami)
   - Stan `error` → NotFoundState

### 6.3 Brak persystencji

Widok publiczny nie wymaga persystencji stanu - każde odświeżenie strony powoduje ponowne pobranie danych z API.

## 7. Integracja API

### 7.1 Endpoint

**GET /api/public/matches/{token}**

- Metoda: GET
- Autentykacja: Brak (endpoint publiczny)
- Path parameter: `token` (string, 43 znaki)

### 7.2 Request/Response

**Request:** Brak body, token w URL

**Response sukces (200 OK):**
Typ: `PublicMatchResponse` = `SingleItemResponseDto<PublicMatchDto>`
Struktura odpowiedzi zawiera obiekt `data` z pełnymi danymi meczu, setami (włącznie z punktami) i raportem AI.

**Response błąd (404 Not Found):**
Typ: `ErrorResponseDto`
Kod błędu: `NOT_FOUND`
Komunikat: "Shared match not found"

### 7.3 Serwis API

Serwis Angular do komunikacji z API:

- Metoda `getPublicMatch(token: string)` zwracająca `Observable<PublicMatchResponse>`
- Endpoint URL: `/api/public/matches/${token}`
- Brak dodatkowych headers (endpoint publiczny)
- HttpClient z inject()

### 7.4 Obsługa odpowiedzi

Mapowanie odpowiedzi w komponencie:

- Sukces: wyciągnięcie `response.data` i przekazanie do stanu
- Błąd 404: ustawienie stanu error z komunikatem "Mecz nie istnieje"
- Inne błędy: generyczny komunikat błędu

## 8. Interakcje użytkownika

### 8.1 Wejście na stronę z prawidłowym tokenem

1. Użytkownik klika/wkleja link publiczny `/public/matches/{token}`
2. Widok wyświetla MatchSkeleton (placeholdery ładowania)
3. Wysyłane jest zapytanie do API
4. Po otrzymaniu danych wyświetlany jest pełny widok meczu:
   - MatchScoreHero z nazwami zawodników i wynikiem
   - SetsHistoryTable z listą setów (współdzielony komponent)
   - CoachNotesPanel z uwagami (jeśli istnieją)
   - AiReportSection z raportem (jeśli dostępny)
   - BrandingFooter na dole

### 8.2 Wejście na stronę z nieprawidłowym tokenem

1. Użytkownik klika/wkleja link z nieprawidłowym tokenem
2. Widok wyświetla MatchSkeleton
3. API zwraca błąd 404
4. Wyświetlany jest NotFoundState z komunikatem:
   - "Mecz nie istnieje"
   - "Sprawdź poprawność linku lub skontaktuj się z osobą, która go udostępniła."

### 8.3 Przeglądanie uwag trenera

1. Użytkownik widzi CoachNotesPanel (jeśli są uwagi)
2. Wszystkie panele są domyślnie zwinięte
3. Kliknięcie nagłówka panelu rozwija/zwija panel
4. Możliwość otwarcia wielu paneli jednocześnie
5. Brak możliwości edycji

### 8.4 Przeglądanie raportu AI

1. Sekcja AI widoczna jeśli raport istnieje (ai_report !== null)
2. Dla stanu `pending` - spinner z komunikatem oczekiwania
3. Dla stanu `success` - dwie karty: opis meczu i zalecenia
4. Dla stanu `error` - komunikat o niedostępności raportu
5. Brak możliwości odświeżenia

### 8.5 Nawigacja do strony głównej

1. Użytkownik może kliknąć link "Spin Flow" w BrandingFooter
2. Otwarcie strony głównej w nowej karcie (target="\_blank")
3. Obecna strona pozostaje otwarta

## 9. Warunki i walidacja

### 9.1 Walidacja tokenu (frontend)

| Warunek                                             | Akcja                                                     |
| --------------------------------------------------- | --------------------------------------------------------- |
| Token ma dokładnie 43 znaki                         | Kontynuuj do API                                          |
| Token zawiera tylko znaki base64url `[A-Za-z0-9_-]` | Kontynuuj do API                                          |
| Token nie spełnia warunków                          | Natychmiastowo wyświetl NotFoundState (bez wywołania API) |

Wzorzec regex: `^[A-Za-z0-9_-]{43}$`

### 9.2 Warunki wyświetlania elementów

| Element              | Warunek                                              |
| -------------------- | ---------------------------------------------------- |
| MatchSkeleton        | `state === 'loading'`                                |
| NotFoundState        | `state === 'error'`                                  |
| PublicMatchContent   | `state === 'success'`                                |
| AiReportSection      | `aiReport !== null`                                  |
| ProgressSpinner w AI | `aiReport?.ai_status === 'pending'`                  |
| Treść raportu AI     | `aiReport?.ai_status === 'success'`                  |
| Błąd AI              | `aiReport?.ai_status === 'error'`                    |
| CoachNotesPanel      | `hasCoachNotes === true`                             |
| Panel uwag do meczu  | `matchNotes !== null && matchNotes !== ''`           |
| Panel uwag do seta   | `set.coach_notes !== null && set.coach_notes !== ''` |
| BrandingFooter       | Zawsze widoczny                                      |

### 9.3 Brak walidacji formularzy

Widok jest w pełni read-only, nie zawiera żadnych formularzy ani pól edycyjnych.

## 10. Obsługa błędów

### 10.1 Błąd 404 (Not Found)

- **Przyczyny:** Nieprawidłowy token, mecz usunięty przez trenera, token o złym formacie
- **Zachowanie:** Wyświetlenie NotFoundState
- **Komunikat:** "Mecz nie istnieje"
- **Ważne:** Ten sam komunikat dla wszystkich przypadków (zapobieganie enumeracji tokenów)

### 10.2 Błędy sieciowe

| Typ błędu            | Komunikat                                          |
| -------------------- | -------------------------------------------------- |
| Timeout              | "Wystąpił problem z połączeniem. Odśwież stronę."  |
| Brak sieci (offline) | "Brak połączenia z internetem."                    |
| 500 Server Error     | "Wystąpił błąd serwera. Spróbuj ponownie później." |
| Inne błędy HTTP      | "Wystąpił nieoczekiwany błąd."                     |

### 10.3 Edge cases

| Sytuacja                                    | Zachowanie                                                          |
| ------------------------------------------- | ------------------------------------------------------------------- |
| Token w nieprawidłowym formacie             | NotFoundState przed wywołaniem API                                  |
| Token prawidłowy, mecz nie istnieje         | 404 → NotFoundState                                                 |
| Token prawidłowy, mecz usunięty             | 404 → NotFoundState                                                 |
| AI raport w stanie pending                  | Spinner z komunikatem (użytkownik musi poczekać lub wrócić później) |
| AI raport w stanie error                    | Komunikat "Raport AI nie jest dostępny"                             |
| Brak AI raportu (generate_ai_summary=false) | Sekcja AI niewidoczna                                               |
| Brak uwag do meczu i setów                  | CoachNotesPanel niewidoczny                                         |
| Mecz bez żadnych setów                      | Pusta tabela SetsHistoryTable (edge case - nie powinien wystąpić)   |

### 10.4 Bezpieczeństwo

- **Jednolity komunikat błędu:** Dla nieistniejącego i usuniętego meczu zawsze "Mecz nie istnieje"
- **Brak informacji o istnieniu:** API nie pozwala na enumerację tokenów
- **Brak logowania błędów użytkownika:** Nieprawidłowe tokeny nie są logowane z pełną wartością (tylko prefix)

## 11. Kroki implementacji

### Faza 1: Przygotowanie struktury (1h)

1. **Utworzenie strony Astro**
   - Utworzenie pliku `src/pages/public/matches/[token].astro`
   - Konfiguracja layoutu bez nawigacji głównej (tylko content + footer)
   - Przekazanie parametru `token` z `Astro.params` do komponentu Angular
   - Integracja z Angular przez `client:only="angular"`

2. **Utworzenie struktury katalogów Angular**
   - Katalog: `src/components/public-match/`
   - Podkatalogi dla komponentów: `match-skeleton/`, `not-found-state/`, `match-score-hero/`, `coach-notes-panel/`, `ai-report-section/`, `branding-footer/`
   - Uwaga: `SetsHistoryTable` znajduje się w `src/components/shared/` i jest współdzielony

### Faza 2: Serwisy (1h)

3. **Serwis API**
   - Plik: `src/components/public-match/services/public-match-api.service.ts`
   - Metoda `getPublicMatch(token: string)` z HttpClient
   - Obsługa błędów HTTP (catchError)

4. **Serwis stanu (opcjonalny)**
   - Plik: `src/components/public-match/services/public-match-state.service.ts`
   - Implementacja signals i computed
   - Metody: setLoading, setSuccess, setError
   - Alternatywnie: stan w głównym komponencie

### Faza 3: Komponenty pomocnicze (2-3h)

5. **MatchSkeleton**
   - PrimeNG Skeleton w layoutzie odpowiadającym docelowej stronie
   - Animacja pulsowania

6. **NotFoundState**
   - Wzorzec PrimeBlocks Empty State
   - Ikona, nagłówek, tekst pomocniczy
   - Opcjonalny link do strony głównej

7. **BrandingFooter**
   - Minimalistyczny footer z tekstem "Powered by Spin Flow"
   - Link otwierający stronę główną w nowej karcie

### Faza 4: Komponenty treści (3-4h)

8. **MatchScoreHero**
   - Layout z nazwami zawodników i wynikiem setowym
   - Formatowanie daty z `Intl.DateTimeFormat` (locale pl-PL)
   - Kolorowanie zawodników (CSS variables --color-player, --color-opponent)
   - Responsywność (stack na mobile, row na desktop)

9. **SetsHistoryTable (współdzielony - jeśli nie istnieje)**
   - Sprawdzić czy komponent istnieje w `src/components/shared/sets-history-table.component.ts`
   - Jeśli nie istnieje - zaimplementować zgodnie z opisem w `live-match-view-implementation-plan.md`
   - PrimeNG Table z kolumnami: Nr, Player, Opponent, Zwycięzca/Status
   - Striped rows, size small, scrollable
   - Oznaczenie złotego seta
   - Kolorowanie zwycięzcy z PrimeNG Tag

10. **CoachNotesPanel**
    - PrimeNG Accordion z panelami dla uwag
    - Dynamiczne panele dla setów z uwagami
    - Domyślnie zwinięty, multiple=true

11. **AiReportSection**
    - Trzy stany: pending (spinner), success (karty z treścią), error (komunikat)
    - Layout dwukolumnowy dla opisu i zaleceń
    - Ikony dla każdej sekcji

### Faza 5: Komponent główny (2h)

12. **PublicMatchContainer**
    - Input dla tokenu
    - Walidacja tokenu (regex)
    - Wywołanie API w ngOnInit
    - Zarządzanie stanem (signals)
    - Warunkowe renderowanie komponentów
    - Kompozycja wszystkich komponentów dzieci

### Faza 6: Integracja i testy (1-2h)

13. **Integracja Astro-Angular**
    - Weryfikacja przekazywania tokenu
    - Testowanie routingu
    - Stylowanie strony Astro (min-height, background)

14. **Testy manualne**
    - Prawidłowy token → wyświetlenie danych meczu
    - Nieprawidłowy token → NotFoundState
    - Token o złym formacie → NotFoundState (bez API call)
    - Stany raportu AI (pending, success, error)
    - Responsywność (mobile, tablet, desktop)
    - Dark mode

### Faza 7: Dopracowanie (1h)

15. **Stylowanie finalne**
    - Spójność z design system PrimeNG (Aura preset)
    - Weryfikacja kolorów w dark mode
    - Animacje (accordion, skeleton)
    - Dostępność (aria-labels, kontrast, focus states)

### Struktura plików końcowa

```
src/
├── pages/
│   └── public/
│       └── matches/
│           └── [token].astro
└── components/
    ├── shared/
    │   └── sets-history-table.component.ts  # Współdzielony z Live Match i Match Summary
    └── public-match/
        ├── public-match-container.component.ts
        ├── services/
        │   └── public-match-api.service.ts
        ├── match-skeleton/
        │   └── match-skeleton.component.ts
        ├── not-found-state/
        │   └── not-found-state.component.ts
        ├── match-score-hero/
        │   └── match-score-hero.component.ts
        ├── coach-notes-panel/
        │   └── coach-notes-panel.component.ts
        ├── ai-report-section/
        │   └── ai-report-section.component.ts
        └── branding-footer/
            └── branding-footer.component.ts
```

### Szacowany czas implementacji

| Faza                            | Czas       |
| ------------------------------- | ---------- |
| Faza 1: Przygotowanie struktury | 1h         |
| Faza 2: Serwisy                 | 1h         |
| Faza 3: Komponenty pomocnicze   | 2-3h       |
| Faza 4: Komponenty treści       | 3-4h       |
| Faza 5: Komponent główny        | 2h         |
| Faza 6: Integracja i testy      | 1-2h       |
| Faza 7: Dopracowanie            | 1h         |
| **Razem**                       | **11-14h** |

### Uwagi implementacyjne

1. **Komponenty PrimeNG:** Wykorzystać Table, Skeleton, ProgressSpinner, Accordion, Button, Card. Wszystkie z Aura preset.

2. **Wzorce PrimeBlocks:** Inspirować się blokami Stats, Empty State, Footer, Feature Section dostępnymi na primeblocks.org.

3. **Formatowanie daty:** Użyć `Intl.DateTimeFormat` z locale `pl-PL` dla polskiego formatowania. Czas wyświetlany w lokalnej strefie czasowej przeglądarki użytkownika.

4. **Dark mode:** Wykorzystać system z ThemeService (klasa `.app-dark` na html). PrimeNG i Tailwind automatycznie reagują.

5. **CSS Variables:** Użyć zmiennych `--color-player`, `--color-opponent` zdefiniowanych globalnie dla spójnej kolorystyki.

6. **Reużywalność:** `SetsHistoryTable` jest komponentem współdzielonym z `src/components/shared/`. Jest używany w widokach Live Match, Match Summary i Public Match. W widoku publicznym `currentSetId` przekazywany jest jako `null`.

7. **Accessibility:**
   - Wszystkie interaktywne elementy z focus visible
   - Accordion z aria-expanded
   - Kontrast kolorów zgodny z WCAG 2.1 AA
   - Alt text dla ikon dekoracyjnych (aria-hidden="true")

8. **Layout:** Flexbox z `min-h-screen` na kontenerze głównym, footer z `mt-auto` dla sticky-bottom effect.

9. **Responsywność breakpoints:** Wykorzystać domyślne breakpoints Tailwind (sm: 640px, md: 768px, lg: 1024px).

10. **Autentykacja:** Widok nie wymaga żadnej autentykacji. Szczegóły AuthGuard i serwisu autentykacji zostaną określone w przyszłości dla innych widoków.
