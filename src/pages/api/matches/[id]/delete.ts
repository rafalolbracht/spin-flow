import type { APIContext } from "astro";
import { supabaseClient, DEFAULT_USER_ID } from "../../../../db/supabase.client";
import { idParamSchema } from "../../../../lib/schemas/common.schemas";
import { deleteMatch } from "../../../../lib/services/match.service";
import {
  createNoContentResponse,
  createNotFoundResponse,
  createValidationErrorResponse,
  createInternalErrorResponse,
} from "../../../../lib/utils/api-response";
import { logError } from "../../../../lib/utils/logger";
import { NotFoundError, DatabaseError } from "../../../../lib/utils/api-errors";

export const prerender = false;

export async function DELETE(context: APIContext) {
  // 1. Supabase client + userId
  const supabase = supabaseClient;
  const userId = DEFAULT_USER_ID;

  // 2. Walidacja id
  const paramResult = idParamSchema.safeParse({ id: context.params.id });
  if (!paramResult.success) {
    return createValidationErrorResponse(paramResult.error);
  }

  const matchId = paramResult.data.id;

  // 3. Usunięcie meczu
  try {
    const deleted = await deleteMatch(supabase, userId, matchId);

    if (!deleted) {
      return createNotFoundResponse("Match not found");
    }

    return createNoContentResponse();
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createNotFoundResponse("Match not found");
    }
    if (error instanceof DatabaseError) {
      logError("DELETE /api/matches/{id}", error, { userId, matchId });
      return createInternalErrorResponse();
    }
    throw error;
  }
}

/**
 * DELETE /api/matches/{id}
 *
 * Trwałe usunięcie meczu wraz z powiązanymi danymi (sety, punkty, tagi punktów, raporty AI, publiczne udostępnienia).
 * Operacja nieodwracalna.
 *
 * Path Parameters:
 * - id: Match ID (integer, required)
 *
 * Response: 204 No Content (success)
 *
 * Error Responses:
 * - 404: Match not found or access denied
 * - 422: Invalid ID format
 * - 500: Internal server error
 *
 * @see .ai/api-implementation/delete-matches-id-implementation-plan.md
 */
