import type { APIContext } from "astro";
import { supabaseClient, DEFAULT_USER_ID } from "../../../../db/supabase.client";
import { setsIncludeQuerySchema } from "../../../../lib/schemas/set.schemas";
import { idParamSchema } from "../../../../lib/schemas/common.schemas";
import { getMatchById } from "../../../../lib/services/match.service";
import { getSetsByMatchId } from "../../../../lib/services/set.service";
import { parseQueryParams } from "../../../../lib/utils/zod-helpers";
import {
  createListResponse,
  createNotFoundResponse,
  createValidationErrorResponse,
  createInternalErrorResponse,
} from "../../../../lib/utils/api-response";
import { logError } from "../../../../lib/utils/logger";
import { NotFoundError, DatabaseError } from "../../../../lib/utils/api-errors";

export const prerender = false;

export async function GET(context: APIContext) {
  // 1. Supabase client + userId
  const supabase = supabaseClient;
  const userId = DEFAULT_USER_ID;

  // 2. Walidacja matchId
  const paramResult = idParamSchema.safeParse({ id: context.params.id });
  if (!paramResult.success) {
    return createValidationErrorResponse(paramResult.error);
  }

  const matchId = paramResult.data.id;

  // 3. Walidacja query params
  const queryResult = parseQueryParams(context.url.searchParams, setsIncludeQuerySchema);
  if (!queryResult.success) {
    return createValidationErrorResponse(queryResult.error);
  }

  // 4. Weryfikacja ownership meczu
  try {
    const match = await getMatchById(supabase, userId, matchId, undefined);

    if (!match) {
      return createNotFoundResponse("Match not found");
    }

    // 5. Określenie flagi includePoints
    const includePoints =
      queryResult.data.include?.includes("points") || queryResult.data.include?.includes("tags") || false;

    // 6. Pobranie setów
    const sets = await getSetsByMatchId(supabase, userId, matchId, includePoints);

    return createListResponse(sets);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createNotFoundResponse("Match not found");
    }
    if (error instanceof DatabaseError) {
      logError("GET /api/matches/{id}/sets", error, { userId, matchId, include: queryResult.data.include });
      return createInternalErrorResponse();
    }
    throw error;
  }
}

/**
 * GET /api/matches/{id}/sets
 *
 * Retrieves all sets for a specific match, sorted by sequence_in_match.
 *
 * Path Parameters:
 * - id: Match ID (integer, required)
 *
 * Query Parameters:
 * - include: Comma-separated list of relations to load (optional)
 *   - "points": Include points with tags for each set
 *   - "tags": Include points with tags for each set (same as "points")
 *
 * Response: 200 OK
 * {
 *   data: SetDetailDto[]  // Array of sets, empty array if no sets exist
 * }
 *
 * SetDetailDto includes:
 * - id, match_id, sequence_in_match, is_golden, set_score_player, set_score_opponent
 * - winner, is_finished, coach_notes, finished_at, created_at
 * - points?: PointWithTagsDto[]  // Only if include contains "points" or "tags"
 *
 * Error Responses:
 * - 404: Match not found or access denied (same message for both)
 * - 422: Invalid matchId format or invalid include parameter
 * - 500: Internal server error
 *
 * @see .ai/api-implementation/get-matches-matchId-sets-implementation-plan.md
 */

