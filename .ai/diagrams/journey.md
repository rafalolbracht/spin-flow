# Diagram podróży użytkownika - Moduł logowania i rejestracji

## Analiza podróży użytkownika modułu autentykacji

### Ścieżki użytkownika wymienione w dokumentacji

1. **Ścieżka użytkownika niezalogowanego do strony głównej**:
   - Użytkownik wchodzi na stronę główną
   - Widzi przycisk "Zaloguj" w topbarze i sekcji hero
   - Po kliknięciu zostaje przekierowany do strony logowania
   - Wybiera metodę logowania (Google lub Facebook)
   - Następuje przekierowanie do OAuth providera
   - Po pomyślnym logowaniu użytkownik trafia do listy swoich meczów

2. **Ścieżka użytkownika zalogowanego do strony głównej**:
   - Użytkownik wchodzi na stronę główną
   - Przycisk "Zaloguj" zmienia się na "Moje mecze"
   - Kliknięcie przycisku przekierowuje do listy meczów

3. **Ścieżka użytkownika zalogowanego do strony logowania**:
   - Użytkownik wchodzi na stronę logowania
   - System wykrywa istniejącą sesję
   - Następuje automatyczne przekierowanie do listy meczów

4. **Ścieżka wylogowania**:
   - Użytkownik klika "Wyloguj się" w menu użytkownika
   - Następuje zniszczenie sesji
   - Użytkownik zostaje przekierowany do strony głównej

5. **Ścieżka próby dostępu do chronionej strony bez logowania**:
   - Użytkownik próbuje wejść na chronioną stronę (lista meczów, widok meczu)
   - Middleware wykrywa brak sesji
   - Następuje przekierowanie do strony głównej z komunikatem o konieczności logowania

### Główne podróże i ich odpowiadające stany

1. **Podróż logowania**:
   - Stan początkowy: Strona główna (niezalogowany)
   - Stan przejściowy: Strona logowania z wyborem providera
   - Stan końcowy: Lista meczów (zalogowany)

2. **Podróż użytkownika zalogowanego**:
   - Stan początkowy: Strona główna (zalogowany)
   - Stan przejściowy: Lista meczów
   - Stan końcowy: Korzystanie z aplikacji

3. **Podróż wylogowania**:
   - Stan początkowy: Aplikacja zalogowana
   - Stan przejściowy: Proces wylogowania
   - Stan końcowy: Strona główna (niezalogowany)

4. **Podróż obsługi błędów**:
   - Stan początkowy: Próba logowania lub dostępu
   - Stan przejściowy: Błąd OAuth lub brak dostępu
   - Stan końcowy: Strona logowania z komunikatem błędu

### Punkty decyzyjne i alternatywne ścieżki

1. **Punkt decyzyjny: Czy użytkownik jest zalogowany?**
   - Tak → Dostęp do aplikacji
   - Nie → Strona logowania

2. **Punkt decyzyjny: Wybór metody logowania**
   - Google → OAuth Google
   - Facebook → OAuth Facebook
   - Anulowanie → Powrót do strony głównej

3. **Punkt decyzyjny: Wynik OAuth**
   - Powodzenie → Lista meczów
   - Niepowodzenie → Komunikat błędu na stronie logowania
   - Anulowanie przez użytkownika → Powrót do strony logowania

4. **Punkt decyzyjny: Wygasła sesja podczas korzystania z aplikacji**
   - Tak → Komunikat błędu i przekierowanie do strony głównej

### Opis celu każdego stanu

- **Strona główna (niezalogowany)**: Prezentacja wartości produktu i zachęta do logowania
- **Strona logowania**: Wybór metody autentykacji (Google lub Facebook)
- **OAuth provider**: Zewnętrzna autentykacja przez Google/Facebook
- **Callback OAuth**: Weryfikacja tokenu i utworzenie sesji
- **Lista meczów**: Główny widok aplikacji po zalogowaniu
- **Widok meczu**: Szczegółowy widok pojedynczego meczu
- **Stan błędu**: Komunikat o problemach z autentykacją
- **Strona główna (zalogowany)**: Szybki dostęp do listy meczów dla zalogowanych użytkowników

## Diagram Mermaid

```mermaid
stateDiagram-v2
    [*] --> StronaGlowna

    state "Pierwsza wizyta" as PierwszaWizyta {
        StronaGlowna --> StronaLogowania: "Zaloguj się"
        StronaLogowania --> if_logowanie: Wybór metody

        if_logowanie --> LogowanieGoogle: Google
        if_logowanie --> LogowanieFacebook: Facebook
        if_logowanie --> StronaGlowna: Anulowanie

        LogowanieGoogle --> ListaMeczow: Powodzenie
        LogowanieFacebook --> ListaMeczow: Powodzenie

        LogowanieGoogle --> StronaLogowania: Błąd logowania
        LogowanieFacebook --> StronaLogowania: Błąd logowania
    }

    state "Powtarzające wizyty" as PowtarzajaceWizyty {
        StronaGlowna --> ListaMeczow: "Moje mecze" [zalogowany]

        StronaLogowania --> ListaMeczow: Automatyczne przekierowanie [zalogowany]

        ListaMeczow --> WidokMeczu: Wybór meczu
        WidokMeczu --> ListaMeczow: Powrót do listy

        ListaMeczow --> StronaGlowna: Wylogowanie
    }

    state "Ochrona dostępu" as OchronaDostepu {
        state if_dostep <<choice>>

        ChroniczonaStrona --> if_dostep: Próba dostępu
        if_dostep --> StronaGlowna: Brak logowania
        if_dostep --> ListaMeczow: Zalogowany

        ListaMeczow --> if_sesjaWygasla <<choice>>: Akcja w aplikacji
        if_sesjaWygasla --> StronaGlowna: Sesja wygasła
        if_sesjaWygasla --> ListaMeczow: Sesja aktywna
    }

    note right of StronaGlowna
        Prezentacja wartości produktu
        Przyciski logowania dla nowych użytkowników
        Szybki dostęp dla zalogowanych
    end note

    note right of StronaLogowania
        Wybór metody autentykacji
        Google lub Facebook
    end note

    note right of ListaMeczow
        Główny widok aplikacji
        Lista meczów trenera
        Dostęp do wszystkich funkcji
    end note

    note right of WidokMeczu
        Szczegółowy widok meczu
        Rejestracja punktów na żywo
        Analiza i raporty
    end note

    ListaMeczow --> [*]

    classDef stronaPoczatkowa fill:#4CAF50,stroke:#2E7D32,stroke-width:3px,color:#ffffff,font-weight:bold
    classDef stronaLogowania fill:#2196F3,stroke:#0D47A1,stroke-width:3px,color:#ffffff,font-weight:bold
    classDef stanAplikacji fill:#FF9800,stroke:#E65100,stroke-width:3px,color:#ffffff,font-weight:bold
    classDef stanBledu fill:#F44336,stroke:#B71C1C,stroke-width:3px,color:#ffffff,font-weight:bold
    classDef punktDecyzyjny fill:#9C27B0,stroke:#6A1B9A,stroke-width:3px,color:#ffffff,font-weight:bold

    class StronaGlowna stronaPoczatkowa
    class StronaLogowania stronaLogowania
    class ListaMeczow stanAplikacji
    class WidokMeczu stanAplikacji
    class if_logowanie punktDecyzyjny
    class if_dostep punktDecyzyjny
    class if_sesjaWygasla punktDecyzyjny
```
