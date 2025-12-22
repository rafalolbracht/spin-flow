# Stylowanie w Spin Flow - Dokumentacja techniczna

## Stack technologii

| Technologia         | Rola                                        |
| ------------------- | ------------------------------------------- |
| **Astro**           | Framework serwerowy (SSR, routing)          |
| **Tailwind CSS 4**  | Klasy utility CSS                           |
| **PrimeNG 20**      | Komponenty UI                               |
| **PrimeUIX Themes** | System motywów PrimeNG (Aura preset, Green) |
| **CSS Variables**   | Źródło prawdy dla kolorów                   |

## Przepływ inicjalizacji

```
astro.config.mjs
  ↓ vite: { plugins: [tailwindcss()] }
tailwind.config.mjs
  ↓ darkMode: "class", content: [...]
src/styles/global.css
  ↓ :root {...}, .dark {...}, @theme {...}
src/lib/config/primeng.config.ts
  ↓ PrimeNGPreset + PrimeNGOptions
src/lib/config/primeng-theme-init.service.ts
  ↓ Auto-init singleton (providedIn: 'root')
Page Component
  ↓ inject(PrimeNGThemeInitService)
```

## Dark Mode - mechanizm

**Przełączanie:**

```typescript
// JavaScript dodaje/usuwa klasę na <html>
document.documentElement.classList.toggle("dark");
```

**CSS Variables:**

```css
:root {
  --color-surface-0: #ffffff;
  --color-surface-900: #0f172a;
}

.dark {
  --color-surface-0: #020617;
  --color-surface-900: #f8fafc;
}
```

**Mapowanie do Tailwind:**

```css
@theme {
  --color-surface-0: var(--color-surface-0);
  --color-surface-900: var(--color-surface-900);
}
```

**Synchronizacja z PrimeNG:**

- `tailwind.config.mjs`: `darkMode: "class"`
- `primeng.config.ts`: `darkModeSelector: ".dark"`

**Rezultat:** Klasa `.dark` na `<html>` przełącza Tailwind, PrimeNG i CSS Variables jednocześnie.

## Architektura PrimeNG z Astro + Angular (SSR-safe)

### Problem: Konfiguracja PrimeNG w SSR

Astro + Angular z `client:only="angular"`:

- Brak `main.ts` - Astro nie bootstrapuje pełnej aplikacji Angular
- Brak `app.config.ts` - providers nie działają automatycznie
- SSR vs Browser - kod musi być SSR-safe

### Rozwiązanie: Auto-initializing Service

**Struktura plików:**

**1. Konfiguracja (źródło prawdy):**

```typescript
// src/lib/config/primeng.config.ts
import Aura from "@primeuix/themes/aura";
import { definePreset } from "@primeuix/themes";

export const PrimeNGPreset = definePreset(Aura, {
  semantic: { primary: { 500: "{green.500}" /* ... */ } },
});

export const PrimeNGOptions = {
  darkModeSelector: ".dark",
};
```

**2. Auto-initializing Service (singleton):**

```typescript
// src/lib/config/primeng-theme-init.service.ts
@Injectable({ providedIn: "root" })
export class PrimeNGThemeInitService {
  private readonly primeng = inject(PrimeNG);
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (this.initialized) return;
    this.primeng.theme.set({
      preset: PrimeNGPreset,
      options: PrimeNGOptions,
    });
    this.initialized = true;
  }
}
```

**3. Użycie w komponencie strony:**

```typescript
// src/components/landing/landing-page/landing-page.component.ts
import { PrimeNGThemeInitService } from "@/lib/config/primeng-theme-init.service";

@Component({
  /* ... */
})
export class LandingPageComponent {
  private readonly _themeInit = inject(PrimeNGThemeInitService);
}
```

**4. Strona Astro:**

```astro
<Layout title="Tytuł">
  <LandingPageComponent client:only="angular" />
</Layout>
```

### Zalety

- **Jedna centralna konfiguracja** w `primeng.config.ts`
- **Automatyczna inicjalizacja** przez inject
- **Singleton** - działa raz dla całej aplikacji
- **SSR-safe** - działa na serwerze i w przeglądarce
- **Ultra proste** - jedna linijka: `inject(PrimeNGThemeInitService)`

### FAQ

**Q: Czy muszę dodawać inject w każdym komponencie?**
**A:** Tylko w głównych komponentach stron (renderowanych przez Astro). Komponenty dzieci dziedziczą konfigurację. Technicznie wystarczy raz, ale dla pewności dodajemy do każdej strony.

**Q: Co jeśli zapomnę dodać inject?**
**A:** PrimeNG użyje domyślnego motywu Aura (niebieski), bez synchronizacji z dark mode.

**Q: Dlaczego serwis zamiast app.config.ts?**
**A:** `app.config.ts` nie działa w Astro z `client:only="angular"`. Serwis z `providedIn: 'root'` działa jako singleton automatycznie.

**Q: Co z HttpClient?**
**A:** Używamy helpera `httpProviders` w `providers` komponentu:

```typescript
import { httpProviders } from '@/lib/config/http-providers';
@Component({ providers: [httpProviders], /* ... */ })
```

### SSR Safety

Serwisy używające browser APIs muszą sprawdzać platformę:

```typescript
export class ThemeService {
  constructor() {
    if (typeof window !== "undefined") {
      this.initializeTheme();
    }
  }
}
```

### Struktura plików

| Plik                            | Rola                         | Status          |
| ------------------------------- | ---------------------------- | --------------- |
| `primeng.config.ts`             | Definicje (Preset + Options) | ✅ Używany      |
| `primeng-theme-init.service.ts` | Auto-init singleton          | ✅ Używany      |
| `http-providers.ts`             | Helper dla HttpClient        | ✅ Używany      |
| `theme.service.ts`              | Dark mode toggle             | ✅ Używany      |
| ~~`app.config.ts`~~             | ~~Angular config~~           | ❌ Usunięty     |
| ~~`main.ts`~~                   | ~~Bootstrap~~                | ❌ Nie istnieje |
| ~~`app.component.ts`~~          | ~~Root wrapper~~             | ❌ Usunięty     |
