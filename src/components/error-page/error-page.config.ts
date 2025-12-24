import type { ErrorType, ErrorPageConfig } from './error-page.types';

/**
 * Stała mapa konfiguracji dla każdego typu błędu
 */
export const ERROR_PAGE_CONFIGS: Record<ErrorType, ErrorPageConfig> = {
  not_found: {
    errorType: 'not_found',
    title: 'Strona nie znaleziona',
    description: 'Przepraszamy, strona której szukasz nie istnieje lub została przeniesiona.',
    buttonLabel: 'Strona główna',
    buttonRoute: '/',
    buttonIcon: 'pi pi-home',
    errorIcon: 'pi pi-exclamation-triangle',
  },
  match_not_found: {
    errorType: 'match_not_found',
    title: 'Mecz nie istnieje',
    description: 'Ten mecz nie istnieje lub został usunięty przez trenera.',
    buttonLabel: 'Strona główna',
    buttonRoute: '/',
    buttonIcon: 'pi pi-home',
    errorIcon: 'pi pi-times-circle',
  },
  invalid_token: {
    errorType: 'invalid_token',
    title: 'Nieprawidłowy link',
    description: 'Link do meczu jest nieprawidłowy lub wygasł.',
    buttonLabel: 'Strona główna',
    buttonRoute: '/',
    buttonIcon: 'pi pi-home',
    errorIcon: 'pi pi-link',
  },
};
