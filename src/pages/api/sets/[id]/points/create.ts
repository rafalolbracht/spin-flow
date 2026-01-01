import type { APIContext } from "astro";
import { requireAuth } from "../../../../../lib/utils/auth-helpers";
import { idParamSchema } from "../../../../../lib/schemas/common.schemas";
import { createPointCommandSchema } from "../../../../../lib/schemas/point.schemas";
import { createPoint } from "../../../../../lib/services/point.service";
import { parseRequestBody } from "../../../../../lib/utils/zod-helpers";
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

export async function POST(context: APIContext) {
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

  // 3. Walidacja body
  const bodyResult = await parseRequestBody(context.request, createPointCommandSchema);
  if (!bodyResult.success) {
    // JSON parse error
    if (bodyResult.error instanceof Error) {
      return createErrorResponse("INVALID_JSON", bodyResult.error.message, 400);
    }
    // Zod validation error
    return createValidationErrorResponse(bodyResult.error);
  }

  const command = bodyResult.data;

  // 4. Utworzenie punktu
  try {
    const result = await createPoint(supabase, userId, setId, command.scored_by, command.tag_ids || []);

    return createSuccessResponse(result, 201);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createNotFoundResponse("Set not found");
    }
    if (error instanceof ApiError) {
      return createErrorResponse(error.code, error.message, error.statusCode);
    }
    if (error instanceof DatabaseError) {
      logError("POST /api/sets/{id}/points/create", error, { userId, setId, command });
      return createInternalErrorResponse();
    }
    throw error;
  }
}
