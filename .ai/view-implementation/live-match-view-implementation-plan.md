# Plan implementacji widoku Mecz "W toku" (Live Match)

## 1. Przegląd

Widok meczu "W toku" służy do rejestracji przebiegu meczu tenisa stołowego na żywo. Trener może rejestrować punkty dla zawodnika ocenianego lub rywala, przypisywać tagi do punktów, cofać ostatni punkt, kończyć sety z uwagami oraz zakończyć cały mecz. Widok jest zoptymalizowany pod obsługę jedną ręką na smartfonie w orientacji pionowej, z dużymi przyciskami do szybkiej rejestracji punktów.

**Główne funkcjonalności:**

- Wyświetlanie aktualnego stanu meczu (wynik setowy i punktowy)
- Wskazanie aktualnie serwującego zawodnika
- Rejestracja punktów z opcjonalnymi tagami
- Cofanie ostatniego punktu w bieżącym secie
- Zamykanie seta z uwagami trenera
- Zakończenie meczu z uwagami i automatycznym wyzwoleniem generowania raportu AI

**Wykorzystane elementy PrimeNG/PrimeBlocks:**

- PrimeNG Card dla sekcji scoreboard i akcji
- PrimeNG Button z różnymi severity dla przycisków punktów
- PrimeNG SelectButton dla wielokrotnego wyboru tagów
- PrimeNG Dialog dla modali zakończenia seta/meczu
- PrimeNG Textarea dla uwag trenera
- PrimeNG Table dla tabeli setów
- PrimeNG Tag dla statusów i badge'ów
- PrimeNG BlockUI dla blokowania UI podczas operacji
- PrimeNG Toast dla komunikatów
- Wzorzec layoutu inspirowany PrimeBlocks Application Templates

## 2. Routing widoku

- **Ścieżka:** `/matches/:id/live`
- **Plik Astro:** `src/pages/matches/[id]/live.astro`
- **Dostęp:** Chroniony - wymaga autentykacji
- **Walidacja wejścia:** Weryfikacja ownership meczu + redirect do `/matches/:id/summary` jeśli mecz zakończony

## 3. Struktura komponentów

```
LiveMatchPage (Astro)
└── LiveMatchPageComponent (Angular - standalone, root, client:only="angular")
    ├── AppNavbarComponent (współdzielony - z shared-frontend-implementation-plan)
    ├── ScoreDisplayCard
    │   ├── PrimeNG Card (kontener)
    │   ├── Sekcja wyników setowych (p-tag)
    │   ├── Sekcja wyników punktowych (duże cyfry, stylowane)
    │   ├── Nazwy zawodników (po bokach)
    │   └── Wskaźnik serwującego (ikona/badge przy aktywnym)
    ├── TagSelectionPanel
    │   └── PrimeNG SelectButton (multiple mode)
    ├── PointScoringButtons
    │   ├── PrimeNG Button (severity="info", duży) - zawodnik
    │   └── PrimeNG Button (severity="warn", duży) - rywal
    ├── MatchControlActions
    │   ├── PrimeNG Button (outlined) - Cofnij punkt
    │   ├── PrimeNG Button (outlined) - Zakończ set
    │   └── PrimeNG Button (severity="danger", outlined) - Zakończ mecz
    ├── SetsHistoryTable
    │   └── PrimeNG Table (compact, striped)
    ├── FinishSetDialog
    │   └── PrimeNG Dialog + Textarea + Button
    ├── FinishMatchDialog
    │   └── PrimeNG Dialog + podsumowanie + Textarea + Button
    ├── PrimeNG BlockUI (globalny overlay)
    └── PrimeNG Toast (komunikaty)
```

## 4. Szczegóły komponentów

### 4.1 LiveMatchPageComponent

- **Opis:** Główny komponent standalone Angular zarządzający całym widokiem meczu na żywo. Odpowiada za inicjalizację danych, koordynację akcji użytkownika, zarządzanie stanem i komunikację z API. Zawiera AppNavbarComponent jako współdzielony element nawigacji.

- **Główne elementy:**
  - `<app-navbar>` - współdzielony komponent nawigacji głównej
  - `<p-toast>` - komponent powiadomień
  - `<main>` - wrapper z klasami Tailwind dla responsywnego layoutu (flex column, max-w-md na mobile, max-w-2xl na desktop, mx-auto)
  - Zagnieżdżone komponenty dzieci
  - PrimeNG BlockUI dla globalnego overlay podczas operacji API

- **Obsługiwane interakcje:**
  - Inicjalizacja - pobranie danych meczu i tagów przy OnInit
  - Obsługa zdarzeń z komponentów potomnych (point scored, undo, finish set, finish match)
  - Nawigacja powrotna do listy meczów (przycisk w AppNavbar lub dedykowany)
  - Redirect do /summary po zakończeniu meczu

- **Obsługiwana walidacja:**
  - Weryfikacja czy mecz istnieje i należy do użytkownika (HTTP 403 → redirect + toast)
  - Weryfikacja czy mecz nie jest zakończony (redirect do /summary)
  - Blokowanie UI podczas operacji API (BlockUI)

