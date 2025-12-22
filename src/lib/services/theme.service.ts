import { Injectable, signal, computed } from '@angular/core';

/**
 * Serwis zarządzania motywem kolorystycznym (dark/light mode)
 *
 * Zarządza stanem trybu kolorystycznego aplikacji z persystencją w localStorage.
 * Automatycznie synchronizuje stan z DOM i obsługuje systemowe preferencje.
 *
 * SSR-safe: Sprawdza czy kod działa w przeglądarce przed użyciem localStorage/DOM.
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly STORAGE_KEY = 'spin-flow-dark-mode';
  private readonly DARK_MODE_CLASS = 'dark';
  private readonly _isDarkMode = signal<boolean>(false);

  readonly isDarkMode = this._isDarkMode.asReadonly();
  readonly isLightMode = computed(() => !this._isDarkMode());

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeTheme();
    }
  }

  private initializeTheme(): void {
    const savedPreference = localStorage.getItem(this.STORAGE_KEY);
    let shouldUseDarkMode = false;

    if (savedPreference !== null) {
      shouldUseDarkMode = savedPreference === 'true';
    } else {
      shouldUseDarkMode = this.getSystemPreference();
    }
    this.setDarkMode(shouldUseDarkMode);
  }

  private getSystemPreference(): boolean {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }

  toggleDarkMode(): void {
    this.setDarkMode(!this._isDarkMode());
  }

  setDarkMode(enabled: boolean): void {
    this._isDarkMode.set(enabled);

    if (typeof window !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, enabled.toString());
      this.updateDomClass(enabled);
    }
  }

  private updateDomClass(enabled: boolean): void {
    if (typeof document !== 'undefined') {
      const htmlElement = document.documentElement;

      if (enabled) {
        htmlElement.classList.add(this.DARK_MODE_CLASS);
      } else {
        htmlElement.classList.remove(this.DARK_MODE_CLASS);
      }
    }
  }
}
