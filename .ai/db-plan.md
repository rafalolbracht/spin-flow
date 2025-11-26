## 1. Lista tabel z kolumnami, typami danych i ograniczeniami

### 1.1. Typy ENUM (PostgreSQL)

```sql
-- Wartości kodowe zgodne z PRD i ustaleniami sesji
CREATE TYPE side_enum AS ENUM ('player', 'opponent');
CREATE TYPE match_status_enum AS ENUM ('in_progress', 'finished');
CREATE TYPE analytics_event_type_enum AS ENUM ('login', 'match_created', 'match_finished');
CREATE TYPE ai_status_enum AS ENUM ('pending', 'success', 'error');
```

### 1.2. Tabela: matches

- id: BIGSERIAL, PK
- user_id: UUID NOT NULL — właściciel (FK do `auth.users.id` w Supabase; kaskada na delete)
- player_name: VARCHAR(200) NOT NULL
- opponent_name: VARCHAR(200) NOT NULL
- max_sets: INT NOT NULL — CHECK (max_sets > 0)
- golden_set_enabled: BOOLEAN NOT NULL
- first_server_first_set: side_enum NOT NULL
- generate_ai_summary: BOOLEAN NOT NULL
- sets_won_player: SMALLINT NOT NULL
- sets_won_opponent: SMALLINT NOT NULL
- status: match_status_enum NOT NULL
- coach_notes: TEXT NULL
- started_at: TIMESTAMPTZ NOT NULL DEFAULT now()
- ended_at: TIMESTAMPTZ NULL
- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()

### 1.3. Tabela: sets

- id: BIGSERIAL, PK
- match_id: BIGINT NOT NULL, FK → matches(id); brak kaskad
- user_id: UUID NOT NULL — właściciel (FK do `auth.users.id` w Supabase; kaskada na delete)
- sequence_in_match: SMALLINT NOT NULL
- is_golden: BOOLEAN NOT NULL
- set_score_player: SMALLINT NOT NULL
- set_score_opponent: SMALLINT NOT NULL
- winner: side_enum NULL
- is_finished: BOOLEAN NOT NULL
- coach_notes: TEXT NULL
- finished_at: TIMESTAMPTZ NULL
- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()

### 1.4. Tabela: points

- id: BIGSERIAL, PK
- set_id: BIGINT NOT NULL, FK → sets(id); brak kaskad
- user_id: UUID NOT NULL — właściciel (FK do `auth.users.id` w Supabase; kaskada na delete)
- sequence_in_set: SMALLINT NOT NULL
- scored_by: side_enum NOT NULL
- served_by: side_enum NOT NULL
- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()

### 1.5. Tabela: tags (globalna, współdzielona)

- id: BIGSERIAL, PK
- name: VARCHAR(30) NOT NULL UNIQUE
- is_system: BOOLEAN NOT NULL
- order_in_list: SMALLINT NOT NULL
- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()

### 1.6. Tabela: point_tags (relacja M:N między points a tags)

- point_id: BIGINT NOT NULL, FK → points(id); brak kaskad
- tag_id: BIGINT NOT NULL, FK → tags(id); brak kaskad
- user_id: UUID NOT NULL — właściciel (FK do `auth.users.id` w Supabase; kaskada na delete)
- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()

Ograniczenia/uwagi:

- PK (point_id, tag_id)

### 1.7. Tabela: matches_public_share (publiczny link 1:1 z meczem)

- id: BIGSERIAL, PK
- match_id: BIGINT NOT NULL UNIQUE, FK → matches(id); brak kaskad
- user_id: UUID NOT NULL — właściciel (FK do `auth.users.id` w Supabase; kaskada na delete)
- token: VARCHAR(64) NOT NULL UNIQUE - skrót tokenu (SHA-256 hex)
- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()

### 1.8. Tabela: matches_ai_reports (raport AI 1:1 z meczem)

- id: BIGSERIAL, PK
- match_id: BIGINT NOT NULL UNIQUE, FK → matches(id), brak kaskad
- user_id: UUID NOT NULL — właściciel (FK do `auth.users.id` w Supabase; kaskada na delete)
- ai_status: ai_status_enum NOT NULL
- ai_summary: TEXT NULL
- ai_recommendations: TEXT NULL
- ai_error: TEXT NULL
- ai_generated_at: TIMESTAMPTZ NULL
- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()

### 1.9. Tabela: analytics_events (tylko dostęp administracyjny)

- id: BIGSERIAL, PK
- user_id: UUID NOT NULL — właściciel (FK do `auth.users.id` w Supabase; kaskada na delete ustawia null)
- type: analytics_event_type_enum NOT NULL
- match_id: BIGINT NULL, FK → matches(id); kaskada na delete ustawia null
- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()

### 1.10. Tabela: dic_lookup_labels (etykiety dla ENUMów i słowników)

