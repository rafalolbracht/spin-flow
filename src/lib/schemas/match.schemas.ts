import { z } from "zod";
import { SIDE_VALUES, MATCH_STATUS_VALUES } from "../../types";

/**
 * Schema for creating a new match
 */
export const createMatchCommandSchema = z.object({
  player_name: z.string().min(1).max(200),
  opponent_name: z.string().min(1).max(200),
  max_sets: z.number().int().min(1).max(7),
  golden_set_enabled: z.boolean(),
  first_server_first_set: z.enum(SIDE_VALUES),
  generate_ai_summary: z.boolean(),
});

/**
 * Schema for match list query parameters
 */
export const matchListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  player_name: z.string().trim().min(1).optional(),
  opponent_name: z.string().trim().min(1).optional(),
  status: z.enum(MATCH_STATUS_VALUES).optional(),
  sort: z
    .string()
    .regex(/^-?(started_at|ended_at|created_at|player_name|opponent_name)$/)
    .default("-started_at"),
});

/**
 * Schema for updating match metadata
 */
export const updateMatchCommandSchema = z.object({
  player_name: z.string().min(1).max(200).optional(),
  opponent_name: z.string().min(1).max(200).optional(),
  coach_notes: z.string().nullable().optional(),
});

/**
 * Schema for finishing a match
 */
export const finishMatchCommandSchema = z.object({
  coach_notes: z.string().nullable().optional(),
});

/**
 * Schema for include query parameter
 * Supports comma-separated values: sets, points, tags, ai_report
 */
export const includeQuerySchema = z.object({
  include: z
    .string()
    .regex(/^(sets|points|tags|ai_report)(,(sets|points|tags|ai_report))*$/)
    .optional(),
});
