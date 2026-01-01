import type { APIContext } from "astro";
import { requireAuth } from "../../../lib/utils/auth-helpers";
import { createMatchCommandSchema } from "../../../lib/schemas/match.schemas";
import { createMatch } from "../../../lib/services/match.service";
import { parseRequestBody } from "../../../lib/utils/zod-helpers";
import {
  createValidationErrorResponse,
  createSuccessResponse,
  createErrorResponse,
  createInternalErrorResponse,
} from "../../../lib/utils/api-response";
import { logError } from "../../../lib/utils/logger";
import { DatabaseError } from "../../../lib/utils/api-errors";

export const prerender = false;

export async function POST(context: APIContext) {
  // 1. Sprawdzenie autentykacji
  const userId = await requireAuth(context);
  if (userId instanceof Response) {
    return userId; // Zwróć błąd 401
  }

  // 2. Supabase client
  const supabase = context.locals.supabase;

  // 2. Walidacja body
  const bodyResult = await parseRequestBody(context.request, createMatchCommandSchema);
  if (!bodyResult.success) {
    // JSON parse error
    if (bodyResult.error instanceof Error) {
      return createErrorResponse("INVALID_JSON", bodyResult.error.message, 400);
    }
    // Zod validation error
    return createValidationErrorResponse(bodyResult.error);
  }

  const command = bodyResult.data;

  // 3. Utworzenie meczu
  try {
    const result = await createMatch(supabase, userId, command);
    return createSuccessResponse(result, 201);
  } catch (error) {
    if (error instanceof DatabaseError) {
      logError("POST /api/matches", error, { userId, command });
      return createInternalErrorResponse();
    }
    throw error;
  }
}
