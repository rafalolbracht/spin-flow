import type { APIContext } from "astro";
import { requireAuth } from "../../../lib/utils/auth-helpers";
import { matchListQuerySchema } from "../../../lib/schemas/match.schemas";
import { getMatchesPaginated } from "../../../lib/services/match.service";
import { parseQueryParams } from "../../../lib/utils/zod-helpers";
import {
  createPaginatedResponse,
  createValidationErrorResponse,
  createInternalErrorResponse,
} from "../../../lib/utils/api-response";
import { logError } from "../../../lib/utils/logger";
import { DatabaseError } from "../../../lib/utils/api-errors";

export const prerender = false;

export async function GET(context: APIContext) {
  // 1. Sprawdzenie autentykacji
  const userId = await requireAuth(context);
  if (userId instanceof Response) {
    return userId; // Zwróć błąd 401
  }

  // 2. Supabase client
  const supabase = context.locals.supabase;

  // 2. Walidacja query params
  const queryResult = parseQueryParams(context.url.searchParams, matchListQuerySchema);
  if (!queryResult.success) {
    return createValidationErrorResponse(queryResult.error);
  }

  const query = queryResult.data;

  // 3. Pobranie meczów z paginacją
  try {
    const result = await getMatchesPaginated(supabase, userId, {
      page: query.page as number,
      limit: query.limit as number,
      player_name: query.player_name,
      opponent_name: query.opponent_name,
      status: query.status,
      sort: query.sort as string,
    });
    return createPaginatedResponse(result.data, result.pagination.total, 200);
  } catch (error) {
    if (error instanceof DatabaseError) {
      logError("GET /api/matches", error, { userId, query });
      return createInternalErrorResponse();
    }
    throw error;
  }
}