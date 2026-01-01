import type { APIContext } from "astro";
import { requireAuth } from "../../../../../lib/utils/auth-helpers";
import { idParamSchema } from "../../../../../lib/schemas/common.schemas";
import { pointsIncludeQuerySchema } from "../../../../../lib/schemas/point.schemas";
import { getPointsBySetId } from "../../../../../lib/services/point.service";
import { parseQueryParams } from "../../../../../lib/utils/zod-helpers";
import {
  createListResponse,
  createNotFoundResponse,
  createValidationErrorResponse,
  createInternalErrorResponse,
} from "../../../../../lib/utils/api-response";
import { logError } from "../../../../../lib/utils/logger";
import { DatabaseError } from "../../../../../lib/utils/api-errors";

export const prerender = false;

export async function GET(context: APIContext) {
  // 1. Sprawdzenie autentykacji
  const userId = await requireAuth(context);
  if (userId instanceof Response) {
    return userId; // Zwróć błąd 401
  }

  // 2. Supabase client
  const supabase = context.locals.supabase;

  // 2. Walidacja setId
  const paramResult = idParamSchema.safeParse({ id: context.params.id });
  if (!paramResult.success) {
    return createValidationErrorResponse(paramResult.error);
  }

  const setId = paramResult.data.id;

  // 3. Walidacja query param (opcjonalne, ale zachowane dla zgodności)
  const queryResult = parseQueryParams(context.url.searchParams, pointsIncludeQuerySchema);
  if (!queryResult.success) {
    return createValidationErrorResponse(queryResult.error);
  }

  // 4. Pobranie punktów
  try {
    const points = await getPointsBySetId(supabase, userId, setId);

    if (!points) {
      return createNotFoundResponse("Set not found");
    }

    return createListResponse(points);
  } catch (error) {
    if (error instanceof DatabaseError) {
      logError("GET /api/sets/{id}/points", error, { userId, setId });
      return createInternalErrorResponse();
    }
    throw error;
  }
}

/**
 * GET /api/sets/{id}/points
 *
 * Retrieves all points for a specific set with tags always included.
 *
 * Path Parameters:
 * - id: Set ID (integer, required)
 *
 * Query Parameters:
 * - include: Value "tags" (optional, maintained for API consistency)
 *   Note: Tags are always loaded regardless of this parameter
 *
 * Response: 200 OK
 * {
 *   data: PointWithTagsDto[]
 * }
 *
 * PointWithTagsDto:
 * {
 *   id: number,
 *   set_id: number,
 *   sequence_in_set: number,
 *   scored_by: SideEnum,
 *   served_by: SideEnum,
 *   created_at: string,
 *   tags: string[]  // Tag names (not IDs)
 * }
 *
 * Error Responses:
 * - 404: Set not found or access denied (same message for both)
 * - 422: Invalid setId format or include parameter
 * - 500: Internal server error
 *
 * Points are sorted by sequence_in_set ASC (chronological order).
 * Tags are always loaded for performance optimization.
 *
 * @see .ai/api-implementation/get-sets-setId-points-implementation-plan.md
 */