- **Typy:**
  - `MatchDetailDto` - dane meczu z API
  - `CurrentSetDto` - bieżący set
  - `SetDetailDto[]` - lista setów
  - `TagDto[]` - dostępne tagi
  - `LiveMatchViewModel` - lokalny ViewModel

- **Propsy:** Brak (komponent root, pobiera matchId z URL poprzez input binding lub route params)

### 4.2 ScoreDisplayCard

- **Opis:** Karta wyświetlająca aktualny wynik meczu i seta oraz wskazująca serwującego. Jest centrum wizualnym widoku, widocznym bez scrollowania. Wykorzystuje PrimeNG Card jako kontener.

- **Główne elementy:**
  - PrimeNG Card jako kontener z custom header
  - Sekcja górna: wynik setowy w formie badge'ów (np. "2" - "1") z PrimeNG Tag
  - Sekcja środkowa: wynik punktowy bieżącego seta - duże cyfry (np. "7" - "5")
  - Sekcja dolna: nazwy zawodników po bokach (flexbox justify-between)
  - Wskaźnik serwującego: mała ikona serwisu (pi-send lub custom) przy nazwisku aktualnie serwującego

- **Obsługiwane interakcje:**
  - Brak bezpośrednich interakcji (komponent prezentacyjny)

- **Obsługiwana walidacja:**
  - Brak

- **Typy:**
  - `SideEnum` - określenie serwującego (`'player' | 'opponent'`)

- **Propsy:**
  - `playerName: string` - nazwa zawodnika ocenianego
  - `opponentName: string` - nazwa rywala
  - `setsWonPlayer: number` - wygrane sety zawodnika
  - `setsWonOpponent: number` - wygrane sety rywala
  - `setScorePlayer: number` - punkty zawodnika w bieżącym secie
  - `setScoreOpponent: number` - punkty rywala w bieżącym secie
  - `currentServer: SideEnum` - kto aktualnie serwuje
  - `currentSetNumber: number` - numer bieżącego seta

### 4.3 TagSelectionPanel

- **Opis:** Panel umożliwiający wybór wielu tagów przed zapisem punktu. Wykorzystuje PrimeNG SelectButton w trybie multiple. Tagi są resetowane automatycznie po dodaniu punktu.

- **Główne elementy:**
  - PrimeNG SelectButton z opcją `multiple="true"`
  - Opcje generowane z listy TagDto
  - Responsywny układ: przyciski wrap na mniejszych ekranach
  - Custom template dla lepszego wyglądu tagów

- **Obsługiwane interakcje:**
  - Kliknięcie tagu - toggle zaznaczenia (ngModel two-way binding)
  - Reset zaznaczenia po dodaniu punktu (obsługiwane przez rodzica)

- **Obsługiwana walidacja:**
  - Brak (wybór tagów jest opcjonalny)

- **Typy:**
  - `TagDto[]` - dostępne tagi
  - `number[]` - ID zaznaczonych tagów

- **Propsy:**
  - `tags: TagDto[]` - lista dostępnych tagów
  - `selectedTagIds: number[]` - ID zaznaczonych tagów (two-way binding z ngModel)
  - `disabled: boolean` - blokada podczas operacji API
  - `selectionChange: EventEmitter<number[]>` - zdarzenie zmiany selekcji

### 4.4 PointScoringButtons

- **Opis:** Dwa duże przyciski PrimeNG Button do rejestracji punktu - jeden dla zawodnika ocenianego (niebieski/info), drugi dla rywala (pomarańczowy/warn). Zoptymalizowane pod obsługę jedną ręką na mobile.

- **Główne elementy:**
  - PrimeNG Button z severity="info" dla zawodnika - pełna szerokość lub 50%
  - PrimeNG Button z severity="warn" dla rywala - pełna szerokość lub 50%
  - Układ: flexbox row z gap, oba przyciski tej samej wielkości
  - Minimalna wysokość 64px dla touch targets
  - Ikony pi-plus lub pi-check przed label

- **Obsługiwane interakcje:**
  - Kliknięcie przycisku - emituje zdarzenie `pointScored` z informacją kto zdobył punkt

- **Obsługiwana walidacja:**
  - Disabled podczas operacji API (przekazywane przez prop `disabled`)

- **Typy:**
  - `SideEnum` - kto zdobył punkt

- **Propsy:**
  - `playerName: string` - nazwa zawodnika (wyświetlana na przycisku)
  - `opponentName: string` - nazwa rywala (wyświetlana na przycisku)
  - `disabled: boolean` - blokada podczas operacji
  - `pointScored: EventEmitter<SideEnum>` - zdarzenie zdobycia punktu

### 4.5 MatchControlActions

- **Opis:** Grupa przycisków akcji kontrolujących przebieg meczu: cofnij punkt, zakończ set, zakończ mecz. Przyciski mają warunki aktywacji.

