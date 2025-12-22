import { inject } from '@angular/core';
import type {
  HttpInterceptorFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { logError } from '../utils/logger';

/**
 * HTTP Error Interceptor
 *
 * Centralny interceptor obsługujący błędy HTTP we wszystkich widokach aplikacji.
 * Mapuje kody błędów na przyjazne komunikaty użytkownika i wykonuje odpowiednie akcje.
 */
export const HttpErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const messageService = inject(MessageService);

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      handleHttpError(error, messageService);
      return throwError(() => error);
    }),
  );
};

/**
 * Centralna obsługa błędów HTTP
 * @param error - HttpErrorResponse z Angular
 * @param messageService - PrimeNG MessageService
 */
function handleHttpError(error: HttpErrorResponse, messageService: MessageService): void {
  logError(
    `HTTP ${error.status}`,
    new Error(error.message),
    {
      status: error.status,
      url: error.url || 'unknown',
      statusText: error.statusText,
      errorDetails: error.error,
    },
  );

  // Mapowanie błędów na podstawie statusu HTTP
  switch (error.status) {
    case 0:
      handleNetworkError(messageService);
      break;

    case 401:
      handleUnauthorizedError(messageService);
      break;

    case 403:
      handleForbiddenError(messageService);
      break;

    case 404:
      handleNotFoundError(error, messageService);
      break;

    case 422:
      handleValidationError(error, messageService);
      break;

    case 500:
      handleServerError(messageService);
      break;

    default:
      handleGenericError(error, messageService);
      break;
  }
}

/**
 * Obsługa błędu połączenia (network error)
 */
function handleNetworkError(messageService: MessageService): void {
  messageService.add({
    severity: 'error',
    summary: 'Błąd połączenia',
    detail: 'Sprawdź połączenie z internetem.',
    life: 5000,
  });
}

/**
 * Obsługa błędu autoryzacji (401 Unauthorized)
 */
function handleUnauthorizedError(messageService: MessageService): void {
  messageService.add({
    severity: 'error',
    summary: 'Sesja wygasła',
    detail: 'Zaloguj się ponownie.',
    life: 5000,
  });

  // Przekierowanie do strony głównej (używamy window.location, bo routing obsługuje Astro)
  if (typeof window !== 'undefined') {
    window.location.href = '/';
  }
}

/**
 * Obsługa błędu dostępu zabronionego (403 Forbidden)
 */
function handleForbiddenError(messageService: MessageService): void {
  messageService.add({
    severity: 'warn',
    summary: 'Brak dostępu',
    detail: 'Nie masz uprawnień do wykonania tej akcji.',
    life: 4000,
  });
}

/**
 * Obsługa błędu nie znaleziono (404 Not Found)
 */
function handleNotFoundError(error: HttpErrorResponse, messageService: MessageService): void {
  const contextualMessage = getContextualNotFoundMessage(error.url || undefined);

  messageService.add({
    severity: 'warn',
    summary: 'Nie znaleziono',
    detail: contextualMessage,
    life: 4000,
  });
}

/**
 * Obsługa błędu walidacji (422 Unprocessable Entity)
 */
function handleValidationError(error: HttpErrorResponse, messageService: MessageService): void {
  const validationMessage = extractValidationMessage(error);

  messageService.add({
    severity: 'error',
    summary: 'Błąd walidacji',
    detail: validationMessage,
    life: 5000,
  });
}

/**
 * Obsługa błędu serwera (500 Internal Server Error)
 */
function handleServerError(messageService: MessageService): void {
  messageService.add({
    severity: 'error',
    summary: 'Błąd serwera',
    detail: 'Wystąpił błąd serwera. Spróbuj ponownie później.',
    life: 5000,
  });
}

/**
 * Obsługa ogólnych błędów HTTP
 */
function handleGenericError(error: HttpErrorResponse, messageService: MessageService): void {
  messageService.add({
    severity: 'error',
    summary: `Błąd ${error.status}`,
    detail: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.',
    life: 4000,
  });
}

/**
 * Pobiera kontekstowy komunikat dla błędu 404
 * @param url - URL który spowodował błąd
 * @returns Kontekstowy komunikat błędu
 */
function getContextualNotFoundMessage(url?: string): string {
  if (!url) {
    return 'Żądany zasób nie został znaleziony.';
  }

  // Proste mapowanie URL na komunikaty kontekstowe
  if (url.includes('/matches/')) {
    return 'Mecz nie został znaleziony.';
  }

  if (url.includes('/sets/')) {
    return 'Set nie został znaleziony.';
  }

  if (url.includes('/points/')) {
    return 'Punkt nie został znaleziony.';
  }

  if (url.includes('/tags/')) {
    return 'Tag nie został znaleziony.';
  }

  return 'Żądany zasób nie został znaleziony.';
}

/**
 * Wyciąga komunikat walidacji z odpowiedzi błędu
 * @param error - HttpErrorResponse
 * @returns Komunikat walidacji
 */
function extractValidationMessage(error: HttpErrorResponse): string {
  // Sprawdź czy błąd zawiera szczegóły walidacji
  if (error.error?.error?.details && Array.isArray(error.error.error.details)) {
    const firstDetail = error.error.error.details[0];
    if (firstDetail?.message) {
      return firstDetail.message;
    }
  }

  // Sprawdź czy błąd zawiera ogólny komunikat
  if (error.error?.error?.message) {
    return error.error.error.message;
  }

  // Fallback na domyślny komunikat
  return 'Dane są nieprawidłowe. Sprawdź wprowadzone informacje.';
}
