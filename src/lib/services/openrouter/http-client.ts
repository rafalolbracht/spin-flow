/**
 * OpenRouter HTTP Client
 * Klient HTTP dla komunikacji z API OpenRouter
 */

import axios from 'axios';
import type { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
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
 * HTTP Client for OpenRouter API
 * Zarządza połączeniami HTTP z pełną obsługą błędów i retry logic
 */
export class HttpClient {
  private client!: AxiosInstance;
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

    this.initializeClient();
    this.setupInterceptors();
  }

  /**
   * Inicjalizuje klienta axios z podstawową konfiguracją
   */
  private initializeClient(): void {
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout.completion,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': 'https://spin-flow.vercel.app', // Dla OpenRouter analytics
        'X-Title': 'Spin Flow - Table Tennis AI Coach', // Dla OpenRouter analytics
      },
    });
  }

  /**
   * Konfiguruje interceptory dla request/response logging
   */
  private setupInterceptors(): void {
    // Request interceptor - logging wychodzących żądań
    this.client.interceptors.request.use(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (config: any) => {
        this.metrics.requestCount++;
        this.metrics.lastRequestTime = Date.now();

        this.logger.debug('Outgoing request', {
          url: config.url,
          method: config.method,
          timeout: config.timeout,
          sanitizedHeaders: sanitizeForLogging(config.headers),
        });

        return config;
      },
      (error: AxiosError) => {
        this.logger.error('Request interceptor error', {
          error: error.message,
          stack: error.stack,
        });
        return Promise.reject(error);
      },
    );

    // Response interceptor - logging odpowiedzi i metryk
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        const responseTime = Date.now() - (this.metrics.lastRequestTime || 0);
        this.metrics.successCount++;
        this.metrics.totalResponseTime += responseTime;
        this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.requestCount;

        this.logger.debug('Response received', {
          status: response.status,
          responseTime,
          usage: response.data?.usage,
          model: response.data?.model,
        });

        return response;
      },
      (error: AxiosError) => {
        const responseTime = Date.now() - (this.metrics.lastRequestTime || 0);
        this.metrics.errorCount++;
        this.metrics.totalResponseTime += responseTime;
        this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.requestCount;

        // Mapuj błąd na OpenRouterError
        const openRouterError = mapApiError(error);

        this.logger.error('Response error', {
          statusCode: error.response?.status,
          responseTime,
          errorCode: openRouterError.code,
          errorMessage: openRouterError.message,
          retryable: openRouterError.retryable,
          sanitizedResponse: sanitizeForLogging(error.response?.data),
        });

        return Promise.reject(openRouterError);
      },
    );
  }

  /**
   * Wykonuje żądanie do API z retry logic
   */
  async executeWithRetry<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
  ): Promise<AxiosResponse<T>> {
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
      this.client.post<OpenRouterCompletionResponse>('/chat/completions', request, {
        timeout: request.stream ? this.config.timeout.streaming : this.config.timeout.completion,
      }),
    );

    return response.data as OpenRouterCompletionResponse;
  }

  /**
   * Pobiera listę dostępnych modeli
   */
  async getModels(): Promise<Record<string, unknown>> {
    const response = await this.executeWithRetry(() =>
      this.client.get('/models'),
    );

    return response.data as Record<string, unknown>;
  }

  /**
   * Pobiera informacje o wykorzystaniu API (jeśli dostępne)
   */
  async getUsage(): Promise<Record<string, unknown> | null> {
    try {
      const response = await this.executeWithRetry(() =>
        this.client.get('/auth/key'),
      );

      return response.data as Record<string, unknown>;
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
      await this.client.get('/models', { timeout: 5000 });
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

    // Aktualizuj headers jeśli zmienił się API key
    if (newConfig.apiKey) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${newConfig.apiKey}`;
    }

    // Aktualizuj baseURL jeśli się zmienił
    if (newConfig.baseUrl) {
      this.client.defaults.baseURL = newConfig.baseUrl;
    }

    this.logger.info('HTTP client configuration updated', {
      hasNewApiKey: !!newConfig.apiKey,
      hasNewBaseUrl: !!newConfig.baseUrl,
    });
  }
}
