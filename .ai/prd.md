# Dokument wymagań produktu (PRD) - Spin Flow

## 1. Przegląd produktu

Spin Flow to webowa aplikacja dla trenerów tenisa stołowego, służąca do rejestrowania przebiegu meczów „na żywo” oraz generowania podsumowań i zaleceń treningowych przy pomocy AI.

Produkt w wersji MVP:

\* działa wyłącznie online (brak trybu offline),

\* jest projektowany przede wszystkim na smartfon w pionie (trener przy stole), z poprawnym działaniem na tablet i laptop,

\* obsługuje pojedyncze konto trenera (brak kont zespołowych),

\* pozwala rejestrować punkty i sety na żywo podczas meczu,

\* po zakończeniu meczu generuje krótki raport i zalecenia dla zawodnika (AI),

\* umożliwia bezpieczne, publiczne udostępnianie zakończonych meczów do podglądu.

Technicznie MVP zakłada:

\* logowanie przez Google (Supabase Auth),

\* backend w Astro,

\* frontend w Angular,

\* baza w Supabase,

\* integrację z modelem AI przez OpenRouter (szczegóły implementacyjne poza zakresem tego PRD),

\* lekką analitykę do mierzenia liczby zakończonych meczów per aktywny użytkownik.

Główna persona: trener tenisa stołowego, rejestrujący mecze wielu zawodników (bez osobnych kont dla zawodników).

Język interfejsu i raportów: polski, neutralny, bez przygotowania pod kolejne języki w MVP.

---

## 2. Problem użytkownika

Zapamiętanie pełnego przebiegu meczu tenisa stołowego w warunkach turniejowych jest trudne:

\* trener skupia się na meczu i zawodniku,

\* tempo wymian jest wysokie,

\* na jednym turnieju trener często prowadzi kilka meczów z rzędu, dla różnych zawodników.

Skutki:

\* brak pełnego, wiarygodnego zapisu meczu (kto zdobywał punkty, w jakich okolicznościach),

\* trudności z obiektywną analizą przyczyn wygranej/przegranej,

\* trudno formułować konkretne zalecenia treningowe oparte na faktach („za mało ataków backhandem”, „dużo błędów serwisu”, „problemy przy odbiorze rotowanego serwisu”).

Spin Flow rozwiązuje ten problem, zapewniając:

\* szybkie i wygodne rejestrowanie wyniku oraz „tagów” opisujących charakter punktu (np. błąd serwisu, błąd odbioru, zła praca nóg),

\* poprawne śledzenie serwującego zgodnie z zasadami serwowania w meczu (2–2, przy 10:10 po 1, w złotym secie po 1),

\* trwały zapis stanu meczu po każdym punkcie (odświeżenie strony nie niszczy pracy trenera),

\* automatyczne podsumowanie meczu i listę zaleceń wygenerowaną przez AI,

\* możliwość udostępnienia meczu zawodnikowi / rodzicom / innym zainteresowanym za pomocą publicznego linku.

---

## 3. Wymagania funkcjonalne

### 3.1. Konta i autentykacja

1\. System obsługuje jedno konto trenera (brak kont zespołowych).

2\. Logowanie odbywa się wyłącznie przez Google za pośrednictwem Supabase Auth.

3\. Brak edycji profilu użytkownika i brak funkcji usuwania konta w MVP.

4\. Dostęp do listy meczów i widoków edycji meczu wymaga zalogowania.

5\. Każdy mecz jest jednoznacznie powiązany z kontem trenera i niewidoczny dla innych zalogowanych użytkowników.

### 3.2. Strona startowa i nawigacja

1\. Strona startowa (landing page) prezentuje:

  \* krótkie wyjaśnienie wartości produktu (rejestracja meczu na żywo + analiza AI),

  \* przyciski logowania (Google),

  \* odnośnik do listy meczów po zalogowaniu.

2\. Po zalogowaniu domyślnym ekranem jest lista meczów danego trenera.

3\. Użytkownik może wylogować się z aplikacji (np. przycisk „Wyloguj”).

### 3.3. Lista meczów

1\. Lista pokazuje wyłącznie mecze utworzone przez zalogowanego trenera.

2\. Dla każdego meczu na liście widoczne są co najmniej:

  \* nazwa zawodnika ocenianego,

  \* nazwa rywala,

  \* status meczu: „W toku” lub „Zakończony”,

  \* dzień i godzina wystartowania meczu (w lokalnej strefie użytkownika),

  \* aktualny wynik setów.

3\. Lista umożliwia filtrowanie po:

  \* nazwie zawodnika ocenianego,

  \* nazwie rywala.

4\. Lista jest posortowana według dna i godziny wystartowania meczu.

5\. Lista ma stronicowanie.

6\. Trener może usunąć pojedynczy mecz z listy (akcja nieodwracalna).

7\. Kliknięcie meczu „W toku” prowadzi do widoku edycji meczu „W toku”.

8\. Kliknięcie meczu „Zakończony” prowadzi do widoku przeglądu meczu „Zakończony”.

### 3.4. Tworzenie i start meczu

1\. Dodanie nowego meczu wymaga uzupełnienia danych początkowych:

  \* nazwa zawodnika ocenianego (tekst),

  \* nazwa rywala (tekst),

  \* maksymalna liczba setów (liczba całkowita > 0, maksymalnie 7, domyślnie 5),

  \* flaga „czy jest złoty set” (domyślnie false),

  \* kto pierwszy serwuje w pierwszym secie (zawodnik oceniany lub rywal),

  \* flaga „Podsumowanie AI na koniec meczu” (domyślnie true).

2\. Po poprawnym zapisaniu meczu:

  \* tworzony jest rekord meczu ze statusem „W toku”,

  \* automatycznie tworzony i uruchamiany jest pierwszy set,

  \* ustawiany jest pierwszy serwujący w tym secie zgodnie z wprowadzonymi danymi.

3\. Dane początkowe podlegają podstawowej walidacji:

  \* pola wymagane nie mogą być puste,

  \* maksymalna liczba setów musi być liczbą dodatnią,

  \* musi być wybrany pierwszy serwujący.

### 3.5. Widok meczu „W toku”

Widok meczu „W toku” prezentuje:

1\. Dane ogólne meczu:

  \* nazwa zawodnika ocenianego,

  \* nazwa rywala,

  \* aktualny wynik setowy meczu (wygrane sety zawodnika ocenianego i rywala).

