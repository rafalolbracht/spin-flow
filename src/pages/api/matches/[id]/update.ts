import type { APIContext } from "astro";
import { requireAuth, requireOwnership } from "../../../../lib/utils/auth-helpers";
import { updateMatchCommandSchema } from "../../../../lib/schemas/match.schemas";
import { idParamSchema } from "../../../../lib/schemas/common.schemas";
import { updateMatch } from "../../../../lib/services/match.service";
import { parseRequestBody } from "../../../../lib/utils/zod-helpers";
import {
  createSuccessResponse,
  createNotFoundResponse,
  createValidationErrorResponse,
  createErrorResponse,
  createInternalErrorResponse,
} from "../../../../lib/utils/api-response";
import { logError } from "../../../../lib/utils/logger";
import { NotFoundError, DatabaseError } from "../../../../lib/utils/api-errors";

export const prerender = false;

export async function PATCH(context: APIContext) {
  // 1. Sprawdzenie autentykacji
  const userId = await requireAuth(context);
  if (userId instanceof Response) {
    return userId; // Zwróć błąd 401
  }

  // 2. Supabase client
  const supabase = context.locals.supabase;

  // 3. Walidacja id
  const paramResult = idParamSchema.safeParse({ id: context.params.id });
  if (!paramResult.success) {
    return createValidationErrorResponse(paramResult.error);
  }

  const matchId = paramResult.data.id;

  // 3. Walidacja body
  const bodyResult = await parseRequestBody(context.request, updateMatchCommandSchema);
  if (!bodyResult.success) {
    // JSON parse error
    if (bodyResult.error instanceof Error) {
      return createErrorResponse("INVALID_JSON", bodyResult.error.message, 400);
    }
    // Zod validation error
    return createValidationErrorResponse(bodyResult.error);
  }

  const command = bodyResult.data;

  // 4. Sprawdzenie ownership
  const ownershipCheck = await requireOwnership(context, userId);
  if (ownershipCheck instanceof Response) {
    return ownershipCheck; // Zwróć błąd 403
  }

  // 5. Aktualizacja meczu
  try {
    const result = await updateMatch(supabase, userId, matchId, command);

    if (!result) {
      return createNotFoundResponse("Match not found");
    }

    return createSuccessResponse(result);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createNotFoundResponse("Match not found");
    }
    if (error instanceof DatabaseError) {
      logError("PATCH /api/matches/{id}", error, { userId, matchId, command });
      return createInternalErrorResponse();
    }
    throw error;
  }
}

/**
 * PATCH /api/matches/{id}
 *
 * Updates match metadata (partial update). Only allows updating specific fields.
 * Cannot modify sets, points, or match status.
 *
 * @see .ai/api-implementation/patch-matches-id-implementation-plan.md
 */
