/**
 * OpenRouter HTTP Client
 * Klient HTTP dla komunikacji z API OpenRouter
 */

import type {
  OpenRouterConfig,
  OpenRouterCompletionRequest,
  OpenRouterCompletionResponse,
  Logger,
} from './openrouter.types';
import { mapApiError, isRetryableError, sanitizeForLogging } from './error-handler';

/**
 * Default logger implementation using console
 */
const defaultLogger: Logger = {
  debug: (message: string, meta?: Record<string, unknown>) => console.debug(`[OpenRouter-HTTP] ${message}`, meta),
  info: (message: string, meta?: Record<string, unknown>) => console.info(`[OpenRouter-HTTP] ${message}`, meta),
  warn: (message: string, meta?: Record<string, unknown>) => console.warn(`[OpenRouter-HTTP] ${message}`, meta),
  error: (message: string, meta?: Record<string, unknown>) => console.error(`[OpenRouter-HTTP] ${message}`, meta),
};

/**
 * Metrics collector for HTTP requests
 */
interface HttpMetrics {
  requestCount: number,
  successCount: number,
  errorCount: number,
  totalResponseTime: number,
  averageResponseTime: number,
  lastRequestTime?: number,
}

/**
 * Custom error types for fetch-based HTTP client
 */
class FetchError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
    public response?: Response,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

/**
 * HTTP response wrapper for fetch API
 */
interface FetchResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: {
    url: string;
    method: string;
    timeout: number;
    headers: Record<string, string>;
  };
}

/**
 * HTTP Client for OpenRouter API
 * Zarządza połączeniami HTTP z pełną obsługą błędów i retry logic
 */
export class HttpClient {
  private config: OpenRouterConfig;
  private logger: Logger;
  private metrics: HttpMetrics;

  constructor(
    config: OpenRouterConfig,
    logger: Logger = defaultLogger,
  ) {
    this.config = config;
    this.logger = logger;
    this.metrics = {
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
    };
  }

  /**
   * Wykonuje żądanie HTTP używając fetch
   */
  private async makeRequest<T>(
    method: string,
    endpoint: string,
    data?: unknown,
    timeout?: number,
  ): Promise<FetchResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const requestTimeout = timeout || this.config.timeout.completion;

