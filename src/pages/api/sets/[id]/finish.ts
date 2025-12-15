/**
 * POST /api/sets/{id}/finish
 *
 * Finishes a set and automatically creates the next set.
 * Validates that the set is not already finished, match is in progress, and score is not tied.
 * Updates match sets won counts and creates next set with proper serving rules.
 *
 * @see .ai/api-implementation/post-sets-id-finish-implementation-plan.md
 */

import type { APIContext } from "astro";
import { supabaseClient, DEFAULT_USER_ID } from "../../../../db/supabase.client";
import { finishSetCommandSchema } from "../../../../lib/schemas/set.schemas";
import { idParamSchema } from "../../../../lib/schemas/common.schemas";
import { finishSet } from "../../../../lib/services/set.service";
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
  // 1. Supabase client + userId
  const supabase = supabaseClient;
  const userId = DEFAULT_USER_ID;

  // 2. Walidacja id
  const paramResult = idParamSchema.safeParse({ id: context.params.id });
  if (!paramResult.success) {
    return createValidationErrorResponse(paramResult.error);
  }

  const setId = paramResult.data.id;

  // 3. Walidacja body
  const bodyResult = await parseRequestBody(context.request, finishSetCommandSchema);
  if (!bodyResult.success) {
    // JSON parse error
    if (bodyResult.error instanceof Error) {
      return createErrorResponse("INVALID_JSON", bodyResult.error.message, 400);
    }
    // Zod validation error
    return createValidationErrorResponse(bodyResult.error);
  }

  const command = bodyResult.data;

  // 4. Zakończenie seta
  try {
    const result = await finishSet(supabase, userId, setId, command);

    if (!result) {
      return createNotFoundResponse("Set not found");
    }

    return createSuccessResponse(result);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createNotFoundResponse("Set not found");
    }
    if (error instanceof ApiError) {
      return createErrorResponse(error.code, error.message, error.statusCode);
    }
    if (error instanceof DatabaseError) {
      logError("POST /api/sets/{id}/finish", error, { userId, setId, command });
      return createInternalErrorResponse();
    }
    throw error;
  }
}
