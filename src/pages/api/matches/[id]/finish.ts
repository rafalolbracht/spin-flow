/**
 * POST /api/matches/{id}/finish
 *
 * Finishes a match by updating its status to 'finished'.
 * Validates that the match is not already finished and handles AI report generation.
 *
 * @see .ai/api-implementation/post-matches-id-finish-implementation-plan.md
 */

import type { APIContext } from "astro";
import { requireAuth } from "../../../../lib/utils/auth-helpers";
import { finishMatchCommandSchema } from "../../../../lib/schemas/match.schemas";
import { idParamSchema } from "../../../../lib/schemas/common.schemas";
import { finishMatch } from "../../../../lib/services/match.service";
import { parseRequestBody } from "../../../../lib/utils/zod-helpers";
import {
  createSuccessResponse,
  createNotFoundResponse,
  createValidationErrorResponse,
  createErrorResponse,
  createInternalErrorResponse,
} from "../../../../lib/utils/api-response";
import { logError } from "../../../../lib/utils/logger";
import { NotFoundError, ApiError, DatabaseError } from "../../../../lib/utils/api-errors";

export const prerender = false;

export async function POST(context: APIContext) {
  // 1. Sprawdzenie autentykacji
  const userId = await requireAuth(context);
  if (userId instanceof Response) {
    return userId; // Zwróć błąd 401
  }

  // 2. Supabase client
  const supabase = context.locals.supabase;

  // Get runtime environment variables
  const runtimeEnv = context.locals.runtime?.env;

  // 2. Walidacja id
  const paramResult = idParamSchema.safeParse({ id: context.params.id });
  if (!paramResult.success) {
    return createValidationErrorResponse(paramResult.error);
  }

  const matchId = paramResult.data.id;

  // 3. Walidacja body
  const bodyResult = await parseRequestBody(context.request, finishMatchCommandSchema);
  if (!bodyResult.success) {
    // JSON parse error
    if (bodyResult.error instanceof Error) {
      return createErrorResponse("INVALID_JSON", bodyResult.error.message, 400);
    }
    // Zod validation error
    return createValidationErrorResponse(bodyResult.error);
  }

  const command = bodyResult.data;

  // 4. Zakończenie meczu
  try {
    const result = await finishMatch(supabase, userId, matchId, command, runtimeEnv);

    return createSuccessResponse(result);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createNotFoundResponse("Match not found");
    }
    if (error instanceof ApiError) {
      return createErrorResponse(error.code, error.message, error.statusCode);
    }
    if (error instanceof DatabaseError) {
      logError("POST /api/matches/{id}/finish", error, { userId, matchId, command });
      return createInternalErrorResponse();
    }
    throw error;
  }
}