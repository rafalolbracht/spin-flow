import type { APIContext } from "astro";
import { createSupabaseClient } from "../../../db/supabase.client";
import { createListResponse, createInternalErrorResponse } from "../../../lib/utils/api-response";
import { logError } from "../../../lib/utils/logger";
import type { TagDto } from "../../../types";

/**
 * GET /api/tags
 *
 * Pobieranie wszystkich dostępnych tagów w systemie
 * Tagi są zasobem globalnym, współdzielonym między wszystkimi użytkownikami
 *
 * @see .ai/api-implementation/get-tags-implementation-plan.md
 */
export const prerender = false;

export async function GET(context: APIContext) {
  // Get runtime environment variables
  const runtimeEnv = context.locals.runtime?.env;
  
  // 1. Supabase client (bez userId - endpoint publiczny)
  const supabase = createSupabaseClient(runtimeEnv);

  // 2. Query do bazy danych
  try {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .order("order_in_list", { ascending: true });

    if (error) {
      logError("GET /api/tags", error);
      return createInternalErrorResponse();
    }

    const tags: TagDto[] = data;
    return createListResponse(tags);
  } catch (error) {
    logError("GET /api/tags", error as Error);
    return createInternalErrorResponse();
  }
}
