/**
 * OpenRouter Response Parser
 * Parsuje i waliduje odpowiedzi z API OpenRouter
 */

import type {
  MatchAnalysisResponse,
  OpenRouterCompletionResponse,
  ProcessingMetrics,
  Logger,
  TrainingPlanResponse,
} from './openrouter.types';
import { OpenRouterError, OpenRouterErrorCode } from './openrouter.types';
import { sanitizeForLogging } from './error-handler';

/**
 * Default logger implementation using console
 */

const defaultLogger: Logger = {
  // eslint-disable-next-line no-console
  debug: (message: string, meta?: Record<string, unknown>) => console.debug(`[OpenRouter-Parser] ${message}`, meta),
  // eslint-disable-next-line no-console
  info: (message: string, meta?: Record<string, unknown>) => console.info(`[OpenRouter-Parser] ${message}`, meta),
  // eslint-disable-next-line no-console
  warn: (message: string, meta?: Record<string, unknown>) => console.warn(`[OpenRouter-Parser] ${message}`, meta),
  // eslint-disable-next-line no-console
  error: (message: string, meta?: Record<string, unknown>) => console.error(`[OpenRouter-Parser] ${message}`, meta),
};

/**
 * Response Parser for OpenRouter API
 * Parsuje odpowiedzi JSON Schema i waliduje ich strukturę
 */
export class ResponseParser {
  private logger: Logger;

  constructor(logger: Logger = defaultLogger) {
    this.logger = logger;
  }

