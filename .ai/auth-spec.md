# Specyfikacja techniczna modułu autentykacji – Spin Flow

## 1. Wprowadzenie

### 1.1. Cel dokumentu

Niniejszy dokument stanowi szczegółową specyfikację techniczną modułu autentykacji dla aplikacji **Spin Flow**. Opisuje architekturę, komponenty, interfejsy oraz przepływ danych związanych z logowaniem, wylogowywaniem i ochroną zasobów aplikacji.

### 1.2. Zakres funkcjonalny

Moduł autentykacji realizuje wymagania z dokumentu PRD (Product Requirements Document), w szczególności:

- **US-001**: Logowanie do aplikacji przez konto Google i Facebook
- **US-002**: Dostęp tylko dla zalogowanych trenerów
- **US-003**: Wylogowanie z aplikacji
- **US-010**: Strona startowa z prezentacją produktu

### 1.3. Kontekst techniczny

Aplikacja Spin Flow zbudowana jest w oparciu o:

- **Frontend**: Angular 20 (standalone components, signals, inject pattern)
- **Backend**: Astro (API endpoints, SSR)
- **Baza danych i autentykacja**: Supabase (Postgres + Supabase Auth)
- **Hosting**: Cloudflare Pages
- **Biblioteka UI**: PrimeNG 20 + TailwindCSS 4

### 1.4. Stan początkowy

W aplikacji istnieją następujące szczątkowe elementy autentykacji:

- Klient Supabase skonfigurowany (`src/db/supabase.client.ts`)
- `DEFAULT_USER_ID` używane tymczasowo we wszystkich API endpoints (47 wystąpień)
- Middleware Astro dodające klienta Supabase do `context.locals`
- Placeholder-y w UI (przyciski "Zaloguj", "Wyloguj się")
- Zakomentowane placeholder-y sprawdzania sesji w plikach `.astro`
- Metoda `handleUnauthorizedError` w `HttpErrorInterceptor`

---

## 2. Architektura interfejsu użytkownika

### 2.1. Struktura stron i routing

#### 2.1.1. Strony publiczne (brak wymagania autentykacji)

| Ścieżka                   | Plik                                     | Komponent Angular               | Opis                                                       |
| ------------------------- | ---------------------------------------- | ------------------------------- | ---------------------------------------------------------- |
| `/`                       | `src/pages/index.astro`                  | `LandingPageComponent`          | Strona startowa z opisem aplikacji i przyciskami logowania |
| `/auth/login`             | `src/pages/auth/login.astro`             | `LoginPageComponent`            | Strona wyboru metody logowania (Google lub Facebook)       |
| `/public/matches/{token}` | `src/pages/public/matches/[token].astro` | `PublicMatchContainerComponent` | Publiczny widok meczu (bez autentykacji)                   |
| `/404`                    | `src/pages/404.astro`                    | `ErrorPageComponent`            | Strona błędu 404                                           |

**Uwaga**: OAuth callback jest obsługiwany przez API endpoint `/api/auth/callback`, nie przez osobną stronę Astro. Supabase automatycznie przekierowuje do tego endpointu po autoryzacji OAuth.

#### 2.1.2. Strony chronione (wymagają autentykacji)

| Ścieżka                 | Plik                                   | Komponent Angular                | Opis                             |
| ----------------------- | -------------------------------------- | -------------------------------- | -------------------------------- |
| `/matches`              | `src/pages/matches/index.astro`        | `MatchListPageComponent`         | Lista meczów trenera             |
| `/matches/new`          | `src/pages/matches/new.astro`          | `CreateMatchWizardPageComponent` | Formularz tworzenia nowego meczu |
| `/matches/{id}/live`    | `src/pages/matches/[id]/live.astro`    | `LiveMatchPageComponent`         | Widok meczu "W toku"             |
| `/matches/{id}/summary` | `src/pages/matches/[id]/summary.astro` | `MatchSummaryPageComponent`      | Widok meczu "Zakończony"         |

### 2.2. Nowe komponenty do utworzenia

#### 2.2.1. LoginPageComponent

**Lokalizacja**: `src/components/auth/login-page/login-page.component.ts`

**Odpowiedzialność**:

- Wyświetlenie interfejsu wyboru metody logowania (Google lub Facebook)
- Przekierowanie do OAuth flow Supabase Auth
- Obsługa błędów logowania przekazanych w query params

**Interfejs wejściowy**:

```typescript
export interface LoginPageComponentProps {
  errorCode?: string; // np. 'oauth_failed', 'session_expired'
  redirectUrl?: string; // URL do powrotu po pomyślnym logowaniu
}
```

**Struktura HTML** (pseudo-kod):

- Logo aplikacji
- Nagłówek "Zaloguj się do Spin Flow"
- Przycisk "Zaloguj przez Google" z ikoną Google
- Przycisk "Zaloguj przez Facebook" z ikoną Facebook
- Komunikat o błędzie (jeśli `errorCode` jest przekazany)
- Link do strony głównej

**Zależności**:

- `AuthService` (do inicjowania OAuth flow)
- `PrimeNG Button`
- `PrimeNG Message` (dla komunikatów błędów)

#### 2.2.2. ~~AuthCallbackComponent~~ (USUNIĘTY)

**UWAGA**: Ten komponent nie jest potrzebny. OAuth callback jest obsługiwany bezpośrednio przez API endpoint `/api/auth/callback.ts` (sekcja 3.2.2), który wykonuje wymianę tokenu i natychmiast przekierowuje użytkownika do docelowej strony. Nie ma potrzeby renderowania strony pośredniej z loaderem, ponieważ cała operacja trwa < 1s i użytkownik nie zauważa opóźnienia.

#### 2.2.3. AuthGuardComponent (helper)

**Lokalizacja**: `src/components/auth/auth-guard/auth-guard.component.ts`

**Odpowiedzialność**:

- Komponent wrappera sprawdzający autentykację przed renderowaniem zawartości
- Używany wewnętrznie przez strony chronione (opcjonalne, jeśli ochrona jest na poziomie Astro)

**Uwaga**: W architekturze Astro preferujemy weryfikację sesji na poziomie plików `.astro` (server-side), więc ten komponent może być niewymagany.

### 2.3. Modyfikacje istniejących komponentów

#### 2.3.1. LandingPageComponent

**Plik**: `src/components/landing-page/landing-page.component.ts`

**Zmiany**:

```typescript
// PRZED:
onTopbarLoginClick(): void {
  console.log('Topbar login clicked - placeholder for future OAuth integration');
  // TODO: Implement OAuth flow with Supabase Auth
}

onHeroLoginClick(): void {
  console.log('Hero CTA login clicked - placeholder for future OAuth integration');
  // TODO: Implement OAuth flow with Supabase Auth
}

// PO:
import { inject } from '@angular/core';
import { AuthService } from '@/lib/services/auth.service';

readonly authService = inject(AuthService);

onTopbarLoginClick(): void {
  // Jeśli użytkownik jest zalogowany, przekieruj do listy meczów
  if (this.authService.isAuthenticated()) {
    window.location.href = '/matches';
  } else {
    window.location.href = '/auth/login';
  }
}

onHeroLoginClick(): void {
  window.location.href = '/auth/login';
}
```

**Dodatkowe zmiany**:

- W szablonie HTML: przycisk "Zaloguj" w topbarze powinien zmieniać tekst na "Moje mecze" jeśli użytkownik jest zalogowany
- Użycie computed signal dla dynamicznego tekstu przycisku:

```typescript
readonly loginButtonLabel = computed(() =>
  this.authService.isAuthenticated() ? 'Moje mecze' : 'Zaloguj'
);
```

**Obsługa parametru `?login_required=true`**:

Gdy użytkownik zostaje przekierowany z chronionej strony, komponent powinien wyświetlić komunikat o konieczności zalogowania:

```typescript
import { signal, effect } from '@angular/core';

readonly showLoginRequired = signal<boolean>(false);

constructor() {
  // Sprawdzenie parametru URL po inicjalizacji
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('login_required') === 'true') {
      this.showLoginRequired.set(true);
      // Usunięcie parametru z URL bez przeładowania strony
      window.history.replaceState({}, '', '/');
    }
  }
}
```

W szablonie HTML dodać komunikat:

```html
@if (showLoginRequired()) {
<p-message
  severity="info"
  text="Zaloguj się, aby uzyskać dostęp do tej funkcji."
/>
}
```

#### 2.3.2. AppLayoutComponent

**Plik**: `src/components/shared/app-layout/app-layout.component.ts`

**Zmiany**:

