import type { APIContext } from "astro";
import { z } from "zod";
import { parseRequestBody } from "@/lib/utils/zod-helpers";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/lib/utils/api-response";

export const prerender = false;

const loginSchema = z.object({
  provider: z.enum(["google", "facebook"]),
  redirectUrl: z.string().optional(),
});

export async function POST(context: APIContext) {
  const supabase = context.locals.supabase;

  // Walidacja body
  const bodyResult = await parseRequestBody(context.request, loginSchema);
  if (!bodyResult.success) {
    return createErrorResponse("INVALID_REQUEST", "Invalid request body", 400);
  }

  const { provider, redirectUrl } = bodyResult.data;

  // Generowanie URL OAuth callback (API endpoint, nie strona Astro!)
  const callbackUrl = new URL("/api/auth/callback", context.url.origin);
  if (redirectUrl) {
    callbackUrl.searchParams.set("redirect", redirectUrl);
  }

  // Wywołanie OAuth flow
  // Supabase przekieruje użytkownika do providera, a potem z powrotem do callbackUrl
  // @supabase/ssr automatycznie zarządza cookies po callback
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider,
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  if (error) {
    return createErrorResponse("OAUTH_INIT_FAILED", error.message, 500);
  }

  return createSuccessResponse({ url: data.url }, 200);
}


