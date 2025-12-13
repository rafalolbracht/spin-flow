import { createClient } from "@supabase/supabase-js";

import type { Database } from "../db/database.types.ts";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
);

export type SupabaseClient = typeof supabaseClient;

/**
 * Create a Supabase client with service role key (bypasses RLS)
 * Use only for internal/admin endpoints that don't require user authentication
 */
export function createSupabaseServiceClient(): ReturnType<
  typeof createClient<Database>
> {
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is not set");
  }

  return createClient<Database>(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

// TODO: Temporary - replace with real authentication
export const DEFAULT_USER_ID = "69c4930b-63f6-4c05-9dec-c3b888fac1f5";