2\. Bieżący set:

  \* numer seta (np. „Set 1”),

  \* aktualny wynik punktowy seta (punkty zawodnika ocenianego i rywala),

  \* informację, kto serwuje następny punkt, zgodnie z zasadami serwowania. 3. Lista tagów:

  \* nazwa tagu. 4. Przyciski:

  \* przycisk do cofania punktu (aktywny jeśli co najmniej jeden zapisany punkt w secie),
  \* przycisk zamykania seta,
  \* przycisk zamykania meczu.

4\. Tabelę setów:

  \* listę zakończonych i niezakończonych setów wraz z wynikiem punktowym (np. 11:8).

Działania w meczu „W toku”:

1\. Dodanie punktu:

  \* trener wskazuje, kto zdobył punkt: zawodnik oceniany lub rywal,

  \* trener może (ale nie musi) przypisać do punktu jeden lub wiele tagów z predefiniowanej listy (np. błąd odbioru, błąd serwisu, zła praca nóg, świnka itd.),

  \* system zapisuje informację, kto serwował ten punkt,

  \* po zapisaniu punktu:

  \* aktualizowany jest wynik bieżącego seta,

  \* na podstawie historii punktów wyliczany jest serwujący następnego punktu,

  \* jeśli set jest nadal „otwarty”, nie zmienia się status seta,

  \* stan meczu jest trwałe zapisany w backendzie.

2\. Cofnięcie ostatniego punktu w secie:

  \* możliwe jest cofnięcie wyłącznie ostatnio zapisanego punktu w danym secie,

  \* operacja usuwa rekord punktu wraz z przypisanymi tagami,

  \* system przelicza:

  \* wynik bieżącego seta,

  \* serwującego następnego punktu.

3\. Zakończanie seta:

  \* trener może zakończyć bieżący set przy każdym nie remisowym wyniku punktowym (dowolne wartości, aplikacja nie weryfikuje zgodności z oficjalnymi przepisami gry),

  \* przy zakończeniu seta trener może wpisać uwagi do danego seta (pole tekstowe),

  \* po zakończeniu seta:

  \* set trafia do tabeli setów jako zakończony,

  \* jeśli mecz nie został zakończony, automatycznie tworzony i startowany jest kolejny set:

  \* serwujący pierwszy w nowym secie jest określony na podstawie zasad serwowania (zawodnicy serwują sety na zmianę; kolejność wynika z tego, kto serwował pierwszy w pierwszym secie),

  \* wynik nowego seta startuje od 0:0.

4\. Zakończanie meczu:

  \* trener może zakończyć mecz, jeśli:

  \* bieżący wynik punktowy w aktualnym secie nie jest remisem,

  \* wynik setów (zakończone sety plus bieżący set wliczony zgodnie z wynikiem) nie jest remisem,

  \* przy zakończeniu meczu trener może dodać uwagi do całego meczu,

  \* mecz po zapisaniu ma status „Zakończony” (niezależnie od powodzenia generowania AI).

5\. Przerwanie meczu:

  \* trener może w dowolnym momencie opuścić widok meczu „W toku” (np. powrót do listy),

  \* po powrocie do meczu system odtwarza aktualny stan (set, punkty, serwujący, historia punktów).

Zasady serwowania:

1\. Zawodnicy serwują sety na zmianę:

  \* serwujący pierwszy set jest podawany w danych początkowych meczu,

  \* w kolejnych setach pierwszy serwujący jest naprzemienny.

2\. W trakcie seta:

  \* domyślnie serwuje się po 2 punkty z rzędu na jednego zawodnika, następnie 2 punkty rywala, itd.

3\. Przy wyniku 10:10:

  \* serwowanie przechodzi w tryb naprzemienny po 1 punkcie.

4\. W złotym secie (jeśli flaga ustawiona):

  \* serwowanie przez cały set odbywa się naprzemiennie po 1 punkcie, niezależnie od wyniku.

### 3.6. Widok meczu „Zakończony”

Widok meczu „Zakończony” prezentuje:

1\. Dane ogólne meczu:

  \* nazwa zawodnika ocenianego,

  \* nazwa rywala,

  \* dzień i godzina wystartowania meczu (w lokalnej strefie przeglądającego),

  \* aktualny wynik setowy meczu (wygrane sety zawodnika ocenianego i rywala).

2\. Tabelę setów:

  \* listę zakończonych i niezakończonych setów wraz z wynikiem punktowym (np. 11:8). 3. Uwagi trenera do całego meczu (jeśli wpisane).

4\. Uwagi trenera do wszystkich setów (jeśli wpisane).

5\. Wyniki analizy AI (jeśli wygenerowane):

  \* opis przebiegu meczu (5–7 zdań),

  \* zalecenia do poprawy dla zawodnika ocenianego (5–7 zdań).

Edycja meczu „Zakończony”:

1\. Trener może edytować wybrane dane meta meczu (np. nazwy zawodników, nazwa meczu, flaga złotego seta), jeśli UI przewidzi takie pola.

2\. Trener nie może modyfikować:

  \* punktów w zakończonych setach,

  \* zakończonych setów (wyników, kolejności),

  \* historii punktów.

### 3.7. Integracja z AI

1\. Dla meczu, w którym flaga „Podsumowanie AI na koniec meczu” = true:

  \* po oznaczeniu meczu jako „Zakończony” aplikacja wysyła żądanie do AI (OpenRouter),

  \* dane wejściowe do AI obejmują:

  \* dane meczu (zawodnik, rywal, maks. liczba setów, złoty set),

  \* przebieg setów (wyniki, zwycięzcy),

  \* szczegółową listę punktów z informacją:

  \* kto zdobył punkt,

  \* kto serwował,

  \* jakie tagi zostały przypisane,

  \* uwagi trenera do poszczególnych setów,

  \* uwagi trenera do meczu.

  \* output AI obejmuje:

  \* opis przebiegu meczu (5–7 zdań po polsku, neutralny ton),

  \* zalecenia do poprawy dla zawodnika ocenianego (5–7 zdań po polsku, neutralny ton).

2\. W trakcie generowania AI UI jest blokowane:

  \* wyświetlany jest loader „Przetwarzanie”,

  \* przy dłuższym czasie „Generowanie podsumowania AI. Jeszcze chwila…”.

3\. W przypadku błędu generowania AI (timeout, błąd sieci, błąd modelu):

  \* użytkownik otrzymuje komunikat o błędzie,

  \* nie są wykonywane automatyczne ponowne próby (retry),

  \* mecz pozostaje w statusie „Zakończony”, jedynie bez danych AI.

