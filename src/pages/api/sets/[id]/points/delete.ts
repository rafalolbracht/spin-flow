/**
 * DELETE /api/sets/{id}/points/delete
 *
 * @see .ai/api-implementation/delete-sets-setId-points-last-implementation-plan.md
 */

import type { APIContext } from "astro";
import { supabaseClient, DEFAULT_USER_ID } from "../../../../../db/supabase.client";
import { idParamSchema } from "../../../../../lib/schemas/common.schemas";
import { undoLastPoint } from "../../../../../lib/services/point.service";
import {
  createSuccessResponse,
  createValidationErrorResponse,
  createNotFoundResponse,
  createErrorResponse,
  createInternalErrorResponse,
} from "../../../../../lib/utils/api-response";
import { logError } from "../../../../../lib/utils/logger";
import { NotFoundError, ApiError, DatabaseError } from "../../../../../lib/utils/api-errors";

export const prerender = false;

export async function DELETE(context: APIContext) {
  // 1. Supabase client + userId
  const supabase = supabaseClient;
  const userId = DEFAULT_USER_ID;

  // 2. Walidacja setId
  const paramResult = idParamSchema.safeParse({ id: context.params.id });
  if (!paramResult.success) {
    return createValidationErrorResponse(paramResult.error);
  }

  const setId = paramResult.data.id;

  // 3. Cofnięcie punktu
  try {
    const result = await undoLastPoint(supabase, userId, setId);

    return createSuccessResponse(result);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createNotFoundResponse("Set not found");
    }
    if (error instanceof ApiError) {
      return createErrorResponse(error.code, error.message, error.statusCode);
    }
    if (error instanceof DatabaseError) {
      logError("DELETE /api/sets/{id}/points/delete", error, { userId, setId });
      return createInternalErrorResponse();
    }
    throw error;
  }
}