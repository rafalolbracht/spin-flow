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
