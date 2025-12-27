/**
 * OpenRouter Error Handler
 * Kompleksowa obsługa błędów dla usługi OpenRouter
 */

import {
  OpenRouterError,
  OpenRouterErrorCode,
} from './openrouter.types';
import type {
  CircuitBreakerState,
  Logger,
} from './openrouter.types';

/**
 * Default logger implementation using console
 */
const defaultLogger: Logger = {
  debug: (message: string, meta?: Record<string, unknown>) => console.debug(`[OpenRouter] ${message}`, meta),
  info: (message: string, meta?: Record<string, unknown>) => console.info(`[OpenRouter] ${message}`, meta),
  warn: (message: string, meta?: Record<string, unknown>) => console.warn(`[OpenRouter] ${message}`, meta),
  error: (message: string, meta?: Record<string, unknown>) => console.error(`[OpenRouter] ${message}`, meta),
};

/**
 * Circuit Breaker Pattern Implementation
 * Zapobiega kaskadowym awariom poprzez tymczasowe wstrzymanie żądań przy wysokiej częstotliwości błędów
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly threshold = 5; // Liczba kolejnych błędów przed otwarciem
  private readonly timeout = 60000; // 1 min - czas po którym circuit breaker się resetuje
  private readonly logger: Logger;

  constructor(logger: Logger = defaultLogger) {
    this.logger = logger;
  }

  /**
   * Wykonuje operację z kontrolą circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new OpenRouterError(
        OpenRouterErrorCode.NETWORK_ERROR,
        'Circuit breaker is open. Service temporarily unavailable.',
        undefined,
        true, // retryable
      );
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Sprawdza czy circuit breaker jest otwarty
   */
  private isOpen(): boolean {
    if (this.failures < this.threshold) return false;

    const timeSinceLastFailure = Date.now() - this.lastFailureTime;
    const isStillOpen = timeSinceLastFailure < this.timeout;

    if (!isStillOpen) {
      // Reset circuit breaker po timeout
      this.failures = 0;
      this.logger.info('Circuit breaker reset after timeout');
    }

    return isStillOpen;
  }

  /**
   * Obsługa sukcesu - resetuje licznik błędów
   */
  private onSuccess(): void {
    if (this.failures > 0) {
      this.logger.info('Circuit breaker success - resetting failure count', {
        previousFailures: this.failures,
      });
      this.failures = 0;
    }
  }

  /**
   * Obsługa błędu - zwiększa licznik błędów
   */
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    this.logger.warn('Circuit breaker failure recorded', {
      failureCount: this.failures,
      threshold: this.threshold,
    });
  }

  /**
   * Zwraca aktualny stan circuit breaker (dla monitoringu)
   */
  getState(): CircuitBreakerState {
    return {
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      isOpen: this.isOpen(),
    };
  }
}

/**
 * Mapuje błędy API OpenRouter na specyficzne błędy aplikacji
 * @param error - błąd z fetch lub innego klienta HTTP
 * @returns OpenRouterError z odpowiednim kodem i komunikatem
 */
export function mapApiError(error: unknown): OpenRouterError {
  // Type guard to check if error has fetch-like structure
  const isFetchError = (err: unknown): err is {
    status?: number;
    statusText?: string;
    data?: unknown;
    message?: string;
    stack?: string;
    name?: string;
  } => {
    return typeof err === 'object' && err !== null && 'status' in err;
  };

  // Only handle fetch errors now
  let statusCode: number | undefined;
  let responseData: unknown;

  if (isFetchError(error)) {
    statusCode = error.status;
    responseData = error.data;
  }

  // Type guard for response data with error structure
  const hasErrorMessage = (data: unknown): data is { error?: { message?: string } } => {
    return typeof data === 'object' && data !== null && 'error' in data;
  };

  const errorMessage = isFetchError(error) && error.message ? error.message : 'Unknown error';
  const stack = isFetchError(error) && error.stack ? error.stack : undefined;

  // Logowanie błędu dla diagnostyki
  defaultLogger.error('API Error mapping', {
    statusCode,
    responseData,
    errorMessage,
    stack,
  });

  switch (statusCode) {
    case 401:
      return new OpenRouterError(
        OpenRouterErrorCode.INVALID_API_KEY,
        'Invalid OpenRouter API key',
        401,
      );

    case 429:
      return new OpenRouterError(
        OpenRouterErrorCode.RATE_LIMIT_EXCEEDED,
        'Rate limit exceeded. Please try again later.',
        429,
        true, // retryable
      );

    case 402:
      return new OpenRouterError(
        OpenRouterErrorCode.QUOTA_EXCEEDED,
        'API quota exceeded. Please check your OpenRouter account.',
        402,
      );

    case 400:
      // Szczegółowa analiza błędów 400
      if (hasErrorMessage(responseData) && responseData.error?.message?.includes('model')) {
        return new OpenRouterError(
          OpenRouterErrorCode.MODEL_NOT_AVAILABLE,
          `Model not available: ${responseData.error.message}`,
          400,
        );
      }
      return new OpenRouterError(
        OpenRouterErrorCode.INVALID_REQUEST,
        hasErrorMessage(responseData) && responseData.error?.message ? responseData.error.message : 'Invalid request format',
        400,
      );

    default:
      // Błędy sieciowe i inne
      if (isFetchError(error) && (error.name === 'AbortError' || error.status === 408)) {
        return new OpenRouterError(
          OpenRouterErrorCode.NETWORK_ERROR,
          'Network connection failed',
          undefined,
          true, // retryable
        );
      }

      // Błędy serwera (5xx)
      if (statusCode && statusCode >= 500) {
        return new OpenRouterError(
          OpenRouterErrorCode.NETWORK_ERROR,
          `Server error: ${statusCode}`,
          statusCode,
          true, // retryable dla błędów serwera
        );
      }

      // Nieznany błąd
      return new OpenRouterError(
        OpenRouterErrorCode.NETWORK_ERROR,
        errorMessage,
        statusCode,
        typeof statusCode === 'number' && statusCode >= 500, // retryable dla błędów serwera
      );
  }
}

