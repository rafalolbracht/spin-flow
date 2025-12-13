import { z } from "zod";

/**
 * Schema for sets include query parameter
 * Supports comma-separated values: points, tags
 */
export const setsIncludeQuerySchema = z.object({
  include: z
    .string()
    .regex(/^(points|tags)(,(points|tags))?$/)
    .optional(),
});

/**
 * Schema for finishing a set
 */
export const finishSetCommandSchema = z.object({
  coach_notes: z.string().nullable().optional(),
});
