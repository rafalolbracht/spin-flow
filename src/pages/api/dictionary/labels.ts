import type { APIContext } from "astro";
import { createSupabaseClient } from "../../../db/supabase.client";
import { dictionaryQuerySchema } from "../../../lib/schemas/dictionary.schemas";
import { getDictionaryLabels } from "../../../lib/services/dictionary.service";
import { parseQueryParams } from "../../../lib/utils/zod-helpers";
import {
  createListResponse,
  createValidationErrorResponse,
  createInternalErrorResponse,
} from "../../../lib/utils/api-response";
import { DatabaseError } from "../../../lib/utils/api-errors";

/**
 * GET /api/dictionary/labels
 *
 * Pobieranie etykiet UI dla enumów i wartości słownikowych
 * Endpoint publiczny - nie wymaga uwierzytelniania
 *
 * @see .ai/api-implementation/get-dictionary-labels-implementation-plan.md
 */
export const prerender = false;

export async function GET(context: APIContext) {
  // Get runtime environment variables
  const runtimeEnv = context.locals.runtime?.env;
  
  // 1. Supabase client (bez userId - endpoint publiczny)
  const supabase = createSupabaseClient(runtimeEnv);

  // 2. Walidacja query params
  const result = parseQueryParams(context.url.searchParams, dictionaryQuerySchema);
  if (!result.success) {
    return createValidationErrorResponse(result.error);
  }

  // 3. Pobranie etykiet
  try {
    const labels = await getDictionaryLabels(supabase, result.data.domain);
    return createListResponse(labels);
  } catch (error) {
    if (error instanceof DatabaseError) {
      return createInternalErrorResponse("Failed to retrieve dictionary labels");
    }
    throw error;
  }
}