- **Główne elementy:**
  - PrimeNG Button (outlined, icon pi-undo) - "Cofnij punkt"
  - PrimeNG Button (outlined, icon pi-check) - "Zakończ set"
  - PrimeNG Button (outlined, severity="danger", icon pi-stop) - "Zakończ mecz"
  - Układ: flexbox wrap z gap, responsywny

- **Obsługiwane interakcje:**
  - Kliknięcie "Cofnij punkt" - emituje zdarzenie `undoPoint`
  - Kliknięcie "Zakończ set" - emituje zdarzenie `finishSet` (rodzic otwiera dialog)
  - Kliknięcie "Zakończ mecz" - emituje zdarzenie `finishMatch` (rodzic otwiera dialog)

- **Obsługiwana walidacja:**
  - "Cofnij punkt" - disabled jeśli brak punktów w secie LUB isLoading
  - "Zakończ set" - disabled jeśli wynik remisowy LUB to ostatni set LUB isLoading
  - "Zakończ mecz" - disabled jeśli wynik setów/punktów remisowy LUB isLoading

- **Typy:**
  - `boolean` dla stanów disabled każdego przycisku

- **Propsy:**
  - `canUndoPoint: boolean` - czy można cofnąć punkt
  - `canFinishSet: boolean` - czy można zakończyć set
  - `canFinishMatch: boolean` - czy można zakończyć mecz
  - `disabled: boolean` - globalna blokada (isLoading)
  - `undoPoint: EventEmitter<void>` - zdarzenie cofnięcia punktu
  - `finishSet: EventEmitter<void>` - zdarzenie żądania zakończenia seta
  - `finishMatch: EventEmitter<void>` - zdarzenie żądania zakończenia meczu

### 4.6 SetsHistoryTable (współdzielony)

- **Lokalizacja:** `src/components/shared/sets-history-table.component.ts`
- **Selector:** `app-sets-history-table`

