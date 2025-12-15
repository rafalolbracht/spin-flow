/**
 * POST /api/analytics/events
 *
 * @see .ai/api-implementation/post-analytics-events-implementation-plan.md
 */

export const prerender = false;

import { supabaseClient } from "../../../db/supabase.client";
import { parseRequestBody } from "../../../lib/utils/zod-helpers";
import { createAnalyticsEventCommandSchema } from "../../../lib/schemas/analytics.schemas";
import { createAnalyticsEvent } from "../../../lib/services/analytics.service";
import {
  createSuccessResponse,
  createValidationErrorResponse,
  createInternalErrorResponse,
  createErrorResponse,
} from "../../../lib/utils/api-response";
import { DatabaseError } from "../../../lib/utils/api-errors";
import type { APIContext } from "astro";

export async function POST(context: APIContext) {
  // 1. Supabase client
  const supabase = supabaseClient;

  // 2. Walidacja body
  const result = await parseRequestBody(context.request, createAnalyticsEventCommandSchema);
  if (!result.success) {
    // JSON parse error
    if (result.error instanceof Error) {
      return createErrorResponse("INVALID_JSON", result.error.message, 400);
    }
    // Zod validation error
    return createValidationErrorResponse(result.error);
  }

  // 3. Utworzenie eventu
  try {
    const event = await createAnalyticsEvent(supabase, result.data);
    return createSuccessResponse(event, 201);
  } catch (error) {
    if (error instanceof DatabaseError) {
      return createInternalErrorResponse("Failed to create analytics event");
    }
    throw error;
  }
}