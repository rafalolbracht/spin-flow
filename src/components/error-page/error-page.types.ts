/**
 * Typy dla komponentu ErrorPageComponent
 */

/**
 * Typ określający wariant błędu do wyświetlenia
 */
export type ErrorType = 'not_found' | 'match_not_found' | 'invalid_token';

/**
 * Interfejs konfiguracji widoku błędu
 */
export interface ErrorPageConfig {
  /** Typ błędu */
  errorType: ErrorType;
  /** Tekst nagłówka */
  title: string;
  /** Tekst pomocniczy */
  description: string;
  /** Etykieta przycisku */
  buttonLabel: string;
  /** Ścieżka docelowa przycisku */
  buttonRoute: string;
  /** Ikona PrimeIcons dla przycisku */
  buttonIcon: string;
  /** Główna ikona błędu */
  errorIcon: string;
}
