import { z } from "zod";

/**
 * Schema for path parameters containing an ID
 * Validates that ID is a positive integer
 */
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive("ID must be a positive integer"),
});

/**
 * Schema for path parameters containing a token
 * Validates that token is exactly 43 characters and matches base64url format
 */
export const tokenParamSchema = z.object({
  token: z
    .string()
    .length(43)
    .regex(/^[A-Za-z0-9_-]{43}$/, "Invalid token format"),
});
