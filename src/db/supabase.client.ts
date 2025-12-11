import { createClient } from "@supabase/supabase-js";

import type { Database } from "../db/database.types.ts";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
);

export type SupabaseClient = typeof supabaseClient;

// TODO: Temporary - replace with real authentication
export const DEFAULT_USER_ID = "69c4930b-63f6-4c05-9dec-c3b888fac1f5";
