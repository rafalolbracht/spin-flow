import type { APIContext } from "astro";
import { createErrorResponse } from "./api-response";

/**
 * Sprawdza autentykację i zwraca user ID lub odpowiedź błędu
 */
export async function requireAuth(
  context: APIContext,
): Promise<string | Response> {
  const userId = await context.locals.getUserId();

  if (!userId) {
    return createErrorResponse("UNAUTHORIZED", "Authentication required", 401);
  }

  return userId;
}

/**
 * Sprawdza czy użytkownik jest właścicielem zasobu
 */
export async function requireOwnership(
  context: APIContext,
  resourceUserId: string,
): Promise<true | Response> {
  const userId = await context.locals.getUserId();

  if (!userId) {
    return createErrorResponse("UNAUTHORIZED", "Authentication required", 401);
  }

  if (userId !== resourceUserId) {
    return createErrorResponse("FORBIDDEN", "Access denied", 403);
  }

  return true;
}