- id: BIGSERIAL, PK
- domain: VARCHAR(100) NOT NULL
- code: VARCHAR(50) NOT NULL
- label: VARCHAR(100) NOT NULL

## 2. Relacje między tabelami

- matches (1) — (N) sets: przez `sets.match_id`
- sets (1) — (N) points: przez `points.set_id`
- points (N) — (M) tags: przez tabelę łączącą `point_tags(point_id, tag_id)`
- matches (1) — (1) matches_ai_reports: przez `matches_ai_reports.match_id` (UNIQUE)
- matches (1) — (1) matches_public_share: przez `matches_public_share.match_id` (UNIQUE)
- analytics_events → (opcjonalnie) matches: powiązanie logiczne po `match_id` (bez FK)
- dic_lookup_labels: niezależna (słownik)

Kardynalności:

- 1:N: matches→sets, sets→points
- M:N: points↔tags (przez point_tags)
- 1:1: matches↔matches_ai_reports
- 1:1: matches↔matches_public_share

## 3. Indeksy

Zgodnie z uzgodnieniami MVP — tylko indeksy na kluczach obcych oraz wynikające z ograniczeń unikalności.

- sets: INDEX (match_id)
- points: INDEX (set_id)
- point_tags: INDEX (tag_id), INDEX(point_id)
- matches_ai_reports: UNIQUE INDEX (match_id)
- matches_public_share: UNIQUE INDEX (match_id), UNIQUE INDEX (token)
- tags: UNIQUE INDEX (name)

## 4. Zasady PostgreSQL (RLS) i dostęp

### 4.1. Włączenie RLS

- Włącz RLS na: `matches`, `sets`, `points`, `point_tags`, `matches_ai_reports`, `matches_public_share`.
- Wyłączone/bez RLS: `tags` (globalne), `dic_lookup_labels` (słownik UI).
- `analytics_events`: RLS włączone, (odczyt danych będzie robiony przez service role — bypass RLS w Supabase).

### 4.2. Polityki własności (użytkownik = właściciel)

Dla każdej z tabel objętych RLS (matches, sets, points, point_tags, matches_ai_reports, matches_public_share) utwórz zestaw polityk:

```sql
-- Przykład dla matches (analogiczne dla pozostałych tabel RLS)
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY matches_select_own
  ON matches FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY matches_insert_own
  ON matches FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY matches_update_own
  ON matches FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY matches_delete_own
  ON matches FOR DELETE
  USING (user_id = auth.uid());
```

Zastosuj analogiczne polityki dla: `sets`, `points`, `point_tags`, `matches_ai_reports`, `matches_public_share` (warunek: `user_id = auth.uid()`).

### 4.3. Tabele bez RLS

- `tags`: globalna, współdzielona lista; brak kolumny `user_id`. RLS nieaktywne.
- `dic_lookup_labels`: słownik etykiet; RLS nieaktywne.

### 4.4. analytics_events (tylko admin/service)

```sql
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
-- Brak polityk dla ról public/auth → brak dostępu.
-- Dostęp realizowany przez service role (bypass RLS).
```

### 4.5. Dostęp publiczny do meczu (public share)

- Publiczny podgląd realizowany wyłącznie przez warstwę BE (Astro) z kluczem serwisowym (bypass RLS) i weryfikacją `matches_public_share.token`.
- Brak wyjątków RLS dla anonimów.

## 5. Dodatkowe uwagi i decyzje projektowe

- Klucze PK/FK: domenowe BIGSERIAL (PK/FK), wyjątek: `user_id` (UUID z Supabase).
- Denormalizacja wyników: szybkie listy/widoki dzięki `matches.sets_won_*`, `sets.set_score_*`, `sets.winner`, `sets.is_finished`.
- Kolejność: `sequence_in_match` (sety) i `sequence_in_set` (punkty) nadawana w BE transakcyjnie, bez UNIQUE/CHECK w DB.
- Usuwanie z wyjątkiem user_id: bez kaskad; kolejność (BE, transakcja): `point_tags` → `points` → `sets` → `matches_ai_reports` → `matches_public_share` → `matches`.
- Token publiczny: generowany w aplikacji (kryptograficznie losowy, np. base64url). Brak generowania w DB.
- Analityka: `analytics_events` kaskady do `matches` i users_id ustawiają null , aby nie blokować usuwania. Dostęp wyłącznie przez service role.
- Słowniki/etykiety: `dic_lookup_labels` do mapowania kodów ENUM → etykiety UI (seed wymagany).
- Global: `tags` do tagów (seed wymagany).
- Czas: wszędzie `TIMESTAMPTZ` (UTC w bazie), prezentacja w lokalnej strefie klienta.
- Indeksy dodatkowe i walidacje CHECK/UNIQUE poza wymienionymi — odroczone do post-MVP wg potrzeb.
