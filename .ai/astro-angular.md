# Routing i architektura Astro + Angular

Dokument definiuje zasady routingu i architektury dla projektu łączącego Astro z Angular przez `@analogjs/astro-angular`.

## 1. Architektura Islands (Wyspy)

### 1.1 Czym jest Islands Architecture?

Astro używa architektury **Islands** - strona składa się głównie ze statycznego HTML z izolowanymi "wyspami" interaktywnego JavaScript.

```
┌─────────────────────────────────────────────────────┐
│  Strona Astro (.astro)                              │
│  ┌──────────────────────────────────────────────┐   │
│  │  Statyczny HTML (Layout, nagłówki, footer)   │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────┐    ┌─────────────────────┐     │
│  │  Wyspa Angular  │    │   Wyspa Angular     │     │
│  │  (interaktywna) │    │   (interaktywna)    │     │
│  └─────────────────┘    └─────────────────────┘     │
└─────────────────────────────────────────────────────┘
```

### 1.2 Charakterystyka wysp Angular

Każdy komponent Angular renderowany przez Astro to osobna wyspa, która:

- Jest **izolowana** od innych wysp na stronie
- Ma własny **bundle JavaScript** ładowany osobno
- Jest **hydratowana** niezależnie (client directives)
- **Nie współdzieli stanu** z innymi wyspami (chyba że przez localStorage/cookies)

### 1.3 Kluczowa implikacja

**Każda strona Astro = osobny bootstrap Angular**

Nawigacja między stronami Astro oznacza:

- Pełne przeładowanie strony
- Ponowną inicjalizację Angular
- Utratę stanu komponentów (chyba że zpersystowany)

---

## 2. Podział odpowiedzialności

### 2.1 Astro zarządza

| Obszar                      | Realizacja                        |
| --------------------------- | --------------------------------- |
| **Routing między stronami** | Struktura plików w `src/pages/`   |
| **Dynamiczne ścieżki URL**  | Pliki `[param].astro`             |
| **SEO i meta tagi**         | Komponenty `.astro` w `<head>`    |
| **Statyczny HTML**          | Layouts, struktury stron          |
| **SSR / SSG**               | Konfiguracja w `astro.config.mjs` |

### 2.2 Angular zarządza

| Obszar                      | Realizacja                  |
| --------------------------- | --------------------------- |
| **Interaktywność UI**       | Event handling, formularze  |
| **Stan lokalny komponentu** | Signals, zmienne komponentu |
| **Logika biznesowa**        | Serwisy Angular             |
| **Komponenty UI**           | PrimeNG, własne komponenty  |
| **Komunikacja z API**       | HttpClient                  |

### 2.3 Współdzielone

| Obszar                | Realizacja                   |
| --------------------- | ---------------------------- |
| **Stan globalny**     | localStorage, cookies        |
| **Motyw (dark mode)** | CSS Variables + localStorage |
| **Sesja użytkownika** | Cookies / Supabase Auth      |

---

## 3. Routing - zasady

### 3.1 Struktura plików = ścieżki URL

Astro automatycznie tworzy routing na podstawie struktury katalogów:

```
src/pages/
├── index.astro              → /
├── about.astro              → /about
├── matches/
│   ├── index.astro          → /matches
│   ├── new.astro            → /matches/new
│   └── [id]/
│       ├── index.astro      → /matches/{id}
│       ├── live.astro       → /matches/{id}/live
│       └── summary.astro    → /matches/{id}/summary
└── api/
    └── ...                  → /api/... (endpoints)
```

### 3.2 Angular Router - NIE UŻYWAĆ

Angular Router **nie działa** w kontekście Astro z `client:only`. Każda strona Astro to osobny bootstrap Angular, więc:

```typescript
// ❌ NIE RÓB TEGO
import { Router, RouterLink, RouterLinkActive } from "@angular/router";

@Component({
  imports: [RouterLink], // ❌ Nie zadziała
})
export class MyComponent {
  constructor(private router: Router) {}

  navigate() {
    this.router.navigate(["/somewhere"]); // ❌ Nie zadziała
  }
}
```

