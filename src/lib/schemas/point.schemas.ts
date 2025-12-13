import { z } from "zod";
import { SIDE_VALUES } from "../../types";

/**
 * Schema for points include query parameter
 * Tags are always loaded, but this parameter maintains API consistency
 */
export const pointsIncludeQuerySchema = z.object({
  include: z.literal("tags").optional(),
});

/**
 * Schema for creating a point
 */
export const createPointCommandSchema = z.object({
  scored_by: z.enum(SIDE_VALUES),
  tag_ids: z.array(z.number().int().positive()).optional(),
});
