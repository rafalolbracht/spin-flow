import { z } from "zod";

/**
 * Schema dla logowania
 */
export const loginRequestSchema = z.object({
  provider: z.enum(["google", "facebook"]),
  redirectUrl: z.string().url().optional(),
});

/**
 * Schema dla callback OAuth (query params)
 */
export const authCallbackQuerySchema = z.object({
  code: z.string().min(1),
  redirect: z.string().optional(),
});


