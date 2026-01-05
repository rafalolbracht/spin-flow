import { Component, inject, computed } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { NgClass } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { PrimeNGThemeInitService } from '../../lib/config/primeng-theme-init.service';
import { httpProviders } from '../../lib/config/http-providers';
import { ThemeService } from '../../lib/services/theme.service';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [NgClass, ButtonModule],
  templateUrl: './privacy-policy.component.html',
  styleUrl: './privacy-policy.component.css',
})
export class PrivacyPolicyComponent {
  static clientProviders = [provideAnimations(), httpProviders];
  readonly themeService = inject(ThemeService);
  private readonly _themeInit = inject(PrimeNGThemeInitService);

  readonly logoPath = computed(() =>
    this.themeService.isDarkMode() ? '/logo-dark.svg' : '/logo.svg',
  );

  readonly footerLogoPath = computed(() =>
    this.themeService.isDarkMode() ? '/logo.svg' : '/logo-dark.svg',
  );

  toggleTheme(): void {
    this.themeService.toggleDarkMode();
  }

  goToHome(): void {
    window.location.href = '/';
  }
}
