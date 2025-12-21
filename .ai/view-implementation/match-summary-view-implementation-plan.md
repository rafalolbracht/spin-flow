# Plan implementacji widoku Mecz "Zakończony" (Match Summary)

## 1. Przegląd

Widok meczu "Zakończony" służy do przeglądu zakończonego meczu tenisa stołowego. Prezentuje pełne podsumowanie meczu, w tym wyniki setów, uwagi trenera oraz raport wygenerowany przez AI. Trener może edytować wybrane metadane meczu (nazwy zawodników, uwagi) oraz udostępniać mecz za pomocą publicznego linku.

### Główne funkcjonalności

- Wyświetlanie danych ogólnych meczu (nazwy zawodników, data, wynik setowy)
- Prezentacja tabeli setów z wynikami punktowymi
- Wyświetlanie uwag trenera do meczu i poszczególnych setów (accordion)
- Prezentacja raportu AI (opis meczu i zalecenia) z obsługą stanów: pending, success, error
- Możliwość ręcznego odświeżenia raportu AI
- Edycja metadanych meczu (nazwy zawodników, uwagi do meczu, uwagi do setów)
- Generowanie i kopiowanie publicznego linku do meczu

### Powiązane User Stories

| US ID  | Tytuł                                | Opis                                                             |
| ------ | ------------------------------------ | ---------------------------------------------------------------- |
| US-060 | Przegląd zakończonego meczu          | Wyświetlenie pełnego przeglądu z wynikami, uwagami i raportem AI |
| US-061 | Edycja metadanych meczu zakończonego | Korekta nazw zawodników i uwag bez zmiany przebiegu              |
| US-070 | Wygenerowanie publicznego linku      | Udostępnienie zakończonego meczu za pomocą publicznego linku     |
| US-080 | Raport AI                            | Automatyczne wygenerowanie raportu AI po zakończeniu meczu       |
| US-081 | Obsługa błędu generowania AI         | Komunikat błędu gdy AI się nie powiedzie                         |
| US-100 | Loader podczas operacji              | Blokowanie UI podczas operacji API                               |
| US-110 | Czas w lokalnej strefie              | Wyświetlanie czasu startu w strefie użytkownika                  |

## 2. Routing widoku

- **Ścieżka:** `/matches/:id/summary`
- **Plik Astro:** `src/pages/matches/[id]/summary.astro`
- **Dostęp:** Chroniony - wymaga autentykacji

### Warunki dostępu

| Warunek                           | Zachowanie                                          |
| --------------------------------- | --------------------------------------------------- |
| Brak sesji użytkownika            | Redirect do `/` (landing page)                      |
| Mecz nie istnieje                 | Redirect do `/matches` z komunikatem błędu          |
| Mecz należy do innego użytkownika | Redirect do `/matches` z komunikatem "Brak dostępu" |
| Mecz ma status `in_progress`      | Redirect do `/matches/:id/live`                     |

**Uwaga:** Szczegółowa implementacja mechanizmu autentykacji i guardów będzie określona w przyszłości wraz z integracją Supabase Auth.

## 3. Struktura komponentów

Widok wykorzystuje wzorzec PrimeBlocks "Application Shell" z nawigacją globalną (AppNavbarComponent) oraz główną zawartością w postaci sekcji kart i paneli.

```
MatchSummaryPage (Astro)
└── MatchSummaryPageComponent (Angular - root, client:only="angular", selector: app-match-summary-page)
    ├── AppNavbarComponent (selector: app-navbar) - nawigacja główna (współdzielona)
    ├── p-toast (PrimeNG - globalne powiadomienia)
    │
    └── <main> - kontener zawartości (class="container mx-auto p-4")
        ├── [Stan ładowania: p-skeleton placeholders]
        │
        └── [Stan załadowany:]
            ├── Sekcja nagłówka meczu (p-card)
            │   ├── Nazwy zawodników z wynikiem setowym
            │   ├── Data i godzina startu (sformatowana lokalnie)
            │   └── Przycisk edycji (p-button icon)
            │
            ├── Sekcja tabeli setów (app-sets-history-table - współdzielony)
            │   └── Lista setów z wynikami punktowymi i zwycięzcami
            │
            ├── Sekcja uwag trenera (p-accordion)
            │   ├── Panel "Uwagi do meczu" z przyciskiem edycji
            │   └── Panele "Uwagi do seta X" (dla każdego seta z uwagami)
            │
            ├── Sekcja raportu AI (p-panel / p-card)
            │   ├── [pending] p-progress-spinner + tekst
            │   ├── [success] Opis meczu + Zalecenia
            │   ├── [error] p-message severity="error"
            │   └── Przycisk "Odśwież raport" (p-button)
            │
            ├── Sekcja akcji (p-toolbar / flex container)
            │   ├── Przycisk "Powrót do listy" (p-button outlined)
            │   └── Przycisk "Udostępnij mecz" (p-button primary)
            │
            └── Dialogi modalne
                ├── app-share-dialog (p-dialog)
                ├── app-edit-match-dialog (p-dialog)
                ├── app-edit-match-notes-dialog (p-dialog)
                └── app-edit-set-notes-dialog (p-dialog)
```

## 4. Szczegóły komponentów

### 4.1 MatchSummaryPageComponent

**Lokalizacja:** `src/components/match-summary/match-summary-page.component.ts`

**Selector:** `app-match-summary-page`

