import { Component, inject, input, signal, computed } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

// PrimeNG imports
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { RippleModule } from 'primeng/ripple';

// Services
import { ThemeService } from '../../lib/services/theme.service';

// Types
import type { NavMenuItem, UserMenuItem } from './app-navbar.types';

/**
 * Komponent nawigacji głównej aplikacji
 *
 * Komponent współdzielony między wszystkimi widokami dla zalogowanych użytkowników.
 * Inspirowany wzorcem PrimeBlocks "Stacked Layout - Hover Borders".
 */
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    AvatarModule,
    MenuModule,
    RippleModule,
  ],
  template: `
    <!-- Sticky navbar container -->
    <nav class="sticky top-0 z-50 bg-surface-0 border-b border-surface-200 shadow-sm">
      <div class="container mx-auto px-4">
        <div class="flex items-center justify-between h-16">

          <!-- Lewa sekcja: Logo -->
          <div class="flex items-center">
            <button
              type="button"
              class="flex items-center space-x-2 text-xl font-semibold text-surface-900 hover:text-primary transition-colors duration-200"
              (click)="navigateToMatches()"
              aria-label="Spin Flow - strona główna"
            >
              <img [src]="logoPath()" alt="Spin Flow Logo" width="28" height="28" class="block" />
              <span>Spin Flow</span>
            </button>
          </div>

          <!-- Środkowa sekcja: Menu główne -->
          <div class="hidden md:flex items-center space-x-1">
            @for (item of menuItems(); track item.routerLink) {
              <button
                type="button"
                class="px-4 py-2 text-sm font-medium border-b-2 border-transparent hover:border-primary transition-colors duration-200 rounded-sm"
                [class.border-primary]="item.active"
                [class.text-primary]="item.active"
                [class.text-surface-700]="!item.active"
                [class.hover:text-surface-900]="!item.active"
                (click)="navigateToItem(item)"
                [attr.aria-current]="item.active ? 'page' : null"
              >
                {{ item.label }}
              </button>
            }
          </div>

          <!-- Prawa sekcja: Przyciski -->
          <div class="flex items-center space-x-3">
            <!-- Dark Mode Toggle Button -->
            <p-button
              icon="{{ themeService.isDarkMode() ? 'pi pi-sun' : 'pi pi-moon' }}"
              [text]="true"
              [rounded]="true"
              severity="secondary"
              size="small"
              (onClick)="toggleTheme()"
              [attr.aria-label]="themeService.isDarkMode() ? 'Przełącz na tryb jasny' : 'Przełącz na tryb ciemny'"
              pRipple
            ></p-button>

            <!-- User Menu -->
            <div class="relative">
              <p-avatar
                [label]="userInitials() || 'U'"
                size="normal"
                shape="circle"
                styleClass="cursor-pointer"
                (click)="toggleUserMenu()"
                [attr.aria-label]="'Menu użytkownika'"
                pRipple
              ></p-avatar>

              <!-- User Menu Overlay -->
              @if (showUserMenu()) {
                <div class="absolute right-0 top-full mt-2 w-48 bg-surface-0 border border-surface-200 rounded-lg shadow-lg z-50">
                  <!-- User Info Section -->
                  @if (userName()) {
                    <div class="px-4 py-3 border-b border-surface-200">
                      <div class="text-sm font-medium text-surface-900">{{ userName() }}</div>
                    </div>
                  }

                  <!-- Menu Items -->
                  <div class="py-1">
                    @for (item of userMenuItems(); track $index) {
                      @if (item.separator) {
                        <div class="border-t border-surface-200 my-1"></div>
                      }
                      <button
                        type="button"
                        class="w-full text-left px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 hover:text-surface-900 transition-colors duration-150 flex items-center space-x-2"
                        (click)="executeUserMenuCommand(item)"
                      >
                        <i [class]="item.icon"></i>
                        <span>{{ item.label }}</span>
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    /* Dodatkowe style dla lepszego UX */
    :host ::ng-deep .p-avatar {
      background-color: var(--primary-color);
      color: var(--primary-contrast-color);
    }

    /* Zapewnienie że menu nie wychodzi poza viewport */
    :host ::ng-deep .user-menu-overlay {
      max-height: 80vh;
      overflow-y: auto;
    }

    /* Efekty hover dla lepszej dostępności */
    :host ::ng-deep .p-button:hover {
      transform: none;
    }

    /* Responsywność dla małych ekranów */
    @media (max-width: 768px) {
      :host ::ng-deep .navbar-middle {
        display: none;
      }
    }
  `],
})
export class AppNavbarComponent {
  // Services
  private readonly router = inject(Router);
  readonly themeService = inject(ThemeService);

  // Input props
  readonly userName = input<string | undefined>(undefined);
  readonly userInitials = input<string | undefined>(undefined);

  // Logo path based on theme
  readonly logoPath = computed(() =>
    this.themeService.isDarkMode() ? '/logo-dark.svg' : '/logo.svg',
  );

  // Internal state
  private readonly _showUserMenu = signal<boolean>(false);
  readonly showUserMenu = this._showUserMenu.asReadonly();

  // Menu items - na razie tylko "Mecze"
  readonly menuItems = signal<NavMenuItem[]>([
    {
      label: 'Mecze',
      routerLink: '/matches',
      active: false,
    },
  ]);

  // User menu items
  readonly userMenuItems = signal<UserMenuItem[]>([
    {
      label: 'Wyloguj się',
      icon: 'pi pi-sign-out',
      command: () => this.logout(),
    },
  ]);

  // Computed properties
  readonly isCurrentRoute = computed(() => {
    const currentUrl = this.router.url;
    return (route: string) => currentUrl === route || currentUrl.startsWith(route + '/');
  });

  // Update active menu item based on current route
  private updateActiveMenuItem(): void {
    const currentItems = this.menuItems();
    const updatedItems = currentItems.map(item => ({
      ...item,
      active: this.isCurrentRoute()(item.routerLink),
    }));
    this.menuItems.set(updatedItems);
  }

  constructor() {
    // Update active menu item on route changes
    this.router.events.subscribe(() => {
      this.updateActiveMenuItem();
    });

    // Initial update
    this.updateActiveMenuItem();
  }

  // Navigation methods
  navigateToMatches(): void {
    this.router.navigate(['/matches']);
  }

  navigateToItem(item: NavMenuItem): void {
    if (!item.active) {
      this.router.navigate([item.routerLink]);
    }
  }

  // Theme methods
  toggleTheme(): void {
    this.themeService.toggleDarkMode();
  }

  // User menu methods
  toggleUserMenu(): void {
    this._showUserMenu.update(show => !show);
  }

  executeUserMenuCommand(item: UserMenuItem): void {
    this._showUserMenu.set(false);
    item.command();
  }

  // Placeholder logout - będzie zaimplementowane z AuthService
  private logout(): void {
    // TODO: Implementacja logout z AuthService
    console.log('Logout clicked - placeholder implementation');
    // Na razie przekierowanie do strony głównej
    this.router.navigate(['/']);
  }
}
