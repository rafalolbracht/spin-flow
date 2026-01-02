/**
 * GET /api/public/matches/{token}
 *
 * @see .ai/api-implementation/get-public-matches-token-implementation-plan.md
 */

import type { APIContext } from "astro";
import { createSupabaseClient } from "../../../../db/supabase.client";
import { tokenParamSchema } from "../../../../lib/schemas/common.schemas";
import { getPublicMatchByToken } from "../../../../lib/services/public-match.service";
import {
  createSuccessResponse,
  createNotFoundResponse,
  createInternalErrorResponse,
} from "../../../../lib/utils/api-response";
import { logError } from "../../../../lib/utils/logger";
import { NotFoundError } from "../../../../lib/utils/api-errors";

export const prerender = false;

export async function GET(context: APIContext) {
  // Get runtime environment variables
  const runtimeEnv = context.locals.runtime?.env;
  
  // 1. Supabase client (bez userId - endpoint publiczny)
  const supabase = createSupabaseClient(runtimeEnv);

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
    if (error instanceof NotFoundError) {
      return createNotFoundResponse("Shared match not found");
    }
    // Log tylko błędy 500, nie 404
    logError("GET /api/public/matches/{token}", error as Error, { token: tokenResult.data.token?.substring(0, 8) + "..." });
    return createInternalErrorResponse();
  }
}