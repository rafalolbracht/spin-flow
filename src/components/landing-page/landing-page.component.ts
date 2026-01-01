import { Component, signal, computed, inject, effect, HostListener } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { NgClass } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { PrimeNGThemeInitService } from '../../lib/config/primeng-theme-init.service';
import { httpProviders } from '../../lib/config/http-providers';
import type { HeroConfig, FeatureCardData } from './landing-page.types';
import { ThemeService } from '../../lib/services/theme.service';
import { AuthService } from '../../lib/services/auth.service';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [NgClass, ButtonModule, MessageModule],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.css',
})
export class LandingPageComponent {
  static clientProviders = [provideAnimations(), httpProviders];
  readonly themeService = inject(ThemeService);
  readonly authService = inject(AuthService);
  private readonly _themeInit = inject(PrimeNGThemeInitService);

  readonly logoPath = computed(() =>
    this.themeService.isDarkMode() ? '/logo-dark.svg' : '/logo.svg',
  );

  readonly footerLogoPath = computed(() =>
    this.themeService.isDarkMode() ? '/logo.svg' : '/logo-dark.svg',
  );

  readonly loginButtonLabel = computed(() =>
    this.authService.isAuthenticated() ? 'Moje mecze' : 'Zaloguj',
  );

  readonly showLoginRequired = signal<boolean>(false);
  readonly windowWidth = signal<number>(0);

  heroConfig = signal<HeroConfig>({
    badge: 'Rejestracja meczów tenisa stołowego',
    headline: 'Analizuj mecze',
    subheadline: 'Rejestruj każdy punkt w czasie rzeczywistym i otrzymuj inteligentne analizy oraz zalecenia treningowe wygenerowane przez AI.',
    ctaLabel: 'Zaloguj i zacznij',
    miniFeatures: [],
    appScreenshotUrl: '/app-screenshot2.png',
    appScreenshotAlt: 'Zrzut ekranu aplikacji Spin Flow pokazujący interfejs rejestracji meczu',
  });

  readonly screenshotUrl = computed(() => {
    // Na małych ekranach używamy innego obrazka
    if (this.windowWidth() < 640) {
      return '/app-screenshot-mobile.png';
    }
    return '/app-screenshot2.png';
  });

  features = signal<FeatureCardData[]>([
    {
      icon: 'pi pi-stopwatch',
      iconBgClass: '',
      iconColorClass: '',
      title: 'Rejestracja na żywo',
      description: 'Zapisuj punkty i sety podczas meczu w czasie rzeczywistym. Śledź serwującego według oficjalnych zasad tenisa stołowego.',
    },
    {
      icon: 'pi pi-tags',
      iconBgClass: '',
      iconColorClass: '',
      title: 'Tagi punktów',
      description: 'Oznaczaj punkty tagami: błąd serwisu, błąd odbioru, zła praca nóg. Dzięki temu AI wygeneruje precyzyjne zalecenia treningowe.',
    },
    {
      icon: 'pi pi-sparkles',
      iconBgClass: '',
      iconColorClass: '',
      title: 'Analiza AI',
      description: 'Po zakończeniu meczu otrzymasz automatyczne podsumowanie oraz listę zaleceń do poprawy dla zawodnika.',
    },
    {
      icon: 'pi pi-share-alt',
      iconBgClass: '',
      iconColorClass: '',
      title: 'Udostępnianie meczów',
      description: 'Wygeneruj publiczny link do meczu i udostępnij go zawodnikowi, rodzicom lub innym zainteresowanym osobom.',
    },
    {
      icon: 'pi pi-mobile',
      iconBgClass: '',
      iconColorClass: '',
      title: 'Mobilny interfejs',
      description: 'Aplikacja zoptymalizowana pod smartfony. Rejestruj mecze jedną ręką bezpośrednio przy stole.',
    },
    {
      icon: 'pi pi-cloud',
      iconBgClass: '',
      iconColorClass: '',
      title: 'Bezpieczna chmura',
      description: 'Wszystkie dane są automatycznie zapisywane w chmurze. Odśwież stronę bez obaw o utratę postępu.',
    },
  ]);

  constructor() {
    // Inicjalizacja szerokości okna
    if (typeof window !== 'undefined') {
      this.windowWidth.set(window.innerWidth);

      // Sprawdzenie parametru URL po inicjalizacji
      const params = new URLSearchParams(window.location.search);
      if (params.get('login_required') === 'true') {
        this.showLoginRequired.set(true);
        // Usunięcie parametru z URL bez przeładowania strony
        window.history.replaceState({}, '', '/');
      }
    }

    // Effect do śledzenia zmian szerokości okna
    effect(() => {
      // Ten effect będzie reagował na zmiany windowWidth
      this.screenshotUrl();
    });
  }

  @HostListener('window:resize')
  onResize() {
    if (typeof window !== 'undefined') {
      this.windowWidth.set(window.innerWidth);
    }
  }

  toggleTheme(): void {
    this.themeService.toggleDarkMode();
  }

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
}
