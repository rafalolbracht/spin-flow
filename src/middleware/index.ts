import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerInstance, createSupabaseServiceClient } from "../db/supabase.client";

// Public paths - Auth API endpoints & Server-Rendered Astro Pages
const PUBLIC_PATHS = [
  // Server-Rendered Astro Pages
  "/",
  "/auth/login",
  "/privacy-policy",
  // Auth API endpoints
  "/api/auth/login",
  "/api/auth/callback",
  "/api/auth/logout",
  "/api/auth/session",
  // Public match sharing
  "/public/matches",
];

type RuntimeEnv = Record<string, string | undefined>;

function getRuntimeEnvVariable(key: string, runtimeEnv?: RuntimeEnv): string | undefined {
  // 1) Cloudflare runtime.env
  const v1 = runtimeEnv?.[key];
  if (v1) return v1;

  // 2) import.meta.env (dev)
  const v2 = import.meta.env?.[key];
  if (v2) return v2;

  // 3) process.env (CI/test)
  const v3 = typeof process !== "undefined" ? process.env?.[key] : undefined;
  if (v3) return v3;

  return undefined;
}

export const onRequest = defineMiddleware(async (context, next) => {

  const runtimeEnv = context.locals.runtime?.env as RuntimeEnv | undefined;

  const nodeEnv = getRuntimeEnvVariable("NODE_ENV", runtimeEnv);

  const isTestMode =
    nodeEnv !== "production" &&
    (
      nodeEnv === "test" ||
      context.request.headers.get("x-test-mode") === "true"
    );

  const supabase = isTestMode
    ? createSupabaseServiceClient(runtimeEnv)
    : createSupabaseServerInstance({
        cookies: context.cookies,
        headers: context.request.headers,
        runtimeEnv,
      });

  context.locals.supabase = supabase;

  context.locals.getSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  };

  // Sprawdzenie czy ścieżka jest publiczna
  const isPublicPath =
    PUBLIC_PATHS.includes(context.url.pathname) ||
    context.url.pathname.startsWith("/public/") ||
    context.url.pathname.startsWith("/api/auth/") ||
    // Statyczne zasoby (CSS, JS, obrazy, fonty)
    context.url.pathname.startsWith("/_astro/") ||
    context.url.pathname.startsWith("/_image/") ||
    context.url.pathname.match(/\.(css|js|ico|svg|png|jpg|jpeg|webp|gif|woff|woff2|ttf|eot)$/);

  // Debug logging for test mode
  if (isTestMode) {
    // eslint-disable-next-line no-console
    console.log('🔧 Test mode detected, using service role client');
  }

  if (isPublicPath || isTestMode) {
    if (isTestMode) {
      const testUserId = getRuntimeEnvVariable("TEST_USER_ID", runtimeEnv);

      if (!testUserId) {
        // eslint-disable-next-line no-console
        console.error("❌ TEST_USER_ID not found in env (runtime.env, import.meta.env, process.env)");
        throw new Error("TEST_USER_ID is required for test mode");
      }

      context.locals.getUserId = async () => testUserId;
      // eslint-disable-next-line no-console
      console.log(`🔧 Test mode: Using test user ID: ${testUserId}`);
    }

    return next();
  }

  // Dla chronionych ścieżek: sprawdzenie sesji użytkownika
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Dodanie helpera do pobierania user ID
  context.locals.getUserId = async () => {
    return user?.id || null;
  };

  // Jeśli użytkownik zalogowany, kontynuuj
  if (user) {
    return next();
  }

  // Dla niezalogowanych: przekierowanie do strony startowej
  // (zgodnie z PRD US-001, kryterium 7: "trener zostanie przeniesiony na stronę startową")
  // Opcjonalnie można przekazać informację o wymaganym logowaniu
  return context.redirect(`/?login_required=true`);
});