```typescript
// PRZED:
private performLogout(): void {
  // TODO: Implementacja logout z Supabase Auth
  if (typeof window !== 'undefined') {
    window.location.href = '/';
  }
}

// PO:
import { inject } from '@angular/core';
import { AuthService } from '@/lib/services/auth.service';

readonly authService = inject(AuthService);

private async performLogout(): Promise<void> {
  try {
    await this.authService.signOut();
    // Przekierowanie do strony głównej po wylogowaniu
    // (zgodnie z PRD US-003, kryterium 3)
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  } catch (error) {
    // Błąd wylogowania zostanie obsłużony przez AuthService
    console.error('Logout failed', error);
  }
}
```

**Dodatkowe zmiany**:

- Dodanie input dla wyświetlania danych użytkownika (przekazywanych z Astro):

```typescript
readonly userName = input<string | undefined>(undefined);
readonly userEmail = input<string | undefined>(undefined);
readonly userInitials = input<string | undefined>(undefined);
```

**Uwaga**: `userName`, `userEmail`, `userInitials` są już zdefiniowane w komponencie, ale trzeba je przekazać z poziomu stron Astro.

### 2.4. Modyfikacje stron Astro

#### 2.4.1. Strona główna (index.astro)

**Plik**: `src/pages/index.astro`

**Zmiany**:

- Sprawdzenie czy użytkownik jest zalogowany
- Przekazanie informacji o sesji do komponentu Angular

```astro
---
import Layout from "../layouts/Layout.astro";
import { LandingPageComponent } from "@/components/landing-page/landing-page.component";

// Pobranie sesji użytkownika
const session = await Astro.locals.getSession();
---

<Layout title="Spin Flow - Rejestracja meczów tenisa stołowego na żywo">
  <LandingPageComponent client:only="angular" />
</Layout>
```

**Uwaga**: Zgodnie z US-001, kryterium 5: "Jeśli trener jest zalogowany i wejdzie na adres strony startowej, to nadal widzi przycisk 'Zaloguj', ale tym razem jego użycie automatycznie przenosi go do listy swoich meczów". Logika ta jest realizowana w komponencie Angular (`onTopbarLoginClick`).

#### 2.4.2. Strona logowania (nowa)

**Plik**: `src/pages/auth/login.astro`

**Zawartość**:

```astro
---
import Layout from "@/layouts/Layout.astro";
import { LoginPageComponent } from "@/components/auth/login-page/login-page.component";

// Jeśli użytkownik jest już zalogowany, przekieruj do listy meczów
const session = await Astro.locals.getSession();
if (session) {
  return Astro.redirect('/matches');
}

// Odczytanie parametrów query (błędy, redirectUrl)
const errorCode = Astro.url.searchParams.get('error') || undefined;
const redirectUrl = Astro.url.searchParams.get('redirect') || '/matches';

export const prerender = false;
---

<Layout title="Logowanie - Spin Flow">
  <LoginPageComponent
    client:only="angular"
    errorCode={errorCode}
    redirectUrl={redirectUrl}
  />
</Layout>
```

#### 2.4.3. ~~Strona callback OAuth~~ (NIEPOTRZEBNA)

**UWAGA**: Ta strona Astro nie jest tworzona. OAuth callback jest obsługiwany bezpośrednio przez API endpoint `/api/auth/callback.ts` (sekcja 3.2.2).

**Konfiguracja Supabase OAuth:**

- **Redirect URL w Supabase**: `https://spin-flow.app/api/auth/callback` (production) lub `http://localhost:4300/api/auth/callback` (development)
- Endpoint automatycznie wymienia kod OAuth na sesję i przekierowuje użytkownika

**Dlaczego nie potrzebujemy strony Astro:**

- API endpoint wykonuje całą logikę (wymiana tokenu, zapis sesji, redirect) w < 1s
- Nie ma sensu renderować strony pośredniej tylko po to, aby od razu przekierować
- Upraszcza to architekturę i eliminuje niepotrzebny komponent

#### 2.4.4. Chronione strony (matches/index.astro, matches/new.astro, itd.)

**Przykład**: `src/pages/matches/index.astro`

**Zmiany**:

```astro
---
import Layout from "../../layouts/Layout.astro";
import { MatchListPageComponent } from "@/components/matches/match-list-page/match-list-page.component";

// Middleware już sprawdza autentykację automatycznie
// Tutaj tylko pobieramy dane użytkownika dla UI

const supabase = Astro.locals.supabase;
const { data: { user } } = await supabase.auth.getUser();

// Pobranie danych użytkownika dla layoutu
const userName = user?.user_metadata?.full_name || user?.email || 'Trener';
const userEmail = user?.email || '';
const userInitials = userName
  .split(' ')
  .map(n => n[0])
  .join('')
  .toUpperCase()
  .slice(0, 2);

export const prerender = false;
---

<Layout title="Spin Flow - Moje mecze">
  <MatchListPageComponent
    client:only="angular"
    userName={userName}
    userEmail={userEmail}
    userInitials={userInitials}
  />
</Layout>
```

**Uwaga**: Podobne uproszczenia należy zastosować we wszystkich chronionych stronach:

- `src/pages/matches/new.astro`
- `src/pages/matches/[id]/live.astro`
- `src/pages/matches/[id]/summary.astro`

**Kluczowa zmiana**: Usunięcie ręcznego sprawdzania sesji (`if (!session) { return Astro.redirect(...) }`), ponieważ middleware już to robi automatycznie.

### 2.5. Przepływ nawigacji

#### 2.5.1. Scenariusz: Użytkownik niezalogowany próbuje wejść na chronioną stronę

1. Użytkownik wchodzi na `/matches`
2. Astro middleware sprawdza sesję
3. Brak sesji → przekierowanie do `/?login_required=true` (strona startowa)
4. Użytkownik widzi stronę główną z informacją o konieczności zalogowania
5. Użytkownik klika przycisk "Zaloguj" w topbarze
6. Przekierowanie do `/auth/login`
7. Użytkownik klika "Zaloguj przez Google"
8. `AuthService.signInWithGoogle()` inicjuje OAuth przez POST `/api/auth/login`
9. Przekierowanie do OAuth flow Supabase (zewnętrzny URL Google)
10. Po autoryzacji Google → callback do `/api/auth/callback?code=...`
11. API `/api/auth/callback` weryfikuje token, tworzy sesję w cookies
12. Przekierowanie do `/matches` (lub `redirectUrl` jeśli był przekazany)
13. Użytkownik widzi listę meczów

#### 2.5.2. Scenariusz: Użytkownik zalogowany wchodzi na stronę główną

1. Użytkownik wchodzi na `/`
2. Strona główna renderuje `LandingPageComponent`
3. Komponent wykrywa, że użytkownik jest zalogowany (`authService.isAuthenticated()`)
4. Przycisk "Zaloguj" w topbarze zmienia się na "Moje mecze"
5. Kliknięcie "Moje mecze" → przekierowanie do `/matches`

#### 2.5.3. Scenariusz: Użytkownik wylogowuje się

1. Użytkownik klika "Wyloguj się" w menu użytkownika
2. Angular wywołuje `authService.signOut()`
3. AuthService wywołuje API `/api/auth/logout`
4. Backend niszczy sesję (usuwa cookies)
5. Przekierowanie do `/` (strona główna, zgodnie z PRD US-003, kryterium 3)

### 2.6. Obsługa błędów w UI

#### 2.6.1. Błędy logowania

**Scenariusz**: OAuth flow zakończył się niepowodzeniem

- API endpoint `/api/auth/callback` zwraca błąd
- Przekierowanie do `/auth/login?error=oauth_failed`
- `LoginPageComponent` wyświetla komunikat: "Logowanie nie powiodło się. Spróbuj ponownie."

**Możliwe kody błędów**:

- `oauth_failed` – błąd podczas OAuth flow
- `session_expired` – sesja wygasła (przekierowanie z interceptora)
- `invalid_callback` – nieprawidłowy token callback

#### 2.6.2. Błędy sesji wygasłej (401 Unauthorized)

**Scenariusz**: Użytkownik wykonuje akcję, ale sesja wygasła

- API endpoint zwraca 401 Unauthorized
- `HttpErrorInterceptor` przechwytuje błąd
- Wyświetlenie komunikatu: "Sesja wygasła. Zaloguj się ponownie."
- Przekierowanie do `/auth/login?error=session_expired&redirect={currentUrl}`

**Uwaga**: Metoda `handleUnauthorizedError` w `HttpErrorInterceptor` już istnieje i wymaga tylko aktualizacji URL przekierowania.

---

## 3. Logika backendowa

### 3.1. Aktualizacja Middleware Astro

#### 3.1.1. Obecny stan

**Plik**: `src/middleware/index.ts`

```typescript
import { defineMiddleware } from "astro:middleware";
import { supabaseClient } from "../db/supabase.client";

export const onRequest = defineMiddleware((context, next) => {
  context.locals.supabase = supabaseClient;
  return next();
});
```

#### 3.1.2. Nowy stan (rozszerzony middleware)

**Plik**: `src/middleware/index.ts`

