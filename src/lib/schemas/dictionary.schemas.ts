import { z } from "zod";

/**
 * Schema for dictionary labels query parameters
 */
export const dictionaryQuerySchema = z.object({
  domain: z.string().trim().min(1).optional(),
});
