/**
 * OpenRouter Service Types
 * Definiuje wszystkie typy używane przez usługę OpenRouter
 */

// ========================================
// CONFIGURATION TYPES
// ========================================

export interface OpenRouterConfig {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;    // x-ai/grok-4.1-fast
  fallbackModel: string;
  timeout: {
    completion: number;    // ms, domyślnie 30000
    streaming: number;     // ms, domyślnie 300000
  };
  retry: {
    maxAttempts: number;   // domyślnie 3
    baseDelay: number;     // ms, domyślnie 1000
  };
}

// ========================================
// REQUEST/RESPONSE TYPES
// ========================================

export interface MatchAnalysisRequest {
  matchId: number;
  playerName: string;
  opponentName: string;
  sets: Array<{
    sequenceInMatch: number;
    scorePlayer: number;
    scoreOpponent: number;
    isGolden: boolean;
    coachNotes?: string; // Uwagi trenera do seta
    points: Array<{
      sequenceInSet: number;
      scoredBy: 'player' | 'opponent';
      tags: string[];
    }>;
  }>;
  coachNotes?: string; // Uwagi trenera do całego meczu
}

export interface MatchAnalysisResponse {
  opisMeczu: string;        // Treść sekcji "Opis meczu" (5-7 zdań)
  zaleceniaTreningowe: string; // Treść sekcji "Zalecenia treningowe" (5-7 zdań)
  modelUsed: string;
  processingTime: number; // ms
}

export interface PlayerTrainingRequest {
  playerName: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  recentMatches: MatchSummary[];
  focusAreas: string[];
}

export interface MatchSummary {
  matchId: number;
  opponentName: string;
  result: string;
  date: string;
  keyPoints?: string[];
}

export interface TrainingPlanResponse {
  plan: string;
  modelUsed: string;
  processingTime: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  supportsJsonSchema: boolean;
  costPerToken: number;
}

// ========================================
// INTERNAL TYPES
// ========================================

export interface MatchData {
  matchId: number;
  playerName: string;
  opponentName: string;
  coachNotes?: string;
  sets: Array<{
    sequenceInMatch: number;
    scorePlayer: number;
    scoreOpponent: number;
    isGolden: boolean;
    coachNotes?: string;
    points: Array<{
      sequenceInSet: number;
      scoredBy: 'player' | 'opponent';
      tags: string[];
    }>;
  }>;
}

export interface AnalysisContext {
  sport: 'table-tennis';
  language: 'polish';
  focus: 'match-analysis';
}

// ========================================
// API REQUEST/RESPONSE TYPES
// ========================================

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterCompletionRequest {
  model: string;
  messages: OpenRouterMessage[];
  response_format?: ResponseFormat;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

// Type for JSON Schema property definitions
export type JsonSchemaProperty = {
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchemaProperty>;
  items?: JsonSchemaProperty | JsonSchemaProperty[];
  required?: string[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  enum?: unknown[];
  [key: string]: unknown;
};

export interface ResponseFormat {
  type: 'json_schema';
  json_schema: {
    name: string;
    strict: boolean;
    schema: {
      type: 'object';
      properties: Record<string, JsonSchemaProperty>;
      required: string[];
      additionalProperties: boolean;
    };
  };
}

export interface OpenRouterCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ========================================
// ERROR TYPES
// ========================================

export class OpenRouterError extends Error {
  constructor(
    public code: OpenRouterErrorCode,
    message: string,
    public statusCode?: number,
    public retryable: boolean = false,
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

export enum OpenRouterErrorCode {
  INVALID_API_KEY = 'INVALID_API_KEY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  MODEL_NOT_AVAILABLE = 'MODEL_NOT_AVAILABLE',
  INVALID_REQUEST = 'INVALID_REQUEST',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
  TIMEOUT = 'TIMEOUT'
}

// ========================================
// METRICS AND MONITORING TYPES
// ========================================

export interface ProcessingMetrics {
  startTime: number;
  endTime: number;
  modelUsed: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  retryCount: number;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
}

export interface ServiceMetrics {
  httpMetrics: unknown;
  circuitBreakerState: CircuitBreakerState;
}

// ========================================
// SERVICE INTERFACE
// ========================================

export interface IOpenRouterService {
  analyzeMatch(request: MatchAnalysisRequest): Promise<MatchAnalysisResponse>;
  generateTrainingPlan(request: PlayerTrainingRequest): Promise<TrainingPlanResponse>;
  getAvailableModels(): Promise<ModelInfo[]>;
  healthCheck(): Promise<boolean>;
  getMetrics(): ServiceMetrics;
  updateConfig(newConfig: Partial<OpenRouterConfig>): void;
  resetMetrics(): void;
}

// ========================================
// LOGGER INTERFACE
// ========================================

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}