```typescript
import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerInstance } from "../db/supabase.client";

// Ścieżki publiczne (bez wymagania autentykacji)
const PUBLIC_PATHS = [
  // Strony publiczne
  "/",
  "/auth/login",
  // API auth endpoints (wszystkie ścieżki /api/auth/* są publiczne)
  // Uwaga: /public/matches/* są obsługiwane przez pattern matching poniżej
];

export const onRequest = defineMiddleware(async (context, next) => {
  // Utworzenie instancji Supabase dla tego requestu
  const supabase = createSupabaseServerInstance({
    cookies: context.cookies,
    headers: context.request.headers,
  });

  // Dodanie klienta do context.locals
  context.locals.supabase = supabase;

  // Sprawdzenie czy ścieżka jest publiczna
  const isPublicPath =
    PUBLIC_PATHS.includes(context.url.pathname) ||
    context.url.pathname.startsWith("/public/") ||
    context.url.pathname.startsWith("/api/auth/");

  if (isPublicPath) {
    return next();
  }

  // Dla chronionych ścieżek: sprawdzenie sesji użytkownika
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Dodanie helpera do pobierania sesji (opcjonalne, dla kompatybilności)
  context.locals.getSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  };

  // Dodanie helpera do pobierania user ID
  context.locals.getUserId = async () => {
    return user?.id || null;
  };

  // Jeśli użytkownik zalogowany, kontynuuj
  if (user) {
    return next();
  }

  // Dla niezalogowanych: przekierowanie do strony startowej
  // (zgodnie z PRD US-001, kryterium 7: "trener zostanie przeniesiony na stronę startową")
  // Opcjonalnie można przekazać informację o wymaganym logowaniu
  return context.redirect(`/?login_required=true`);
});
```

#### 3.1.3. Aktualizacja supabase.client.ts

**Plik**: `src/db/supabase.client.ts`

```typescript
import type { AstroCookies } from "astro";
import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

// Client instance (for client-side components)
export const supabaseClient = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);

export type SupabaseClient = typeof supabaseClient;

// Cookie options for server-side auth
export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: true,
  httpOnly: true,
  sameSite: "lax",
};

// Helper function to parse cookie header
function parseCookieHeader(
  cookieHeader: string
): { name: string; value: string }[] {
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

// Server instance creator (for API routes and server-side auth)
export const createSupabaseServerInstance = (context: {
  headers: Headers;
  cookies: AstroCookies;
}) => {
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          context.cookies.set(name, value, options)
        );
      },
    },
  });

  return supabase;
};

/**
 * Create a Supabase client with service role key (bypasses RLS)
 * Use only for internal/admin endpoints that don't require user authentication
 */
export function createSupabaseServiceClient(): ReturnType<
  typeof createClient<Database>
> {
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_KEY environment variable is not set");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// DEFAULT_USER_ID - zostanie usunięty po implementacji autentykacji
```

#### 3.1.4. Rozszerzenie typu Locals

**Plik**: `src/env.d.ts` (lub nowy plik `src/types/astro.d.ts`)

```typescript
/// <reference types="astro/client" />

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Session } from "@supabase/supabase-js";
import type { Database } from "./db/database.types";

declare namespace App {
  interface Locals {
    supabase: SupabaseClient<Database>;
    getSession: () => Promise<Session | null>;
    getUserId: () => Promise<string | null>;
  }
}
```

### 3.2. API Endpoints autentykacji

#### 3.2.1. POST /api/auth/login

**Plik**: `src/pages/api/auth/login.ts`

**Cel**: Inicjowanie OAuth flow z Google

**Request**:

- Method: POST
- Body:

```typescript
{
  provider: 'google' | 'facebook', // Google lub Facebook
  redirectUrl?: string // Opcjonalny URL powrotu
}
```

**Response**:

- Success (200):

```typescript
{
  data: {
    url: string; // URL do przekierowania OAuth
  }
}
```

- Error (400, 500):

```typescript
{
  error: {
    code: string,
    message: string
  }
}
```

**Implementacja**:

```typescript
import type { APIContext } from "astro";
import { z } from "zod";
import { parseRequestBody } from "@/lib/utils/zod-helpers";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/lib/utils/api-response";

export const prerender = false;

const loginSchema = z.object({
  provider: z.enum(["google", "facebook"]),
  redirectUrl: z.string().optional(),
});

export async function POST(context: APIContext) {
  const supabase = context.locals.supabase;

  // Walidacja body
  const bodyResult = await parseRequestBody(context.request, loginSchema);
  if (!bodyResult.success) {
    return createErrorResponse("INVALID_REQUEST", "Invalid request body", 400);
  }

  const { provider, redirectUrl } = bodyResult.data;

  // Generowanie URL OAuth callback (API endpoint, nie strona Astro!)
  const callbackUrl = new URL("/api/auth/callback", context.url.origin);
  if (redirectUrl) {
    callbackUrl.searchParams.set("redirect", redirectUrl);
  }

  // Wywołanie OAuth flow
  // Supabase przekieruje użytkownika do providera, a potem z powrotem do callbackUrl
  // @supabase/ssr automatycznie zarządza cookies po callback
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider,
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  if (error) {
    return createErrorResponse("OAUTH_INIT_FAILED", error.message, 500);
  }

  return createSuccessResponse({ url: data.url }, 200);
}
```

#### 3.2.2. GET/POST /api/auth/callback

**Plik**: `src/pages/api/auth/callback.ts`

**Cel**: Obsługa callback OAuth i wymiana tokenu na sesję

**UWAGA WAŻNA**: To jest **API endpoint**, nie strona Astro. Supabase OAuth musi być skonfigurowany z URL callback wskazującym na `/api/auth/callback` (nie `/auth/callback`).

**Request**:

- Method: GET lub POST (Supabase może używać obu)
- Query params:
  - `code` – token autoryzacyjny od Google/Facebook
  - `state` – opcjonalny state parameter (zabezpieczenie CSRF)

**Response**:

- Success: HTTP 302 Redirect do `/matches` (lub do URL zapisanego w state)
- Error: HTTP 302 Redirect do `/auth/login?error=oauth_failed`

**Implementacja**:

```typescript
import type { APIContext } from "astro";

export const prerender = false;

export async function GET(context: APIContext) {
  return handleCallback(context);
}

export async function POST(context: APIContext) {
  return handleCallback(context);
}

async function handleCallback(context: APIContext) {
  const supabase = context.locals.supabase;
  const code = context.url.searchParams.get("code");

  // Redirect URL może być zakodowany w state lub query param
  // Domyślnie przekierowujemy do listy meczów
  const redirectUrl = context.url.searchParams.get("redirect") || "/matches";

  if (!code) {
    console.error("OAuth callback: missing code parameter");
    return context.redirect("/auth/login?error=invalid_callback");
  }

  // Wymiana kodu OAuth na sesję
  // @supabase/ssr automatycznie zapisze tokeny do cookies przez setAll()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    console.error("OAuth callback error:", error);
    return context.redirect("/auth/login?error=oauth_failed");
  }

  // Rejestracja zdarzenia logowania w analityce (US-090)
  try {
    if (data.session.user?.id) {
      await trackLoginEvent(supabase, data.session.user.id);
    }
  } catch (err) {
    console.error("Failed to track login event:", err);
    // Nie blokujemy logowania jeśli analityka zawiedzie
  }

  // Przekierowanie do docelowej strony
  return context.redirect(redirectUrl);
}

async function trackLoginEvent(supabase: any, userId: string) {
  // Bezpośredni insert do tabeli analytics_events
  await supabase.from("analytics_events").insert({
    user_id: userId,
    type: "login",
  });
}
```

#### 3.2.3. POST /api/auth/logout

**Plik**: `src/pages/api/auth/logout.ts`

**Cel**: Wylogowanie użytkownika i zniszczenie sesji

**Request**:

- Method: POST
- Body: brak
- Headers: Ciasteczko sesji

**Response**:

- Success (204): No Content
- Error (500):

```typescript
{
  error: {
    code: string,
    message: string
  }
}
```

**Implementacja**:

```typescript
import type { APIContext } from "astro";
import { createErrorResponse } from "@/lib/utils/api-response";

export const prerender = false;

export async function POST(context: APIContext) {
  const supabase = context.locals.supabase;

  // Wylogowanie użytkownika
  // @supabase/ssr automatycznie usunie cookies przez setAll()
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Logout error:", error);
    return createErrorResponse("LOGOUT_FAILED", error.message, 500);
  }

  // Zwrócenie pustej odpowiedzi 204 No Content
  return new Response(null, { status: 204 });
}
```

#### 3.2.4. GET /api/auth/session

**Plik**: `src/pages/api/auth/session.ts`

**Cel**: Pobranie informacji o bieżącej sesji użytkownika (dla klienta Angular)

**Request**:

- Method: GET
- Headers: Ciasteczko sesji

