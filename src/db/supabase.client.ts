import type { AstroCookies } from "astro";
import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import type { Database } from "../db/database.types.ts";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error('SUPABASE_URL environment variable is not set. Please check your environment configuration.');
}

if (!supabaseAnonKey) {
  throw new Error('SUPABASE_KEY environment variable is not set. Please check your environment configuration.');
}

// Client instance (for client-side components)
export const supabaseClient = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
);

export type SupabaseClient = typeof supabaseClient;

// Cookie options for server-side auth
export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  // W DEV zwykle działamy po HTTP (np. localhost), więc secure cookies nie zostaną zapisane.
  // To łamie OAuth PKCE (brak cookie z code_verifier) i kończy się błędem na callback.
  secure: import.meta.env.PROD,
  httpOnly: true,
  sameSite: "lax",
};

// Validate required environment variables for service client
function validateServiceEnvironment() {
  const serviceKey = import.meta.env.SUPABASE_SERVICE_KEY;
  const url = import.meta.env.SUPABASE_URL;

  if (!url) {
    throw new Error('SUPABASE_URL environment variable is not set. Please check your environment configuration.');
  }

  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_KEY environment variable is not set. Please check your environment configuration.');
  }

  return { url, serviceKey };
}

// Helper function to parse cookie header
function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  if (!cookieHeader?.trim()) return [];

  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .map((cookie) => {
      const [name, ...rest] = cookie.split("=");
      return { name, value: rest.join("=") };
    })
    .filter((c) => Boolean(c.name));
}

// Server instance creator (for API routes and server-side auth)
export const createSupabaseServerInstance = (context: {
  headers: Headers;
  cookies: AstroCookies;
}) => {
  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return parseCookieHeader(context.headers.get("Cookie") ?? "");
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            context.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  return supabase;
};

/**
 * Create a Supabase client with service role key (bypasses RLS)
 * Use only for internal/admin endpoints that don't require user authentication
 */
export function createSupabaseServiceClient(): ReturnType<
  typeof createClient<Database>
> {
  const { url, serviceKey } = validateServiceEnvironment();

  return createClient<Database>(
    url,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

// Authentication implemented - DEFAULT_USER_ID removed
