/**
 * OpenRouter Service
 * Główna usługa integrująca wszystkie komponenty OpenRouter dla analizy meczów tenisa stołowego
 */

import type {
  IOpenRouterService,
  OpenRouterConfig,
  MatchAnalysisRequest,
  MatchAnalysisResponse,
  TrainingPlanResponse,
  ModelInfo,
  MatchData,
  Logger,
  ServiceMetrics,
} from './openrouter.types';
import { getMatchAnalysisResponseSchema } from './schemas';
import { HttpClient } from './http-client';
import { MessageBuilder } from './message-builder';
import { ResponseParser } from './response-parser';
import { CircuitBreaker } from './error-handler';
import { OpenRouterError, OpenRouterErrorCode } from './openrouter.types';

/**
 * Default logger implementation using console
 * Note: Console statements are allowed here as this is a fallback logger
 * when no custom logger is provided to the service
 */
/* eslint-disable no-console */
const defaultLogger: Logger = {
  debug: (message: string, meta?: Record<string, unknown>) => console.debug(`[OpenRouter-Service] ${message}`, meta),
  info: (message: string, meta?: Record<string, unknown>) => console.info(`[OpenRouter-Service] ${message}`, meta),
  warn: (message: string, meta?: Record<string, unknown>) => console.warn(`[OpenRouter-Service] ${message}`, meta),
  error: (message: string, meta?: Record<string, unknown>) => console.error(`[OpenRouter-Service] ${message}`, meta),
};
/* eslint-enable no-console */

/**
 * Główna usługa OpenRouter dla aplikacji Spin Flow
 * Integruje wszystkie komponenty: HttpClient, MessageBuilder, ResponseParser, CircuitBreaker
 * Zapewnia kompletną funkcjonalność analizy meczów opartą na AI
 */
export class OpenRouterService implements IOpenRouterService {
  private httpClient!: HttpClient;
  private messageBuilder!: MessageBuilder;
  private responseParser!: ResponseParser;
  private circuitBreaker!: CircuitBreaker;
  private config!: OpenRouterConfig;
  private logger!: Logger;

  constructor(
    config: OpenRouterConfig,
    logger: Logger = defaultLogger,
  ) {
    this.config = config;
    this.logger = logger;

    this.validateConfig(config);
    this.initializeComponents();
  }

  // ========================================
  // PUBLIC METHODS
  // ========================================

  /**
   * Główna metoda analizy meczu zgodnie z formatem prompta Spin Flow
   */
  async analyzeMatch(request: MatchAnalysisRequest): Promise<MatchAnalysisResponse> {
    const startTime = Date.now();

    try {
      this.logger.info('Starting match analysis', {
        matchId: request.matchId,
        playerName: request.playerName,
        opponentName: request.opponentName,
        setsCount: request.sets.length,
      });

      // Konwertuj request na wewnętrzny format MatchData
      const matchData = this.convertToMatchData(request);

      // Waliduj dane meczu
      if (!this.messageBuilder.validateMatchData(matchData)) {
        throw new OpenRouterError(
          OpenRouterErrorCode.INVALID_REQUEST,
          'Invalid match data structure',
        );
      }

      // Wykonaj analizę z circuit breaker i retry logic
      const result = await this.executeWithRetry(() =>
        this.performMatchAnalysis(matchData, startTime),
      );

      this.logger.info('Match analysis completed successfully', {
        matchId: request.matchId,
        modelUsed: result.modelUsed,
        processingTime: result.processingTime,
      });

      return result;

    } catch (error) {
      this.logger.error('Match analysis failed', {
        matchId: request.matchId,
        error: error instanceof Error ? error.message : String(error),
        processingTime: Date.now() - startTime,
      });

      throw error;
    }
  }

  /**
   * Generuje spersonalizowany plan treningowy
   * Placeholder - pełna implementacja zostanie dodana w przyszłości
   */
  async generateTrainingPlan(): Promise<TrainingPlanResponse> {
    // Placeholder implementation
    throw new OpenRouterError(
      OpenRouterErrorCode.INVALID_REQUEST,
      'Training plan generation not implemented yet',
    );
  }

  /**
   * Zwraca listę dostępnych modeli z ich możliwościami
   */
  async getAvailableModels(): Promise<ModelInfo[]> {
    try {
      await this.httpClient.getModels();

      // Mapuj odpowiedź na ModelInfo[]
      // To jest uproszczona implementacja - w rzeczywistości należałoby sparsować pełną odpowiedź
      return [{
        id: this.config.defaultModel,
        name: 'xAI Grok 4.1 Fast',
        provider: 'xAI',
        contextWindow: 128000,
        supportsJsonSchema: true,
        costPerToken: 0.0000005, // Przybliżona wartość
      }];

    } catch (error) {
      this.logger.warn('Failed to fetch available models', { error: error instanceof Error ? error.message : String(error) });

      // Fallback - zwróć domyślny model
      return [{
        id: this.config.defaultModel,
        name: 'xAI Grok 4.1 Fast (fallback)',
        provider: 'xAI',
        contextWindow: 128000,
        supportsJsonSchema: true,
        costPerToken: 0.0000005,
      }];
    }
  }

