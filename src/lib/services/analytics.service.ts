import type { SupabaseClient } from "../../db/supabase.client";
import type {
  AnalyticsEventTypeEnum,
  CreateAnalyticsEventCommandDto,
  AnalyticsEvent,
} from "../../types";
import { DatabaseError } from "../utils/api-errors";
import { logWarning } from "../utils/logger";

/**
 * Track an analytics event (fire-and-forget)
 * This function should be called without await to avoid blocking the main operation
 * @param supabase - Supabase client
 * @param userId - User ID (DEFAULT_USER_ID in development)
 * @param type - Type of analytics event
 * @param matchId - Optional match ID for match-related events
 */
export async function trackEvent(
  supabase: SupabaseClient,
  userId: string,
  type: AnalyticsEventTypeEnum,
  matchId?: number | null,
): Promise<void> {
  try {
    // Fire-and-forget: don't block the caller
    await supabase
      .from("analytics_events")
      .insert({
        user_id: userId,
        type,
        match_id: matchId,
        created_at: new Date().toISOString(),
      });
  } catch (error) {
    // Log warning but don't throw - this is fire-and-forget
    logWarning(
      "analytics.service.trackEvent",
      `Failed to track analytics event: ${error instanceof Error ? error.message : String(error)}`,
      { userId, type, matchId },
    );
  }
}

/**
 * Create an analytics event (internal API)
 * This function throws errors and should be used in API endpoints
 * @param supabase - Supabase client
 * @param command - Analytics event creation command
 * @returns Created analytics event
 */
export async function createAnalyticsEvent(
  supabase: SupabaseClient,
  command: CreateAnalyticsEventCommandDto,
): Promise<AnalyticsEvent> {
  const { data, error } = await supabase
    .from("analytics_events")
    .insert({
      user_id: command.user_id,
      type: command.type,
      match_id: command.match_id,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new DatabaseError();
  }

  return data;
}