  /**
   * Parsuje odpowiedź API OpenRouter na MatchAnalysisResponse
   */
  parseMatchAnalysisResponse(
    apiResponse: OpenRouterCompletionResponse,
    requestStartTime: number,
  ): MatchAnalysisResponse {
    try {
      // Sprawdź podstawową strukturę odpowiedzi API
      this.validateApiResponseStructure(apiResponse);

      // Wyciągnij content z pierwszego choice
      const content = apiResponse.choices[0].message.content;

      if (!content || typeof content !== 'string') {
        throw new OpenRouterError(
          OpenRouterErrorCode.PARSING_ERROR,
          'No content in API response',
        );
      }

      // Parsuj JSON z content
      const parsedContent = this.parseJsonContent(content);

      // Waliduj format odpowiedzi zgodnie z wymaganiami Spin Flow
      const analysisResponse = this.validateAndMapMatchAnalysisResponse(parsedContent);

      // Dodaj metryki przetwarzania
      const processingTime = Date.now() - requestStartTime;

      const result: MatchAnalysisResponse = {
        ...analysisResponse,
        modelUsed: apiResponse.model,
        processingTime,
      };

      this.logger.debug('Successfully parsed match analysis response', {
        modelUsed: apiResponse.model,
        processingTime,
        opisMeczuLength: analysisResponse.opisMeczu.length,
        zaleceniaLength: analysisResponse.zaleceniaTreningowe.length,
        usage: apiResponse.usage,
      });

      return result;

    } catch (error) {
      this.logger.error('Failed to parse match analysis response', {
        error: error instanceof Error ? error.message : String(error),
        apiResponse: sanitizeForLogging(apiResponse),
      });

      if (error instanceof OpenRouterError) {
        throw error;
      }

      throw new OpenRouterError(
        OpenRouterErrorCode.PARSING_ERROR,
        `Response parsing failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Waliduje podstawową strukturę odpowiedzi API
   */
  private validateApiResponseStructure(response: OpenRouterCompletionResponse): void {
    if (!response || typeof response !== 'object') {
      throw new OpenRouterError(
        OpenRouterErrorCode.PARSING_ERROR,
        'Invalid API response structure: expected object',
      );
    }

    if (!response.choices || !Array.isArray(response.choices) || response.choices.length === 0) {
      throw new OpenRouterError(
        OpenRouterErrorCode.PARSING_ERROR,
        'Invalid API response: missing or empty choices array',
      );
    }

    const firstChoice = response.choices[0];
    if (!firstChoice.message || typeof firstChoice.message.content !== 'string') {
      throw new OpenRouterError(
        OpenRouterErrorCode.PARSING_ERROR,
        'Invalid API response: missing message content',
      );
    }

    if (!response.usage || typeof response.usage !== 'object') {
      throw new OpenRouterError(
        OpenRouterErrorCode.PARSING_ERROR,
        'Invalid API response: missing usage information',
      );
    }
  }

  /**
   * Parsuje JSON content z odpowiedzi API
   */
  private parseJsonContent(content: string): unknown {
    try {
      // Spróbuj sparsować jako JSON
      const parsed = JSON.parse(content);
      return parsed;
    } catch (jsonError) {
      // Jeśli parsowanie JSON się nie powiedzie, spróbuj wyodrębnić JSON z tekstu
      this.logger.warn('Direct JSON parsing failed, attempting to extract JSON from text', {
        contentLength: content.length,
        error: jsonError instanceof Error ? jsonError.message : String(jsonError),
      });

      const extractedJson = this.extractJsonFromText(content);
      if (extractedJson) {
        return extractedJson;
      }

      throw new OpenRouterError(
        OpenRouterErrorCode.PARSING_ERROR,
        `Failed to parse JSON content: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`,
      );
    }
  }

  /**
   * Próbuje wyodrębnić JSON z tekstu odpowiedzi (fallback dla modeli, które dodają dodatkowy tekst)
   */
  private extractJsonFromText(text: string): unknown | null {
    try {
      // Szukaj JSON między pierwszą { a ostatnią }
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Szukaj JSON po znacznikach kodu
      const codeBlockMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        return JSON.parse(codeBlockMatch[1]);
      }

      return null;
    } catch (error) {
      this.logger.warn('Failed to extract JSON from text', { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Waliduje i mapuje odpowiedź analizy meczu zgodnie z wymaganiami Spin Flow
   */
  private validateAndMapMatchAnalysisResponse(data: unknown): Omit<MatchAnalysisResponse, 'modelUsed' | 'processingTime'> {
    if (!data || typeof data !== 'object') {
      throw new OpenRouterError(
        OpenRouterErrorCode.PARSING_ERROR,
        'Invalid response data: expected object',
      );
    }

    const objData = data as Record<string, unknown>;

    // Sprawdź obecność wymaganych pól
    if (!objData.opisMeczu || typeof objData.opisMeczu !== 'string') {
      throw new OpenRouterError(
        OpenRouterErrorCode.PARSING_ERROR,
        'Missing or invalid "opisMeczu" field',
      );
    }

    if (!objData.zaleceniaTreningowe || typeof objData.zaleceniaTreningowe !== 'string') {
      throw new OpenRouterError(
        OpenRouterErrorCode.PARSING_ERROR,
        'Missing or invalid "zaleceniaTreningowe" field',
      );
    }

    // Waliduj długość treści (wymaganie 5-7 zdań)
    const opisMeczuValidation = this.validateContentLength(objData.opisMeczu, 'opisMeczu');
    const zaleceniaValidation = this.validateContentLength(objData.zaleceniaTreningowe, 'zaleceniaTreningowe');

    // Loguj ostrzeżenia jeśli długość nie spełnia wymagań
    if (!opisMeczuValidation.isValid) {
      this.logger.warn('Opis meczu may not meet length requirements', {
        sentenceCount: opisMeczuValidation.sentenceCount,
        expectedRange: '5-7',
        content: objData.opisMeczu.substring(0, 100) + '...',
      });
    }

    if (!zaleceniaValidation.isValid) {
      this.logger.warn('Zalecenia treningowe may not meet length requirements', {
        sentenceCount: zaleceniaValidation.sentenceCount,
        expectedRange: '5-7',
        content: objData.zaleceniaTreningowe.substring(0, 100) + '...',
      });
    }

    // Wyczyść i znormalizuj tekst
    const opisMeczu = this.normalizeContent(objData.opisMeczu);
    const zaleceniaTreningowe = this.normalizeContent(objData.zaleceniaTreningowe);

    return {
      opisMeczu,
      zaleceniaTreningowe,
    };
  }

  /**
   * Waliduje długość treści na podstawie liczby zdań
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private validateContentLength(content: string, _fieldName: string): { isValid: boolean; sentenceCount: number } {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceCount = sentences.length;
    const isValid = sentenceCount >= 3 && sentenceCount <= 10; // Tolerancja dla walidacji (3-10 zamiast 5-7)

    return { isValid, sentenceCount };
  }

  /**
   * Normalizuje zawartość tekstową (czyszczenie, trimowanie)
   */
  private normalizeContent(content: string): string {
    return content
      .trim()
      // Usuń wielokrotne spacje
      .replace(/\s+/g, ' ')
      // Usuń nadmiarowe nowe linie
      .replace(/\n\s*\n/g, '\n')
      .trim()
  }

  /**
   * Parsuje odpowiedź dla planów treningowych (placeholder - do implementacji w przyszłości)
   */
  parseTrainingPlanResponse(): TrainingPlanResponse {
    // Placeholder - implementacja zostanie dodana gdy będzie potrzebna
    throw new Error('Training plan parsing not implemented yet');
  }

  /**
   * Tworzy metryki przetwarzania na podstawie odpowiedzi API
   */
  extractProcessingMetrics(
    apiResponse: OpenRouterCompletionResponse,
    requestStartTime: number,
  ): ProcessingMetrics {
    const endTime = Date.now();

    return {
      startTime: requestStartTime,
      endTime,
      modelUsed: apiResponse.model,
      tokensUsed: {
        prompt: apiResponse.usage.prompt_tokens,
        completion: apiResponse.usage.completion_tokens,
        total: apiResponse.usage.total_tokens,
      },
      retryCount: 0, // To będzie ustawiane przez caller
    };
  }

  /**
   * Sprawdza czy odpowiedź zawiera oczekiwane nagłówki sekcji
   */
  validateSectionHeaders(content: string): boolean {
    const hasOpisMeczu = /###\s*Opis meczu/i.test(content);
    const hasZalecenia = /###\s*Zalecenia treningowe/i.test(content);

    if (!hasOpisMeczu) {
      this.logger.warn('Missing "### Opis meczu" section header in response');
    }

    if (!hasZalecenia) {
      this.logger.warn('Missing "### Zalecenia treningowe" section header in response');
    }

    return hasOpisMeczu && hasZalecenia;
  }

  /**
   * Ekstrahuje sekcje z odpowiedzi tekstowej (fallback dla modeli, które nie używają JSON)
   */
  extractSectionsFromText(content: string): { opisMeczu: string; zaleceniaTreningowe: string } | null {
    try {
      // Szukaj sekcji między nagłówkami
      const opisMatch = content.match(/###\s*Opis meczu\s*\n([\s\S]*?)(?=###|\n*$)/);
      const zaleceniaMatch = content.match(/###\s*Zalecenia treningowe\s*\n([\s\S]*?)(?=###|\n*$)/);

      if (opisMatch && zaleceniaMatch) {
        return {
          opisMeczu: opisMatch[1].trim(),
          zaleceniaTreningowe: zaleceniaMatch[1].trim(),
        };
      }

      return null;
    } catch (error) {
      this.logger.warn('Failed to extract sections from text', { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }
}
