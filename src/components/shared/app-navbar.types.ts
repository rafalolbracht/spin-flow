/**
 * Typy dla komponentu nawigacji głównej aplikacji (AppNavbarComponent)
 */

/**
 * Element menu nawigacji
 */
export interface NavMenuItem {
  /** Tekst wyświetlany w menu */
  label: string;

  /** Ścieżka nawigacji (routerLink) */
  routerLink: string;

  /** Ikona PrimeIcons (opcjonalna) */
  icon?: string;

  /** Czy element jest aktywny (computed na podstawie aktualnej ścieżki) */
  active?: boolean;
}

/**
 * Element menu użytkownika (popup)
 */
export interface UserMenuItem {
  /** Tekst wyświetlany w menu */
  label: string;

  /** Ikona PrimeIcons */
  icon: string;

  /** Akcja do wykonania po kliknięciu */
  command: () => void;

  /** Czy dodać separator przed tym elementem (opcjonalne) */
  separator?: boolean;
}
