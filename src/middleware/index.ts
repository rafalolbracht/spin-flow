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

export const onRequest = defineMiddleware(async (context, next) => {
  // Get runtime environment variables (Cloudflare Workers runtime)
  const runtimeEnv = context.locals.runtime?.env;

  // Sprawdzenie czy jesteśmy w trybie testowym (PRZED utworzeniem klienta)
  const isTestMode = runtimeEnv?.NODE_ENV === 'test' ||
                    context.url.searchParams.get('test_mode') === 'true' ||
                    context.request.headers.get('x-test-mode') === 'true';

  // W trybie testowym używamy service role client (bypass RLS)
  const supabase = isTestMode
    ? createSupabaseServiceClient(runtimeEnv)
    : createSupabaseServerInstance({
        cookies: context.cookies,
        headers: context.request.headers,
        runtimeEnv,
      });

  // Dodanie klienta do context.locals
  context.locals.supabase = supabase;

  // Dodanie helpera do pobierania sesji (dla wszystkich ścieżek)
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
    // W trybie testowym ustaw testowego użytkownika (prawdziwy UUID z bazy)
    if (isTestMode) {
      const testUserId = runtimeEnv?.TEST_USER_ID || import.meta.env.TEST_USER_ID;
      if (!testUserId) {
        // eslint-disable-next-line no-console
        console.error('❌ TEST_USER_ID not found in environment variables');
        throw new Error('TEST_USER_ID is required for test mode');
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
