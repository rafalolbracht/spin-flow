import type { APIContext } from "astro";
import { createSuccessResponse } from "@/lib/utils/api-response";

export const prerender = false;

export async function GET(context: APIContext) {
  const supabase = context.locals.supabase;

  // Pobranie sesji użytkownika
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Jeśli jest sesja, sprawdź czy użytkownik nadal istnieje w bazie danych
  // (potrzebne po resetowaniu bazy, gdy JWT nadal jest ważny ale użytkownik został usunięty)
  if (session?.user) {
    try {
      const { data: userData, error } = await supabase.auth.admin.getUserById(session.user.id);

      // Jeśli użytkownik nie istnieje lub jest błąd, wyczyść sesję
      if (error || !userData.user) {
        // Wyczyść ciasteczka sesji
        const cookieHeader = context.request.headers.get("cookie") ?? "";
        const cookieNames = cookieHeader
          .split(";")
          .map((c) => c.trim().split("=")[0])
          .filter((name) => name && name.startsWith("sb-"));

        for (const name of cookieNames) {
          context.cookies.delete(name, { path: "/" });
        }

        return createSuccessResponse(
          {
            user: null,
          },
          200,
        );
      }
    } catch {
      // W przypadku błędu zakładamy że sesja jest nieważna
      return createSuccessResponse(
        {
          user: null,
        },
          200,
      );
    }
  }

  return createSuccessResponse(
    {
      user: session?.user || null,
    },
    200,
  );
}