**Response**:

- Success (200):

```typescript
{
  data: {
    user: {
      id: string,
      email: string,
      user_metadata: {
        full_name?: string,
        avatar_url?: string,
      }
    } | null
  }
}
```

- Success (200) gdy brak sesji:

```typescript
{
  data: {
    user: null;
  }
}
```

**Implementacja**:

```typescript
import type { APIContext } from "astro";
import { createSuccessResponse } from "@/lib/utils/api-response";

export const prerender = false;

export async function GET(context: APIContext) {
  const supabase = context.locals.supabase;

  // Pobranie sesji użytkownika
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return createSuccessResponse(
    {
      user: session?.user || null,
    },
    200
  );
}
```

### 3.3. Aktualizacja istniejących API endpoints

#### 3.3.1. Wzorzec zmiany

**PRZED** (przykład: `src/pages/api/matches/create.ts`):

```typescript
export async function POST(context: APIContext) {
  const supabase = supabaseClient;
  const userId = DEFAULT_USER_ID; // ❌ Hardcoded

  // ... reszta logiki
}
```

**PO**:

```typescript
export async function POST(context: APIContext) {
  const supabase = context.locals.supabase;
  const userId = await context.locals.getUserId();

  // Sprawdzenie autentykacji
  if (!userId) {
    return new Response(
      JSON.stringify({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // ... reszta logiki
}
```

#### 3.3.2. Lista endpoints do aktualizacji

Wszystkie endpointy korzystające z `DEFAULT_USER_ID` (14 plików):

**Matches**:

- `src/pages/api/matches/index.ts` (GET)
- `src/pages/api/matches/create.ts` (POST)
- `src/pages/api/matches/[id]/index.ts` (GET)
- `src/pages/api/matches/[id]/update.ts` (PATCH)
- `src/pages/api/matches/[id]/delete.ts` (DELETE)
- `src/pages/api/matches/[id]/finish.ts` (POST)
- `src/pages/api/matches/[id]/sets.ts` (GET)
- `src/pages/api/matches/[id]/ai-report.ts` (GET)
- `src/pages/api/matches/[id]/share.ts` (POST)

**Sets**:

- `src/pages/api/sets/[id]/index.ts` (GET)
- `src/pages/api/sets/[id]/finish.ts` (POST)

**Points**:

- `src/pages/api/sets/[id]/points/index.ts` (GET)
- `src/pages/api/sets/[id]/points/create.ts` (POST)
- `src/pages/api/sets/[id]/points/delete.ts` (DELETE)

**Uwaga**: Endpointy publiczne (`/api/public/matches/{token}`) nie wymagają autentykacji i nie powinny sprawdzać `userId`.

#### 3.3.3. Helper do autoryzacji (opcjonalny)

**Plik**: `src/lib/utils/auth-helpers.ts`

```typescript
import type { APIContext } from "astro";
import { createErrorResponse } from "./api-response";

/**
 * Sprawdza autentykację i zwraca user ID lub odpowiedź błędu
 */
export async function requireAuth(
  context: APIContext
): Promise<string | Response> {
  const userId = await context.locals.getUserId();

  if (!userId) {
    return createErrorResponse("UNAUTHORIZED", "Authentication required", 401);
  }

  return userId;
}

/**
 * Sprawdza czy użytkownik jest właścicielem zasobu
 */
export async function requireOwnership(
  context: APIContext,
  resourceUserId: string
): Promise<true | Response> {
  const userId = await context.locals.getUserId();

  if (!userId) {
    return createErrorResponse("UNAUTHORIZED", "Authentication required", 401);
  }

  if (userId !== resourceUserId) {
    return createErrorResponse("FORBIDDEN", "Access denied", 403);
  }

  return true;
}
```

**Użycie**:

```typescript
export async function GET(context: APIContext) {
  const supabase = context.locals.supabase;

  const userId = await requireAuth(context);
  if (userId instanceof Response) {
    return userId; // Zwróć błąd 401
  }

  // Kontynuuj logikę z userId jako string
  // ...
}
```

### 3.4. Aktualizacja serwisów

#### 3.4.1. Usunięcie DEFAULT_USER_ID

**Plik**: `src/db/supabase.client.ts`

**PRZED**:

```typescript
// TODO: Temporary - replace with real authentication
export const DEFAULT_USER_ID = "69c4930b-63f6-4c05-9dec-c3b888fac1f5";
```

**PO**:

```typescript
// Usunąć export DEFAULT_USER_ID
```

**Uwaga**: Po usunięciu `DEFAULT_USER_ID`, wszystkie importy tego stałego w endpointach API przestaną się kompilować, co pozwoli nam zidentyfikować wszystkie miejsca wymagające aktualizacji.

---

## 4. System autentykacji

### 4.1. Architektura autentykacji

#### 4.1.1. Przepływ autentykacji

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ 1. GET /matches
       ▼
┌─────────────────────┐
│  Astro Middleware   │ ◄── Sprawdza ciasteczko sesji
└──────┬──────────────┘
       │
       │ Brak sesji
       │
       │ 2. Redirect: /?login_required=true
       ▼
┌─────────────────────┐
│  LandingPageComponent│ ◄── Pokazuje komunikat o konieczności logowania
└──────┬──────────────┘
       │
       │ 3. Użytkownik klika "Zaloguj"
       ▼
┌─────────────────────┐
│  LoginPageComponent │
└──────┬──────────────┘
       │
       │ 4. Klik "Zaloguj przez Google"
       │ 5. AuthService.signInWithGoogle()
       ▼
┌─────────────────────┐
│ POST /api/auth/login│
└──────┬──────────────┘
       │
       │ 6. Zwraca URL OAuth
       ▼
┌─────────────────────┐
│   Google OAuth      │
└──────┬──────────────┘
       │
       │ 7. Callback: /api/auth/callback?code=...
       ▼
┌──────────────────────────┐
│ GET/POST /api/auth/callback│ ◄── API endpoint (nie strona Astro!)
└──────┬───────────────────┘
       │
       │ 8. Wymiana tokenu na sesję (Supabase)
       │ 9. Ustawienie ciasteczka sesji
       │
       │ 10. Redirect: /matches
       ▼
┌─────────────────────┐
│  Astro Middleware   │ ◄── Znajduje sesję w ciasteczku
└──────┬──────────────┘
       │
       │ Sesja OK
       │
       │ 11. Renderuje stronę /matches
       ▼
┌─────────────────────┐
│ MatchListPageComponent│
└─────────────────────┘
```

#### 4.1.2. Przechowywanie sesji

**Mechanizm**: Ciasteczka HTTP-only

- Supabase Auth automatycznie zarządza ciasteczkami sesji
- Ciasteczka są `HttpOnly`, `Secure`, `SameSite=Lax`
- Klucze ciasteczek Supabase (domyślne):
  - `sb-<project-ref>-auth-token` – token sesji
  - `sb-<project-ref>-auth-token-code-verifier` – weryfikator PKCE

**Konfiguracja Supabase** (opcjonalna, w pliku `.env`):

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=your-jwt-secret (tylko jeśli potrzebna weryfikacja JWT)
```

#### 4.1.3. Weryfikacja sesji

**Server-side (Astro)**:

```typescript
const session = await context.locals.getSession();
if (!session) {
  return Astro.redirect("/auth/login");
}
```

**Client-side (Angular)**:

```typescript
readonly authService = inject(AuthService);

if (!this.authService.isAuthenticated()) {
  window.location.href = '/auth/login';
}
```

**Uwaga**: Weryfikacja client-side jest opcjonalna i służy tylko do poprawy UX (np. ukrycie elementów UI). Prawdziwa ochrona odbywa się server-side.

### 4.2. AuthService (Angular)

#### 4.2.1. Interfejs serwisu

**Plik**: `src/lib/services/auth.service.ts`

**Odpowiedzialność**:

- Pobieranie informacji o bieżącej sesji
- Inicjowanie OAuth flow
- Wylogowanie użytkownika
- Udostępnienie stanu autentykacji dla komponentów Angular

**Interfejs publiczny**:

```typescript
export class AuthService {
  // Signals
  readonly user: Signal<User | null>;
  readonly isAuthenticated: Signal<boolean>;

  // Metody
  initializeSession(): Promise<void>;
  signInWithGoogle(redirectUrl?: string): Promise<void>;
  signInWithFacebook(redirectUrl?: string): Promise<void>;
  signOut(): Promise<void>;
  refreshSession(): Promise<void>;
}
```

#### 4.2.2. Implementacja