4\. Jeśli flaga „Podsumowanie AI na koniec meczu” = false:

  \* mecz jest kończony bez wywoływania AI,

  \* widok meczu „Zakończony” nie zawiera sekcji z raportem AI.

### 3.8. Publiczne udostępnianie meczów

1\. Dla meczu zakończonego trener może wygenerować publiczny URL:

  \* link zawiera kryptograficznie losowy token,

  \* przycisk „Kopiuj” pozwala skopiować link do schowka.

2\. Widok publiczny meczu:

  \* dostępny bez logowania,

  \* prezentuje te same informacje co widok „Zakończony” (dane meczu, sety, uwagi, raport AI),

  \* jest całkowicie tylko-do-odczytu (brak jakiejkolwiek edycji).

3\. Nazwy zawodników nie są anonimizowane w widoku publicznym.

4\. Publiczny link działa tak długo, jak długo mecz istnieje w systemie:

  \* usunięcie meczu przez trenera powoduje, że link przestaje działać (np. błąd 404 / ekran „mecz nie istnieje”),

  \* brak osobnego mechanizmu „odwołania” linku w ramach MVP.

### 3.9. Trwałość stanu i zachowanie przy odświeżeniu strony

1\. Po każdym zapisanym punkcie stan meczu jest trwałe zapisany po stronie backendu:

  \* wynik bieżącego seta,

  \* tabela setów,

  \* historia punktów,

  \* serwujący następny punkt.

2\. Po odświeżeniu strony lub zamknięciu i ponownym otwarciu URL meczu:

  \* trener wraca do aktualnego stanu meczu,

  \* może kontynuować rejestrację od bieżącego punktu.

3\. W przypadku błędu zapisu (np. problem z siecią):

  \* trener otrzymuje komunikat o błędzie,

  \* UI zostaje odblokowane,

  \* stan meczu po stronie serwera pozostaje niezmieniony (brak częściowo zapisanych punktów).

### 3.10. Warstwa prezentacji (RWD, UX)

1\. UI jest zoptymalizowane pod smartfon w pionie:

  \* duże, wygodne w obsłudze przyciski dla rejestracji punktów,

  \* przejrzysta prezentacja bieżącego wyniku i serwującego.

2\. Aplikacja jest responsywna:

  \* na tabletach i laptopach układ dostosowuje się do większej szerokości,

  \* zachowana jest pełna funkcjonalność.

3\. Szczegółowy projekt UX (rozmieszczenie przycisków, układ tabeli setów, prezentacja tagów) jest poza zakresem tego PRD i powstanie na etapie projektowania.

### 3.11. Analityka i metryki

1\. Aplikacja rejestruje co najmniej następujące zdarzenia:

  \* logowanie użytkownika (z rozróżnieniem miesiąca kalendarzowego),

  \* utworzenie meczu,

  \* zakończenie meczu (zmiana statusu na „Zakończony”).

2\. Na podstawie tych zdarzeń możliwe jest:

  \* obliczenie, czy użytkownik był aktywny w danym miesiącu (co najmniej jedno logowanie),

  \* obliczenie liczby meczów zakończonych przez każdego aktywnego użytkownika w miesiącu.

### 3.12. Czas i strefy czasowe

1\. Czas (np. start meczu) jest przechowywany w sposób umożliwiający prezentowanie go w lokalnej strefie czasowej przeglądającego (np. UTC w bazie).

2\. Na wszystkich widokach:

  \* mecze rejestrowane w Polsce, oglądane np. na Filipinach, pokazują czas startu meczu w lokalnej strefie przeglądającego.

---

## 4. Granice produktu

### 4.1. Zakres wchodzący w MVP

1\. Rejestracja przebiegu meczu na żywo:

  \* punkty z tagami,

  \* sety i wynik setów,

  \* wskazanie serwującego zgodnie z opisanymi zasadami.

2\. Prosty system kont:

  \* jedno konto trenera,

  \* logowanie przez Google (Supabase),

  \* brak edycji profilu i usuwania konta.

3\. Lista meczów:

  \* tylko mecze danego trenera,

  \* filtrowanie po zawodniku ocenianym i rywalu,

  \* usuwanie pojedynczego meczu.

4\. Widok meczu „W toku”:

  \* rejestracja punktów z tagami,

  \* cofanie ostatniego punktu,

  \* zakończanie setów z uwagami,

  \* zakończanie meczu z uwagami.

5\. Widok meczu „Zakończony”:

  \* tabela setów, uwagi, raport i zalecenia AI.

6\. Integracja z AI:

  \* generowanie podsumowania i zaleceń po zakończeniu meczu,

  \* obsługa błędów generowania bez retry.

7\. Publiczne udostępnianie meczów:

  \* publiczny, losowy link tylko-do-odczytu,

  \* ważny do czasu usunięcia meczu.

8\. Lekką analitykę:

  \* zdarzenia logowania,

  \* zdarzenia zakończenia meczu.

9\. RWD:

  \* pełne wsparcie dla smartfonu w pionie,

  \* poprawne działanie na tablet i desktop.

### 4.2. Zakres wyłączony z MVP

Zgodnie z opisem:

1\. Brak kont zawodników i rywali (na poziomie aplikacji lub konta użytkownika).

2\. Brak listy zawodników i rywali (słowniki, wyszukiwarki).

3\. Brak meczów w statusach „W przygotowaniu” / „Zaplanowane”:

  \* każdy mecz tworzony jest od razu jako „W toku” z pierwszym setem.

4\. Brak możliwości dodania meczu bez danych początkowych.

5\. Brak grupowego usuwania wielu meczów jednocześnie.

6\. Brak możliwości:

  \* poprawiania lub usuwania danych o punktach w zakończonych setach,

  \* poprawiania lub usuwania danych o setach i punktach w zakończonych meczach,

  \* cofania się do zakończonego seta w celu dodania kolejnych punktów,

  \* anulowania meczów lub setów.

7\. Brak własnych zestawów tagów per konto:

  \* lista tagów jest predefiniowana i wspólna dla wszystkich.

8\. Brak walidacji przepisów gry:

  \* brak wymogu 11 punktów i 2 punktów przewagi,

  \* aplikacja pozwala zakończyć set przy dowolnym nie remisowym wyniku punktowym,

  \* brak ostrzeżeń o nietypowych wynikach.

