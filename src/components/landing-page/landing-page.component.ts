import { Component, signal, computed, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { PrimeNGThemeInitService } from '../../lib/config/primeng-theme-init.service';
import type { HeroConfig, FeatureCardData } from './landing-page.types';
import { ThemeService } from '../../lib/services/theme.service';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [NgClass, ButtonModule],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.css',
})
export class LandingPageComponent {
  readonly themeService = inject(ThemeService);
  private readonly _themeInit = inject(PrimeNGThemeInitService);

  readonly logoPath = computed(() =>
    this.themeService.isDarkMode() ? '/logo-dark.svg' : '/logo.svg',
  );

  readonly footerLogoPath = computed(() =>
    this.themeService.isDarkMode() ? '/logo.svg' : '/logo-dark.svg',
  );

  heroConfig = signal<HeroConfig>({
    badge: 'Rejestracja meczów tenisa stołowego',
    headline: 'Analizuj mecze',
    subheadline: 'Rejestruj każdy punkt w czasie rzeczywistym i otrzymuj inteligentne analizy oraz zalecenia treningowe wygenerowane przez AI.',
    ctaLabel: 'Zaloguj i zacznij',
    miniFeatures: [],
    appScreenshotUrl: '/app-screenshot2.png',
    appScreenshotAlt: 'Zrzut ekranu aplikacji Spin Flow pokazujący interfejs rejestracji meczu',
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

  toggleTheme(): void {
    this.themeService.toggleDarkMode();
  }

  onTopbarLoginClick(): void {
    console.log('Topbar login clicked - placeholder for future OAuth integration');
    // TODO: Implement OAuth flow with Supabase Auth
  }

  onHeroLoginClick(): void {
    console.log('Hero CTA login clicked - placeholder for future OAuth integration');
    // TODO: Implement OAuth flow with Supabase Auth
  }
}
