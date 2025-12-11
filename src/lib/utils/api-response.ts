import { z } from "zod";
import type { ValidationErrorDetail } from "../../types";
import { zodErrorToValidationDetails } from "./zod-helpers";

/**
 * Private helper function to create JSON responses
 * @param body - Response body object
 * @param status - HTTP status code
 * @returns Response object
 */
function createJsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Creates a success response for a single item
 * @param data - The data to return
 * @param status - HTTP status code (default: 200)
 * @returns Response with { data: T }
 */
export function createSuccessResponse<T>(data: T, status = 200): Response {
  return createJsonResponse({ data }, status);
}

/**
 * Creates a response for a list without pagination
 * @param data - Array of items
 * @param status - HTTP status code (default: 200)
 * @returns Response with { data: T[] }
 */
export function createListResponse<T>(data: T[], status = 200): Response {
  return createJsonResponse({ data }, status);
}

/**
 * Creates a response for a paginated list
 * @param data - Array of items for current page
 * @param total - Total number of items across all pages
 * @param status - HTTP status code (default: 200)
 * @returns Response with { data: T[], pagination: { total } }
 */
export function createPaginatedResponse<T>(data: T[], total: number, status = 200): Response {
  return createJsonResponse({ data, pagination: { total } }, status);
}

/**
 * Creates an error response
 * @param code - Error code
 * @param message - Error message
 * @param status - HTTP status code
 * @param details - Optional validation error details
 * @returns Response with { error: { code, message, details? } }
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number,
  details?: ValidationErrorDetail[],
): Response {
  const errorBody = details
    ? { error: { code, message, details } }
    : { error: { code, message } };
  return createJsonResponse(errorBody, status);
}

/**
 * Creates a validation error response from ZodError
 * @param zodError - Zod validation error
 * @returns Response with validation error details
 */
export function createValidationErrorResponse(zodError: z.ZodError): Response {
  const details = zodErrorToValidationDetails(zodError);
  return createErrorResponse("VALIDATION_ERROR", "Validation failed", 422, details);
}

/**
 * Creates an unauthorized error response (401)
 * @param message - Optional custom message
 * @returns 401 Unauthorized response
 */
export function createUnauthorizedResponse(message?: string): Response {
  return createErrorResponse(
    "UNAUTHORIZED",
    message || "Missing or invalid authentication token",
    401,
  );
}

/**
 * Creates a not found error response (404)
 * @param message - Optional custom message
 * @returns 404 Not Found response
 */
export function createNotFoundResponse(message?: string): Response {
  return createErrorResponse("NOT_FOUND", message || "Resource not found", 404);
}

/**
 * Creates an internal server error response (500)
 * @param message - Optional custom message
 * @returns 500 Internal Server Error response
 */
export function createInternalErrorResponse(message?: string): Response {
  return createErrorResponse(
    "INTERNAL_ERROR",
    message || "An unexpected error occurred",
    500,
  );
}

/**
 * Creates a no content response (204)
 * @returns 204 No Content response
 */
export function createNoContentResponse(): Response {
  return new Response(null, { status: 204 });
}
