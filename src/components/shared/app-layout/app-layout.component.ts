import { Component, inject, input, computed, signal } from '@angular/core';
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
import type { NavMenuItem } from './app-layout.types';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
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
  private readonly _themeInit = inject(PrimeNGThemeInitService);

  readonly userName = input<string | undefined>(undefined);
  readonly userInitials = input<string | undefined>(undefined);
  readonly customMenuItems = input<NavMenuItem[] | undefined>(undefined);
  readonly activeMenuIndex = input<number>(0);

  private readonly _activeItem = signal<number>(0);

  readonly logoPath = computed(() =>
    this.themeService.isDarkMode() ? '/logo-dark.svg' : '/logo.svg',
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

  constructor() {
    const initialIndex = this.activeMenuIndex();
    if (initialIndex >= 0) {
      this._activeItem.set(initialIndex);
    }
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

  private performLogout(): void {
    // TODO: Implementacja logout z Supabase Auth
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }
}

