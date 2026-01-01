import { Component, inject, input, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideAnimations } from '@angular/platform-browser/animations';
import { StyleClassModule } from 'primeng/styleclass';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { RippleModule } from 'primeng/ripple';
import { type MenuItem } from 'primeng/api';
import { ThemeService } from '@/lib/services/theme.service';
import { PrimeNGThemeInitService } from '@/lib/config/primeng-theme-init.service';
import { httpProviders } from '@/lib/config/http-providers';
import { AuthService } from '@/lib/services/auth.service';
import type { NavMenuItem } from './app-layout.types';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    StyleClassModule,
    AvatarModule,
    MenuModule,
    ToastModule,
    ConfirmDialogModule,
    RippleModule,
  ],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.css',
})
export class AppLayoutComponent {
  static clientProviders = [provideAnimations(), httpProviders];

  readonly themeService = inject(ThemeService);
  readonly authService = inject(AuthService);
  private readonly _themeInit = inject(PrimeNGThemeInitService);

  readonly userName = input<string | undefined>(undefined);
  readonly userInitials = input<string | undefined>(undefined);
  readonly userAvatarUrl = input<string | undefined>(undefined);
  readonly customMenuItems = input<NavMenuItem[] | undefined>(undefined);
  readonly activeMenuIndex = input<number>(0);

  // Stan błędu ładowania avatara
  private _avatarError = signal<boolean>(false);

  private readonly _activeItem = signal<number>(0);

  readonly logoPath = computed(() =>
    this.themeService.isDarkMode() ? '/logo-dark.svg' : '/logo.svg',
  );

  readonly darkModeIconClass = computed(() =>
    this.themeService.isDarkMode() ? 'pi pi-sun text-base text-surface-600' : 'pi pi-moon text-base text-surface-600',
  );

  readonly menuItems = computed<NavMenuItem[]>(() => {
    const custom = this.customMenuItems();
    if (custom && custom.length > 0) {
      return custom;
    }
    return [
      {
        label: 'Mecze',
        href: '/matches',
        icon: 'pi-list',
      },
    ];
  });

  readonly userMenuItems = computed<MenuItem[]>(() => [
    {
      label: 'Wyloguj się',
      icon: 'pi pi-sign-out',
      command: () => this.onLogout(),
    },
  ]);

  readonly effectiveAvatarUrl = computed(() => {
    return this._avatarError() ? undefined : this.userAvatarUrl();
  });

  readonly avatarStyleClass = computed(() => {
    // Jeśli mamy obrazek, nie potrzebujemy specjalnych stylów
    if (this.effectiveAvatarUrl()) {
      return 'bg-primary text-primary-contrast';
    }

    // Dla inicjałów - różne tła w zależności od trybu
    if (this.themeService.isDarkMode()) {
      // W trybie ciemnym - jaśniejsze tło dla lepszego kontrastu
      return 'bg-primary-400 text-primary-contrast';
    } else {
      // W trybie jasnym - ciemniejsze tło dla lepszego kontrastu z jasnym nagłówkiem
      return 'bg-primary-700 text-primary-contrast';
    }
  });

  constructor() {
    const initialIndex = this.activeMenuIndex();
    if (initialIndex >= 0) {
      this._activeItem.set(initialIndex);
    }

    // Reset avatar error when userAvatarUrl changes
    effect(() => {
      this.userAvatarUrl(); // Trigger effect
      this._avatarError.set(false);
    });
  }

  onAvatarImageError(): void {
    this._avatarError.set(true);
  }

  activeItem(): number {
    return this._activeItem();
  }

  setActiveItem(index: number): void {
    this._activeItem.set(index);
  }

  getMenuItemClassDesktop(index: number): string {
    const base = 'flex items-center gap-2 h-full px-4 cursor-pointer transition-colors duration-150 border-b-2';
    const isActive = this._activeItem() === index;

    if (isActive) {
      return `${base} dark:border-white border-primary-500`;
    }
    return `${base} border-transparent dark:hover:border-white hover:border-primary-500`;
  }

  getMenuItemClassMobile(index: number): string {
    const base = 'flex items-center gap-2 px-6 py-3 cursor-pointer transition-colors duration-150 border-l-2';
    const isActive = this._activeItem() === index;

    if (isActive) {
      return `${base} dark:border-white border-primary-500`;
    }
    return `${base} border-transparent dark:hover:border-white hover:border-primary-500`;
  }

  getMenuIconClass(index: number): string {
    const isActive = this._activeItem() === index;
    return isActive ? 'text-surface-900' : 'text-surface-500';
  }

  getMenuLabelClass(index: number): string {
    const isActive = this._activeItem() === index;
    return isActive ? 'font-medium text-surface-900' : 'font-medium text-surface-600';
  }

  toggleDarkMode(): void {
    this.themeService.toggleDarkMode();
  }

  private onLogout(): void {
    this.performLogout();
  }

  onLogoutClick(): void {
    this.performLogout();
  }

  private async performLogout(): Promise<void> {
    try {
      await this.authService.signOut();
      // Przekierowanie do strony głównej po wylogowaniu
      // (zgodnie z PRD US-003, kryterium 3)
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch {
      // Błąd wylogowania zostanie obsłużony przez AuthService
    }
  }
}