### 3.3 Nawigacja - prawidłowe podejście

**W szablonie HTML:**

```html
<!-- ✅ Prawidłowo - standardowe linki HTML -->
<a href="/matches">Lista meczów</a>
<a [href]="'/matches/' + matchId + '/live'">Otwórz mecz</a>

<!-- ❌ Nieprawidłowo - nie używaj routerLink -->
<a routerLink="/matches">Lista meczów</a>
```

**W kodzie TypeScript:**

```typescript
// ✅ Prawidłowo - nawigacja przez window.location
navigateToMatch(id: number): void {
  if (typeof window !== 'undefined') {
    window.location.href = `/matches/${id}/live`;
  }
}

// ❌ Nieprawidłowo - Angular Router nie działa
this.router.navigate(['/matches', id, 'live']);
```

### 3.4 SSR Safety

Kod odwołujący się do browser APIs musi sprawdzać środowisko:

```typescript
// ✅ Prawidłowo - sprawdzenie SSR
if (typeof window !== 'undefined') {
  window.location.href = '/somewhere';
  localStorage.setItem('key', 'value');
}

// ✅ Alternatywnie - w constructor serwisu
constructor() {
  if (typeof window !== 'undefined') {
    this.initializeBrowserFeatures();
  }
}
```

---

## 4. Komponenty Angular w Astro

### 4.1 Client Directives

Astro oferuje różne strategie hydratacji:

| Directive               | Kiedy hydratuje                   | Użycie                  |
| ----------------------- | --------------------------------- | ----------------------- |
| `client:load`           | Natychmiast po załadowaniu strony | Krytyczne komponenty    |
| `client:idle`           | Gdy przeglądarka jest idle        | Mniej krytyczne         |
| `client:visible`        | Gdy komponent wejdzie w viewport  | Komponenty poniżej fold |
| `client:only="angular"` | Tylko na kliencie, bez SSR        | Większość przypadków    |

**Rekomendacja:** Używaj `client:only="angular"` dla komponentów Angular, ponieważ:

- Unika problemów z hydracją
- Prostsze zarządzanie stanem
- Lepsze dla komponentów zależnych od browser APIs

```astro
---
import { MyComponent } from '@/components/my-component.component';
---

<MyComponent client:only="angular" />
```

### 4.2 Wzorzec AppLayoutComponent

Dla stron zalogowanych użytkowników używamy `AppLayoutComponent` jako bazowego layoutu.

**Lokalizacja:** `src/components/shared/app-layout/`

```
Astro (analogjs bootstrap)
    └── MyPageComponent ← static clientProviders = AppLayoutComponent.clientProviders
            └── AppLayoutComponent ← zawiera navbar, toast, ng-content
                    └── Treść strony (ng-content)
```

#### Co zawiera AppLayoutComponent:

| Element                 | Opis                                                          |
| ----------------------- | ------------------------------------------------------------- |
| **Responsywny navbar**  | Logo, menu główne, dark mode toggle, user menu                |
| **Hamburger menu**      | Na mobile (<1024px) menu rozwija się pionowo                  |
| **Dark mode toggle**    | Przełącznik widoczny zawsze w headerze                        |
| **User menu (desktop)** | Avatar + nazwa + popup menu z opcją wylogowania               |
| **User info (mobile)**  | Avatar + nazwa + przycisk "Wyloguj" na dole rozwiniętego menu |
| **Toast (p-toast)**     | Gotowy do użycia dla powiadomień                              |
| **ng-content**          | Slot na treść strony                                          |

#### Inputs:

```typescript
userName: string | undefined      // Nazwa użytkownika do wyświetlenia
userInitials: string | undefined  // Inicjały dla avatara (np. "JK")
customMenuItems: NavMenuItem[]    // Opcjonalne nadpisanie menu (domyślnie: Mecze)
activeMenuIndex: number           // Indeks aktywnego elementu menu (domyślnie: 0)
```