9\. Brak automatycznego:

  \* zamykania setów przez aplikację,

  \* zamykania meczów przez aplikację.

10\. Brak archiwizacji meczów (osobny status „archiwalny” itp.).

11\. Brak funkcji społecznościowych:

\* brak komentarzy, polubień, profili publicznych itp.

12\. Brak obsługi multimediów:

\* brak zdjęć, nagrań video, plików audio powiązanych z meczem.

13\. Brak udostępniania meczów przez integracje z serwisami społecznościowymi:

\* jedyną formą udostępnienia jest publiczny URL do skopiowania.

14\. Brak trybu offline i buforowania lokalnego:

\* aplikacja wymaga połączenia z internetem.

15\. Brak twardych limitów na liczbę meczów, setów i punktów:

\* ewentualne problemy wydajnościowe przy ekstremalnych przypadkach są akceptowane w MVP.

16\. Brak szczegółowej specyfikacji UX/UI w tym PRD:

\* układ ekranów, dokładne teksty komunikatów, mikrocopy powstaną poza tym dokumentem.

17\. Brak szczegółowych wymagań niefunkcjonalnych (np. SLA czasu odpowiedzi):

\* doprecyzowanie tylko jeśli praktyka wskaże taką potrzebę.

---

## 5. Historyjki użytkowników

### US-001 – Logowanie przez Google

\* ID: US-001

\* Tytuł: Logowanie do aplikacji przez konto Google

\* Opis:

  Jako trener chcę zalogować się do aplikacji za pomocą mojego konta Google, aby szybko uzyskać dostęp do moich meczów bez zakładania kolejnego konta.

\* Kryteria akceptacji:

  1. Na stronie startowej widoczny jest przycisk logowania Google.

  2. Po kliknięciu przycisku użytkownik przechodzi standardowy flow logowania Google (Supabase).

  3. Po pomyślnym logowaniu użytkownik trafia na listę swoich meczów.

  4. Po wylogowaniu próba wejścia na listę meczów lub widok meczu przekierowuje na stronę logowania.

---

### US-002 – Dostęp tylko dla zalogowanych trenerów

\* ID: US-002

\* Tytuł: Ochrona widoków aplikacji przed dostępem bez logowania

\* Opis:

  Jako trener chcę, aby moje mecze były dostępne tylko po zalogowaniu, tak aby nikt nieuprawniony nie mógł przeglądać ani edytować moich danych.

\* Kryteria akceptacji:

  1. Wejście na listę meczów bez sesji logowania przekierowuje na stronę logowania.

  2. Wejście na URL meczu „W toku” lub „Zakończony” bez sesji logowania (dla niepublicznego widoku) przekierowuje na stronę logowania.

  3. Po zalogowaniu trener widzi wyłącznie swoje mecze.

  4. Próba odczytu meczu innego użytkownika (np. po podmianie ID w URL) kończy się błędem autoryzacji.

---

### US-003 – Wylogowanie z aplikacji

\* ID: US-003

\* Tytuł: Wylogowanie trenera z aplikacji

\* Opis:

  Jako trener chcę móc się wylogować z aplikacji, aby na współdzielonym urządzeniu nikt inny nie miał dostępu do moich meczów.

\* Kryteria akceptacji:

  1. Na głównych widokach dla zalogowanego użytkownika dostępny jest przycisk „Wyloguj”.

  2. Po wylogowaniu sesja użytkownika jest unieważniana.

  3. Po wylogowaniu użytkownik trafia na stronę startową lub ekran logowania.

  4. Ponowna próba wejścia na listę lub widok meczu po wylogowaniu wymaga ponownego logowania.

---

### US-010 – Strona startowa z prezentacją produktu

\* ID: US-010

\* Tytuł: Strona startowa z opisem wartości i logowaniem

\* Opis:

  Jako trener chcę zobaczyć na stronie startowej krótkie wyjaśnienie, do czego służy aplikacja Spin Flow oraz mieć możliwość przejścia do logowania, aby szybko zrozumieć produkt i rozpocząć pracę.

\* Kryteria akceptacji:

  1. Strona startowa opisuje krótko główny problem i wartość (rejestracja meczu + analiza AI).

  2. Na stronie widoczny jest przycisk logowania Google.

  3. Po zalogowaniu użytkownik nie jest ponownie kierowany na stronę startową, tylko na listę meczów.

---

### US-020 – Przegląd listy meczów

\* ID: US-020

\* Tytuł: Lista meczów trenera

\* Opis:

  Jako trener chcę zobaczyć listę moich meczów, aby móc szybko znaleźć mecz do kontynuacji lub przeglądu.

\* Kryteria akceptacji:

  1. Lista prezentuje wyłącznie mecze zalogowanego trenera.

  2. Dla każdego meczu pokazane są: zawodnik oceniany, rywal, status meczu, dzień i godzina startu meczu (w lokalnej strefie), aktualny wynik setów.

  3. Mecze „W toku” są wyróżnione względem „Zakończonych”.

  4. Lista jest posortowana według dna i godziny wystartowania meczu.

  5. Lista ma stronicowanie.

  6. Kliknięcie meczu „W toku” otwiera widok meczu „W toku”.

  7. Kliknięcie meczu „Zakończony” otwiera widok meczu „Zakończony”.

---

### US-021 – Filtrowanie listy meczów

\* ID: US-021

\* Tytuł: Filtrowanie meczów po zawodniku i rywalu

\* Opis:

  Jako trener chcę filtrować listę meczów po nazwie zawodnika ocenianego i rywala, aby szybciej znaleźć interesujący mnie mecz.

\* Kryteria akceptacji:

  1. Użytkownik może wprowadzić filtr po nazwie zawodnika ocenianego.

  2. Użytkownik może wprowadzić filtr po nazwie rywala.

  3. Lista meczów aktualizuje się po zastosowaniu filtrów, wyświetlając tylko pasujące pozycje.

  4. Czyszczenie filtrów przywraca pełną listę.

---

### US-022 – Usuwanie meczu z listy

\* ID: US-022

\* Tytuł: Usunięcie pojedynczego meczu

\* Opis:

  Jako trener chcę móc usunąć pojedynczy mecz z listy, aby pozbyć się niepotrzebnych lub testowych meczów.

