import type { APIContext } from "astro";
import { createSuccessResponse } from "@/lib/utils/api-response";

export const prerender = false;

export async function GET(context: APIContext) {
  const supabase = context.locals.supabase;

  // Pobranie użytkownika z weryfikacją JWT
  // getUser() sprawdza czy token JWT jest ważny i czy użytkownik istnieje
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Jeśli jest błąd (np. token wygasł, użytkownik został usunięty), zwróć null
  if (error || !user) {
    // Opcjonalnie: wyczyść ciasteczka sesji jeśli są
    if (error) {
      const cookieHeader = context.request.headers.get("cookie") ?? "";
      const cookieNames = cookieHeader
        .split(";")
        .map((c) => c.trim().split("=")[0])
        .filter((name) => name && name.startsWith("sb-"));

      for (const name of cookieNames) {
        context.cookies.delete(name, { path: "/" });
      }
    }

    return createSuccessResponse(
      {
        user: null,
      },
      200,
    );
  }

  return createSuccessResponse(
    {
      user,
    },
    200,
  );
}