#### Metody pomocnicze (dostępne przez ViewChild):

```typescript
@ViewChild(AppLayoutComponent) appLayout!: AppLayoutComponent;

// Wyświetlanie toastów
this.appLayout.showInfo('Info', 'Wiadomość informacyjna');
this.appLayout.showSuccess('Sukces', 'Operacja zakończona pomyślnie');
this.appLayout.showError('Błąd', 'Coś poszło nie tak');
```

#### Przykład użycia w komponencie strony:

```typescript
// my-page.component.ts
import { Component, signal, ViewChild } from "@angular/core";
import { AppLayoutComponent } from "@/components/shared/app-layout/app-layout.component";

@Component({
  selector: "app-my-page",
  standalone: true,
  imports: [AppLayoutComponent],
  templateUrl: "./my-page.component.html",
})
export class MyPageComponent {
  // Delegacja providerów do AppLayout
  static clientProviders = AppLayoutComponent.clientProviders;

  @ViewChild(AppLayoutComponent) appLayout!: AppLayoutComponent;

  readonly userName = signal<string | undefined>("Jan Kowalski");
  readonly userInitials = signal<string | undefined>("JK");
}
```

```html
<!-- my-page.component.html -->
<app-layout
  [userName]="userName()"
  [userInitials]="userInitials()"
  [activeMenuIndex]="0"
>
  <!-- Treść strony -->
  <h1>Moja strona</h1>
</app-layout>
```

### 4.2.1 Dlaczego NIE zagnieżdżamy komponentów Angular w Astro?

**❌ TO NIE ZADZIAŁA:**

```astro
---
import { AppLayoutComponent } from "@/components/shared/app-layout/app-layout.component";
import { MatchListComponent } from "@/components/matches/match-list.component";
---

<AppLayoutComponent client:only="angular">
  <MatchListComponent client:only="angular" />
</AppLayoutComponent>
```

**Dlaczego?**

Każdy `client:only="angular"` tworzy **osobną, izolowaną wyspę Angular**. To oznacza:

1. `AppLayoutComponent` i `MatchListComponent` to **dwa oddzielne bootstrapy Angular**
2. `ng-content` w `AppLayoutComponent` **nie odbierze** dziecka z Astro
3. Nie ma współdzielenia DI container między wyspami
4. Każda wyspa ma własny bundle JavaScript

**✅ PRAWIDŁOWE PODEJŚCIE:**

```astro
---
import { MatchListPageComponent } from "@/components/matches/match-list-page/match-list-page.component";
---

<MatchListPageComponent client:only="angular" />
```

Gdzie `MatchListPageComponent` **wewnętrznie** używa `AppLayoutComponent`:

```typescript
// match-list-page.component.ts
@Component({
  imports: [AppLayoutComponent /* inne */],
  template: `
    <app-layout [userName]="userName()" [userInitials]="userInitials()">
      <!-- treść strony -->
    </app-layout>
  `,
})
export class MatchListPageComponent {
  static clientProviders = AppLayoutComponent.clientProviders;
}
```

**Zasada:** Jedna wyspa Angular per strona. Cała hierarchia komponentów musi być w jednym `client:only="angular"`.

### 4.3 Struktura komponentu strony

Każdy główny komponent strony (PageComponent) dla zalogowanych użytkowników powinien używać `AppLayoutComponent`:

```typescript
import { Component, signal, ViewChild } from "@angular/core";
import { ButtonModule } from "primeng/button";
import { AppLayoutComponent } from "@/components/shared/app-layout/app-layout.component";

@Component({
  selector: "app-my-page",
  standalone: true,
  imports: [
    AppLayoutComponent,
    ButtonModule,
    // Inne komponenty UI...
  ],
  templateUrl: "./my-page.component.html",
  styleUrl: "./my-page.component.css",
})
export class MyPageComponent {
  /**
   * Delegacja providerów do AppLayoutComponent
   * AppLayout już zawiera: provideAnimations(), MessageService, PrimeNGThemeInitService
   */
  static clientProviders = AppLayoutComponent.clientProviders;

  @ViewChild(AppLayoutComponent) appLayout!: AppLayoutComponent;

  // Dane użytkownika (w przyszłości z AuthService)
  readonly userName = signal<string | undefined>("Jan Kowalski");
  readonly userInitials = signal<string | undefined>("JK");

  // Metody strony...
  onSomeAction(): void {
    this.appLayout?.showSuccess("Sukces", "Akcja wykonana");
  }
}
```

