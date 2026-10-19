/**
 * @file client.server.ts
 * @description Server-exclusive Supabase admin client configured with elevated Service Role credentials.
 *
 * CRITICAL SECURITY & ACCESS CONTROL WARNING:
 * -------------------------------------------------------------------------------------------------
 * 1. The Service Role key (`SUPABASE_SERVICE_ROLE_KEY`) bypasses ALL PostgreSQL Row-Level Security (RLS)
 *    policies. Any query executed via `supabaseAdmin` has unrestricted read/write access to every table.
 * 2. NEVER import this file into code that executes in client bundles or public route modules.
 *    Only import within trusted backend server handlers, server-only middleware, or `*.server.ts` files:
 *    ```ts
 *    // Dynamic import inside a server function:
 *    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
 *    ```
 * 3. `supabaseAdmin` is configured without session persistence (`persistSession: false`)
 *    and without token refresh timers, making it safe for stateless, concurrent server operations.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Checks whether the API key is a modern Supabase opaque secret token.
 */
function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

/**
 * Creates a specialized server fetch wrapper injecting the service role key.
 */
function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // Modern Supabase service keys are opaque strings; strip from Bearer Authorization header
    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

/**
 * Factory creating the elevated Supabase admin client.
 */
function createSupabaseAdminClient() {
  const SUPABASE_URL = process.env["SUPABASE_URL"];
  const SUPABASE_SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    const missingKeys = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_SERVICE_ROLE_KEY ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missingKeys.join(", ")}. Please verify your server credentials in .env.`;
    console.error(`[Supabase Admin] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_SERVICE_ROLE_KEY),
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Internal singleton reference
let _supabaseAdminInstance: ReturnType<typeof createSupabaseAdminClient> | undefined;

/**
 * Server-only Supabase admin client instance.
 * Bypasses RLS to perform administrative tasks, system migrations, and audit logging.
 */
export const supabaseAdmin = new Proxy(
  {} as ReturnType<typeof createSupabaseAdminClient>,
  {
    get(_, property, receiver) {
      if (!_supabaseAdminInstance) {
        _supabaseAdminInstance = createSupabaseAdminClient();
      }
      return Reflect.get(_supabaseAdminInstance, property, receiver);
    },
  }
);
