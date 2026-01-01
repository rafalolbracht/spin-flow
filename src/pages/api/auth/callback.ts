import type { APIContext } from "astro";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";

export const prerender = false;

export async function GET(context: APIContext) {
  return handleCallback(context);
}

export async function POST(context: APIContext) {
  return handleCallback(context);
}

async function handleCallback(context: APIContext) {
  const supabase = context.locals.supabase;
  const code = context.url.searchParams.get("code");
  const state = context.url.searchParams.get("state");
  const cookieHeader = context.request.headers.get("cookie") ?? "";
  const hasCodeVerifierCookie = cookieHeader.includes("auth-token-code-verifier=");

  // Redirect URL może być zakodowany w state lub query param
  // Domyślnie przekierowujemy do listy meczów
  const redirectUrl = context.url.searchParams.get("redirect") || "/matches";

  if (!code) {
    return context.redirect("/auth/login?error=invalid_callback");
  }

  // Diagnostyka w DEV: jeśli nie ma flow-state/PKCE cookie, exchangeCodeForSession zawsze polegnie
  // i Supabase zwróci błąd typu "invalid flow state".
  if (!import.meta.env.PROD) {
    if (!hasCodeVerifierCookie) {
      const redirect = new URL("/auth/login", context.url.origin);
      redirect.searchParams.set("error", "oauth_failed");
      redirect.searchParams.set(
        "error_message",
        "Brak cookie PKCE '*-auth-token-code-verifier'. Najczęstsze przyczyny: różny host (localhost vs 127.0.0.1), brak redirect URL na allowliście Supabase, lub cookies blokowane przez przeglądarkę.",
      );
      return context.redirect(`${redirect.pathname}${redirect.search}`);
    }
  }

  // Wymiana kodu OAuth na sesję
  // @supabase/ssr automatycznie zapisze tokeny do cookies przez setAll()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    const message =
      error?.message ||
      "Brak sesji po callback (najczęściej: brak cookie PKCE / secure cookies na HTTP)";

    const redirect = new URL("/auth/login", context.url.origin);
    redirect.searchParams.set("error", "oauth_failed");
    // Szczegóły błędu pokazujemy tylko w DEV, żeby nie wyciekały informacje w PROD.
    if (!import.meta.env.PROD) {
      const sbCookieNames = cookieHeader
        .split(";")
        .map((c) => c.trim().split("=")[0])
        .filter((name) => name.startsWith("sb-"));

      const diag = [
        message,
        `state=${state ? "present" : "missing"}`,
        `pkce_cookie=${hasCodeVerifierCookie ? "present" : "missing"}`,
        sbCookieNames.length ? `sb_cookies=${sbCookieNames.join(",")}` : "sb_cookies=<none>",
        `origin=${context.url.origin}`,
      ].join(" | ");

      redirect.searchParams.set("error_message", diag.slice(0, 240));
    }

    return context.redirect(`${redirect.pathname}${redirect.search}`);
  }

  // Rejestracja zdarzenia logowania w analityce (US-090)
  try {
    if (data.session.user?.id) {
      await trackLoginEvent(supabase, data.session.user.id);
    }
  } catch {
    // Nie blokujemy logowania jeśli analityka zawiedzie
  }

  // Przekierowanie do docelowej strony
  return context.redirect(redirectUrl);
}

async function trackLoginEvent(supabase: SupabaseClient<Database>, userId: string) {
  // Bezpośredni insert do tabeli analytics_events
  await supabase.from("analytics_events").insert({
    user_id: userId,
    type: "login",
  });
}
