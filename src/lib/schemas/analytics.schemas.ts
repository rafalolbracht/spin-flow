import { z } from "zod";
import { ANALYTICS_EVENT_TYPE_VALUES } from "../../types";

/**
 * Schema for creating analytics events
 * Uses refine to validate that match_id is required for match-related events
 */
export const createAnalyticsEventCommandSchema = z
  .object({
    user_id: z.string().uuid(),
    type: z.enum(ANALYTICS_EVENT_TYPE_VALUES),
    match_id: z.number().int().positive().nullable().optional(),
  })
  .refine(
    (data) => {
      const requiresMatchId = ["match_created", "match_finished"].includes(
        data.type,
      );
      return !requiresMatchId || data.match_id;
    },
    { message: "match_id required for match events", path: ["match_id"] },
  );