/**
 * Sprawdza czy błąd kwalifikuje się do ponowienia próby
 * @param error - błąd do sprawdzenia
 * @returns true jeśli błąd jest retryable
 */
export function isRetryableError(error: unknown): boolean {
  // Sprawdź czy to OpenRouterError z flagą retryable
  if (error instanceof OpenRouterError) {
    return error.retryable;
  }

  // Type guard for error-like objects
  const isErrorLike = (err: unknown): err is {
    code?: string;
    response?: { status?: number };
  } => {
    return typeof err === 'object' && err !== null;
  };

  if (!isErrorLike(error)) {
    return false;
  }

  // Sprawdź błędy transientne
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
    return true;
  }

  // Sprawdź błędy serwera 5xx
  if (error.response?.status && error.response.status >= 500) {
    return true;
  }

  // Sprawdź rate limiting 429
  if (error.response?.status === 429) {
    return true;
  }

  return false;
}

/**
 * Sanitizuje dane wrażliwe przed logowaniem
 * @param data - dane do sanitizacji
 * @returns dane z usuniętymi wrażliwymi informacjami
 */
export function sanitizeForLogging(data: unknown): unknown {
  const sensitiveFields = ['apiKey', 'authorization', 'x-api-key', 'apikey'];

  if (typeof data === 'object' && data !== null) {
    const sanitized = { ...data } as Record<string, unknown>;
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Rekursywnie sanitizuj zagnieżdżone obiekty
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'object') {
        sanitized[key] = sanitizeForLogging(sanitized[key]);
      }
    }

    return sanitized;
  }

  return data;
}

/**
 * Tworzy user-friendly komunikat błędu na podstawie OpenRouterError
 * @param error - błąd OpenRouter
 * @returns komunikat przyjazny dla użytkownika
 */
export function getUserFriendlyErrorMessage(error: OpenRouterError): string {
  switch (error.code) {
    case OpenRouterErrorCode.INVALID_API_KEY:
      return 'Problem z konfiguracją API. Skontaktuj się z administratorem.';

    case OpenRouterErrorCode.RATE_LIMIT_EXCEEDED:
      return 'Serwis tymczasowo przeciążony. Spróbuj ponownie za chwilę.';

    case OpenRouterErrorCode.MODEL_NOT_AVAILABLE:
      return 'Wybrany model AI jest tymczasowo niedostępny.';

    case OpenRouterErrorCode.QUOTA_EXCEEDED:
      return 'Przekroczono limit wykorzystania API. Spróbuj ponownie później.';

    case OpenRouterErrorCode.NETWORK_ERROR:
      return 'Problem z połączeniem internetowym. Sprawdź połączenie i spróbuj ponownie.';

    case OpenRouterErrorCode.TIMEOUT:
      return 'Żądanie trwało zbyt długo. Spróbuj ponownie.';

    case OpenRouterErrorCode.PARSING_ERROR:
      return 'Problem z przetwarzaniem odpowiedzi AI. Spróbuj ponownie.';

    case OpenRouterErrorCode.INVALID_REQUEST:
      return 'Nieprawidłowe dane wejściowe. Sprawdź wprowadzone informacje.';

    default:
      return 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.';
  }
}
