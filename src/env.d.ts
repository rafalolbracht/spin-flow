/// <reference types="astro/client" />

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Session } from "@supabase/supabase-js";
import type { Database } from "./db/database.types.ts";

// Type for Cloudflare runtime context
type CloudflareRuntime = {
  env: Record<string, string | undefined>;
  ctx: {
    waitUntil: (promise: Promise<unknown>) => void;
    passThroughOnException: () => void;
  };
};

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      getSession: () => Promise<Session | null>;
      getUserId: () => Promise<string | null>;
      runtime?: CloudflareRuntime;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly SUPABASE_SERVICE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  readonly SITE_URL?: string; // Base URL for public share links (e.g., http://localhost:4321 or https://spin-flow.app)
  readonly GOOGLE_CLIENT_ID: string;
  readonly GOOGLE_CLIENT_SECRET: string;
  readonly FACEBOOK_APP_ID: string;
  readonly FACEBOOK_APP_SECRET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