**Opis:** Główny komponent kontenera zarządzający widokiem zakończonego meczu. Odpowiada za inicjalizację danych, koordynację akcji użytkownika i zarządzanie stanem. Używa podejścia "smart container" - pobiera dane i przekazuje je do komponentów prezentacyjnych. Zawiera AppNavbarComponent jako współdzielony element nawigacji zgodnie ze wzorcem z [shared-frontend-implementation-plan.md](./shared-frontend-implementation-plan.md#39-wzorzec-integracji-z-widokami).

**Główne elementy** (zgodnie ze wzorcem shared-frontend):

- `<app-navbar>` - komponent nawigacji głównej (współdzielony)
- `<p-toast>` - komponent powiadomień
- `<main>` - kontener z klasami Tailwind dla responsywnego layoutu (`container mx-auto p-4`)
- Sekcje z danymi meczu renderowane warunkowo na podstawie stanu ładowania
- Skeleton placeholders podczas ładowania danych
- Wszystkie dialogi modalne jako komponenty dzieci

**Obsługiwane interakcje:**

- Inicjalizacja - pobranie danych meczu z setami i raportem AI przy `ngOnInit`
- Obsługa zdarzeń z komponentów dzieci (edycja, udostępnianie, odświeżanie AI)
- Nawigacja powrotna do listy meczów

**Obsługiwana walidacja:**

- Weryfikacja statusu meczu (redirect do `/live` jeśli `in_progress`)
- Blokowanie UI podczas operacji API (poprzez signal `isLoading`)

**Typy:**

- `MatchDetailDto` - dane meczu z setami i raportem AI
- `MatchSummaryViewModel` - stan widoku (signals)

**Propsy:** Brak (komponent root, pobiera matchId z URL przez mechanizm Astro)

---

### 4.2 MatchHeaderSectionComponent

**Lokalizacja:** `src/components/match-summary/match-header-section.component.ts`

**Opis:** Sekcja nagłówka meczu zbudowana jako `p-card` z PrimeNG. Wyświetla nazwy zawodników, wynik setowy, datę i godzinę startu oraz przycisk edycji. Inspirowana wzorcem PrimeBlocks "Stats Card".

**Główne elementy:**

- `<p-card>` z nagłówkiem "Szczegóły meczu"
- Layout dwukolumnowy (Tailwind grid) dla nazw zawodników
- Nazwa zawodnika (player) po lewej, nazwa rywala (opponent) po prawej
- Wynik setowy centralnie (duża czcionka, format "X : Y")
- Data i godzina startu sformatowana w lokalnej strefie czasowej
- `<p-button>` z ikoną `pi-pencil` do edycji (rounded, text severity)

**Obsługiwane interakcje:**

- Kliknięcie przycisku edycji emituje zdarzenie `editMatchClicked`

**Obsługiwana walidacja:** Brak (komponent prezentacyjny)

**Typy:** Brak specyficznych

**Propsy:**

| Prop               | Typ               | Opis                             |
| ------------------ | ----------------- | -------------------------------- |
| `playerName`       | `input<string>()` | Nazwa zawodnika ocenianego       |
| `opponentName`     | `input<string>()` | Nazwa rywala                     |
| `setsWonPlayer`    | `input<number>()` | Liczba wygranych setów zawodnika |
| `setsWonOpponent`  | `input<number>()` | Liczba wygranych setów rywala    |
| `startedAt`        | `input<string>()` | Data startu (ISO string)         |
| `editMatchClicked` | `output<void>()`  | Zdarzenie kliknięcia edycji      |

---

### 4.3 SetsHistoryTable (współdzielony)

**Lokalizacja:** `src/components/shared/sets-history-table.component.ts`

**Selector:** `app-sets-history-table`

**Opis:** Reużywalna tabela setów zbudowana z `p-table` (PrimeNG DataTable). Wyświetla listę setów z wynikami punktowymi. Komponent współdzielony między widokami "W toku" (Live Match) i "Zakończony" (Match Summary).

**Pełna specyfikacja:** Szczegółowa specyfikacja komponentu znajduje się w [shared-frontend-implementation-plan.md](./shared-frontend-implementation-plan.md#5-setshistorytable-komponent-współdzielony).

**Różnice w użyciu w Match Summary:**

- Prop `currentSetId` przekazywany jako `null` (brak wyróżnienia bieżącego seta - mecz zakończony)
- Wszystkie sety są zakończone, więc kolumna "Zwycięzca/Status" zawsze pokazuje zwycięzcę

**Propsy (zgodnie ze shared-frontend-implementation-plan):**

| Prop           | Typ              | Opis                                        |
| -------------- | ---------------- | ------------------------------------------- |
| `sets`         | `SetDetailDto[]` | Lista setów do wyświetlenia                 |
| `currentSetId` | `number \| null` | ID bieżącego seta (w summary zawsze `null`) |
| `playerName`   | `string`         | Nazwa zawodnika (nagłówek kolumny)          |
| `opponentName` | `string`         | Nazwa rywala (nagłówek kolumny)             |

---

### 4.4 CoachNotesAccordionComponent

**Lokalizacja:** `src/components/match-summary/coach-notes-accordion.component.ts`

**Opis:** Accordion (PrimeNG `p-accordion`) prezentujący uwagi trenera do meczu i poszczególnych setów. Każda sekcja ma przycisk edycji. Inspirowany wzorcem PrimeBlocks "FAQ Accordion".

**Główne elementy:**

- `<p-accordion>` z `[multiple]="true"` (możliwość otwarcia wielu paneli)
- `<p-accordion-panel>` dla uwag do meczu (pierwszy panel)
- `<p-accordion-panel>` dla każdego seta z uwagami (dynamiczne)
- Nagłówek każdego panelu zawiera tytuł i `<p-button>` z ikoną `pi-pencil`
- Treść panelu: tekst uwag lub placeholder "Brak uwag" (`text-muted-color`)
- Wszystkie panele domyślnie zwinięte

**Obsługiwane interakcje:**

- Rozwijanie/zwijanie paneli (wbudowane w `p-accordion`)
- Kliknięcie ikony edycji przy uwagach do meczu emituje `editMatchNotesClicked`
- Kliknięcie ikony edycji przy uwagach do seta emituje `editSetNotesClicked` z `setId`

**Obsługiwana walidacja:** Brak (komponent prezentacyjny)

**Typy:**

- `SetDetailDto[]` - sety z polem `coach_notes`

**Propsy:**

| Prop                    | Typ                       | Opis                                       |
| ----------------------- | ------------------------- | ------------------------------------------ |
| `matchNotes`            | `input<string \| null>()` | Uwagi do meczu                             |
| `sets`                  | `input<SetDetailDto[]>()` | Lista setów z uwagami                      |
| `editMatchNotesClicked` | `output<void>()`          | Zdarzenie edycji uwag meczu                |
| `editSetNotesClicked`   | `output<number>()`        | Zdarzenie edycji uwag seta (emituje setId) |

---

### 4.5 AiReportSectionComponent

**Lokalizacja:** `src/components/match-summary/ai-report-section.component.ts`

**Opis:** Sekcja prezentująca raport AI z trzema możliwymi stanami: pending, success, error. Zbudowana na bazie `p-panel` z PrimeNG. Zawiera przycisk do ręcznego odświeżenia raportu.

**Główne elementy:**

- `<p-panel>` z nagłówkiem "Analiza AI" i ikoną `pi-sparkles`
- **Stan `pending`:**
  - `<p-progress-spinner>` centralnie
  - Tekst "Generowanie raportu AI..."
- **Stan `success`:**
  - Podsekcja "Opis meczu" z tekstem (formatowanie Tailwind prose)
  - Podsekcja "Zalecenia treningowe" z tekstem
- **Stan `error`:**
  - `<p-message>` z `severity="error"` i komunikatem błędu
- **Stan ukryty (AI wyłączone):** Komponent nie renderowany (`@if`)
- Przycisk "Odśwież raport" (`<p-button>` outlined) widoczny dla stanów success/error
- Wskaźnik ładowania podczas odświeżania (loading state na przycisku)

**Obsługiwane interakcje:**

- Kliknięcie "Odśwież raport" emituje `refreshClicked`

**Obsługiwana walidacja:** Brak (komponent prezentacyjny)

**Typy:**

- `AiReportDto | null` - dane raportu AI
- `AiStatusEnum` - status: 'pending', 'success', 'error'

**Propsy:**

| Prop             | Typ                            | Opis                           |
| ---------------- | ------------------------------ | ------------------------------ |
| `report`         | `input<AiReportDto \| null>()` | Dane raportu AI                |
| `isAiEnabled`    | `input<boolean>()`             | Czy AI było włączone dla meczu |
| `isRefreshing`   | `input<boolean>()`             | Czy trwa odświeżanie           |
| `refreshClicked` | `output<void>()`               | Zdarzenie odświeżenia          |

---

### 4.6 MatchActionsSectionComponent

**Lokalizacja:** `src/components/match-summary/match-actions-section.component.ts`

**Opis:** Sekcja z przyciskami akcji: powrót do listy i udostępnianie meczu. Zbudowana jako `<p-toolbar>` dla spójnego układu.

**Główne elementy:**

- `<p-toolbar>` jako kontener z flex justify-between
- **Lewa strona:**
  - `<p-button>` "Powrót do listy" z ikoną `pi-arrow-left`, severity="secondary", outlined
- **Prawa strona:**
  - `<p-button>` "Udostępnij mecz" z ikoną `pi-share-alt`, severity="primary"

**Obsługiwane interakcje:**

- Kliknięcie "Powrót do listy" emituje `backToListClicked`
- Kliknięcie "Udostępnij mecz" emituje `shareClicked`

**Obsługiwana walidacja:** Brak

**Propsy:**

| Prop                | Typ                | Opis                         |
| ------------------- | ------------------ | ---------------------------- |
| `disabled`          | `input<boolean>()` | Czy przyciski są zablokowane |
| `backToListClicked` | `output<void>()`   | Zdarzenie powrotu            |
| `shareClicked`      | `output<void>()`   | Zdarzenie udostępniania      |

---

### 4.7 ShareDialogComponent

**Lokalizacja:** `src/components/match-summary/dialogs/share-dialog.component.ts`

**Opis:** Modal z wygenerowanym linkiem publicznym i przyciskiem do kopiowania. Zbudowany na `p-dialog` z PrimeNG.

**Główne elementy:**

- `<p-dialog>` z `[modal]="true"`, nagłówek "Udostępnij mecz"
- `<p-inputgroup>` z readonly `<input pInputText>` zawierającym URL
- `<p-button>` z ikoną `pi-copy` w inputgroup jako addon
- Tekst informacyjny o działaniu linku
- Footer z `<p-button>` "Zamknij"

**Obsługiwane interakcje:**

- Kliknięcie "Kopiuj" - kopiuje URL do schowka, emituje `copyClicked`
- Kliknięcie "Zamknij" - emituje `closeClicked`
- Zamknięcie przez "X" lub Escape - emituje `closeClicked`

**Obsługiwana walidacja:** Brak

**Typy:**

- `PublicShareDto` - dane linku publicznego

**Propsy:**

| Prop           | Typ                       | Opis                                 |
| -------------- | ------------------------- | ------------------------------------ |
| `visible`      | `model<boolean>()`        | Widoczność dialogu (two-way binding) |
| `publicUrl`    | `input<string \| null>()` | URL do wyświetlenia                  |
| `isLoading`    | `input<boolean>()`        | Stan ładowania (generowanie linku)   |
| `copyClicked`  | `output<void>()`          | Zdarzenie kopiowania                 |
| `closeClicked` | `output<void>()`          | Zdarzenie zamknięcia                 |

---

### 4.8 EditMatchDialogComponent

**Lokalizacja:** `src/components/match-summary/dialogs/edit-match-dialog.component.ts`

**Opis:** Modal do edycji nazw zawodników meczu. Formularz reaktywny z walidacją.

**Główne elementy:**

- `<p-dialog>` z nagłówkiem "Edytuj dane meczu"
- Formularz z Reactive Forms (`FormGroup`)
- `<p-floatlabel>` + `<input pInputText>` dla "Nazwa zawodnika"
- `<p-floatlabel>` + `<input pInputText>` dla "Nazwa rywala"
- Komunikaty błędów walidacji pod polami (inline)
- Footer: `<p-button>` "Anuluj" (text) i `<p-button>` "Zapisz" (primary)

**Obsługiwane interakcje:**

- Wpisywanie w pola formularza
- Kliknięcie "Anuluj" - zamyka dialog bez zapisu, emituje `cancelClicked`
- Kliknięcie "Zapisz" - waliduje formularz i emituje `confirmClicked` z danymi

**Obsługiwana walidacja:**

| Pole            | Walidacja                            |
| --------------- | ------------------------------------ |
| `player_name`   | Wymagane, min 1 znak, max 200 znaków |
| `opponent_name` | Wymagane, min 1 znak, max 200 znaków |

**Typy:**

- `UpdateMatchCommandDto` - dane do aktualizacji

**Propsy:**

| Prop             | Typ                                                    | Opis                     |
| ---------------- | ------------------------------------------------------ | ------------------------ |
| `visible`        | `model<boolean>()`                                     | Widoczność dialogu       |
| `playerName`     | `input<string>()`                                      | Aktualna nazwa zawodnika |
| `opponentName`   | `input<string>()`                                      | Aktualna nazwa rywala    |
| `isLoading`      | `input<boolean>()`                                     | Stan zapisywania         |
| `cancelClicked`  | `output<void>()`                                       | Zdarzenie anulowania     |
| `confirmClicked` | `output<{playerName: string, opponentName: string}>()` | Zdarzenie zapisu         |

---

### 4.9 EditMatchNotesDialogComponent

**Lokalizacja:** `src/components/match-summary/dialogs/edit-match-notes-dialog.component.ts`

**Opis:** Modal do edycji uwag do całego meczu. Textarea z licznikiem znaków.

**Główne elementy:**

- `<p-dialog>` z nagłówkiem "Edytuj uwagi do meczu"
- `<textarea pTextarea>` z `[autoResize]="true"`
- Licznik pozostałych znaków (computed: 5000 - current length)
- Footer: przyciski "Anuluj" i "Zapisz"

**Obsługiwane interakcje:**

- Wpisywanie uwag
- Kliknięcie "Anuluj" emituje `cancelClicked`
- Kliknięcie "Zapisz" emituje `confirmClicked` z tekstem uwag

**Obsługiwana walidacja:**

| Pole          | Walidacja                   |
| ------------- | --------------------------- |
| `coach_notes` | Opcjonalne, max 5000 znaków |

**Propsy:**

| Prop             | Typ                        | Opis                 |
| ---------------- | -------------------------- | -------------------- |
| `visible`        | `model<boolean>()`         | Widoczność dialogu   |
| `currentNotes`   | `input<string \| null>()`  | Aktualne uwagi       |
| `isLoading`      | `input<boolean>()`         | Stan zapisywania     |
| `cancelClicked`  | `output<void>()`           | Zdarzenie anulowania |
| `confirmClicked` | `output<string \| null>()` | Zdarzenie zapisu     |

---

### 4.10 EditSetNotesDialogComponent

**Lokalizacja:** `src/components/match-summary/dialogs/edit-set-notes-dialog.component.ts`

**Opis:** Modal do edycji uwag do konkretnego seta. Analogiczny do EditMatchNotesDialogComponent.

**Główne elementy:**

- `<p-dialog>` z nagłówkiem "Edytuj uwagi do seta X" (dynamiczny numer)
- `<textarea pTextarea>` z `[autoResize]="true"`
- Licznik pozostałych znaków
- Footer: przyciski "Anuluj" i "Zapisz"

**Obsługiwane interakcje:**

- Wpisywanie uwag
- Kliknięcie "Anuluj" emituje `cancelClicked`
- Kliknięcie "Zapisz" emituje `confirmClicked` z tekstem uwag

**Obsługiwana walidacja:**

| Pole          | Walidacja                   |
| ------------- | --------------------------- |
| `coach_notes` | Opcjonalne, max 5000 znaków |

**Propsy:**

| Prop             | Typ                        | Opis                      |
| ---------------- | -------------------------- | ------------------------- |
| `visible`        | `model<boolean>()`         | Widoczność dialogu        |
| `setNumber`      | `input<number>()`          | Numer seta (dla nagłówka) |
| `setId`          | `input<number>()`          | ID seta                   |
| `currentNotes`   | `input<string \| null>()`  | Aktualne uwagi            |
| `isLoading`      | `input<boolean>()`         | Stan zapisywania          |
| `cancelClicked`  | `output<void>()`           | Zdarzenie anulowania      |
| `confirmClicked` | `output<string \| null>()` | Zdarzenie zapisu          |

## 5. Typy

### 5.1 Typy z API (z types.ts)

Widok wykorzystuje następujące typy zdefiniowane w `src/types.ts`:

| Typ                     | Opis                                     | Użycie               |
| ----------------------- | ---------------------------------------- | -------------------- |
| `MatchDetailDto`        | Szczegóły meczu z opcjonalnymi relacjami | Główne dane meczu    |
| `SetDetailDto`          | Szczegóły seta z opcjonalnymi punktami   | Lista setów w tabeli |
| `AiReportDto`           | Raport AI z statusem i treścią           | Sekcja raportu AI    |
| `UpdateMatchCommandDto` | Komenda aktualizacji meczu               | Edycja nazw i uwag   |
| `UpdateMatchDto`        | Odpowiedź po aktualizacji                | Aktualizacja stanu   |
| `PublicShareDto`        | Dane linku publicznego                   | Dialog udostępniania |
| `SideEnum`              | 'player' \| 'opponent'                   | Zwycięzca seta       |
| `MatchStatusEnum`       | 'in_progress' \| 'finished'              | Status meczu         |
| `AiStatusEnum`          | 'pending' \| 'success' \| 'error'        | Status raportu AI    |

### 5.2 ViewModel dla widoku

ViewModel jest zrealizowany poprzez Angular Signals w serwisie stanu. Poniżej przedstawiono strukturę logiczną:

**Dane meczu:**

- `matchId` - identyfikator meczu
- `playerName` - nazwa zawodnika
- `opponentName` - nazwa rywala
- `startedAt` - data startu (ISO string)
- `endedAt` - data zakończenia (ISO string lub null)
- `setsWonPlayer` - wygrane sety zawodnika
- `setsWonOpponent` - wygrane sety rywala
- `sets` - lista setów z uwagami
- `matchNotes` - uwagi do meczu
- `aiReport` - raport AI (lub null)
- `generateAiSummary` - czy AI było włączone

**Stan linku publicznego:**

- `publicShare` - dane linku publicznego (lub null)

**Stany UI:**

- `isLoading` - czy trwa ładowanie danych
- `isRefreshingAi` - czy trwa odświeżanie raportu AI
- `isGeneratingShare` - czy trwa generowanie linku
- `isSaving` - czy trwa zapis edycji
- `error` - komunikat błędu (lub null)

**Stany dialogów:**

- `isShareDialogVisible` - widoczność dialogu udostępniania
- `isEditMatchDialogVisible` - widoczność dialogu edycji meczu
- `isEditMatchNotesDialogVisible` - widoczność dialogu uwag do meczu
- `isEditSetNotesDialogVisible` - widoczność dialogu uwag do seta
- `editingSetId` - ID edytowanego seta (lub null)

### 5.3 Funkcje pomocnicze

**Formatowanie daty:**

- Funkcja konwertująca ISO string na sformatowaną datę w lokalnej strefie czasowej
- Format wyjściowy: "15 stycznia 2024, 14:30" (locale pl-PL)
- Wykorzystanie `Intl.DateTimeFormat` dla poprawnej lokalizacji

**Określanie stanu raportu AI:**

- Funkcja zwracająca stan: 'hidden' | 'pending' | 'success' | 'error'
- Logika: jeśli AI wyłączone → 'hidden', jeśli brak raportu → 'pending', w przeciwnym razie → status z raportu

## 6. Zarządzanie stanem

### 6.1 Strategia zarządzania stanem

Stan widoku jest zarządzany przez dedykowany serwis Angular z wykorzystaniem Signals. Serwis jest dostarczany na poziomie komponentu głównego (`providedIn: 'root'` lub przez `providers` w komponencie).

**Lokalizacja:** `src/components/match-summary/services/match-summary-state.service.ts`

### 6.2 Struktura serwisu stanu

Serwis zawiera:

**Prywatne writeable signals:**

- Przechowują aktualny stan widoku
- Modyfikowalne tylko przez metody serwisu

**Publiczne readonly signals (computed):**

- Udostępniają stan do odczytu komponentom
- Derived values obliczane automatycznie (np. `aiReportState` z `aiReport` i `generateAiSummary`)

**Metody aktualizacji:**

- `setMatchData(data)` - ustawia dane meczu po pobraniu
- `setPublicShare(share)` - ustawia dane linku
- `updateMatchNames(playerName, opponentName)` - aktualizuje nazwy po edycji
- `updateMatchNotes(notes)` - aktualizuje uwagi meczu
- `updateSetNotes(setId, notes)` - aktualizuje uwagi seta
- `updateAiReport(report)` - aktualizuje raport AI

**Metody kontroli dialogów:**

- `openShareDialog()` / `closeShareDialog()`
- `openEditMatchDialog()` / `closeEditMatchDialog()`
- `openEditMatchNotesDialog()` / `closeEditMatchNotesDialog()`
- `openEditSetNotesDialog(setId)` / `closeEditSetNotesDialog()`

**Metoda reset:**

- `reset()` - czyści cały stan (wywoływana przy opuszczeniu widoku)

### 6.3 Przepływ aktualizacji stanu

**Inicjalizacja:**

1. Komponent główny wywołuje `loadMatch(matchId)` w serwisie
2. Serwis ustawia `isLoading = true`
3. Pobiera dane z API: `GET /api/matches/{id}?include=sets,ai_report`
4. Sprawdza status meczu - jeśli `in_progress`, wykonuje redirect
5. Ustawia `matchData` i `isLoading = false`

**Edycja nazw zawodników:**

1. Użytkownik wypełnia formularz i klika "Zapisz"
2. Serwis ustawia `isSaving = true`
3. Wysyła `PATCH /api/matches/{id}/update`
4. Po sukcesie wywołuje `updateMatchNames()` i zamyka dialog
5. Wyświetla toast "Zapisano zmiany"

**Edycja uwag do meczu:**

1. Analogicznie jak wyżej, ale z `updateMatchNotes()`

**Edycja uwag do seta:**

1. Wykorzystuje endpoint `PATCH /api/matches/{id}/update` z `coach_notes` dla całego meczu
2. Alternatywnie: lokalny stan uwag setów (wymaga rozszerzenia API w przyszłości)
3. **Uwaga:** API obecnie nie ma dedykowanego endpointu do edycji uwag seta

**Odświeżenie raportu AI:**

1. Serwis ustawia `isRefreshingAi = true`
2. Wysyła `GET /api/matches/{matchId}/ai-report`
3. Po sukcesie wywołuje `updateAiReport()`
4. Ustawia `isRefreshingAi = false`

**Generowanie linku publicznego:**

1. Serwis ustawia `isGeneratingShare = true`
2. Wysyła `POST /api/matches/{matchId}/share`
3. Po sukcesie wywołuje `setPublicShare()` i otwiera dialog
4. Ustawia `isGeneratingShare = false`

## 7. Integracja API

### 7.1 Serwis API

**Lokalizacja:** `src/components/match-summary/services/match-summary-api.service.ts`

Serwis Angular odpowiedzialny za komunikację HTTP z backendem. Wykorzystuje `HttpClient` z Angular.

### 7.2 Endpointy

| Endpoint                                   | Metoda | Request                 | Response                                | Opis                    |
| ------------------------------------------ | ------ | ----------------------- | --------------------------------------- | ----------------------- |
| `/api/matches/{id}?include=sets,ai_report` | GET    | -                       | `SingleItemResponseDto<MatchDetailDto>` | Pobranie danych meczu   |
| `/api/matches/{matchId}/ai-report`         | GET    | -                       | `SingleItemResponseDto<AiReportDto>`    | Odświeżenie raportu AI  |
| `/api/matches/{id}/update`                 | PATCH  | `UpdateMatchCommandDto` | `SingleItemResponseDto<UpdateMatchDto>` | Aktualizacja metadanych |
| `/api/matches/{matchId}/share`             | POST   | -                       | `SingleItemResponseDto<PublicShareDto>` | Generowanie linku       |

### 7.3 Obsługa odpowiedzi

Każda metoda serwisu API zwraca `Observable<T>` gdzie T to odpowiedni typ DTO. Obsługa błędów realizowana jest przez:

1. **Interceptor HTTP** - globalny interceptor przechwytuje błędy i wyświetla odpowiednie toasty
2. **Lokalna obsługa** - w serwisie stanu poprzez `catchError` dla specyficznych przypadków

## 8. Interakcje użytkownika

### 8.1 Wejście na widok

| Krok | Akcja                                         | Efekt                        |
| ---- | --------------------------------------------- | ---------------------------- |
| 1    | Użytkownik wchodzi na `/matches/{id}/summary` | Rozpoczyna się ładowanie     |
| 2    | Wyświetlane są skeleton placeholders          | UI feedback                  |
| 3    | Pobierane są dane meczu z API                 | Request HTTP                 |
| 4    | Sprawdzany jest status meczu                  | Redirect jeśli `in_progress` |
| 5    | Wyświetlany jest pełny widok                  | Koniec ładowania             |

### 8.2 Edycja nazw zawodników

| Krok | Akcja                                  | Efekt                    |
| ---- | -------------------------------------- | ------------------------ |
| 1    | Klik ikony edycji w nagłówku           | Otwiera dialog           |
| 2    | Pola wypełnione aktualnymi wartościami | Inicjalizacja formularza |
| 3    | Użytkownik modyfikuje nazwy            | Walidacja inline         |
| 4    | Klik "Zapisz"                          | Walidacja + request API  |
| 5    | Loading na przycisku                   | UI feedback              |
| 6    | Zamknięcie dialogu + toast "Zapisano"  | Sukces                   |

### 8.3 Edycja uwag do meczu

| Krok | Akcja                         | Efekt                        |
| ---- | ----------------------------- | ---------------------------- |
| 1    | Klik ikony edycji w accordion | Otwiera dialog               |
| 2    | Textarea z aktualnymi uwagami | Inicjalizacja                |
| 3    | Użytkownik edytuje tekst      | Licznik znaków aktualizowany |
| 4    | Klik "Zapisz"                 | Request API                  |
| 5    | Zamknięcie dialogu + toast    | Sukces                       |

### 8.4 Edycja uwag do seta

Analogicznie jak dla meczu, ale dialog zawiera informację o numerze seta w nagłówku.

### 8.5 Odświeżenie raportu AI

| Krok | Akcja                       | Efekt               |
| ---- | --------------------------- | ------------------- |
| 1    | Klik "Odśwież raport"       | Request API         |
| 2    | Loading na przycisku        | UI feedback         |
| 3    | Aktualizacja treści raportu | Sukces              |
| 4    | W przypadku błędu           | Toast z komunikatem |

### 8.6 Udostępnianie meczu

| Krok | Akcja                        | Efekt                               |
| ---- | ---------------------------- | ----------------------------------- |
| 1    | Klik "Udostępnij mecz"       | Request API (jeśli brak linku)      |
| 2    | Otwiera się dialog z linkiem | UI                                  |
| 3    | Klik "Kopiuj"                | Link w schowku + toast "Skopiowano" |
| 4    | Klik "Zamknij"               | Zamknięcie dialogu                  |

### 8.7 Powrót do listy

| Krok | Akcja                   | Efekt              |
| ---- | ----------------------- | ------------------ |
| 1    | Klik "Powrót do listy"  | Nawigacja          |
| 2    | Reset stanu serwisu     | Czyszczenie danych |
| 3    | Przejście do `/matches` | Router             |

## 9. Warunki i walidacja

### 9.1 Walidacja formularzy

| Komponent            | Pole            | Warunki                     | Komunikat błędu                                            |
| -------------------- | --------------- | --------------------------- | ---------------------------------------------------------- |
| EditMatchDialog      | `player_name`   | Wymagane, 1-200 znaków      | "Nazwa zawodnika jest wymagana" / "Maksymalnie 200 znaków" |
| EditMatchDialog      | `opponent_name` | Wymagane, 1-200 znaków      | "Nazwa rywala jest wymagana" / "Maksymalnie 200 znaków"    |
| EditMatchNotesDialog | `coach_notes`   | Opcjonalne, max 5000 znaków | "Maksymalnie 5000 znaków"                                  |
| EditSetNotesDialog   | `coach_notes`   | Opcjonalne, max 5000 znaków | "Maksymalnie 5000 znaków"                                  |

### 9.2 Warunki wyświetlania elementów

| Element                   | Warunek                       | Efekt gdy fałszywy   |
| ------------------------- | ----------------------------- | -------------------- |
| Sekcja AI Report          | `generateAiSummary === true`  | Sekcja ukryta        |
| Spinner AI                | `aiReportState === 'pending'` | Niewidoczny          |
| Treść raportu AI          | `aiReportState === 'success'` | Niewidoczna          |
| Błąd AI                   | `aiReportState === 'error'`   | Niewidoczny          |
| Przycisk "Odśwież raport" | `aiReportState !== 'pending'` | Ukryty               |
| Panele uwag do setów      | `set.coach_notes !== null`    | Panel niewyświetlany |

### 9.3 Warunki z API (błędy 422)

| Błąd                     | Komunikat                    | Obsługa w UI                   |
| ------------------------ | ---------------------------- | ------------------------------ |
| Match not found          | "Mecz nie istnieje"          | Toast + redirect do `/matches` |
| Forbidden                | "Brak dostępu do tego meczu" | Toast + redirect do `/matches` |
| Validation error (nazwy) | Szczegóły z API              | Błędy inline w formularzu      |
| AI report not available  | "Raport AI niedostępny"      | Toast                          |

## 10. Obsługa błędów

### 10.1 Błędy sieciowe

| Typ błędu        | Obsługa                                         |
| ---------------- | ----------------------------------------------- |
| Timeout          | Toast "Błąd połączenia - spróbuj ponownie"      |
| Brak sieci       | Toast "Brak połączenia z internetem"            |
| 500 Server Error | Toast "Błąd serwera - spróbuj ponownie później" |

### 10.2 Błędy autoryzacji

| Kod              | Obsługa                                                     |
| ---------------- | ----------------------------------------------------------- |
| 401 Unauthorized | Redirect do landing page z toast "Sesja wygasła"            |
| 403 Forbidden    | Toast "Brak dostępu do tego meczu" + redirect do `/matches` |
| 404 Not Found    | Toast "Mecz nie istnieje" + redirect do `/matches`          |

### 10.3 Błędy walidacji (422)

- Wyświetlenie szczegółowego komunikatu z API w odpowiednim miejscu
- Dla formularzy - błędy inline pod polami (`p-message` z `severity="error"`)
- Dialog pozostaje otwarty do poprawienia danych

### 10.4 Edge cases

| Sytuacja                             | Zachowanie                                      |
| ------------------------------------ | ----------------------------------------------- |
| Mecz nie istnieje                    | Redirect do `/matches` + toast                  |
| Mecz w statusie `in_progress`        | Redirect do `/matches/{id}/live`                |
| Mecz innego użytkownika              | Redirect do `/matches` + toast                  |
| AI raport w stanie pending           | Spinner + komunikat "Generowanie raportu AI..." |
| AI raport w stanie error             | Komunikat błędu + przycisk odśwież              |
| AI wyłączone dla meczu               | Sekcja AI niewidoczna                           |
| Brak uwag do meczu/seta              | Placeholder "Brak uwag trenera"                 |
| Kopiowanie do schowka nieobsługiwane | Fallback: zaznaczenie tekstu w input            |

## 11. Kroki implementacji

### Krok 1: Przygotowanie struktury plików

Utworzenie struktury katalogów dla komponentów widoku:

```
src/components/
├── shared/
│   ├── app-navbar.component.ts          # Współdzielony - nawigacja główna
│   ├── app-navbar.types.ts              # Typy nawigacji
│   └── sets-history-table.component.ts  # Współdzielony z Live Match
└── match-summary/
    ├── match-summary-page.component.ts
    ├── services/
    │   ├── match-summary-state.service.ts
    │   └── match-summary-api.service.ts
    ├── match-header-section.component.ts
    ├── coach-notes-accordion.component.ts
    ├── ai-report-section.component.ts
    ├── match-actions-section.component.ts
    └── dialogs/
        ├── share-dialog.component.ts
        ├── edit-match-dialog.component.ts
        ├── edit-match-notes-dialog.component.ts
        └── edit-set-notes-dialog.component.ts
```

**Uwaga:** Komponent `SetsHistoryTable` znajduje się w katalogu `shared/` i jest współdzielony z widokiem Live Match.

### Krok 2: Implementacja serwisów

1. **MatchSummaryApiService**
   - Metody HTTP dla wszystkich endpointów
   - Typy request/response zgodne z `types.ts`

2. **MatchSummaryStateService**
   - Wszystkie signals dla stanu widoku
   - Computed signals dla derived values
   - Metody aktualizacji stanu
   - Metody kontroli dialogów

### Krok 3: Implementacja komponentów sekcji

W kolejności:

1. **MatchHeaderSectionComponent** - nagłówek z danymi meczu
2. **CoachNotesAccordionComponent** - accordion z uwagami
3. **AiReportSectionComponent** - sekcja raportu AI z trzema stanami
4. **MatchActionsSectionComponent** - przyciski akcji

### Krok 4: Implementacja dialogów

W kolejności:

1. **ShareDialogComponent** - najprostszy
2. **EditMatchNotesDialogComponent** - textarea
3. **EditSetNotesDialogComponent** - analogiczny
4. **EditMatchDialogComponent** - formularz z walidacją

### Krok 5: Implementacja komponentu głównego

1. **MatchSummaryPageComponent**
   - Import `AppNavbarComponent` (współdzielony z `src/components/shared/`)
   - Template zgodny ze wzorcem z shared-frontend (navbar → toast → main)
   - Kompozycja wszystkich sekcji
   - Wstrzyknięcie serwisów
   - Obsługa zdarzeń z komponentów dzieci
   - Inicjalizacja danych w `ngOnInit`
   - Cleanup w `ngOnDestroy`

### Krok 6: Utworzenie strony Astro

Plik `src/pages/matches/[id]/summary.astro`:

- Layout z importami PrimeNG
- Przekazanie `matchId` z params do komponentu Angular
- Dyrektywa `client:only="angular"`

### Krok 7: Integracja i testy

1. Weryfikacja wszystkich scenariuszy użytkownika
2. Testowanie stanów raportu AI (pending, success, error)
3. Testowanie edycji danych i dialogów
4. Testowanie udostępniania meczu
5. Testowanie responsywności (mobile, tablet, desktop)
6. Testowanie obsługi błędów
7. Testowanie dostępności (focus management, aria-labels)

### Krok 8: Stylowanie i dopracowanie

1. Spójność z design systemem PrimeNG Aura
2. Dark mode przez klasę `.app-dark`
3. Animacje accordion i dialogów
4. Feedback wizualny przy operacjach (loading states)
5. Dostępność (aria-labels, focus management w dialogach)

### Szacowany czas implementacji

| Krok                       | Szacowany czas |
| -------------------------- | -------------- |
| Krok 1: Struktura plików   | 0.5h           |
| Krok 2: Serwisy            | 2-3h           |
| Krok 3: Komponenty sekcji  | 3-4h           |
| Krok 4: Dialogi            | 2-3h           |
| Krok 5: Komponent główny   | 2-3h           |
| Krok 6: Strona Astro       | 0.5h           |
| Krok 7: Integracja i testy | 2-3h           |
| Krok 8: Stylowanie         | 1-2h           |
| **Razem**                  | **13-19h**     |

**Uwaga:** Czas nie uwzględnia implementacji współdzielonych komponentów (`AppNavbarComponent`, `SetsHistoryTable`), które są realizowane w ramach shared-frontend-implementation-plan.

### Uwagi implementacyjne

1. **Komponenty współdzielone:** Widok Match Summary wykorzystuje komponenty z katalogu `src/components/shared/`:
   - `AppNavbarComponent` - nawigacja główna (specyfikacja w shared-frontend-implementation-plan.md, sekcja 3)
   - `SetsHistoryTable` - tabela setów (specyfikacja w shared-frontend-implementation-plan.md, sekcja 5)

   Te komponenty są współdzielone między wszystkimi widokami aplikacji i powinny być zaimplementowane przed widokami korzystającymi z nich.

2. **Edycja uwag do seta:** Obecne API nie ma dedykowanego endpointu. Rozwiązanie tymczasowe: przechowywanie lokalnie lub rozszerzenie API o `PATCH /api/sets/{id}`.

3. **Kopiowanie do schowka:** Użyć `navigator.clipboard.writeText()` z fallbackiem dla przeglądarek bez wsparcia (zaznaczenie tekstu i `document.execCommand('copy')`).

4. **Formatowanie daty:** Użyć `Intl.DateTimeFormat` z locale `pl-PL` dla spójnego formatowania.

5. **Dark mode:** Klasa `.app-dark` na `<html>` automatycznie przełącza motywy PrimeNG i Tailwind.

6. **Dostępność:** Wszystkie dialogi powinny mieć focus trap i odpowiednie aria-labels dla screen readerów.

7. **Autentykacja:** Szczegóły implementacji guardów i integracji z Supabase Auth będą określone w przyszłości. Na potrzeby widoku zakładamy istnienie mechanizmu weryfikacji sesji użytkownika.