- **Opis:** Tabela PrimeNG Table wyświetlająca listę setów z wynikami punktowymi. Komponent współdzielony między widokami "W toku" (Live Match) i "Zakończony" (Match Summary). Pełna specyfikacja znajduje się w [shared-frontend-implementation-plan.md](./shared-frontend-implementation-plan.md#5-setshistorytable-komponent-współdzielony).

- **Główne elementy:**
  - PrimeNG Table z opcjami: `size="small"`, `stripedRows`, `scrollable`
  - Kolumny: Nr seta, Zawodnik (wynik), Rywal (wynik), Zwycięzca/Status
  - Wyróżnienie bieżącego seta (inny kolor tła - np. klasa `bg-primary-50`)
  - Kolumna zwycięzcy z PrimeNG Tag (success dla player, warn dla opponent)
  - Responsive: horizontal scroll na małych ekranach

- **Obsługiwane interakcje:**
  - Brak bezpośrednich interakcji (komponent prezentacyjny)

- **Obsługiwana walidacja:**
  - Brak

- **Typy:**
  - `SetDetailDto[]` - lista setów

- **Propsy:**
  - `sets: SetDetailDto[]` - lista setów do wyświetlenia
  - `currentSetId: number | null` - ID bieżącego seta (do wyróżnienia)
  - `playerName: string` - nazwa zawodnika (nagłówek kolumny)
  - `opponentName: string` - nazwa rywala (nagłówek kolumny)

### 4.7 FinishSetDialog

- **Opis:** Modal PrimeNG Dialog do zakończenia seta z opcjonalnymi uwagami trenera.

- **Główne elementy:**
  - PrimeNG Dialog z `modal="true"`, `closable="true"`
  - Header: "Zakończ set [numer]"
  - Content: PrimeNG Textarea na uwagi (opcjonalne), z FloatLabel "Uwagi do seta"
  - Footer: PrimeNG Button "Anuluj" (outlined) + PrimeNG Button "Zapisz" (primary)
  - Wyświetlenie aktualnego wyniku seta dla potwierdzenia

- **Obsługiwane interakcje:**
  - Wpisanie uwag (ngModel binding)
  - Kliknięcie "Anuluj" - zamknięcie dialogu, reset formularza
  - Kliknięcie "Zapisz" - emituje zdarzenie `confirm` z uwagami

- **Obsługiwana walidacja:**
  - coach_notes: opcjonalne, string, max 5000 znaków
  - Walidacja długości z komunikatem błędu

- **Typy:**
  - `FinishSetCommandDto` - dane wysyłane do API

- **Propsy:**
  - `visible: boolean` - widoczność dialogu (two-way binding)
  - `setNumber: number` - numer seta do wyświetlenia w nagłówku
  - `currentScore: { player: number; opponent: number }` - wynik do potwierdzenia
  - `isLoading: boolean` - blokada przycisków podczas zapisu
  - `cancel: EventEmitter<void>` - zdarzenie anulowania
  - `confirm: EventEmitter<string | null>` - zdarzenie potwierdzenia z uwagami

### 4.8 FinishMatchDialog

- **Opis:** Modal PrimeNG Dialog do zakończenia meczu z opcjonalnymi uwagami trenera.

- **Główne elementy:**
  - PrimeNG Dialog z `modal="true"`, `closable="true"`
  - Header: "Zakończ mecz"
  - Content:
    - Podsumowanie wyniku setowego (np. "Jan 3 - 1 Adam")
    - Informacja o zwycięzcy
    - PrimeNG Textarea na uwagi do całego meczu (opcjonalne), z FloatLabel "Uwagi do meczu"
  - Footer: PrimeNG Button "Anuluj" (outlined) + PrimeNG Button "Zakończ mecz" (severity="danger")

- **Obsługiwane interakcje:**
  - Wpisanie uwag (ngModel binding)
  - Kliknięcie "Anuluj" - zamknięcie dialogu
  - Kliknięcie "Zakończ mecz" - emituje zdarzenie `confirm` z uwagami

- **Obsługiwana walidacja:**
  - coach_notes: opcjonalne, string, max 5000 znaków

- **Typy:**
  - `FinishMatchCommandDto` - dane wysyłane do API

- **Propsy:**
  - `visible: boolean` - widoczność dialogu (two-way binding)
  - `playerName: string` - nazwa zawodnika
  - `opponentName: string` - nazwa rywala
  - `setsWonPlayer: number` - wygrane sety zawodnika
  - `setsWonOpponent: number` - wygrane sety rywala
  - `generateAiSummary: boolean` - czy generować AI (do wyświetlenia info)
  - `isLoading: boolean` - blokada podczas zapisu
  - `cancel: EventEmitter<void>` - zdarzenie anulowania
  - `confirm: EventEmitter<string | null>` - zdarzenie potwierdzenia

## 5. Typy

### 5.1 Typy z API (importowane z types.ts)

**Używane typy response:**

- `MatchDetailDto` - pełne dane meczu z current_set i opcjonalnymi sets
- `CurrentSetDto` - informacje o bieżącym secie (id, sequence, score, is_golden, current_server)
- `SetDetailDto` - szczegóły seta z opcjonalnymi points
- `TagDto` - tag (id, name, is_system, order_in_list)
- `CreatePointDto` - odpowiedź po dodaniu punktu (zawiera set_state)
- `UndoPointDto` - odpowiedź po cofnięciu punktu (zawiera set_state)
- `FinishSetDto` - odpowiedź po zakończeniu seta (finished_set + next_set)
- `FinishMatchDto` - odpowiedź po zakończeniu meczu
- `SetStateDto` - stan seta po operacji punktowej

**Używane typy request (Command DTOs):**

- `CreatePointCommandDto` - { scored_by: SideEnum, tag_ids?: number[] }
- `FinishSetCommandDto` - { coach_notes?: string | null }
- `FinishMatchCommandDto` - { coach_notes?: string | null }

**Używane typy response wrapper:**

- `SingleItemResponseDto<T>` - wrapper { data: T }
- `ListResponseDto<T>` - wrapper { data: T[] }

**Enumy:**

- `SideEnum` - 'player' | 'opponent'
- `MatchStatusEnum` - 'in_progress' | 'finished'

### 5.2 ViewModel dla widoku (definiowany lokalnie)

```typescript
/**
 * Główny ViewModel dla widoku meczu na żywo
 * Obliczane właściwości są computed signals w serwisie stanu
 */
interface LiveMatchViewModel {
  // Dane meczu (z API)
  matchId: number;
  playerName: string;
  opponentName: string;
  maxSets: number;
  goldenSetEnabled: boolean;
  generateAiSummary: boolean;

  // Wynik setowy
  setsWonPlayer: number;
  setsWonOpponent: number;

  // Bieżący set (null jeśli mecz zakończony)
  currentSet: CurrentSetDto | null;

  // Lista setów (historia)
  sets: SetDetailDto[];

  // Dostępne tagi (z osobnego GET /api/tags)
  tags: TagDto[];

  // Wybrane tagi (stan lokalny, resetowany po każdym punkcie)
  selectedTagIds: number[];

  // Stany UI
  isLoading: boolean;
  error: string | null;

  // Stany modali
  isFinishSetDialogVisible: boolean;
  isFinishMatchDialogVisible: boolean;
}
```

### 5.3 Obliczane flagi (computed w serwisie)

```typescript
// canUndoPoint - czy można cofnąć punkt
// true jeśli: currentSet istnieje && (set_score_player + set_score_opponent) > 0 && !isLoading

// canFinishSet - czy można zakończyć set
// true jeśli: currentSet istnieje && wynik != remis && nie jest to ostatni set meczu && !isLoading

// canFinishMatch - czy można zakończyć mecz
// true jeśli: currentSet istnieje && wynik punktowy != remis && wynik setowy (po secie) != remis && !isLoading
```

## 6. Zarządzanie stanem

### 6.1 LiveMatchStore (Angular Signal Store z @ngrx/signals lub custom service)

Serwis stanu wykorzystuje Angular Signals dla reaktywności. Może być zaimplementowany jako:

- Prosty serwis Injectable z signals
- Lub @ngrx/signals SignalStore (jeśli jest w projekcie)

**Struktura stanu:**

1. **Stan główny (writeable signals):**
   - `_matchData: WritableSignal<MatchDetailDto | null>`
   - `_tags: WritableSignal<TagDto[]>`
   - `_selectedTagIds: WritableSignal<number[]>`
   - `_isLoading: WritableSignal<boolean>`
   - `_error: WritableSignal<string | null>`
   - `_isFinishSetDialogVisible: WritableSignal<boolean>`
   - `_isFinishMatchDialogVisible: WritableSignal<boolean>`

2. **Computed signals (readonly):**
   - `matchData = this._matchData.asReadonly()`
   - `currentSet = computed(() => this._matchData()?.current_set ?? null)`
   - `sets = computed(() => this._matchData()?.sets ?? [])`
   - `playerName = computed(() => this._matchData()?.player_name ?? '')`
   - `opponentName = computed(() => this._matchData()?.opponent_name ?? '')`
   - `setsWonPlayer = computed(() => this._matchData()?.sets_won_player ?? 0)`
   - `setsWonOpponent = computed(() => this._matchData()?.sets_won_opponent ?? 0)`
   - `canUndoPoint = computed(() => ...)`
   - `canFinishSet = computed(() => ...)`
   - `canFinishMatch = computed(() => ...)`

3. **Metody akcji:**
   - `loadMatch(matchId: number): void` - pobranie danych meczu
   - `loadTags(): void` - pobranie listy tagów
   - `toggleTag(tagId: number): void` - toggle tagu w selekcji
   - `clearSelectedTags(): void` - wyczyść zaznaczone tagi
   - `scorePoint(scoredBy: SideEnum): void` - rejestracja punktu
   - `undoLastPoint(): void` - cofnięcie ostatniego punktu
   - `openFinishSetDialog(): void` - otwarcie dialogu zakończenia seta
   - `closeFinishSetDialog(): void` - zamknięcie dialogu
   - `finishSet(coachNotes: string | null): void` - zakończenie seta
   - `openFinishMatchDialog(): void` - otwarcie dialogu zakończenia meczu
   - `closeFinishMatchDialog(): void` - zamknięcie dialogu
   - `finishMatch(coachNotes: string | null): void` - zakończenie meczu
   - `reset(): void` - reset całego stanu

### 6.2 Przepływ aktualizacji stanu

1. **Inicjalizacja (OnInit komponentu głównego):**
   - Równoległe wywołanie: `loadMatch(matchId)` i `loadTags()`
   - Ustawienie `isLoading = true`
   - Po otrzymaniu odpowiedzi: aktualizacja `_matchData` i `_tags`
   - Sprawdzenie statusu meczu - jeśli 'finished' → redirect do /summary
   - Ustawienie `isLoading = false`

2. **Po dodaniu punktu (`scorePoint`):**
   - Ustawienie `isLoading = true`
   - Wywołanie API: `POST /api/sets/{setId}/points/create`
   - Po sukcesie: aktualizacja `currentSet` z `response.set_state`
   - Wyczyść `selectedTagIds`
   - Ustawienie `isLoading = false`
   - Toast sukcesu (opcjonalnie)

3. **Po cofnięciu punktu (`undoLastPoint`):**
   - Ustawienie `isLoading = true`
   - Wywołanie API: `DELETE /api/sets/{setId}/points/delete`
   - Po sukcesie: aktualizacja `currentSet` z `response.set_state`
   - Ustawienie `isLoading = false`

4. **Po zakończeniu seta (`finishSet`):**
   - Ustawienie `isLoading = true`
   - Wywołanie API: `POST /api/sets/{setId}/finish`
   - Po sukcesie:
     - Dodanie zakończonego seta do listy `sets`
     - Aktualizacja `setsWonPlayer` lub `setsWonOpponent`
     - Ustawienie `current_set = response.next_set`
   - Zamknięcie dialogu
   - Ustawienie `isLoading = false`

5. **Po zakończeniu meczu (`finishMatch`):**
   - Ustawienie `isLoading = true`
   - Wywołanie API: `POST /api/matches/{matchId}/finish`
   - Po sukcesie:
     - Toast "Mecz zakończony. Generowanie raportu AI..."
     - Redirect do `/matches/{matchId}/summary`
   - Po błędzie:
     - Toast z komunikatem błędu
     - Ustawienie `isLoading = false`

## 7. Integracja API

### 7.1 Endpointy wykorzystywane przez widok

| Endpoint                                     | Metoda | Request                 | Response                                | Użycie               |
| -------------------------------------------- | ------ | ----------------------- | --------------------------------------- | -------------------- |
| `/api/matches/{id}?include=sets,points,tags` | GET    | -                       | `SingleItemResponseDto<MatchDetailDto>` | Inicjalizacja widoku |
| `/api/tags`                                  | GET    | -                       | `ListResponseDto<TagDto>`               | Pobranie listy tagów |
| `/api/sets/{setId}/points/create`            | POST   | `CreatePointCommandDto` | `SingleItemResponseDto<CreatePointDto>` | Dodanie punktu       |
| `/api/sets/{setId}/points/delete`            | DELETE | -                       | `SingleItemResponseDto<UndoPointDto>`   | Cofnięcie punktu     |
| `/api/sets/{id}/finish`                      | POST   | `FinishSetCommandDto`   | `SingleItemResponseDto<FinishSetDto>`   | Zakończenie seta     |
| `/api/matches/{id}/finish`                   | POST   | `FinishMatchCommandDto` | `SingleItemResponseDto<FinishMatchDto>` | Zakończenie meczu    |

### 7.2 Serwis API (Angular HttpClient)

Serwis `LiveMatchApiService` jako Injectable z metodami:

- `getMatch(matchId: number): Observable<MatchDetailDto>`
- `getTags(): Observable<TagDto[]>`
- `createPoint(setId: number, command: CreatePointCommandDto): Observable<CreatePointDto>`
- `undoPoint(setId: number): Observable<UndoPointDto>`
- `finishSet(setId: number, command: FinishSetCommandDto): Observable<FinishSetDto>`
- `finishMatch(matchId: number, command: FinishMatchCommandDto): Observable<FinishMatchDto>`

Serwis wykorzystuje `HttpClient` z odpowiednim error handling i mapowaniem odpowiedzi (wyciąganie `data` z wrappera).

## 8. Interakcje użytkownika

### 8.1 Rejestracja punktu

1. Użytkownik (opcjonalnie) klika tagi w `TagSelectionPanel` - toggle zaznaczenia
2. Użytkownik klika przycisk "+Zawodnik" lub "+Rywal" w `PointScoringButtons`
3. UI wyświetla BlockUI overlay z spinnerem
4. Wysyłany jest `POST /api/sets/{setId}/points/create` z `scored_by` i `tag_ids`
5. Po sukcesie:
   - Aktualizacja wyniku na `ScoreDisplayCard`
   - Aktualizacja wskaźnika serwującego
   - Wyczyść zaznaczone tagi w `TagSelectionPanel`
   - Ukryj BlockUI
6. Po błędzie:
   - Toast z komunikatem błędu
   - Ukryj BlockUI

### 8.2 Cofnięcie punktu

1. Użytkownik klika "Cofnij punkt" w `MatchControlActions` (aktywny tylko gdy są punkty)
2. UI wyświetla BlockUI overlay
3. Wysyłany jest `DELETE /api/sets/{setId}/points/delete`
4. Po sukcesie:
   - Aktualizacja wyniku na `ScoreDisplayCard`
   - Aktualizacja wskaźnika serwującego
   - Ukryj BlockUI
5. Po błędzie:
   - Toast z komunikatem
   - Ukryj BlockUI

### 8.3 Zakończenie seta

1. Użytkownik klika "Zakończ set" w `MatchControlActions` (aktywny gdy wynik nie jest remisowy)
2. Otwiera się `FinishSetDialog`
3. Użytkownik (opcjonalnie) wpisuje uwagi do seta
4. Użytkownik klika "Zapisz"
5. UI wyświetla loading na przycisku
6. Wysyłany jest `POST /api/sets/{setId}/finish`
7. Po sukcesie:
   - Zamknij dialog
   - Zaktualizuj `SetsHistoryTable` - dodaj zakończony set
   - Ustaw nowy bieżący set na `ScoreDisplayCard`
   - Zaktualizuj wynik setowy
   - Ukryj loading
8. Po błędzie:
   - Toast z komunikatem
   - Nie zamykaj dialogu (użytkownik może poprawić)
   - Ukryj loading

### 8.4 Zakończenie meczu

1. Użytkownik klika "Zakończ mecz" w `MatchControlActions` (aktywny gdy wyniki nie są remisowe)
2. Otwiera się `FinishMatchDialog` z podsumowaniem wyniku
3. Użytkownik (opcjonalnie) wpisuje uwagi do meczu
4. Użytkownik klika "Zakończ mecz"
5. UI wyświetla loading
6. Wysyłany jest `POST /api/matches/{matchId}/finish`
7. Po sukcesie:
   - Toast "Mecz zakończony. Generowanie raportu AI..." (jeśli AI włączone)
   - Redirect do `/matches/{matchId}/summary`
8. Po błędzie:
   - Toast z komunikatem
   - Ukryj loading

### 8.5 Powrót do listy

1. Użytkownik klika logo "Spin Flow" w `AppNavbarComponent` lub dedykowany przycisk
2. Nawigacja do `/matches`
3. Stan meczu jest już zapisany po stronie serwera (pesymistyczne aktualizacje)

## 9. Warunki i walidacja

### 9.1 Warunki aktywacji przycisków

| Przycisk           | Warunek aktywności                                                                           | Komponent           |
| ------------------ | -------------------------------------------------------------------------------------------- | ------------------- |
| +Zawodnik / +Rywal | `!isLoading`                                                                                 | PointScoringButtons |
| Cofnij punkt       | `canUndoPoint = (set_score_player + set_score_opponent) > 0 && !isLoading`                   | MatchControlActions |
| Zakończ set        | `canFinishSet = wynik != remis && nie ostatni set && !isLoading`                             | MatchControlActions |
| Zakończ mecz       | `canFinishMatch = wynik punktowy != remis && wynik setowy (po secie) != remis && !isLoading` | MatchControlActions |

### 9.2 Logika obliczania flag

**canUndoPoint:**

```
currentSet != null
  && (currentSet.set_score_player + currentSet.set_score_opponent) > 0
  && !isLoading
```

**canFinishSet:**

```
currentSet != null
  && currentSet.set_score_player != currentSet.set_score_opponent
  && (setsWonPlayer + setsWonOpponent + 1) < maxSets
  && !isLoading
```

**canFinishMatch:**

```
currentSet != null
  && currentSet.set_score_player != currentSet.set_score_opponent
  && (obliczony wynik setów po bieżącym secie nie jest remisem)
  && !isLoading
```

### 9.3 Walidacja formularzy w dialogach

| Pole               | Walidacja                   | Komunikat błędu                          |
| ------------------ | --------------------------- | ---------------------------------------- |
| coach_notes (set)  | opcjonalne, max 5000 znaków | "Uwagi nie mogą przekraczać 5000 znaków" |
| coach_notes (mecz) | opcjonalne, max 5000 znaków | "Uwagi nie mogą przekraczać 5000 znaków" |

## 10. Obsługa błędów

### 10.1 Błędy HTTP

| Kod | Typ           | Obsługa w UI                                                   |
| --- | ------------- | -------------------------------------------------------------- |
| 401 | Unauthorized  | Toast "Sesja wygasła. Zaloguj się ponownie." + redirect do `/` |
| 403 | Forbidden     | Toast "Brak dostępu do tego meczu" + redirect do `/matches`    |
| 404 | Not Found     | Toast "Mecz nie istnieje" + redirect do `/matches`             |
| 422 | Validation    | Toast z komunikatem z `response.error.message`                 |
| 500 | Server Error  | Toast "Błąd serwera. Spróbuj ponownie później."                |
| 0   | Network Error | Toast "Błąd połączenia. Sprawdź połączenie z internetem."      |

### 10.2 Błędy walidacji biznesowej (422)

| Błąd                        | Komunikat                                 | Obsługa                          |
| --------------------------- | ----------------------------------------- | -------------------------------- |
| Match already finished      | "Ten mecz jest już zakończony"            | Toast + redirect do /summary     |
| Set already finished        | "Ten set jest już zakończony"             | Toast + odświeżenie danych meczu |
| Score is tied               | "Wynik nie może być remisowy"             | Toast                            |
| No points to undo           | "Brak punktów do cofnięcia"               | Toast                            |
| Last set - use finish match | "To ostatni set - użyj zakończenia meczu" | Toast                            |

### 10.3 Edge cases

| Sytuacja                              | Zachowanie UI                                                    |
| ------------------------------------- | ---------------------------------------------------------------- |
| Mecz nie istnieje                     | Redirect do `/matches` + toast                                   |
| Mecz zakończony przy wejściu na /live | Redirect do `/matches/{id}/summary`                              |
| Mecz innego użytkownika               | Redirect do `/matches` + toast                                   |
| Odświeżenie strony (F5)               | Ponowne pobranie danych z API                                    |
| Wynik 10:10 w secie                   | Automatyczna zmiana trybu serwowania (obsługiwane przez backend) |
| Golden set                            | Serwowanie co 1 punkt (obsługiwane przez backend)                |

## 11. Kroki implementacji

### Faza 1: Struktura i konfiguracja (1-2h)

1. **Utworzenie strony Astro**
   - Plik: `src/pages/matches/[id]/live.astro`
   - Import AppNavbarComponent z shared
   - Integracja z Angular przez `client:only="angular"`
   - Przekazanie `matchId` z params do komponentu Angular

2. **Utworzenie struktury katalogów**
   - `src/components/live-match/` - folder główny
   - `src/components/live-match/components/` - komponenty potomne
   - `src/components/live-match/services/` - serwisy

### Faza 2: Serwisy (2-3h)

3. **Utworzenie serwisu API**
   - Plik: `src/components/live-match/services/live-match-api.service.ts`
   - Implementacja wszystkich metod HTTP
   - Error handling i mapowanie response

4. **Utworzenie serwisu stanu**
   - Plik: `src/components/live-match/services/live-match-store.service.ts`
   - Implementacja signals i computed
   - Metody akcji z integracją API

### Faza 3: Komponenty prezentacyjne (3-4h)

5. **ScoreDisplayCard**
   - Plik: `src/components/live-match/components/score-display-card.component.ts`
   - PrimeNG Card + Tag + custom styling
   - Wynik setowy, punktowy, serwujący

6. **TagSelectionPanel**
   - Plik: `src/components/live-match/components/tag-selection-panel.component.ts`
   - PrimeNG SelectButton w trybie multiple
   - Responsywny układ

7. **PointScoringButtons**
   - Plik: `src/components/live-match/components/point-scoring-buttons.component.ts`
   - Dwa duże PrimeNG Button
   - Kolory severity info/warn

8. **MatchControlActions**
   - Plik: `src/components/live-match/components/match-control-actions.component.ts`
   - Trzy PrimeNG Button outlined
   - Logika disabled

9. **SetsHistoryTable (współdzielony)**
   - Plik: `src/components/shared/sets-history-table.component.ts`
   - Selector: `app-sets-history-table`
   - PrimeNG Table compact
   - Wyróżnienie bieżącego seta
   - Specyfikacja w shared-frontend-implementation-plan.md (sekcja 5)
   - Komponent reużywalny w widoku Match Summary

### Faza 4: Dialogi (2h)

10. **FinishSetDialog**
    - Plik: `src/components/live-match/components/finish-set-dialog.component.ts`
    - PrimeNG Dialog + Textarea + Button
    - Walidacja długości uwag

11. **FinishMatchDialog**
    - Plik: `src/components/live-match/components/finish-match-dialog.component.ts`
    - PrimeNG Dialog + podsumowanie + Textarea + Button

### Faza 5: Komponent główny (2-3h)

12. **LiveMatchPageComponent**
    - Plik: `src/components/live-match/live-match-page.component.ts`
    - Standalone component z importami wszystkich komponentów (w tym `AppNavbarComponent`)
    - Template zgodny ze wzorcem z shared-frontend-implementation-plan (navbar → toast → main)
    - Inicjalizacja i koordynacja
    - PrimeNG BlockUI + Toast
    - Routing i redirecty

### Faza 6: Integracja i testy (2h)

13. **Integracja z Astro**
    - Sprawdzenie przekazywania matchId
    - Test nawigacji i redirectów
    - Weryfikacja AuthGuard (zaślepka do implementacji w przyszłości)

14. **Testy manualne**
    - Wszystkie scenariusze interakcji
    - Edge cases (remis, ostatni set, błędy sieciowe)
    - Responsywność (mobile, tablet, desktop)

### Faza 7: Stylowanie finalne (1-2h)

15. **Dopracowanie UI**
    - Dopasowanie kolorów do design tokens PrimeNG (Aura preset)
    - Animacje przejść (jeśli potrzebne)
    - Feedback wizualny przy akcjach
    - Dostępność (aria-labels, focus management)
    - Dark mode (automatyczne przez PrimeNG Aura)

### Struktura plików końcowa

```
src/
├── pages/
│   └── matches/
│       └── [id]/
│           └── live.astro
└── components/
    ├── shared/
    │   ├── app-navbar.component.ts          # Współdzielony - nawigacja główna
    │   ├── app-navbar.types.ts              # Typy nawigacji
    │   └── sets-history-table.component.ts  # Współdzielony z Match Summary
    └── live-match/
        ├── live-match-page.component.ts     # Główny komponent strony
        ├── services/
        │   ├── live-match-api.service.ts
        │   └── live-match-store.service.ts
        └── components/
            ├── score-display-card.component.ts
            ├── tag-selection-panel.component.ts
            ├── point-scoring-buttons.component.ts
            ├── match-control-actions.component.ts
            ├── finish-set-dialog.component.ts
            └── finish-match-dialog.component.ts
```

### Szacowany czas implementacji

| Faza                             | Czas       |
| -------------------------------- | ---------- |
| Faza 1: Struktura i konfiguracja | 1-2h       |
| Faza 2: Serwisy                  | 2-3h       |
| Faza 3: Komponenty prezentacyjne | 3-4h       |
| Faza 4: Dialogi                  | 2h         |
| Faza 5: Komponent główny         | 2-3h       |
| Faza 6: Integracja i testy       | 2h         |
| Faza 7: Stylowanie finalne       | 1-2h       |
| **Razem**                        | **13-18h** |

### Uwagi końcowe

1. **Autentykacja:** Na tym etapie mechanizm autentykacji nie jest jeszcze zdefiniowany. Komponent główny powinien przewidzieć miejsce na weryfikację sesji użytkownika (placeholder do przyszłej implementacji).

2. **PrimeNG Aura Preset:** Widok wykorzystuje preset Aura dla dark mode i design tokens. Nie ma potrzeby definiowania własnych CSS variables - wszystko obsługiwane przez PrimeNG.

3. **Reużywalne komponenty:** `SetsHistoryTable` znajduje się w katalogu `src/components/shared/` i jest współdzielony z widokiem "Zakończony" (Match Summary).

4. **Error Handling:** Zaleca się utworzenie globalnego HTTP interceptora dla spójnej obsługi błędów (opisanego w shared-frontend-implementation-plan).