```typescript
import { Injectable, signal, computed, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { lastValueFrom } from "rxjs";

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

export interface SessionResponse {
  data: {
    user: User | null;
  };
}

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private readonly http = inject(HttpClient);

  // Stan sesji
  private readonly _user = signal<User | null>(null);
  private readonly _isInitialized = signal<boolean>(false);

  // Publiczne signals (readonly)
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly isInitialized = this._isInitialized.asReadonly();

  constructor() {
    // Automatyczna inicjalizacja sesji przy starcie aplikacji
    // (można wywołać ręcznie w app initialization jeśli preferowane)
    if (typeof window !== "undefined") {
      this.initializeSession();
    }
  }

  /**
   * Inicjalizacja sesji - pobiera informacje o użytkowniku z API
   */
  async initializeSession(): Promise<void> {
    try {
      const response = await lastValueFrom(
        this.http.get<SessionResponse>("/api/auth/session")
      );

      if (response.data.user) {
        this._user.set({
          id: response.data.user.id,
          email: response.data.user.email,
          full_name: response.data.user.user_metadata?.full_name,
          avatar_url: response.data.user.user_metadata?.avatar_url,
        });
      } else {
        this._user.set(null);
      }
    } catch (error) {
      console.error("Failed to initialize session:", error);
      this._user.set(null);
    } finally {
      this._isInitialized.set(true);
    }
  }

  /**
   * Rozpoczęcie procesu logowania przez Google
   */
  async signInWithGoogle(redirectUrl?: string): Promise<void> {
    await this.signInWithProvider("google", redirectUrl);
  }

  /**
   * Rozpoczęcie procesu logowania przez Facebook
   */
  async signInWithFacebook(redirectUrl?: string): Promise<void> {
    await this.signInWithProvider("facebook", redirectUrl);
  }

  /**
   * Rozpoczęcie procesu logowania przez wybranego providera
   */
  private async signInWithProvider(
    provider: "google" | "facebook",
    redirectUrl?: string
  ): Promise<void> {
    try {
      const response = await lastValueFrom(
        this.http.post<{ data: { url: string } }>("/api/auth/login", {
          provider,
          redirectUrl,
        })
      );

      // Przekierowanie do OAuth URL
      if (typeof window !== "undefined") {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error(`Failed to initiate ${provider} login:`, error);
      throw error;
    }
  }

  /**
   * Wylogowanie użytkownika
   */
  async signOut(): Promise<void> {
    try {
      await lastValueFrom(this.http.post("/api/auth/logout", {}));

      this._user.set(null);
    } catch (error) {
      console.error("Failed to sign out:", error);
      throw error;
    }
  }

  /**
   * Odświeżenie sesji (opcjonalne - Supabase robi to automatycznie)
   */
  async refreshSession(): Promise<void> {
    await this.initializeSession();
  }
}
```

#### 4.2.3. Integracja z aplikacją

**App initialization** (opcjonalne):

Jeśli chcemy poczekać na inicjalizację sesji przed renderowaniem aplikacji, możemy użyć `APP_INITIALIZER`:

**Plik**: `src/lib/config/app-initializer.ts`

```typescript
import { APP_INITIALIZER, Provider } from "@angular/core";
import { AuthService } from "@/lib/services/auth.service";

export function initializeAuth(authService: AuthService) {
  return () => authService.initializeSession();
}

export const authInitializerProvider: Provider = {
  provide: APP_INITIALIZER,
  useFactory: initializeAuth,
  deps: [AuthService],
  multi: true,
};
```

**Uwaga**: W obecnej architekturze aplikacji (komponenty standalone bez głównego `AppComponent`), `APP_INITIALIZER` może nie być konieczny. Zamiast tego, `AuthService` inicjalizuje sesję w konstruktorze.

### 4.3. Aktualizacja HttpErrorInterceptor

#### 4.3.1. Obecna implementacja

**Plik**: `src/lib/interceptors/http-error.interceptor.ts`

Metoda `handleUnauthorizedError` już istnieje:

```typescript
function handleUnauthorizedError(messageService: MessageService): void {
  messageService.add({
    severity: "error",
    summary: "Sesja wygasła",
    detail: "Zaloguj się ponownie.",
    life: 5000,
  });

  // Przekierowanie do strony głównej (używamy window.location, bo routing obsługuje Astro)
  if (typeof window !== "undefined") {
    window.location.href = "/";
  }
}
```

#### 4.3.2. Aktualizacja przekierowania

**PO**:

```typescript
function handleUnauthorizedError(messageService: MessageService): void {
  messageService.add({
    severity: "error",
    summary: "Sesja wygasła",
    detail: "Zaloguj się ponownie.",
    life: 5000,
  });

  // Przekierowanie do strony logowania
  // (zgodnie z PRD, po wygaśnięciu sesji użytkownik wraca na stronę logowania)
  if (typeof window !== "undefined") {
    window.location.href = `/auth/login?error=session_expired`;
  }
}
```

### 4.4. Typy autentykacji

#### 4.4.1. Dodanie typów do src/types.ts

**Plik**: `src/types.ts`

**Dodać na końcu pliku**:

```typescript
// =============================================================================
// AUTHENTICATION DTOs
// =============================================================================

/**
 * User DTO for authentication
 * Simplified user information from Supabase Auth
 */
export interface UserDto {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    [key: string]: any;
  };
}

/**
 * Session DTO for authentication
 */
export interface SessionDto {
  user: UserDto;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

/**
 * Login request DTO
 */
export interface LoginRequestDto {
  provider: "google" | "facebook"; // Google lub Facebook
  redirectUrl?: string;
}

/**
 * Login response DTO
 */
export interface LoginResponseDto {
  url: string; // OAuth URL do przekierowania
}

// --- Auth API Response Types ---

/** POST /api/auth/login */
export type LoginResponse = SingleItemResponseDto<LoginResponseDto>;

/** GET /api/auth/session */
export interface SessionResponse {
  data: {
    user: UserDto | null;
  };
}
```

### 4.5. RLS (Row-Level Security) w Supabase

#### 4.5.1. Polityki RLS

Zgodnie z dokumentem tech-stack.md, aplikacja wykorzystuje RLS (Row-Level Security) w Supabase do zabezpieczenia danych.

**Przykładowe polityki RLS** (SQL do wykonania w Supabase):

**Tabela `matches`**:

```sql
-- Polityka SELECT: użytkownik widzi tylko swoje mecze
CREATE POLICY "Users can view their own matches"
ON matches
FOR SELECT
USING (auth.uid() = user_id);

-- Polityka INSERT: użytkownik może tworzyć mecze dla siebie
CREATE POLICY "Users can create their own matches"
ON matches
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Polityka UPDATE: użytkownik może edytować swoje mecze
CREATE POLICY "Users can update their own matches"
ON matches
FOR UPDATE
USING (auth.uid() = user_id);

-- Polityka DELETE: użytkownik może usuwać swoje mecze
CREATE POLICY "Users can delete their own matches"
ON matches
FOR DELETE
USING (auth.uid() = user_id);
```

**Uwaga**: Podobne polityki należy zastosować dla tabel:

- `sets`
- `points`
- `point_tags`
- `matches_ai_reports`
- `matches_public_share`
- `analytics_events`

**Tabela `matches_public_share`** (specjalna polityka):

```sql
-- Publiczny dostęp do udostępnionych meczów (przez token)
CREATE POLICY "Public access to shared matches"
ON matches
FOR SELECT
USING (
  id IN (
    SELECT match_id FROM matches_public_share
  )
);
```

#### 4.5.2. Włączenie RLS

```sql
-- Włączenie RLS dla wszystkich tabel
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE points ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches_ai_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches_public_share ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY; -- Opcjonalnie, jeśli tagi są per-user
ALTER TABLE dic_lookup_labels ENABLE ROW LEVEL SECURITY; -- Tylko odczyt dla wszystkich
```

**Uwaga**: Tabele `tags` i `dic_lookup_labels` mogą wymagać polityki odczytu dla wszystkich użytkowników (dane współdzielone):

```sql
-- Polityka SELECT dla tags (dostęp dla wszystkich zalogowanych)
CREATE POLICY "All authenticated users can view tags"
ON tags
FOR SELECT
USING (auth.role() = 'authenticated');

-- Polityka SELECT dla dic_lookup_labels (dostęp dla wszystkich)
CREATE POLICY "All users can view lookup labels"
ON dic_lookup_labels
FOR SELECT
USING (true);
```

---

## 5. Walidacja i obsługa błędów

### 5.1. Walidacja danych wejściowych

#### 5.1.1. Schematy Zod dla autentykacji

**Plik**: `src/lib/schemas/auth.schemas.ts` (nowy plik)

```typescript
import { z } from "zod";

/**
 * Schema dla logowania
 */
export const loginRequestSchema = z.object({
  provider: z.enum(["google", "facebook"]),
  redirectUrl: z.string().url().optional(),
});

/**
 * Schema dla callback OAuth (query params)
 */
export const authCallbackQuerySchema = z.object({
  code: z.string().min(1),
  redirect: z.string().optional(),
});
```

### 5.2. Komunikaty błędów

