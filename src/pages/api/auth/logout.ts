import type { APIContext } from "astro";
import { createErrorResponse } from "@/lib/utils/api-response";

export const prerender = false;

export async function POST(context: APIContext) {
  const supabase = context.locals.supabase;

  // Wylogowanie użytkownika
  // @supabase/ssr automatycznie usunie cookies przez setAll()
  const { error } = await supabase.auth.signOut();

  if (error) {
    // Nawet jeśli Supabase zwróci błąd, spróbujmy i tak wyczyścić cookies lokalnie,
    // żeby przeglądarka nie trzymała "starej" sesji.
  }

  // Twarde czyszczenie cookies Supabase po stronie przeglądarki.
  // W praktyce rozwiązuje przypadki, gdzie klient nadal "widzi" sesję po wylogowaniu.
  const cookieHeader = context.request.headers.get("cookie") ?? "";
  const cookieNames = cookieHeader
    .split(";")
    .map((c) => c.trim().split("=")[0])
    .filter((name) => name && name.startsWith("sb-"));

  for (const name of cookieNames) {
    // Astro cookies API: delete ustawia Set-Cookie z max-age=0
    context.cookies.delete(name, { path: "/" });
  }

  if (error) {
    return createErrorResponse("LOGOUT_FAILED", error.message, 500);
  }

  // Zwrócenie pustej odpowiedzi 204 No Content (Angular HttpClient nie próbuje parsować body).
  // Set-Cookie z context.cookies.delete(...) zostanie dołączone przez Astro.
  return new Response(null, { status: 204 });
}
