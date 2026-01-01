/**
 * GET /api/matches/{id}/ai-report
 *
 * @see .ai/api-implementation/get-matches-matchId-ai-report-implementation-plan.md
 */

import type { APIContext } from "astro";
import { requireAuth } from "../../../../lib/utils/auth-helpers";
import { idParamSchema } from "../../../../lib/schemas/common.schemas";
import { getMatchById } from "../../../../lib/services/match.service";
import { getAiReportByMatchId } from "../../../../lib/services/ai.service";
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

  // 2. Walidacja matchId
  const paramResult = idParamSchema.safeParse({ id: context.params.id });
  if (!paramResult.success) {
    return createValidationErrorResponse(paramResult.error);
  }

  const matchId = paramResult.data.id;

  // 3. Pobranie AI report
  try {
    const report = await getAiReportByMatchId(supabase, userId, matchId);

    if (!report) {
      // Service zwraca null dla 3 scenariuszy - endpoint musi rozróżnić
      const match = await getMatchById(supabase, userId, matchId, undefined);

      if (!match) {
        return createNotFoundResponse("Match not found");
      }

      if (!match.generate_ai_summary) {
        return createNotFoundResponse("AI report not available for this match");
      }

      // Mecz istnieje i ma flagę, ale brak rekordu AI - data inconsistency
      return createNotFoundResponse("AI report not found");
    }

    return createSuccessResponse(report);
  } catch (error) {
    if (error instanceof DatabaseError) {
      logError("GET /api/matches/{matchId}/ai-report", error, { userId, matchId });
      return createInternalErrorResponse();
    }
    throw error;
  }
}

/**
 * GET /api/matches/{id}/ai-report
 *
 * Retrieves the AI-generated analysis report for a finished match.
 * Only available for matches where generate_ai_summary = true.
 *
 * Path Parameters:
 * - id: Match ID (integer, required)
 *
 * Response: 200 OK
 * {
 *   data: {
 *     id: number,
 *     match_id: number,
 *     ai_status: 'pending' | 'success' | 'error',
 *     ai_summary: string | null,
 *     ai_recommendations: string | null,
 *     ai_error: string | null,
 *     ai_generated_at: string | null,
 *     created_at: string
 *   }
 * }
 *
 * Error Responses:
 * - 404: Match not found, access denied, or AI report not available
 * - 422: Invalid ID format
 * - 500: Internal server error
 */