\* Kryteria akceptacji:

  1. Przy każdym meczu dostępna jest akcja usunięcia (np. ikona kosza).

  2. Po wybraniu usunięcia użytkownik otrzymuje proste potwierdzenie akcji (np. modal/pytanie).

  3. Po potwierdzeniu mecz jest trwale usuwany z bazy.

  4. Usunięty mecz znika z listy meczów.

  5. Publiczny link powiązany z usuniętym meczem przestaje działać (widok błędu).

---

### US-023 – Wejście do meczu „W toku” z listy

\* ID: US-023

\* Tytuł: Kontynuacja meczu „W toku”

\* Opis:

  Jako trener chcę kliknąć mecz „W toku” na liście i przenieść się do widoku jego bieżącego stanu, aby kontynuować rejestrację punktów.

\* Kryteria akceptacji:

  1. Kliknięcie pozycji listy ze statusem „W toku” otwiera widok meczu „W toku”.

  2. Widok odzwierciedla aktualny stan meczu (set, punkty, serwujący).

  3. Możliwa jest natychmiastowa rejestracja kolejnego punktu.

---

### US-024 – Wejście do meczu „Zakończony” z listy

\* ID: US-024

\* Tytuł: Przegląd meczu zakończonego z listy

\* Opis:

  Jako trener chcę kliknąć mecz „Zakończony” na liście i zobaczyć jego pełne podsumowanie, aby przeanalizować przebieg meczu i wnioski.

\* Kryteria akceptacji:

  1. Kliknięcie pozycji listy ze statusem „Zakończony” otwiera widok meczu „Zakończony”.

  2. Widoczna jest tabela setów, uwagi trenera, raport i zalecenia AI (jeśli wygenerowane).

  3. Widok jest tylko-do-odczytu, z wyjątkiem dopuszczalnej edycji metadanych (jeśli przewidziana).

---

### US-030 – Dodanie nowego meczu

\* ID: US-030

\* Tytuł: Utworzenie nowego meczu z danymi początkowymi

\* Opis:

  Jako trener chcę utworzyć nowy mecz, podając dane początkowe, aby rozpocząć rejestrowanie punktów na żywo.

\* Kryteria akceptacji:

  1. Formularz tworzenia meczu zawiera pola: zawodnik oceniany, rywal, maksymalna liczba setów, złoty set (tak/nie), pierwszy serwujący, flaga „Podsumowanie AI na koniec meczu”.

  2. Pola wymagane nie mogą być puste (zawodnik, rywal, maksymalna liczba setów, pierwszy serwujący).

  3. Maksymalna liczba setów musi być liczbą dodatnią.

  4. Po zapisaniu meczu tworzony jest mecz ze statusem „W toku”.

  5. Automatycznie tworzony jest pierwszy set z ustawionym pierwszym serwującym.

  6. Użytkownik trafia bezpośrednio do widoku meczu „W toku”.

---

### US-040 – Widok meczu „W toku”

\* ID: US-040

\* Tytuł: Przegląd stanu meczu „W toku”

\* Opis:

  Jako trener chcę widzieć w jednym miejscu najważniejsze informacje o aktualnym meczu (zawodnicy, tabela setów, bieżący set, kto serwuje), aby podejmować szybkie decyzje podczas rejestracji punktów.

\* Kryteria akceptacji:

  1. Widok prezentuje nazwy zawodnika ocenianego i rywala.

  2. Widoczny jest numer bieżącego seta i jego aktualny wynik setowy.

  3. Widoczna jest informacja, kto serwuje następny punkt.

  4. Widoczny jest aktualny wynik punktowy seta.

  5. Widoczna jest tabela zakończonych i niezakończonych setów z wynikami punktowymi.

  6. Widoczna jest lista tagów.

  7. Widoczne są przyciski do rejestrowania punktów dla zawodnika i rywala.

  8. Widoczny jest przycisk do cofania punktu (aktywny jeśli co najmniej jeden zapisany punkt w secie).

  9. Widoczny jest przycisk zamykania seta.

  10. Widoczny jest przycisk zamykania meczu.

---

### US-041 – Zapis punktu dla zawodnika ocenianego

\* ID: US-041

\* Tytuł: Zapis punktu na rzecz zawodnika ocenianego

\* Opis:

  Jako trener chcę jednym dotknięciem zapisać punkt dla zawodnika ocenianego, aby szybko rejestrować wynik w trakcie wymiany.

\* Kryteria akceptacji:

  1. Widok posiada przycisk „Punkt zawodnik” (lub równoważny).

  2. Kliknięcie przycisku powoduje zapis punktu na rzecz zawodnika ocenianego.

  3. System zapisuje kto serwował dany punkt.

  4. Po zapisaniu punktu wynik bieżącego seta jest aktualizowany.

  5. Stan meczu jest trwałe zapisany na serwerze.

---

### US-042 – Zapis punktu dla rywala

\* ID: US-042

\* Tytuł: Zapis punktu na rzecz rywala

\* Opis:

  Jako trener chcę jednym dotknięciem zapisać punkt dla rywala, aby szybko rejestrować wynik w trakcie wymiany.

\* Kryteria akceptacji:

  1. Widok posiada przycisk „Punkt rywal” (lub równoważny).

  2. Kliknięcie przycisku powoduje zapis punktu na rzecz rywala.

  3. System zapisuje kto serwował dany punkt.

  4. Po zapisaniu punktu wynik bieżącego seta jest aktualizowany.

  5. Stan meczu jest trwałe zapisany na serwerze.

---

### US-043 – Dodawanie tagów do punktu

\* ID: US-043

\* Tytuł: Przypisanie tagów do zapisywanego punktu

\* Opis:

  Jako trener chcę móc przypisać do zapisywanego punktu jeden lub wiele tagów z listy, aby później móc analizować rodzaje błędów i akcji.

\* Kryteria akceptacji:

  1. UI umożliwia wybór 0..N tagów z predefiniowanej listy (np. błąd serwisu, błąd odbioru, zła praca nóg, świnka, itd.).

  2. Lista tagów jest stała i wspólna dla wszystkich użytkowników.

  3. Wybrane tagi są zapisywane razem z punktem.

  4. Brak wybranych tagów jest dozwolony (punkt bez tagów).

---

### US-044 – Wyliczanie serwującego według zasad

\* ID: US-044

\* Tytuł: Automatyczne wyliczanie serwującego następny punkt

\* Opis:

  Jako trener chcę, aby aplikacja automatycznie wyliczała, kto serwuje następny punkt na podstawie historii punktów i zasad serwowania, aby uniknąć błędów i oszczędzić czas.

