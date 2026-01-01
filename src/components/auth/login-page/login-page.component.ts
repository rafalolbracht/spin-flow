import { Component, signal, computed, inject, input } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { httpProviders } from '@/lib/config/http-providers';
import { AuthService } from '@/lib/services/auth.service';
import { ThemeService } from '@/lib/services/theme.service';
import { PrimeNGThemeInitService } from '@/lib/config/primeng-theme-init.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ButtonModule, MessageModule, TooltipModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css',
})
export class LoginPageComponent {
  static clientProviders = [provideAnimations(), httpProviders];
  readonly authService = inject(AuthService);
  readonly themeService = inject(ThemeService);
  private readonly _themeInit = inject(PrimeNGThemeInitService);

  // Inputs
  errorCode = input<string | undefined>(undefined);
  errorDetails = input<string | undefined>(undefined);
  redirectUrl = input<string>('/matches');

  readonly logoPath = computed(() =>
    this.themeService.isDarkMode() ? '/logo-dark.svg' : '/logo.svg',
  );

  readonly isLoading = signal<boolean>(false);

  readonly errorMessages: Record<string, string> = {
    oauth_failed: 'Logowanie nie powiodło się. Spróbuj ponownie.',
    session_expired: 'Sesja wygasła. Zaloguj się ponownie.',
    invalid_callback: 'Nieprawidłowy link callback. Spróbuj zalogować się ponownie.',
  };

  readonly errorMessage = computed(() => {
    const code = this.errorCode();
    if (!code) return null;

    const baseMessage =
      this.errorMessages[code] || 'Wystąpił nieoczekiwany błąd.';

    const details = this.errorDetails();
    // Szczegóły są przekazywane tylko w DEV z backendu (api/auth/callback),
    // więc tutaj nie musimy sprawdzać środowiska.
    if (details) {
      const shortDetails = details.length > 240 ? `${details.slice(0, 240)}…` : details;
      return `${baseMessage} Szczegóły (DEV): ${shortDetails}`;
    }

    return baseMessage;
  });

  async onGoogleLogin(): Promise<void> {
    if (this.isLoading()) return;

    this.isLoading.set(true);
    try {
      await this.authService.signInWithGoogle(this.redirectUrl());
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Google login failed:', error);
      this.isLoading.set(false);
    }
  }

  async onFacebookLogin(): Promise<void> {
    if (this.isLoading()) return;

    this.isLoading.set(true);
    try {
      await this.authService.signInWithFacebook(this.redirectUrl());
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Facebook login failed:', error);
      this.isLoading.set(false);
    }
  }

  toggleTheme(): void {
    this.themeService.toggleDarkMode();
  }
}
