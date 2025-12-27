import type { ValidationErrorDetail } from "../../types";

/**
 * Error codes for API responses
 */
export const ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  BAD_REQUEST: "BAD_REQUEST",
  // OpenRouter/AI specific errors
  AI_SERVICE_ERROR: "AI_SERVICE_ERROR",
  AI_QUOTA_EXCEEDED: "AI_QUOTA_EXCEEDED",
  AI_RATE_LIMITED: "AI_RATE_LIMITED",
  AI_MODEL_UNAVAILABLE: "AI_MODEL_UNAVAILABLE",
  AI_INVALID_REQUEST: "AI_INVALID_REQUEST",
  AI_TIMEOUT: "AI_TIMEOUT",
  AI_PARSING_ERROR: "AI_PARSING_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Standard error messages
 */
export const ERROR_MESSAGES = {
  UNAUTHORIZED: "Missing or invalid authentication token",
  INTERNAL_ERROR: "An unexpected error occurred",
  NOT_FOUND: "Resource not found",
  DATABASE_ERROR: "Database operation failed",
  VALIDATION_FAILED: "Validation failed",
  MATCH_NOT_FOUND: "Match not found",
  SET_NOT_FOUND: "Set not found",
  // AI/OpenRouter error messages
  AI_SERVICE_ERROR: "AI analysis service temporarily unavailable",
  AI_QUOTA_EXCEEDED: "AI analysis quota exceeded",
  AI_RATE_LIMITED: "AI analysis rate limit exceeded",
  AI_MODEL_UNAVAILABLE: "AI model temporarily unavailable",
  AI_INVALID_REQUEST: "Invalid AI analysis request",
  AI_TIMEOUT: "AI analysis request timed out",
  AI_PARSING_ERROR: "Failed to parse AI analysis response",
} as const;

/**
 * Base API error class
 */
export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number,
    public details?: ValidationErrorDetail[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Database operation error
 */
export class DatabaseError extends ApiError {
  constructor(message = ERROR_MESSAGES.DATABASE_ERROR) {
    super(ERROR_CODES.DATABASE_ERROR, message, 500);
    this.name = "DatabaseError";
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends ApiError {
  constructor(message = ERROR_MESSAGES.NOT_FOUND) {
    super(ERROR_CODES.NOT_FOUND, message, 404);
    this.name = "NotFoundError";
  }
}

/**
 * Validation error with field details
 */
export class ValidationError extends ApiError {
  constructor(details: ValidationErrorDetail[]) {
    super(
      ERROR_CODES.VALIDATION_ERROR,
      ERROR_MESSAGES.VALIDATION_FAILED,
      422,
      details,
    );
    this.name = "ValidationError";
  }
}

/**
 * AI/OpenRouter service error
 */
export class AIServiceError extends ApiError {
  constructor(
    message = ERROR_MESSAGES.AI_SERVICE_ERROR,
    public originalError?: Error,
  ) {
    super(ERROR_CODES.AI_SERVICE_ERROR, message, 503);
    this.name = "AIServiceError";
  }
}

/**
 * AI quota exceeded error
 */
export class AIQuotaExceededError extends ApiError {
  constructor(message = ERROR_MESSAGES.AI_QUOTA_EXCEEDED) {
    super(ERROR_CODES.AI_QUOTA_EXCEEDED, message, 402);
    this.name = "AIQuotaExceededError";
  }
}

/**
 * AI rate limit exceeded error
 */
export class AIRateLimitError extends ApiError {
  constructor(message = ERROR_MESSAGES.AI_RATE_LIMITED) {
    super(ERROR_CODES.AI_RATE_LIMITED, message, 429);
    this.name = "AIRateLimitError";
  }
}

/**
 * AI model unavailable error
 */
export class AIModelUnavailableError extends ApiError {
  constructor(message = ERROR_MESSAGES.AI_MODEL_UNAVAILABLE) {
    super(ERROR_CODES.AI_MODEL_UNAVAILABLE, message, 503);
    this.name = "AIModelUnavailableError";
  }
}

/**
 * AI invalid request error
 */
export class AIInvalidRequestError extends ApiError {
  constructor(message = ERROR_MESSAGES.AI_INVALID_REQUEST) {
    super(ERROR_CODES.AI_INVALID_REQUEST, message, 400);
    this.name = "AIInvalidRequestError";
  }
}

/**
 * AI timeout error
 */
export class AITimeoutError extends ApiError {
  constructor(message = ERROR_MESSAGES.AI_TIMEOUT) {
    super(ERROR_CODES.AI_TIMEOUT, message, 504);
    this.name = "AITimeoutError";
  }
}

/**
 * AI parsing error
 */
export class AIParseError extends ApiError {
  constructor(message = ERROR_MESSAGES.AI_PARSING_ERROR) {
    super(ERROR_CODES.AI_PARSING_ERROR, message, 500);
    this.name = "AIParseError";
  }
}
