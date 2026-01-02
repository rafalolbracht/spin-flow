/**
 * POST /api/matches/{id}/share
 *
 * Generates or retrieves a public share link for a finished match.
 * The endpoint is idempotent - multiple calls return the same share link.
 *
 * @see .ai/api-implementation/post-matches-matchId-share-implementation-plan.md
 */

import type { APIContext } from "astro";
import { requireAuth } from "../../../../lib/utils/auth-helpers";
import { idParamSchema } from "../../../../lib/schemas/common.schemas";
import { createOrGetPublicShare } from "../../../../lib/services/share.service";
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

  // 2. Walidacja matchId
  const paramResult = idParamSchema.safeParse({ id: context.params.id });
  if (!paramResult.success) {
    return createValidationErrorResponse(paramResult.error);
  }

  const matchId = paramResult.data.id;

  // 3. Utworzenie lub pobranie linku udostępniania
  try {
    const result = await createOrGetPublicShare(supabase, userId, matchId, runtimeEnv);

    const statusCode = result.isNew ? 201 : 200;
    return createSuccessResponse(result.dto, statusCode);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createNotFoundResponse("Match not found");
    }
    if (error instanceof ApiError) {
      return createErrorResponse(error.code, error.message, error.statusCode);
    }
    if (error instanceof DatabaseError) {
      logError("POST /api/matches/{id}/share", error, { userId, matchId });
      return createInternalErrorResponse();
    }
    throw error;
  }
}
