# Diagram UI — jak go czytać

**Strona główna (`/`) a sesja:** `index.astro` nie wywołuje `getSession()` w frontmatterze — tylko `LandingPageComponent` (`client:only="angular"`). `AuthService.initializeSession()` woła **`GET /api/auth/session`** w przeglądarce.

**Legenda strzałek w diagramie przepływu:** **ciągła** — kolejny krok. **Przerywana** — zwrot danych, redirect, reguła middleware.

---

## Pełne mapowanie: ścieżka URL → strona Astro → komponent Angular

Źródło: `src/pages/**/*.astro` (stan repozytorium).

| Ścieżka URL              | Plik Astro                     | Komponent Angular (główny)                                           |
| ------------------------ | ------------------------------ | -------------------------------------------------------------------- |
| `/`                      | `index.astro`                  | `LandingPageComponent`                                               |
| `/auth/login`            | `auth/login.astro`             | `LoginPageComponent`                                                 |
| `/matches`               | `matches/index.astro`          | `MatchListPageComponent`                                             |
| `/matches/new`           | `matches/new.astro`            | `CreateMatchWizardPageComponent`                                     |
| `/matches/:id/live`      | `matches/[id]/live.astro`      | `LiveMatchPageComponent`                                             |
| `/matches/:id/summary`   | `matches/[id]/summary.astro`   | `MatchSummaryPageComponent`                                          |
| `/public/matches/:token` | `public/matches/[token].astro` | `PublicMatchContainerComponent` (minimalny HTML, bez `Layout.astro`) |
| `/privacy-policy`        | `privacy-policy.astro`         | `PrivacyPolicyComponent`                                             |
| _404 / nieznany URL_     | `404.astro`                    | `ErrorPageComponent` (`errorType="not_found"`)                       |

**Layout:** `Layout.astro` owija strony z tabeli **oprócz** `/public/matches/:token` (osobny dokument HTML).

**AppLayout:** `AppLayoutComponent` jest **wewnątrz** komponentów chronionych (lista, kreator, live, summary), nie jest osobną trasą.

---

## Endpointy API (REST, `src/pages/api`)

| Grupa              | Metoda i ścieżka                                                                                                                                                                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**           | `POST /api/auth/login`, `GET\|POST /api/auth/callback`, `POST /api/auth/logout`, `GET /api/auth/session`                                                                                                                                                                |
| **Mecze**          | `GET /api/matches`, `POST /api/matches/create`, `GET /api/matches/:id`, `PATCH /api/matches/:id/update`, `POST /api/matches/:id/finish`, `DELETE /api/matches/:id/delete`, `GET /api/matches/:id/sets`, `POST /api/matches/:id/share`, `GET /api/matches/:id/ai-report` |
| **Sety / punkty**  | `GET /api/sets/:id`, `POST /api/sets/:id/finish`, `GET /api/sets/:id/points`, `POST /api/sets/:id/points/create`, `DELETE /api/sets/:id/points/delete`                                                                                                                  |
| **Publiczny mecz** | `GET /api/public/matches/:token`                                                                                                                                                                                                                                        |
| **Inne**           | `POST /api/analytics/events`, `GET /api/dictionary/labels`, `GET /api/tags`                                                                                                                                                                                             |

---

## Diagram przepływu (uproszczony — nie zastępuje tabel)

Poniżej **jeden** graf: wspólny `AuthService`, OAuth, middleware, chronione widoki **zbiorczo** (szczegóły tras w tabeli powyżej).

