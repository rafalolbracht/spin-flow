import type { APIContext } from "astro";
import { requireAuth } from "../../../../lib/utils/auth-helpers";
import { idParamSchema } from "../../../../lib/schemas/common.schemas";
import { setsIncludeQuerySchema } from "../../../../lib/schemas/set.schemas";
import { getSetById } from "../../../../lib/services/set.service";
import { parseQueryParams } from "../../../../lib/utils/zod-helpers";
import {
  createSuccessResponse,
  createNotFoundResponse,
  createValidationErrorResponse,
  createInternalErrorResponse,
} from "../../../../lib/utils/api-response";
import { logError } from "../../../../lib/utils/logger";
import { DatabaseError } from "../../../../lib/utils/api-errors";

export const prerender = false;

export async function GET(context: APIContext) {
  // 1. Sprawdzenie autentykacji
  const userId = await requireAuth(context);
  if (userId instanceof Response) {
    return userId; // Zwróć błąd 401
  }

  // 2. Supabase client
  const supabase = context.locals.supabase;

  // 2. Walidacja id
  const paramResult = idParamSchema.safeParse({ id: context.params.id });
  if (!paramResult.success) {
    return createValidationErrorResponse(paramResult.error);
  }

  const setId = paramResult.data.id;

  // 3. Walidacja query params
  const queryResult = parseQueryParams(context.url.searchParams, setsIncludeQuerySchema);
  if (!queryResult.success) {
    return createValidationErrorResponse(queryResult.error);
  }

  // 4. Określenie flagi includePoints
  const includePoints =
    queryResult.data.include?.includes("points") || queryResult.data.include?.includes("tags") || false;

  // 5. Pobranie seta
  try {
    const set = await getSetById(supabase, userId, setId, includePoints);

    if (!set) {
      return createNotFoundResponse("Set not found");
    }

    return createSuccessResponse(set);
  } catch (error) {
    if (error instanceof DatabaseError) {
      logError("GET /api/sets/{id}", error, { userId, setId, include: queryResult.data.include });
      return createInternalErrorResponse();
    }
    throw error;
  }
}

/**
 * GET /api/sets/{id}
 *
 * Retrieves details of a single set by ID with optional lazy loading of points and tags.
 *
 * Path Parameters:
 * - id: Set ID (integer, required)
 *
 * Query Parameters:
 * - include: Comma-separated list of relations to load (optional)
 *   - "points": Include points in the set
 *   - "tags": Include tags on points (automatically includes points)
 *   - "points,tags": Include both points and tags
 *
 * Response: 200 OK
 * {
 *   data: {
 *     id: number,
 *     match_id: number,
 *     sequence_in_match: number,
 *     is_golden: boolean,
 *     set_score_player: number,
 *     set_score_opponent: number,
 *     winner: SideEnum | null,
 *     is_finished: boolean,
 *     coach_notes: string | null,
 *     finished_at: string | null,
 *     created_at: string,
 *     current_server: SideEnum | null,  // null dla zakończonych setów
 *     points?: PointWithTagsDto[]        // jeśli include zawiera "points" lub "tags"
 *   }
 * }
 *
 * Error Responses:
 * - 404: Set not found or access denied
 * - 422: Invalid ID format or include parameter
 * - 500: Internal server error
 *
 * @see .ai/api-implementation/get-sets-id-implementation-plan.md
 */