\* Kryteria akceptacji:

  1. Na początku pierwszego seta serwujący jest zgodny z danymi początkowymi meczu.

  2. Zmiana serwującego następuje co 2 punkty (łącznie w secie), naprzemiennie między zawodnikiem a rywalem.

  3. Po osiągnięciu stanu 10:10 w secie serwujący zmienia się po każdym punkcie.

  4. Jeśli set jest oznaczony jako złoty (ostatni przy włączonej opcji złotego seta), serwujący zmienia się po każdym punkcie przez cały set, niezależnie od wyniku.

  5. Pierwszy serwujący w kolejnych setach zmienia się naprzemiennie względem poprzednich setów, zgodnie z ustaleniem serwującego pierwszego seta.

---

### US-045 – Cofnięcie ostatniego punktu w secie

\* ID: US-045

\* Tytuł: Cofnięcie ostatnio zapisanego punktu w secie

\* Opis:

  Jako trener chcę móc cofnąć ostatnio zapisany punkt w secie, gdy się pomylę, aby skorygować zapis meczu bez utraty całej historii.

\* Kryteria akceptacji:

  1. Widok meczu „W toku” zawiera akcję „Cofnij ostatni punkt”.

  2. Cofnięciu podlega wyłącznie ostatni zapisany punkt w bieżącym secie (brak możliwości cofania punktów z innych setów).

  3. Po cofnięciu usuwane są dane punktu i jego tagi.

  4. System przelicza wynik bieżącego seta oraz serwującego następnego punktu.

  5. Jeśli w danym secie nie ma jeszcze zapisanego punktu, to przycisk cofania punktu powinien być nieaktywny, a operacja po stronie serwera niemożliwa do wykonania.

---

### US-046 – Zakończenie seta z uwagami

\* ID: US-046

\* Tytuł: Zakończenie seta i zapis uwag trenera

\* Opis:

  Jako trener chcę zakończyć seta przy dowolnym nie remisowym wyniku oraz dodać uwagi do danego seta, aby odnotować najważniejsze obserwacje.

\* Kryteria akceptacji:

  1. Widok meczu „W toku” zawiera akcję „Zakończ set”.

  2. Aplikacja pozwala zakończyć set tylko, gdy wynik bieżącego seta nie jest remisem.

  3. Przy zakończeniu seta trener może dodać komentarz tekstowy (opcjonalny).

  4. Po zapisaniu seta trafia on do tabeli setów z wynikiem i uwagą.

  5. Stan meczu jest trwałe zapisany po zakończeniu seta.

  6. Jeśli bieżący set jest ostatnim setem w meczu (maksymalna liczba setów), to przycisk zakończenia seta powinien być nieaktywny, a operacja po stronie serwera niemożliwa o wykonania.

---

### US-047 – Automatyczny start nowego seta

\* ID: US-047

\* Tytuł: Automatyczne utworzenie kolejnego seta

\* Opis:

  Jako trener chcę, aby po zakończeniu seta aplikacja automatycznie zaczynała kolejny set, aby nie tracić czasu na ręczne tworzenie nowego seta.

\* Kryteria akceptacji:

  1. Po zakończeniu seta system automatycznie tworzy kolejny set, jeśli mecz nie jest zakończony.

  2. Nowy set startuje z wynikiem 0:0.

  3. Pierwszy serwujący w nowym secie jest wyznaczony zgodnie z zasadą naprzemiennego serwowania setów.

  4. Widok meczu „W toku” przełącza się na nowy, bieżący set.

---

### US-048 – Zakończenie meczu

\* ID: US-048

\* Tytuł: Zakończenie meczu z walidacją wyniku

\* Opis:

  Jako trener chcę zakończyć mecz przy nie remisowym wyniku, aby aplikacja zamknęła mecz i przygotowała dane do analizy AI.

\* Kryteria akceptacji:

  1. Widok meczu „W toku” zawiera akcję „Zakończ mecz”.

  2. Aplikacja pozwala zakończyć mecz tylko, gdy:

  \* bieżący wynik seta nie jest remisem,

  \* wynik setów (zakończone sety plus bieżący) nie jest remisem.

  3. Przy zakończeniu meczu trener może dodać uwagi do całego meczu.

  4. Po zakończeniu mecz otrzymuje status „Zakończony”.

  5. Stan meczu jest trwale zapisany.

---

### US-049 – Przerwanie i późniejsza kontynuacja meczu

\* ID: US-049

\* Tytuł: Przerwanie rejestracji meczu i kontynuacja później

\* Opis:

  Jako trener chcę móc przerwać rejestrację meczu (np. z powodów organizacyjnych) i później kontynuować od aktualnego stanu, aby nie tracić wprowadzonych danych.

\* Kryteria akceptacji:

  1. Trener może opuścić widok meczu „W toku” (np. powrót do listy) bez konieczności kończenia meczu.

  2. Po powrocie do meczu „W toku” widok odzwierciedla aktualny stan meczu.

  3. Możliwe jest natychmiastowe zapisanie kolejnego punktu po powrocie.

---

### US-050 – Zachowanie stanu przy odświeżeniu strony

\* ID: US-050

\* Tytuł: Utrwalenie stanu meczu po każdym punkcie

\* Opis:

  Jako trener chcę, aby po odświeżeniu strony lub przypadkowym zamknięciu przeglądarki aplikacja przywróciła aktualny stan meczu, abym nie utracił wprowadzonych danych.

\* Kryteria akceptacji:

  1. Po każdym zapisaniu punktu stan meczu jest trwałe zapisany w backendzie.

  2. Po odświeżeniu strony i ponownym wejściu na URL meczu trener widzi aktualny stan meczu.

  3. Brak jest sytuacji, w których zapisany punkt jest widoczny w UI, ale nie istnieje w bazie po odświeżeniu.

---

### US-060 – Widok meczu „Zakończony” dla trenera

\* ID: US-060

\* Tytuł: Przegląd zakończonego meczu

\* Opis:

  Jako trener chcę zobaczyć pełny przegląd zakończonego meczu, w tym wyniki setów, uwagi i raport AI, aby analizować grę zawodnika.