```html
<!-- my-page.component.html -->
<app-layout
  [userName]="userName()"
  [userInitials]="userInitials()"
  [activeMenuIndex]="0"
>
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-bold text-surface-900">Tytuł strony</h1>
    <p-button label="Akcja" icon="pi pi-plus" (onClick)="onSomeAction()" />
  </div>

  <!-- Treść strony -->
</app-layout>
```

### 4.3 Providers - ważne zasady (analogjs pattern)

W środowisku Astro z analogjs, `EnvironmentProviders` (jak `provideAnimations()`, `provideHttpClient()`) muszą być zdefiniowane jako **static clientProviders**:

**Animacje i HttpClient (static clientProviders):**

```typescript
export class MyPageComponent {
  // EnvironmentProviders muszą być w static clientProviders
  static clientProviders = [
    provideAnimations(), // Wymagane dla PrimeNG z animacjami
    provideHttpClient(), // Wymagane dla HTTP requests
  ];
}
```

> ⚠️ **Uwaga:** `provideAnimations()` i `provideHttpClient()` zwracają `EnvironmentProviders` i NIE można ich użyć w `providers` ani `imports` komponentu. Używaj wzorca `static clientProviders`.

**Serwisy PrimeNG (w providers):**

```typescript
@Component({
  providers: [
    MessageService,
    ConfirmationService,
  ],
})
```

**Lub jako static (pattern analogjs):**

```typescript
@Component({...})
export class MyComponent {
  static clientProviders = [provideHttpClient()];
  static renderProviders = [MyComponent.clientProviders];
}
```

**Globalnie (providedIn: 'root'):**

```typescript
@Injectable({ providedIn: "root" })
export class ThemeService {
  // Singleton w ramach wyspy
}
```

---

## 5. Stylowanie - CSS Variables

### 5.1 Architektura kolorów

Projekt używa **CSS Variables** które automatycznie zmieniają wartości w dark mode:

```css
/* Light mode (domyślne) */
:root {
  --color-surface-0: #ffffff;
  --color-surface-900: #0f172a;
  --color-primary-500: #22c55e;
}

/* Dark mode - wartości się odwracają */
.dark {
  --color-surface-0: #020617;
  --color-surface-900: #f8fafc;
}
```

### 5.2 Zasada: NIE używaj `dark:` prefixów

Ponieważ CSS Variables zmieniają się automatycznie, **nie potrzebujesz** `dark:` prefixów Tailwind:

```html
<!-- ✅ PRAWIDŁOWO - kolory zmieniają się automatycznie -->
<div class="bg-surface-0 text-surface-900 border-surface-200">Treść</div>

<!-- ❌ NIEPRAWIDŁOWO - zduplikowane, może powodować konflikty -->
<div
  class="bg-surface-0 dark:bg-surface-900 text-surface-900 dark:text-surface-100"
>
  Treść
</div>
```

### 5.3 Dostępne kolory Tailwind

```
Kolory primary (zielony):
  bg-primary-50, bg-primary-100, ..., bg-primary-950
  text-primary-500, text-primary-600, ...

Kolory surface (slate):
  bg-surface-0 (biały/czarny)
  bg-surface-50, bg-surface-100, ..., bg-surface-950
  text-surface-400, text-surface-600, text-surface-900, ...
  border-surface-200, border-surface-300, ...
```

### 5.4 Przykłady stylowania