#### 5.2.1. Kody błędów autentykacji

| Kod błędu           | Znaczenie                          | Komunikat użytkownika                                          |
| ------------------- | ---------------------------------- | -------------------------------------------------------------- |
| `UNAUTHORIZED`      | Brak sesji lub nieprawidłowy token | "Musisz się zalogować, aby wykonać tę akcję."                  |
| `SESSION_EXPIRED`   | Sesja wygasła                      | "Sesja wygasła. Zaloguj się ponownie."                         |
| `OAUTH_INIT_FAILED` | Błąd inicjowania OAuth             | "Nie udało się rozpocząć logowania. Spróbuj ponownie."         |
| `OAUTH_FAILED`      | Błąd podczas OAuth flow            | "Logowanie nie powiodło się. Spróbuj ponownie."                |
| `INVALID_CALLBACK`  | Nieprawidłowy callback OAuth       | "Nieprawidłowy link callback. Spróbuj zalogować się ponownie." |
| `LOGOUT_FAILED`     | Błąd wylogowania                   | "Nie udało się wylogować. Spróbuj ponownie."                   |

#### 5.2.2. Obsługa błędów w komponentach

**LoginPageComponent**:

```typescript
readonly errorMessages: Record<string, string> = {
  oauth_failed: 'Logowanie nie powiodło się. Spróbuj ponownie.',
  session_expired: 'Sesja wygasła. Zaloguj się ponownie.',
  invalid_callback: 'Nieprawidłowy link callback. Spróbuj zalogować się ponownie.',
};

readonly errorMessage = computed(() => {
  const code = this.errorCode();
  return code ? this.errorMessages[code] || 'Wystąpił nieoczekiwany błąd.' : null;
});
```

---

## 6. Scenariusze testowe

### 6.1. Scenariusze logowania

#### 6.1.1. Pomyślne logowanie (Happy Path)

**Kroki**:

1. Użytkownik (niezalogowany) wchodzi na `/matches`
2. System przekierowuje do `/auth/login?redirect=/matches`
3. Użytkownik klika "Zaloguj przez Google"
4. System przekierowuje do Google OAuth
5. Użytkownik autoryzuje aplikację w Google
6. Google przekierowuje do `/auth/callback?code=...`
7. System weryfikuje token i tworzy sesję
8. System przekierowuje do `/matches`
9. Użytkownik widzi listę swoich meczów

**Oczekiwany rezultat**: Użytkownik jest zalogowany i widzi listę meczów.

#### 6.1.2. Użytkownik anulował logowanie

**Kroki**:

1. Użytkownik klika "Zaloguj przez Google"
2. W oknie Google OAuth użytkownik klika "Anuluj"
3. Google przekierowuje do `/api/auth/callback` z błędem (lub bez parametru `code`)
4. API endpoint wykrywa błąd lub brak kodu
5. System przekierowuje do `/auth/login?error=oauth_failed`

**Oczekiwany rezultat**: Użytkownik widzi komunikat "Logowanie nie powiodło się. Spróbuj ponownie."

#### 6.1.3. Użytkownik zalogowany wchodzi na stronę logowania

**Kroki**:

1. Użytkownik (zalogowany) wchodzi na `/auth/login`
2. System wykrywa sesję
3. System przekierowuje do `/matches`

**Oczekiwany rezultat**: Użytkownik jest przekierowany do listy meczów.

### 6.2. Scenariusze wylogowania

#### 6.2.1. Pomyślne wylogowanie

**Kroki**:

1. Użytkownik (zalogowany) klika "Wyloguj się" w menu
2. System wywołuje API `/api/auth/logout`
3. System niszczy sesję (usuwa cookies)
4. System przekierowuje do `/` (strona główna, zgodnie z PRD US-003, kryterium 3)

**Oczekiwany rezultat**: Użytkownik jest wylogowany i widzi stronę główną.

### 6.3. Scenariusze ochrony zasobów

#### 6.3.1. Próba dostępu do chronionej strony bez logowania

**Kroki**:

1. Użytkownik (niezalogowany) próbuje wejść na `/matches/123/live`
2. Middleware wykrywa brak sesji
3. System przekierowuje do `/?login_required=true` (zgodnie z PRD US-001, kryterium 7)

**Oczekiwany rezultat**: Użytkownik widzi stronę główną z komunikatem o konieczności zalogowania.

#### 6.3.2. Sesja wygasła podczas wykonywania akcji

**Kroki**:

1. Użytkownik (zalogowany) jest na stronie `/matches/123/live`
2. Sesja wygasa (np. po 24h)
3. Użytkownik próbuje dodać punkt (API call)
4. API zwraca 401 Unauthorized
5. Interceptor przechwytuje błąd
6. Wyświetlany jest toast "Sesja wygasła. Zaloguj się ponownie."
7. System przekierowuje do `/auth/login?error=session_expired`

**Oczekiwany rezultat**: Użytkownik widzi komunikat o wygasłej sesji i jest przekierowany do strony logowania.

#### 6.3.3. Próba dostępu do meczu innego użytkownika

**Kroki**:

1. Użytkownik A (zalogowany) próbuje wejść na `/matches/123/live` (mecz użytkownika B)
2. API endpoint sprawdza ownership meczu (RLS lub explicit check)
3. API zwraca 403 Forbidden lub 404 Not Found
4. Interceptor przechwytuje błąd
5. Wyświetlany jest toast "Brak dostępu" lub "Mecz nie został znaleziony"

**Oczekiwany rezultat**: Użytkownik widzi komunikat błędu i nie ma dostępu do meczu.

---

## 7. Plan implementacji

### 7.1. Faza 1: Backend – Middleware i API endpoints

**Zadania**:

1. Instalacja zależności: `npm install @supabase/ssr`
2. Aktualizacja `src/db/supabase.client.ts`:
   - Dodanie `createSupabaseServerInstance`
   - Import z `@supabase/ssr`
3. Aktualizacja middleware Astro (`src/middleware/index.ts`):
   - Użycie `createSupabaseServerInstance`
   - Automatyczna weryfikacja sesji dla chronionych ścieżek
   - Dodanie `PUBLIC_PATHS`
4. Rozszerzenie typu `Locals` (`src/env.d.ts`)
5. Utworzenie API endpoints autentykacji:
   - `/api/auth/login` (POST)
   - `/api/auth/callback` (GET/POST)
   - `/api/auth/logout` (POST)
   - `/api/auth/session` (GET)
6. Utworzenie schematów Zod (`src/lib/schemas/auth.schemas.ts`)
7. Utworzenie helperów autoryzacji (`src/lib/utils/auth-helpers.ts`)

**Czas realizacji**: 2-3 dni

### 7.2. Faza 2: Frontend – AuthService i komponenty

**Zadania**:

1. Utworzenie `AuthService` (`src/lib/services/auth.service.ts`)
2. Utworzenie komponentu autentykacji:
   - `LoginPageComponent` + HTML + CSS
3. Utworzenie strony Astro:
   - `/auth/login.astro`
4. Aktualizacja `LandingPageComponent`:
   - Integracja z `AuthService`
   - Dynamiczny tekst przycisków
   - Obsługa parametru `?login_required=true` (wyświetlenie komunikatu)
5. Aktualizacja `AppLayoutComponent`:
   - Integracja z `AuthService` w metodzie `performLogout()`

**Czas realizacji**: 2 dni

### 7.3. Faza 3: Ochrona stron i aktualizacja API

**Zadania**:

1. **Uproszczenie chronionych stron Astro** (middleware już chroni automatycznie):
   - Usunięcie ręcznych sprawdzeń sesji z plików `.astro`
   - Przekazanie danych użytkownika do komponentów Angular
   - Pliki: `/matches/index.astro`, `/matches/new.astro`, `/matches/[id]/live.astro`, `/matches/[id]/summary.astro`
2. Aktualizacja wszystkich API endpoints (14 plików):
   - Zamiana `DEFAULT_USER_ID` na `await context.locals.getUserId()`
   - Dodanie sprawdzania autentykacji
   - Użycie `context.locals.supabase` (instancja per-request)
3. Usunięcie `DEFAULT_USER_ID` z `src/db/supabase.client.ts`
4. Aktualizacja `HttpErrorInterceptor`:
   - Zmiana URL przekierowania w `handleUnauthorizedError`

**Czas realizacji**: 3-4 dni

### 7.4. Faza 4: RLS i bezpieczeństwo

**Zadania**:

1. Utworzenie polityk RLS w Supabase (SQL):
   - Polityki dla tabeli `matches`
   - Polityki dla tabel `sets`, `points`, `point_tags`
   - Polityki dla tabel `matches_ai_reports`, `matches_public_share`
   - Polityki dla tabeli `analytics_events`
2. Włączenie RLS dla wszystkich tabel
3. Testowanie polityk RLS z różnymi użytkownikami