```mermaid
%%{init: {
  "theme": "dark",
  "themeVariables": {
    "fontSize": "14px",
    "fontFamily": "system-ui, 'Segoe UI', sans-serif",
    "primaryTextColor": "#f1f5f9",
    "secondaryTextColor": "#cbd5e1",
    "lineColor": "#94a3b8",
    "clusterBkg": "#1e293b",
    "clusterBorder": "#64748b",
    "mainBkg": "#0f172a",
    "edgeLabelBackground": "#334155",
    "textColor": "#f8fafc"
  },
  "flowchart": {
    "htmlLabels": true,
    "padding": 14,
    "nodeSpacing": 22,
    "rankSpacing": 26,
    "diagramPadding": 8,
    "curve": "basis",
    "useMaxWidth": false
  }
}}%%
flowchart TB
    subgraph LEG["Legenda"]
        direction LR
        q1([ ]) -->|ciągła| q2([ ])
        q3([ ]) -.->|przerywana| q4([ ])
    end

    AS["AuthService"]
    SE["GET /api/auth/session"]
    SB[("Supabase")]

    subgraph G1["/ — Landing"]
        IX["index.astro"]
        LP["LandingPageComponent"]
        IX --> LP --> AS
    end

    AS -->|initializeSession| SE
    SE -.->|user JSON| AS
    AS -.->|UI| LP

    subgraph G2["/auth/login — OAuth"]
        LG["auth/login.astro — LoginPageComponent"]
        K["POST /api/auth/login"]
        RD["Redirect provider"]
        CB["callback API"]
        LG -->|signIn| AS
        AS --> K --> RD --> CB --> SB
    end

    SB -.->|cookies| AS

    subgraph G3["Middleware jeśli ścieżka niepubliczna"]
        MW["getUser"]
        RU["302 → /?login_required"]
        PG["SSR jednej chronionej trasy"]
        MW -.-> RU
        MW -.-> PG
    end

    RU -.-> IX

    PUBNOTE["Publiczne: wcześniejszy next — m.in. / /auth/login /privacy-policy /public/ /api/auth/ /api/public/"]

    subgraph G5["Chronione trasy trenera — osobny box na każdą stronę"]
        direction TB
        MCH["/matches — matches/index.astro — MatchListPageComponent"]
        MNW["/matches/new — matches/new.astro — CreateMatchWizardPageComponent"]
        MLV["/matches/:id/live — matches/[id]/live.astro — LiveMatchPageComponent"]
        MSM["/matches/:id/summary — matches/[id]/summary.astro — MatchSummaryPageComponent"]
    end

    PG -.->|URL lista| MCH
    PG -.->|URL nowy mecz| MNW
    PG -.->|URL live| MLV
    PG -.->|URL podsumowanie| MSM

    MCH -->|Wyloguj| AS
    MNW -->|Wyloguj| AS
    MLV -->|Wyloguj| AS
    MSM -->|Wyloguj| AS

    M["POST /api/auth/logout"]
    AS --> M --> SB

    subgraph G4["Publiczne / błąd"]
        PUBP["/public/matches/:token — public/matches/[token].astro — PublicMatchContainerComponent"]
        APIP["GET /api/public/matches/:token"]
        PRV["/privacy-policy — privacy-policy.astro — PrivacyPolicyComponent"]
        ERR["404 — 404.astro — ErrorPageComponent"]
        PUBP -->|fetch| APIP
    end

    MSM -.->|link udostępnienia| PUBP

    HI["HttpErrorInterceptor 401"]
    HI -.-> LG

    classDef hub fill:#1d4ed8,stroke:#60a5fa,stroke-width:2px,color:#eff6ff
    classDef api fill:#7c3aed,stroke:#a78bfa,stroke-width:2px,color:#f5f3ff
    classDef infra fill:#475569,stroke:#94a3b8,stroke-width:2px,color:#f1f5f9
    classDef page fill:#047857,stroke:#34d399,stroke-width:2px,color:#ecfdf5
    classDef note fill:#92400e,stroke:#fbbf24,stroke-width:1px,color:#fffbeb
    classDef leg fill:#334155,stroke:#64748b,stroke-width:1px,color:#e2e8f0

    class AS hub
    class SE,K,M,CB,APIP api
    class SB api
    class MW,HI,RU,PG infra
    class IX,LP,LG,MCH,MNW,MLV,MSM,PUBP,PRV,ERR page
    class PUBNOTE note
    class LEG leg
```

**Uwaga do diagramu:** Z **jednego** żądania wynika **dokładnie jedna** chroniona strona — cztery przerywane strzałki z `PG` to **alternatywy** (routing wg URL), a nie cztery równoległe renderowania. Każdy box ma własną ścieżkę, plik `.astro` i komponent (jak w tabeli na górze).

---

**Uwagi**

- **Publiczne URL:** `PUBNOTE` — bez strzałki z middleware; w kodzie `isPublicPath` przed `getUser` (`src/middleware/index.ts`).
- **`/auth/login`:** opcjonalny redirect „już zalogowany” w `auth/login.astro` (`getSession` w frontmatterze).
- **401 z XHR:** interceptor → `/auth/login?error=session_expired`.
- **404:** `ErrorPageComponent` — osobna strona; nie jest na liście `PUBLIC_PATHS` w middleware jako stała ścieżka (nieznany URL); zachowanie zależy od hostingu i routingu Astro.