```html
<!-- Przycisk zielony -->
<a class="bg-primary-500 hover:bg-primary-600 text-white rounded-lg px-4 py-2">
  Kliknij
</a>

<!-- Link zielony (tekst) -->
<a class="text-primary-500 hover:text-primary-600 font-medium"> Link </a>

<!-- Karta -->
<div class="bg-surface-0 border border-surface-200 rounded-xl p-6">
  <h2 class="text-surface-900 font-bold">Tytuł</h2>
  <p class="text-surface-600">Opis</p>
</div>
```

---

## 6. Strony Astro - wzorzec

### 6.1 Podstawowa struktura strony

```astro
---
// src/pages/matches/index.astro
import Layout from "@/layouts/Layout.astro";
import { MyPageComponent } from "@/components/my-page/my-page.component";

// Opcjonalnie: sprawdzenie sesji, redirect
// const session = await Astro.locals.getSession();
// if (!session) return Astro.redirect('/');
---

<Layout title="Tytuł strony - Nazwa Aplikacji">
  <MyPageComponent client:only="angular" />
</Layout>
```

### 6.2 Przekazywanie parametrów URL

Dla dynamicznych ścieżek (`[id].astro`):

```astro
---
// src/pages/matches/[id]/live.astro
import Layout from "@/layouts/Layout.astro";
import { LiveMatchComponent } from "@/components/live-match/live-match.component";

const { id } = Astro.params;
---

<Layout title="Mecz na żywo - Spin Flow">
  <LiveMatchComponent
    client:only="angular"
    matchId={id}
  />
</Layout>
```

W komponencie Angular:

```typescript
@Component({...})
export class LiveMatchComponent {
  readonly matchId = input.required<string>();
}
```

---

## 7. Stan aplikacji

### 7.1 Hierarchia stanu

```
┌─────────────────────────────────────────────────┐
│  Stan globalny (localStorage, cookies)          │
│  - Trwa między stronami                         │
│  - Przykład: dark mode, token sesji             │
├─────────────────────────────────────────────────┤
│  Stan serwisu (providedIn: 'root')              │
│  - Trwa w ramach wyspy (jednej strony)          │
│  - Resetowany przy nawigacji                    │
├─────────────────────────────────────────────────┤
│  Stan komponentu (signals, zmienne)             │
│  - Trwa w ramach życia komponentu               │
│  - Resetowany przy re-renderowaniu              │
└─────────────────────────────────────────────────┘
```

### 7.2 Persystencja stanu między stronami

Jeśli stan musi przetrwać nawigację:

```typescript
@Injectable({ providedIn: "root" })
export class PersistentStateService {
  private readonly STORAGE_KEY = "app-state";

  saveState(data: unknown): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    }
  }

  loadState<T>(): T | null {
    if (typeof window !== "undefined") {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    }
    return null;
  }
}
```

---

## 8. Komunikacja z API

### 8.1 HttpClient w wyspach

Każda wyspa musi mieć skonfigurowany HttpClient:

```typescript
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpErrorInterceptor } from '@/lib/interceptors/http-error.interceptor';

// W osobnym pliku helper
export const httpProviders = provideHttpClient(
  withInterceptors([HttpErrorInterceptor])
);

// W komponencie
@Component({
  providers: [httpProviders],
})
```

### 8.2 Względne vs absolutne URL

```typescript
// ✅ Prawidłowo - względne URL (Astro obsługuje)
this.http.get("/api/matches");

// ❌ Nieprawidłowo - hardcoded domain
this.http.get("https://example.com/api/matches");
```

---

## 9. Ograniczenia @analogjs/astro-angular

### 9.1 Co działa

| Funkcja                  | Status              |
| ------------------------ | ------------------- |
| Standalone Components    | ✅                  |
| Signals                  | ✅                  |
| Dependency Injection     | ✅ (w ramach wyspy) |
| HttpClient               | ✅ (z providers)    |
| PrimeNG                  | ✅                  |
| RxJS                     | ✅                  |
| Angular Forms            | ✅                  |
| Component Inputs/Outputs | ✅                  |

### 9.2 Co NIE działa