**Czas realizacji**: 1-2 dni

### 7.5. Faza 5: Testy i poprawki

**Zadania**:

1. Testy wszystkich scenariuszy logowania i wylogowania
2. Testy ochrony zasobów (403, 401)
3. Testy sesji wygasłej
4. Testy RLS (próba dostępu do cudzych meczów)
5. Testy na różnych urządzeniach (mobile, tablet, desktop)
6. Poprawki błędów

**Czas realizacji**: 2-3 dni

### 7.6. Łączny czas realizacji

**Szacowany czas**: 9-14 dni roboczych (2-3 tygodnie)

**Redukcja czasu** wynika z usunięcia niepotrzebnego `AuthCallbackComponent` i strony `/auth/callback.astro`.

---

## 8. Wymagania dotyczące środowiska

### 8.1. Zmienne środowiskowe

**Plik**: `.env`

```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # Tylko dla service endpoints

# OAuth (opcjonalne, jeśli Supabase wymaga konfiguracji)
# Google OAuth Client ID i Secret są konfigurowane w panelu Supabase
```

### 8.2. Konfiguracja Supabase

**W panelu Supabase** (https://app.supabase.com):

1. **Authentication → Providers**:

   **Google Provider**:
   - Włączyć "Google" provider
   - Skonfigurować Google OAuth Client ID i Secret
   - Supabase automatycznie wygeneruje właściwe URL-e callback

   **Facebook Provider**:
   - Włączyć "Facebook" provider
   - Skonfigurować Facebook App ID i App Secret (z Facebook Developers)
   - Supabase automatycznie wygeneruje właściwe URL-e callback

   **KRYTYCZNIE WAŻNE - Redirect URLs**:

   W konfiguracji OAuth w Supabase należy ustawić:

   **Site URL**:
   - Development: `http://localhost:4300`
   - Production: `https://spin-flow.app`

   **Redirect URLs** (w sekcji "Redirect URLs" w Authentication Settings):
   - Development: `http://localhost:4300/api/auth/callback`
   - Production: `https://spin-flow.app/api/auth/callback`

   **UWAGA**: To muszą być pełne URL-e z protokołem, hostem i ścieżką do **API endpoint**, nie do strony Astro!

2. **Authentication → URL Configuration**:
   - Site URL: `https://spin-flow.app` (production) lub `http://localhost:4300` (dev)
   - Redirect URLs: dodać **pełny URL** `http://localhost:4300/api/auth/callback` (dev) i `https://spin-flow.app/api/auth/callback` (prod)

3. **Authentication → Email Templates** (opcjonalnie):
   - Dostosować szablony emaili (jeśli w przyszłości dodamy email auth)

**Konfiguracja Google OAuth Console**:

- Authorized redirect URIs: `https://<your-project>.supabase.co/auth/v1/callback` (Supabase wewnętrzny callback)
- Supabase następnie przekieruje do naszego `/api/auth/callback`

**Konfiguracja Facebook App**:

- Valid OAuth Redirect URIs: `https://<your-project>.supabase.co/auth/v1/callback` (Supabase wewnętrzny callback)

### 8.3. Zależności npm

**Nowa zależność**:

```bash
npm install @supabase/ssr
```

**Plik**: `package.json` (fragment)

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/ssr": "^0.6.1"
  }
}
```

**Uwaga**: Używamy `@supabase/ssr` zgodnie z projektem referencyjnym 10x-cards. Pakiet ten automatycznie zarządza cookies sesji Supabase w środowisku SSR (Astro).

---

## 9. Migracja danych

### 9.1. Migracja użytkownika testowego

**Problem**: W bazie danych istnieje użytkownik testowy z ID `69c4930b-63f6-4c05-9dec-c3b888fac1f5` (DEFAULT_USER_ID), który posiada mecze, sety, punkty, itp.

**Rozwiązanie**:

1. **Opcja A: Utworzenie prawdziwego użytkownika w Supabase Auth**:
   - Utworzyć użytkownika w Supabase Auth z tym samym ID
   - Przypisać mu email i inne dane

**SQL**:

```sql
-- Sprawdzenie czy użytkownik istnieje w auth.users
SELECT * FROM auth.users WHERE id = '69c4930b-63f6-4c05-9dec-c3b888fac1f5';

