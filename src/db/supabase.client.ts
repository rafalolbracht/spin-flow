import type { AstroCookies } from "astro";
import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import type { Database } from "../db/database.types.ts";

// Type for Cloudflare runtime environment variables
type RuntimeEnv = Record<string, string | undefined>;

// Helper to get env variable from either import.meta.env or runtime.env
function getEnvVariable(key: string, runtimeEnv?: RuntimeEnv): string {
  return runtimeEnv?.[key] || import.meta.env[key];
}

// Helper to validate environment variables
function validateEnvVariables(runtimeEnv?: RuntimeEnv) {
  const supabaseUrl = getEnvVariable('SUPABASE_URL', runtimeEnv);
  const supabaseAnonKey = getEnvVariable('SUPABASE_KEY', runtimeEnv);

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is not set. Please check your environment configuration.');
  }

  if (!supabaseAnonKey) {
    throw new Error('SUPABASE_KEY environment variable is not set. Please check your environment configuration.');
  }

  return { supabaseUrl, supabaseAnonKey };
}

// For build-time: get env variables (will be used for types, but actual values come from runtime)
const buildTimeEnv = (() => {
  try {
    return validateEnvVariables();
  } catch {
    // During build on Cloudflare, these might not be available
    // We'll use placeholder values that will be replaced at runtime
    return {
      supabaseUrl: 'placeholder',
      supabaseAnonKey: 'placeholder',
    };
  }
})();

// Client instance (for client-side components) - only used during build
export const supabaseClient = createClient<Database>(
  buildTimeEnv.supabaseUrl,
  buildTimeEnv.supabaseAnonKey,
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
  runtimeEnv?: RuntimeEnv;
}) => {
  const { supabaseUrl, supabaseAnonKey } = validateEnvVariables(context.runtimeEnv);
  
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
export function createSupabaseServiceClient(runtimeEnv?: RuntimeEnv): ReturnType<
  typeof createClient<Database>
> {
  const serviceKey = getEnvVariable('SUPABASE_SERVICE_KEY', runtimeEnv);
  const url = getEnvVariable('SUPABASE_URL', runtimeEnv);

  if (!url) {
    throw new Error('SUPABASE_URL environment variable is not set. Please check your environment configuration.');
  }

  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_KEY environment variable is not set. Please check your environment configuration.');
  }

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