\* Kryteria akceptacji:

  1. Widok „Zakończony” prezentuje dane ogólne meczu (zawodnik, rywal).

  2. Widoczny jest dzień i godzina wystartowania meczu (w lokalnej strefie przeglądającego).

  3. Widoczny jest aktualny wynik setowy meczu (wygrane sety zawodnika ocenianego i rywala).

  4. Tabela setów pokazuje wyniki każdego seta i zwycięzcę.

  5. Wyświetlane są uwagi trenera do każdego seta i do meczu.

  6. Jeśli raport AI jest dostępny, widoczne są: opis meczu (5–7 zdań) i zalecenia (5–7 zdań).

  7. Widok jest domyślnie tylko-do-odczytu, z ewentualną możliwością edycji wybranych metadanych.

---

### US-061 – Edycja metadanych meczu „Zakończony”

\* ID: US-061

\* Tytuł: Korekta wybranych danych meczu zakończonego

\* Opis:

  Jako trener chcę móc poprawić wybrane dane meczu zakończonego (np. literówki w nazwach zawodników), bez zmiany przebiegu meczu, aby raporty były spójne i czytelne.

\* Kryteria akceptacji:

  1. Widok „Zakończony” umożliwia edycję wybranych pól meta (np. nazwy zawodników, uwagi do setów, uwagi do meczu).

  2. System nie pozwala na edycję setów, punktów ani historii punktów.

  3. Po zapisaniu zmian aktualizowane są tylko edytowalne pola.

---

### US-070 – Wygenerowanie publicznego linku do meczu

\* ID: US-070

\* Tytuł: Udostępnienie zakończonego meczu za pomocą publicznego linku

\* Opis:

  Jako trener chcę wygenerować publiczny link do zakończonego meczu, aby zawodnik lub opiekunowie mogli zobaczyć przebieg meczu bez logowania.

\* Kryteria akceptacji:

  1. Dla meczu „Zakończony” dostępna jest akcja „Udostępnij mecz”.

  2. Naciśnięcie akcji generuje (lub pobiera istniejący) publiczny URL zawierający losowy token.

  3. Dostępny jest przycisk „Kopiuj”, który kopiuje link do schowka urządzenia.

  4. Link jest ważny tak długo, jak długo mecz istnieje w bazie.

---

### US-071 – Otworzenie publicznego linku przez osobę niezalogowaną

\* ID: US-071

\* Tytuł: Podgląd meczu poprzez publiczny link bez logowania

\* Opis:

  Jako odbiorca publicznego linku chcę móc otworzyć mecz w przeglądarce bez logowania, aby zobaczyć przebieg i zalecenia.

\* Kryteria akceptacji:

  1. Wejście na publiczny URL nie wymaga logowania.

  2. Prezentowane są te same informacje co w widoku „Zakończony” dla trenera (bez elementów edycyjnych).

  3. Widok jest wyłącznie do odczytu, bez możliwości modyfikacji danych.

  4. Nazwy zawodników pozostają widoczne (brak anonimizacji).

---

### US-072 – Obsługa nieważnego publicznego linku

\* ID: US-072

\* Tytuł: Zachowanie przy nieistniejącym lub usuniętym meczu

\* Opis:

  Jako odbiorca linku chcę otrzymać jasny komunikat, jeśli mecz nie istnieje, aby wiedzieć, że link stracił ważność.

\* Kryteria akceptacji:

  1. Wejście na publiczny URL z tokenem dla meczu, który został usunięty, wyświetla informację „Mecz nie istnieje” lub równoważny komunikat.

  2. Wejście na publiczny URL z nieprawidłowym tokenem wyświetla analogiczny komunikat błędu.

---

### US-080 – Generowanie podsumowania AI po zakończeniu meczu

\* ID: US-080

\* Tytuł: Automatyczne wygenerowanie raportu i zaleceń AI

\* Opis:

  Jako trener chcę, aby po zakończeniu meczu aplikacja automatycznie wygenerowała z pomocą AI opis meczu i zalecenia dla zawodnika, aby móc szybciej wyciągać wnioski.

\* Kryteria akceptacji:

  1. Jeśli flaga „Podsumowanie AI na koniec meczu” = true, po zakończeniu meczu wysyłane jest żądanie do AI.

  2. Dane wejściowe do AI obejmują historię punktów, setów, serwujących, tagi i uwagi trenera.

  3. Otrzymany wynik zawiera 5–7 zdań opisu meczu oraz 5–7 zdań zaleceń, w języku polskim.

  4. Raport AI zostaje zapisany w bazie i widoczny w widoku meczu „Zakończony” i publicznym.

---

### US-081 – Obsługa błędu generowania AI

\* ID: US-081

\* Tytuł: Błąd generowania podsumowania AI

\* Opis:

  Jako trener chcę otrzymać jasny komunikat, gdy generowanie AI się nie powiedzie, aby wiedzieć, że mecz jest zakończony, ale raport AI nie jest dostępny.

\* Kryteria akceptacji:

  1. W przypadku błędu generowania AI użytkownik otrzymuje komunikat o błędzie.

  2. Mecz pozostaje w statusie „Zakończony”.

  3. Dane meczu (sety, punkty, uwagi) są zachowane.

  4. W widoku meczu „Zakończony” sekcja AI informuje o braku dostępnego podsumowania (np. „Nie udało się wygenerować raportu AI”).

  5. W MVP nie są wykonywane automatyczne ponowne próby (retry).

---

### US-082 – Wyłączenie podsumowania AI dla meczu

\* ID: US-082

\* Tytuł: Możliwość stworzenia meczu bez podsumowania AI

\* Opis:

  Jako trener chcę móc utworzyć mecz bez generowania podsumowania AI (np. w testach), aby nie zużywać zasobów AI.

\* Kryteria akceptacji:

  1. Formularz tworzenia meczu zawiera przełącznik „Podsumowanie AI na koniec meczu” (domyślnie włączony).

  2. Jeśli przełącznik jest wyłączony, po zakończeniu meczu nie wysyłane jest żądanie do AI.

  3. Widok „Zakończony” nie prezentuje sekcji z raportem AI dla takiego meczu.

---

### US-090 – Rejestrowanie logowania do analityki

\* ID: US-090

\* Tytuł: Zliczanie logowań użytkownika

\* Opis:

  Jako właściciel produktu chcę rejestrować logowania użytkowników, aby móc obliczyć, którzy użytkownicy są aktywni w danym miesiącu.

\* Kryteria akceptacji:

  1. Za każdym razem, gdy użytkownik pomyślnie się zaloguje, rejestrowane jest zdarzenie w systemie analityki.

  2. Zdarzenie zawiera co najmniej identyfikator użytkownika i datę/czas.

  3. Na podstawie danych można obliczyć listę użytkowników, którzy logowali się w danym miesiącu.

