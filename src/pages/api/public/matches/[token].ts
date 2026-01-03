/**
 * GET /api/public/matches/{token}
 *
 * @see .ai/api-implementation/get-public-matches-token-implementation-plan.md
 */

import type { APIContext } from "astro";
import { createSupabaseServiceClient } from "../../../../db/supabase.client";
import { tokenParamSchema } from "../../../../lib/schemas/common.schemas";
import { getPublicMatchByToken } from "../../../../lib/services/public-match.service";
import {
  createSuccessResponse,
  createNotFoundResponse,
  createInternalErrorResponse,
} from "../../../../lib/utils/api-response";
import { logError } from "../../../../lib/utils/logger";
import { ApiError } from "../../../../lib/utils/api-errors";

export const prerender = false;

export async function GET(context: APIContext) {
  // Get runtime environment variables
  const runtimeEnv = context.locals.runtime?.env;
  
  // 1. Supabase client (service role - dla publicznego dostępu bez RLS)
  const supabase = createSupabaseServiceClient(runtimeEnv);

  // 2. Walidacja tokenu (path param)
  const tokenResult = tokenParamSchema.safeParse({ token: context.params.token });
  if (!tokenResult.success) {
    return createNotFoundResponse("Shared match not found");
  }

  // 3. Pobranie danych meczu
  try {
    const matchData = await getPublicMatchByToken(supabase, tokenResult.data.token);

    if (!matchData) {
      return createNotFoundResponse("Shared match not found");
    }

    return createSuccessResponse(matchData);
  } catch (error) {
    // Obsługa ApiError (w tym NotFoundError z kodem 404)
    if (error instanceof ApiError) {
      if (error.statusCode === 404) {
        return createNotFoundResponse("Shared match not found");
      }
    }
    // Log tylko błędy 500, nie 404
    logError("GET /api/public/matches/{token}", error as Error, { token: tokenResult.data.token?.substring(0, 8) + "..." });
    return createInternalErrorResponse();
  }
}