-- Jeśli nie istnieje, utworzenie użytkownika (wymaga service role)
-- Uwaga: To może wymagać ręcznej interwencji w Supabase Auth
```

2. **Opcja B: Migracja danych do nowego użytkownika**:
   - Utworzyć nowego użytkownika przez OAuth
   - Przenieść mecze testowe do nowego użytkownika

**SQL**:

```sql
-- Aktualizacja user_id w tabelach
UPDATE matches SET user_id = '<new_user_id>' WHERE user_id = '69c4930b-63f6-4c05-9dec-c3b888fac1f5';
UPDATE sets SET user_id = '<new_user_id>' WHERE user_id = '69c4930b-63f6-4c05-9dec-c3b888fac1f5';
UPDATE points SET user_id = '<new_user_id>' WHERE user_id = '69c4930b-63f6-4c05-9dec-c3b888fac1f5';
UPDATE matches_ai_reports SET user_id = '<new_user_id>' WHERE user_id = '69c4930b-63f6-4c05-9dec-c3b888fac1f5';
UPDATE analytics_events SET user_id = '<new_user_id>' WHERE user_id = '69c4930b-63f6-4c05-9dec-c3b888fac1f5';
```

3. **Opcja C: Usunięcie danych testowych**:
   - Jeśli dane testowe nie są potrzebne, można je usunąć

**SQL**:

```sql
-- Usunięcie wszystkich danych użytkownika testowego
DELETE FROM matches WHERE user_id = '69c4930b-63f6-4c05-9dec-c3b888fac1f5';
-- Kaskadowo usuną się sety, punkty, itp. (jeśli ON DELETE CASCADE jest skonfigurowane)
```

**Rekomendacja**: Opcja A jest najlepsza, jeśli chcemy zachować dane testowe. Opcja C jest preferowana dla czystego startu.

---

## 10. Zgodność z wymaganiami PRD

### 10.1. US-001 – Logowanie przez Google i Facebook

**Wymagania PRD**:

1. Na stronie startowej widoczny jest przycisk "Zaloguj"
2. Po kliknięciu przycisku Google lub Facebook użytkownik przechodzi standardowy flow logowania przez wybranego providera (Supabase Auth)
3. Po pomyślnym logowaniu użytkownik trafia na listę swoich meczów
4. Po wylogowaniu próba wejścia na listę meczów przekierowuje na stronę logowania
5. Jeśli trener jest zalogowany i wejdzie na adres strony startowej, przycisk "Zaloguj" automatycznie przenosi go do listy meczów
6. Jeśli trener jest zalogowany i wejdzie na adres strony logowania, zostanie przeniesiony do listy meczów
7. Wszystkie strony inne niż strona startowa, strona logowania oraz `/public/...` wymagają zalogowania
8. Brak funkcjonalności rejestrowania konta trenera (tylko OAuth)
9. Na wszystkich stronach wymagających zalogowania dostępny jest przycisk "Wyloguj"

**Realizacja w specyfikacji**:

- ✅ Przycisk "Zaloguj" na stronie startowej (już istnieje, wymaga integracji z `AuthService`)
- ✅ OAuth flow z Google i Facebook przez Supabase Auth (`/api/auth/login` → Provider → `/api/auth/callback`)
- ✅ Wspólny endpoint callback API dla obu providerów (`/api/auth/callback`)
- ✅ Przekierowanie do `/matches` po pomyślnym logowaniu
- ✅ Przekierowanie do strony startowej (`/?login_required=true`) po próbie dostępu do chronionej strony bez sesji (zgodnie z US-001, kryterium 7)
- ✅ Logika w `LandingPageComponent.onTopbarLoginClick()` sprawdza czy użytkownik jest zalogowany
- ✅ Strona `/auth/login.astro` przekierowuje zalogowanych użytkowników do `/matches`
- ✅ Middleware automatycznie chroni wszystkie strony poza publicznymi
- ✅ Brak endpointu rejestracji (tylko OAuth)
- ✅ Przycisk "Wyloguj się" w `AppLayoutComponent` przekierowuje do `/` (strona główna, zgodnie z US-003, kryterium 3)

### 10.2. US-002 – Dostęp tylko dla zalogowanych trenerów

**Wymagania PRD**:

1. Wejście na listę meczów bez sesji logowania przekierowuje na chronioną stronę (w praktyce: na stronę główną z komunikatem)
2. Wejście na URL meczu "W toku" lub "Zakończony" bez sesji logowania przekierowuje analogicznie
3. Po zalogowaniu trener widzi wyłącznie swoje mecze
4. Próba odczytu meczu innego użytkownika kończy się błędem autoryzacji

**Realizacja w specyfikacji**:

- ✅ Middleware automatycznie przekierowuje niezalogowanych użytkowników do strony głównej (zgodnie z US-001, kryterium 7)
- ✅ Przekierowanie zachowuje informację o wymaganym logowaniu (`?login_required=true`)
- ✅ Polityki RLS w Supabase ograniczają dostęp do danych tylko dla właściciela
- ✅ API endpoints sprawdzają `userId` i ownership meczu (zwracają 403 lub 404)

**Uwaga o spójności PRD**:

- US-002 mówi o "przekierowaniu na stronę logowania", ale US-001 (kryterium 7) jednoznacznie wskazuje "stronę startową"
- Implementacja zgodna z US-001 (dominujące user story dla autentykacji)

### 10.3. US-003 – Wylogowanie z aplikacji

**Wymagania PRD**:

1. Na głównych widokach dla zalogowanego użytkownika dostępny jest przycisk "Wyloguj"
2. Po wylogowaniu sesja użytkownika jest unieważniana
3. Po wylogowaniu użytkownik trafia na stronę startową
4. Ponowna próba wejścia na listę lub widok meczu po wylogowaniu wymaga ponownego logowania

**Realizacja w specyfikacji**:

- ✅ Przycisk "Wyloguj się" w `AppLayoutComponent.userMenuItems` (już istnieje)
- ✅ API endpoint `/api/auth/logout` niszczy sesję Supabase
- ✅ Przekierowanie do `/` (strona główna) po wylogowaniu (zgodnie z PRD US-003, kryterium 3)
- ✅ Brak sesji → przekierowanie do strony głównej przy próbie dostępu do chronionych stron

### 10.4. US-010 – Strona startowa z prezentacją produktu

**Wymagania PRD**:

1. Strona startowa opisuje krótko główny problem i wartość
2. Na stronie widoczny jest przycisk "Zaloguj"
3. Po zalogowaniu użytkownik nie jest ponownie kierowany na stronę startową, tylko na listę meczów

**Realizacja w specyfikacji**:

- ✅ Strona startowa (`index.astro` + `LandingPageComponent`) już istnieje
- ✅ Przycisk "Zaloguj" już istnieje (wymaga integracji z `AuthService`)
- ✅ Po pomyślnym logowaniu callback przekierowuje do `/matches` (lub `redirectUrl`)

---

## 11. Podsumowanie

### 11.0. Rozwiązane sprzeczności z PRD

**UWAGA**: W trakcie analizy wykryto następujące sprzeczności w PRD:

1. **US-003, kryterium 3 vs kryterium 9**: Niezgodność co do miejsca przekierowania po wylogowaniu
   - Kryterium 3: "Po wylogowaniu użytkownik trafia na stronę startową" → `/`
   - Kryterium 9: "przekierowanie na stronę logowania" → `/auth/login`
   - **Decyzja**: Zastosowano kryterium 3 (przekierowanie do `/` - strona główna), zgodnie z preferencją użytkownika

2. **US-001, kryterium 7**: Przekierowanie niezalogowanych użytkowników
   - PRD: "trener zostanie przeniesiony na stronę startową"
   - **Implementacja**: Przekierowanie do `/?login_required=true` z komunikatem informacyjnym
   - To zachowanie jest zgodne z PRD i dodatkowo informuje użytkownika o powodzie przekierowania

### 11.1. Kluczowe komponenty do utworzenia

**Backend (Astro)**:

1. Aktualizacja `src/db/supabase.client.ts`:
   - Dodanie `createSupabaseServerInstance` helper
   - Import z `@supabase/ssr`
2. Middleware: rozszerzenie `src/middleware/index.ts` (z automatyczną weryfikacją sesji)
3. API endpoints:
   - `src/pages/api/auth/login.ts` (obsługuje Google i Facebook)
   - `src/pages/api/auth/callback.ts` (wspólny dla obu providerów)
   - `src/pages/api/auth/logout.ts`
   - `src/pages/api/auth/session.ts`
4. Helpery: `src/lib/utils/auth-helpers.ts`
5. Schematy: `src/lib/schemas/auth.schemas.ts`

**Frontend (Angular)**:

1. Serwis: `src/lib/services/auth.service.ts` (z metodami dla Google i Facebook)
2. Komponenty:
   - `src/components/auth/login-page/` (component + HTML + CSS - z przyciskami Google i Facebook)
3. Strony Astro:
   - `src/pages/auth/login.astro`

**Uwaga**: `AuthCallbackComponent` i strona `/auth/callback.astro` **NIE są tworzone**. OAuth callback jest obsługiwany bezpośrednio przez API endpoint `/api/auth/callback.ts`.

### 11.2. Kluczowe modyfikacje istniejących plików

**Backend**:

- Aktualizacja 14 API endpoints (zamiana `DEFAULT_USER_ID` na `context.locals.getUserId()`)
- Usunięcie `DEFAULT_USER_ID` z `src/db/supabase.client.ts`

**Frontend**:

- `src/components/landing-page/landing-page.component.ts`
- `src/components/shared/app-layout/app-layout.component.ts`
- `src/lib/interceptors/http-error.interceptor.ts`
- Wszystkie chronione strony `.astro` (4 pliki)

**Typy**:

- `src/types.ts` (dodanie typów autentykacji)
- `src/env.d.ts` lub `src/types/astro.d.ts` (rozszerzenie `Locals`)

### 11.3. Bezpieczeństwo

- **Server-side authorization**: Wszystkie chronione strony sprawdzają sesję na poziomie Astro SSR (middleware)
- **Automatyczna ochrona w middleware**: Niezalogowani użytkownicy są automatycznie przekierowywani do `/auth/login`
- **Row-Level Security**: Polityki RLS w Supabase ograniczają dostęp do danych tylko dla właściciela
- **HttpOnly cookies**: Sesja przechowywana w ciasteczkach HttpOnly, Secure, SameSite=Lax (zarządzane przez @supabase/ssr)
- **Automatyczne zarządzanie tokenami**: @supabase/ssr automatycznie odświeża tokeny i aktualizuje cookies
- **API authorization**: Każdy endpoint sprawdza `userId` przez `context.locals.getUserId()`
- **Client-side protection**: `AuthService` i `HttpErrorInterceptor` zapewniają poprawne UX
- **Wspólny callback**: Jeden endpoint `/auth/callback` obsługuje obu providerów OAuth (Google i Facebook)

### 11.4. Zgodność z architekturą

- **Astro SSR**: Weryfikacja sesji na poziomie server-side (middleware Astro)
- **Angular standalone components**: Wszystkie komponenty używają standalone API
- **Signals**: `AuthService` używa signals dla stanu autentykacji
- **PrimeNG**: Komponenty logowania używają PrimeNG (Button, Message)
- **Supabase Auth + SSR**: Integracja z `@supabase/ssr` dla SSR frameworks (wzór z 10x-cards)
- **createSupabaseServerInstance**: Helper pattern zgodny z projektem referencyjnym
- **Automatyczne zarządzanie cookies**: @supabase/ssr transparentnie zarządza tokenami sesji
- **Cloudflare Pages**: Pełna kompatybilność z serverless (stateless per-request instances)
- **Uproszczona architektura**: OAuth callback jest obsługiwany bezpośrednio przez API endpoint `/api/auth/callback`, eliminując potrzebę tworzenia strony pośredniej Astro i komponentu Angular

### 11.5. Kluczowe różnice względem pierwotnej wersji specyfikacji

**Usunięte elementy (niepotrzebne)**:

1. ❌ `AuthCallbackComponent` - nie jest tworzony
2. ❌ Strona `/auth/callback.astro` - nie jest tworzona
3. ❌ Endpoint `/auth/callback` jako strona Astro - zastąpiony przez API endpoint `/api/auth/callback`

**Kluczowe decyzje architektoniczne**:

1. ✅ OAuth callback obsługiwany przez **API endpoint** `/api/auth/callback`, nie stronę Astro
2. ✅ Supabase OAuth Redirect URL wskazuje na `/api/auth/callback` (API), nie `/auth/callback` (strona)
3. ✅ Przekierowanie niezalogowanych użytkowników na stronę główną (`/?login_required=true`), zgodnie z PRD
4. ✅ Przekierowanie po wylogowaniu na `/` (stronę główną), zgodnie z PRD US-003, kryterium 3
5. ✅ Ścieżki API `/api/auth/*` automatycznie wykluczane z ochrony middleware (publiczne endpointy)

**Korzyści z uproszczeń**:

- Mniej plików do utworzenia i utrzymania
- Prostszy flow OAuth (jeden endpoint API zamiast strony + komponentu + API)
- Szybsze przekierowania (brak renderowania strony pośredniej)
- Lepsza spójność z architekturą API-first
- Redukcja czasu implementacji o 1-2 dni

---

**Koniec specyfikacji technicznej modułu autentykacji**
