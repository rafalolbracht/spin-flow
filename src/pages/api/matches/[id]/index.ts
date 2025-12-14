import type { APIContext } from "astro";
import { supabaseClient, DEFAULT_USER_ID } from "../../../../db/supabase.client";
import { includeQuerySchema } from "../../../../lib/schemas/match.schemas";
import { idParamSchema } from "../../../../lib/schemas/common.schemas";
import { getMatchById } from "../../../../lib/services/match.service";
import { parseQueryParams } from "../../../../lib/utils/zod-helpers";
import {
  createSuccessResponse,
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

  // 2. Walidacja path param
  const paramResult = idParamSchema.safeParse({ id: context.params.id });
  if (!paramResult.success) {
    return createValidationErrorResponse(paramResult.error);
  }

  const matchId = paramResult.data.id;

  // 3. Walidacja query param
  const queryResult = parseQueryParams(context.url.searchParams, includeQuerySchema);
  if (!queryResult.success) {
    return createValidationErrorResponse(queryResult.error);
  }

  const { include } = queryResult.data;

  // 4. Pobranie meczu
  try {
    const match = await getMatchById(supabase, userId, matchId, include);

    if (!match) {
      return createNotFoundResponse("Match not found");
    }

    return createSuccessResponse(match, 200);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createNotFoundResponse("Match not found");
    }
    if (error instanceof DatabaseError) {
      logError("GET /api/matches/{id}", error, { userId, matchId, include });
      return createInternalErrorResponse();
    }
    throw error;
  }
}

/**
 * GET /api/matches/{id}
 *
 * Retrieves details of a single match by ID with optional lazy loading of relations.
 *
 * Path Parameters:
 * - id: Match ID (integer, required)
 *
 * Query Parameters:
 * - include: Comma-separated list of relations to load (optional)
 *   - "sets": Include match sets
 *   - "points": Include points in sets (automatically includes sets)
 *   - "tags": Include tags on points (automatically includes sets and points)
 *   - "ai_report": Include AI analysis report
 *
 * Response: 200 OK
 * {
 *   data: {
 *     id: number,
 *     player_name: string,
 *     opponent_name: string,
 *     // ... other match fields
 *     current_set: CurrentSetDto | null,  // automatically included
 *     sets?: SetDetailDto[],            // if include=sets
 *     ai_report?: AiReportDto | null     // if include=ai_report
 *   }
 * }
 *
 * Error Responses:
 * - 404: Match not found or access denied
 * - 422: Invalid ID format or include parameter
 * - 500: Internal server error
 *
 * @see .ai/api-implementation/get-matches-id-implementation-plan.md
 */