    this.metrics.requestCount++;
    this.metrics.lastRequestTime = Date.now();

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      'HTTP-Referer': 'https://spin-flow.vercel.app', // Dla OpenRouter analytics
      'X-Title': 'Spin Flow - Table Tennis AI Coach', // Dla OpenRouter analytics
    };

    this.logger.debug('Outgoing request', {
      url,
      method,
      timeout: requestTimeout,
      sanitizedHeaders: sanitizeForLogging(headers),
    });

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), requestTimeout);

    try {
      const requestOptions: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        requestOptions.body = JSON.stringify(data);
      }

      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      const responseTime = Date.now() - (this.metrics.lastRequestTime || 0);
      const responseHeaders: Record<string, string> = {};

      // Convert Headers to plain object
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseData: T;

      if (!response.ok) {
        // Try to parse error response
        try {
          responseData = await response.json() as T;
        } catch {
          responseData = {} as T;
        }

        throw new FetchError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          response.statusText,
          response,
          responseData,
        );
      }

      // Parse successful response
      try {
        responseData = await response.json() as T;
      } catch {
        responseData = {} as T;
      }

      // Update success metrics
      this.metrics.successCount++;
      this.metrics.totalResponseTime += responseTime;
      this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.requestCount;

      this.logger.debug('Response received', {
        status: response.status,
        responseTime,
        usage: (responseData as Record<string, unknown>)?.usage,
        model: (responseData as Record<string, unknown>)?.model,
      });

      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        config: {
          url,
          method,
          timeout: requestTimeout,
          headers,
        },
      };

    } catch (error) {
      clearTimeout(timeoutId);
      const responseTime = Date.now() - (this.metrics.lastRequestTime || 0);
      this.metrics.errorCount++;
      this.metrics.totalResponseTime += responseTime;
      this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.requestCount;

      // Handle different types of errors
      if (error instanceof FetchError) {
        const openRouterError = mapApiError(error);

        this.logger.error('Response error', {
          statusCode: error.status,
          responseTime,
          errorCode: openRouterError.code,
          errorMessage: openRouterError.message,
          retryable: openRouterError.retryable,
          sanitizedResponse: sanitizeForLogging(error.data),
        });

        throw openRouterError;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new FetchError(
          `Request timeout after ${requestTimeout}ms`,
          408,
          'Request Timeout',
        );
        const openRouterError = mapApiError(timeoutError);

        this.logger.error('Request timeout', {
          timeout: requestTimeout,
          errorMessage: openRouterError.message,
        });

        throw openRouterError;
      }

      // Generic error
      const genericError = new FetchError(
        error instanceof Error ? error.message : 'Unknown error',
        0,
        'Unknown Error',
      );
      const openRouterError = mapApiError(genericError);

      this.logger.error('Request error', {
        errorMessage: openRouterError.message,
      });

      throw openRouterError;
    }
  }

  /**
   * Wykonuje żądanie do API z retry logic
   */
  async executeWithRetry<T>(
    requestFn: () => Promise<FetchResponse<T>>,
  ): Promise<FetchResponse<T>> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retry.maxAttempts; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Sprawdź czy błąd kwalifikuje się do retry
        if (!isRetryableError(error) || attempt === this.config.retry.maxAttempts) {
          throw error;
        }

        // Oblicz delay z exponential backoff
        const delay = this.config.retry.baseDelay * Math.pow(2, attempt - 1);

        this.logger.warn(`HTTP request failed (attempt ${attempt}/${this.config.retry.maxAttempts})`, {
          error: lastError.message,
          delay,
          nextAttemptIn: delay,
        });

        // Czekaj przed następną próbą
        await this.delay(delay);
      }
    }

    throw lastError;
  }

  /**
   * Wysyła żądanie completion do OpenRouter API
   */
  async createCompletion(
    request: OpenRouterCompletionRequest,
  ): Promise<OpenRouterCompletionResponse> {
    const response = await this.executeWithRetry(() =>
      this.makeRequest<OpenRouterCompletionResponse>(
        'POST',
        '/chat/completions',
        request,
        request.stream ? this.config.timeout.streaming : this.config.timeout.completion,
      ),
    );

    return response.data;
  }

  /**
   * Pobiera listę dostępnych modeli
   */
  async getModels(): Promise<Record<string, unknown>> {
    const response = await this.executeWithRetry(() =>
      this.makeRequest<Record<string, unknown>>('GET', '/models'),
    );

    return response.data;
  }

  /**
   * Pobiera informacje o wykorzystaniu API (jeśli dostępne)
   */
  async getUsage(): Promise<Record<string, unknown> | null> {
    try {
      const response = await this.executeWithRetry(() =>
        this.makeRequest<Record<string, unknown>>('GET', '/auth/key'),
      );

      return response.data;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.warn('Could not fetch usage information', { error: errorObj.message });
      return null;
    }
  }

  /**
   * Sprawdza dostępność API (health check)
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.makeRequest('GET', '/models', undefined, 5000);
      return true;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Health check failed', { error: errorObj.message });
      return false;
    }
  }

  /**
   * Zwraca aktualne metryki HTTP
   */
  getMetrics(): HttpMetrics {
    return { ...this.metrics };
  }

  /**
   * Resetuje metryki (np. dla testów)
   */
  resetMetrics(): void {
    this.metrics = {
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
    };
  }

  /**
   * Utility method dla czekania (delay)
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Aktualizuje konfigurację klienta (np. po zmianie API key)
   */
  updateConfig(newConfig: Partial<OpenRouterConfig>): void {
    this.config = { ...this.config, ...newConfig };

    this.logger.info('HTTP client configuration updated', {
      hasNewApiKey: !!newConfig.apiKey,
      hasNewBaseUrl: !!newConfig.baseUrl,
    });
  }
}