| Funkcja                | Status | Alternatywa                      |
| ---------------------- | ------ | -------------------------------- |
| NgModules              | ❌     | Standalone components            |
| Angular Router         | ❌     | `<a href="">`, `window.location` |
| RouterLink             | ❌     | `<a href="">`                    |
| RouterOutlet           | ❌     | Osobne strony Astro              |
| Route Guards           | ❌     | Logika w Astro frontmatter       |
| Lazy Loading (Angular) | ❌     | Osobne strony Astro              |

---

## 10. Checklist dla nowej strony

Tworząc nową stronę z komponentem Angular:

### 10.1 Plik Astro (`src/pages/`)

- [ ] Import Layout
- [ ] Import komponentu Angular (PageComponent)
- [ ] Użycie `client:only="angular"`
- [ ] Przekazanie props (jeśli potrzebne)
- [ ] Sprawdzenie sesji (jeśli strona chroniona)

### 10.2 Komponent Angular (dla stron zalogowanych)

- [ ] `standalone: true`
- [ ] Import `AppLayoutComponent`
- [ ] `static clientProviders = AppLayoutComponent.clientProviders`
- [ ] `@ViewChild(AppLayoutComponent)` dla dostępu do metod toast
- [ ] Signals dla `userName` i `userInitials`
- [ ] Nawigacja przez `<a href="">` lub `window.location`
- [ ] SSR-safe kod (sprawdzenie `typeof window`)

### 10.3 Szablon HTML

- [ ] `<app-layout>` jako root z przekazanymi inputami
- [ ] Treść strony w `ng-content`
- [ ] Kolory przez CSS Variables (bez `dark:` prefixów)
- [ ] Wszystkie linki jako `<a href="">`

### 10.4 Nawigacja

- [ ] Wszystkie linki jako `<a href="">`
- [ ] Brak importów z `@angular/router`
- [ ] Nawigacja programowa przez `window.location.href`

---

## 11. Przykłady

### 11.1 Link w menu nawigacji

```html
<!-- ✅ Prawidłowo -->
<nav>
  <a href="/matches" class="nav-link">Mecze</a>
  <a href="/settings" class="nav-link">Ustawienia</a>
</nav>
```

### 11.2 Link dynamiczny

```html
<!-- ✅ Prawidłowo -->
<a [href]="'/matches/' + match.id + '/summary'"> Zobacz podsumowanie </a>
```

### 11.3 Nawigacja po akcji

```typescript
onMatchCreated(matchId: number): void {
  if (typeof window !== 'undefined') {
    window.location.href = `/matches/${matchId}/live`;
  }
}
```

### 11.4 Zewnętrzny link

```html
<!-- ✅ Prawidłowo - z target="_blank" dla zewnętrznych -->
<a href="https://external.com" target="_blank" rel="noopener noreferrer">
  Zewnętrzny link
</a>
```

---

## 12. Podsumowanie kluczowych zasad

1. **Routing = Astro** - struktura plików definiuje URL
2. **Angular Router = NIE** - nie używać w kontekście Astro
3. **Nawigacja = HTML** - standardowe linki `<a href="">`
4. **Wyspy = izolowane** - każda strona to osobny bootstrap Angular
5. **Stan = lokalny** - chyba że zpersystowany w localStorage
6. **SSR Safety** - sprawdzaj `typeof window !== 'undefined'`
7. **Layout = AppLayoutComponent** - bazowy komponent dla stron zalogowanych
8. **Providers = delegowane** - `static clientProviders = AppLayoutComponent.clientProviders`
9. **Kolory = CSS Variables** - bez `dark:` prefixów, zmiana automatyczna
10. **Toast = przez AppLayout** - `appLayout.showInfo()`, `showSuccess()`, `showError()`

---

## 13. Odniesienia

- [Astro Islands Architecture](https://docs.astro.build/en/concepts/islands/)
- [Astro Framework Components](https://docs.astro.build/en/guides/framework-components/)
- [@analogjs/astro-angular](https://analogjs.org/docs/packages/astro-angular/overview)
- [Astro Routing](https://docs.astro.build/en/guides/routing/)
