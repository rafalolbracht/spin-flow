import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerInstance } from "../db/supabase.client";

// Public paths - Auth API endpoints & Server-Rendered Astro Pages
const PUBLIC_PATHS = [
  // Server-Rendered Astro Pages
  "/",
  "/auth/login",
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

  // Utworzenie instancji Supabase dla tego requestu
  const supabase = createSupabaseServerInstance({
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

  if (isPublicPath) {
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
