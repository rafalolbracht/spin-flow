import { z } from "zod";
import type { ValidationErrorDetail } from "../../types";

/**
 * Converts URLSearchParams to a plain object
 * @param searchParams - URL search parameters
 * @returns Plain object with string values
 */
export function searchParamsToObject(searchParams: URLSearchParams): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    result[key] = value;
  }
  return result;
}

/**
 * Converts Zod validation errors to ValidationErrorDetail array
 * @param error - ZodError instance
 * @returns Array of validation error details
 */
export function zodErrorToValidationDetails(error: z.ZodError): ValidationErrorDetail[] {
  return error.errors.map((err) => ({
    field: err.path.join("."),
    message: err.message,
  }));
}

/**
 * Parses and validates query parameters using Zod schema
 * @param searchParams - URL search parameters
 * @param schema - Zod validation schema
 * @returns Validation result with success/error
 */
export function parseQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>,
): { success: true; data: T } | { success: false; error: z.ZodError } {
  try {
    const obj = searchParamsToObject(searchParams);
    const data = schema.parse(obj);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }
    throw error; // Re-throw unexpected errors
  }
}

/**
 * Parses and validates request body using Zod schema
 * @param request - Request object
 * @param schema - Zod validation schema
 * @returns Promise with validation result
 */
export async function parseRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>,
): Promise<{ success: true; data: T } | { success: false; error: z.ZodError | Error }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }
    if (error instanceof Error) {
      return { success: false, error };
    }
    // Handle non-Error exceptions (like SyntaxError from JSON.parse)
    return { success: false, error: new Error(String(error)) };
  }
}