---

### US-091 – Rejestrowanie zakończenia meczu do analityki

\* ID: US-091

\* Tytuł: Zliczanie zakończonych meczów użytkownika

\* Opis:

  Jako właściciel produktu chcę rejestrować zakończenie meczów przez użytkowników, aby mierzyć średnią liczbę zakończonych meczów na aktywnego użytkownika.

\* Kryteria akceptacji:

  1. Zmiana statusu meczu na „Zakończony” generuje zdarzenie w systemie analityki.

  2. Zdarzenie zawiera identyfikator użytkownika, identyfikator meczu i datę/czas.

  3. Na podstawie danych można obliczyć liczbę zakończonych meczów per użytkownik w danym miesiącu.

---

### US-100 – Loader podczas zapisu danych

\* ID: US-100

\* Tytuł: Blokowanie UI podczas zapisu i generowania AI

\* Opis:

  Jako trener chcę widzieć wyraźny sygnał, że aplikacja przetwarza dane (np. zapisuje punkt, zapisuje mecz, zapisuje set lub generuje AI), aby nie wykonywać tej samej akcji wielokrotnie.

\* Kryteria akceptacji:

  1. Podczas dodawania meczu, zapisywania punktu, cofania punktu, zakończenia seta, edytowania meczu, zakończenia meczu UI jest blokowany loaderem „Przetwarzanie”.

  2. Podczas generowania AI wyświetlany jest loader oraz komunikat typu „Generowanie podsumowania AI. Jeszcze chwila…”.

  3. Po zakończeniu operacji loader znika, a UI jest odblokowane.

  4. W czasie działania loadera użytkownik nie może uruchomić żadnej innej akcji z poziomu UI.

---

### US-101 – Obsługa błędów zapisu punktu/seta/meczu

\* ID: US-101

\* Tytuł: Komunikacja błędów przy problemach z zapisem

\* Opis:

  Jako trener chcę otrzymać jasny komunikat, gdy zapis punktu, seta lub meczu się nie powiedzie, aby wiedzieć, że muszę powtórzyć akcję.

\* Kryteria akceptacji:

  1. W przypadku błędu zapisu (np. sieć, błąd serwera) użytkownik widzi komunikat o błędzie.

  2. Po błędzie loader znika, a UI jest ponownie dostępne.

  3. Stan meczu w bazie pozostaje niezmieniony (brak częściowo zapisanych danych).

  4. Użytkownik może spróbować ponownie wykonać operację ręcznie.

---

### US-110 – Prezentacja czasu w lokalnej strefie

\* ID: US-110

\* Tytuł: Wyświetlanie czasu startu meczu w strefie użytkownika

\* Opis:

  Jako trener lub odbiorca publicznego linku chcę widzieć czas startu meczu w mojej lokalnej strefie czasowej, aby poprawnie interpretować datę i godzinę meczu.

\* Kryteria akceptacji:

  1. Czas startu meczu jest przechowywany w formacie umożliwiającym przeliczenie na dowolny timezone.

  2. Na ekranach listy meczów i widoku meczu czas wyświetlany jest w lokalnej strefie czasowej przeglądarki użytkownika.

  3. Ten sam mecz oglądany w różnych strefach czasowych pokazuje różne lokalne czasy, ale odpowiadające tej samej chwili w czasie.

---

### US-120 – Ochrona danych meczów przed innymi użytkownikami

\* ID: US-120

\* Tytuł: Ograniczenie dostępu do meczów tylko do właściciela

\* Opis:

  Jako trener chcę mieć pewność, że inni zalogowani użytkownicy nie mogą zobaczyć ani edytować moich meczów, aby zachować poufność danych.

\* Kryteria akceptacji:

  1. Każdy mecz jest powiązany z identyfikatorem właściciela.

  2. API backendu weryfikuje, że użytkownik ma dostęp wyłącznie do meczów powiązanych z jego kontem.

  3. Próba dostępu do meczu innego użytkownika zwraca błąd autoryzacji.

---

### US-121 – Bezpieczeństwo publicznego linku (token)

\* ID: US-121

\* Tytuł: Publiczny link z trudnym do odgadnięcia tokenem

\* Opis:

  Jako właściciel produktu chcę, aby publiczny link był oparty na kryptograficznie losowym tokenie, aby w praktyce uniemożliwić zgadywanie cudzych meczów.

\* Kryteria akceptacji:

  1. Token w publicznym URL jest generowany w sposób kryptograficznie losowy (odpowiednio długi).

  2. Token nie zawiera danych osobowych ani prostych wzorców (np. inkrementalnych ID).

  3. System nie pozwala na odgadnięcie tokenu przez proste iterowanie wartości.

---

## 6. Metryki sukcesu

### 6.1. Główne kryterium sukcesu

\* 50% aktywnych użytkowników (logujących się przynajmniej raz w miesiącu) zakańcza 2 lub więcej meczów miesięcznie.

Definicje:

\* aktywny użytkownik w miesiącu: użytkownik, który w danym miesiącu wykonał co najmniej jedno logowanie,

\* zakończony mecz: mecz, który otrzymał status „Zakończony” w danym miesiącu.

Sposób pomiaru:

1\. Na podstawie zdarzeń logowania (US-090) wyznaczana jest lista aktywnych użytkowników w danym miesiącu.

2\. Na podstawie zdarzeń zakończenia meczu (US-091) zliczana jest liczba meczów zakończonych przez każdego aktywnego użytkownika.

3\. Wyliczany jest odsetek aktywnych użytkowników, którzy zakończyli co najmniej 2 mecze w danym miesiącu.

4\. Produkt osiąga kryterium sukcesu, gdy odsetek ten wynosi ≥ 50% w stabilnym okresie (np. 2–3 kolejne miesiące).

### 6.2. Dodatkowe (niewyrażone liczbowo) kryteria jakości

\* Aplikacja pozwala na płynną rejestrację punktów na żywo, bez odczuwalnych opóźnień przy standardowych warunkach sieciowych.

\* Brak utraty danych w typowych scenariuszach (odświeżenie strony, zamknięcie karty, chwilowy problem sieciowy przy zachowaniu odpowiedniej obsługi błędu).

\* Interfejs na smartfonie w pionie jest wystarczająco ergonomiczny, aby trener mógł używać aplikacji jedną ręką w warunkach meczu.