  /**
   * Sprawdza dostępność usługi AI
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await this.httpClient.healthCheck();
    } catch (error) {
      this.logger.error('Health check failed', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Zwraca aktualne metryki usługi
   */
  getMetrics(): ServiceMetrics {
    return {
      httpMetrics: this.httpClient.getMetrics(),
      circuitBreakerState: this.circuitBreaker.getState(),
    };
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  /**
   * Waliduje konfigurację przy inicjalizacji
   */
  private validateConfig(config: OpenRouterConfig): void {
    if (!config.apiKey || !config.apiKey.startsWith('sk-or-v1')) {
      throw new OpenRouterError(
        OpenRouterErrorCode.INVALID_API_KEY,
        'Invalid OpenRouter API key format',
      );
    }

    if (!config.baseUrl) {
      throw new OpenRouterError(
        OpenRouterErrorCode.INVALID_REQUEST,
        'Base URL is required',
      );
    }

    if (!config.defaultModel) {
      throw new OpenRouterError(
        OpenRouterErrorCode.INVALID_REQUEST,
        'Default model is required',
      );
    }
  }

  /**
   * Inicjalizuje wszystkie komponenty usługi
   */
  private initializeComponents(): void {
    this.httpClient = new HttpClient(this.config, this.logger);
    this.messageBuilder = new MessageBuilder(this.logger);
    this.responseParser = new ResponseParser(this.logger);
    this.circuitBreaker = new CircuitBreaker(this.logger);

    this.logger.info('OpenRouter service components initialized', {
      defaultModel: this.config.defaultModel,
      baseUrl: this.config.baseUrl,
    });
  }

  /**
   * Konwertuje MatchAnalysisRequest na wewnętrzny format MatchData
   */
  private convertToMatchData(request: MatchAnalysisRequest): MatchData {
    return {
      matchId: request.matchId,
      playerName: request.playerName,
      opponentName: request.opponentName,
      coachNotes: request.coachNotes,
      sets: request.sets.map(set => ({
        sequenceInMatch: set.sequenceInMatch,
        scorePlayer: set.scorePlayer,
        scoreOpponent: set.scoreOpponent,
        isGolden: set.isGolden,
        coachNotes: set.coachNotes,
        points: set.points.map(point => ({
          sequenceInSet: point.sequenceInSet,
          scoredBy: point.scoredBy,
          tags: point.tags,
        })),
      })),
    };
  }

  /**
   * Zwraca schemat odpowiedzi wymuszający format JSON dla analizy meczu
   */
  private getResponseSchema() {
    return getMatchAnalysisResponseSchema();
  }

  /**
   * Wykonuje operację z retry logic i circuit breaker
   */
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    return this.circuitBreaker.execute(operation);
  }

  /**
   * Wykonuje kompletną analizę meczu
   */
  private async performMatchAnalysis(
    matchData: MatchData,
    startTime: number,
  ): Promise<MatchAnalysisResponse> {
    // Buduj wiadomości dla API
    const messages = this.messageBuilder.buildMatchAnalysisMessages(matchData);

    // Przygotuj request do API
    const completionRequest = {
      model: this.config.defaultModel,
      messages,
      response_format: this.getResponseSchema(),
      temperature: 0.3, // Niska temperatura dla spójnych odpowiedzi
      max_tokens: 2000, // Limit tokenów dla odpowiedzi
    };

    // Wyślij request do API
    const apiResponse = await this.httpClient.createCompletion(completionRequest);

    // Sparsuj odpowiedź
    const analysisResponse = this.responseParser.parseMatchAnalysisResponse(
      apiResponse,
      startTime,
    );

    return analysisResponse;
  }

  /**
   * Aktualizuje konfigurację wszystkich komponentów
   */
  updateConfig(newConfig: Partial<OpenRouterConfig>): void {
    if (newConfig.apiKey || newConfig.baseUrl) {
      this.httpClient.updateConfig(newConfig);
    }

    this.config = { ...this.config, ...newConfig };

    this.logger.info('OpenRouter service configuration updated');
  }

  /**
   * Resetuje metryki wszystkich komponentów (głównie dla testów)
   */
  resetMetrics(): void {
    this.httpClient.resetMetrics();
    this.logger.info('OpenRouter service metrics reset');
  }
}
