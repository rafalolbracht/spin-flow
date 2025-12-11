/* eslint-disable no-console */
/**
 * Simple logger utility for API endpoints
 * Uses console methods with consistent formatting
 */

/**
 * Logs an error message with optional context
 * @param endpoint - API endpoint name (e.g., "POST /api/matches")
 * @param error - Error object to log
 * @param context - Optional additional context data
 */
export function logError(
  endpoint: string,
  error: Error,
  context?: Record<string, unknown>,
): void {
  const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : "";
  console.error(`[${endpoint}] ERROR: ${error.message}${contextStr}`, error);
}

/**
 * Logs a warning message with optional context
 * @param endpoint - API endpoint name (e.g., "POST /api/matches")
 * @param message - Warning message
 * @param context - Optional additional context data
 */
export function logWarning(
  endpoint: string,
  message: string,
  context?: Record<string, unknown>,
): void {
  const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : "";
  console.warn(`[${endpoint}] WARNING: ${message}${contextStr}`);
}

/**
 * Logs an info message with optional context
 * @param endpoint - API endpoint name (e.g., "POST /api/matches")
 * @param message - Info message
 * @param context - Optional additional context data
 */
export function logInfo(
  endpoint: string,
  message: string,
  context?: Record<string, unknown>,
): void {
  const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : "";
  console.log(`[${endpoint}] INFO: ${message}${contextStr}`);
}
