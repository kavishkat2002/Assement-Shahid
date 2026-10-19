/**
 * @file client.ts
 * @description Universal Supabase client singleton for browser and server-side rendering (SSR).
 *
 * Architecture & Integration Highlights:
 * 1. Hybrid Environment Resilience:
 *    - Uses `import.meta.env` in client bundles (Vite build-time replacement).
 *    - Falls back to `process.env` during server-side execution in Node.js / TanStack Start runtimes.
 * 2. Lazy Proxy Initialization:
 *    - Exported as an ES6 `Proxy` wrapping the Supabase client.
 *    - Defers client construction until the first property access, preventing initialization crashes
 *      during module discovery or build-time bundle analysis.
 * 3. Modern Key & Fetch Handling:
 *    - Accommodates next-generation Supabase publishable keys (`sb_publishable_...`), which are opaque
 *      tokens rather than legacy JWTs, ensuring the `Authorization` header is kept clean for user session tokens.
 *    - Rewrites outbound API requests in server runtimes where the local Docker / VPC endpoint differs
 *      from the external browser-facing URL.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Checks whether the API key is a modern Supabase opaque token rather than a legacy JWT.
 */
function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

/**
 * Determines whether server-side requests should be rerouted to an internal container/service URL.
 */
function resolveServerSupabaseUrl(publicUrl: string, supabaseKey: string): string | undefined {
  if (typeof window !== "undefined" || typeof process === "undefined") {
    return undefined;
  }

  const serverUrl = process.env["SUPABASE_URL"]?.replace(/\/+$/, "");
  if (!serverUrl || serverUrl === publicUrl || process.env["SUPABASE_PUBLISHABLE_KEY"] !== supabaseKey) {
    return undefined;
  }

  return serverUrl;
}

/**
 * Creates a specialized fetch wrapper that injects necessary Supabase API keys
 * and routes internal server requests appropriately.
 */
function createSupabaseFetch(supabaseUrl: string, supabaseKey: string): typeof fetch {
  const publicUrl = supabaseUrl.replace(/\/+$/, "");
  const serverUrl = resolveServerSupabaseUrl(publicUrl, supabaseKey);

  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // Modern Supabase API keys are opaque strings; avoid passing them in the Authorization header
    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);

    // Rewrite internal target URL when executing on the server
    if (serverUrl) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith(`${publicUrl}/`)) {
        const target = serverUrl + url.slice(publicUrl.length);
        const request = typeof input === "string" || input instanceof URL ? target : new Request(target, input);
        return fetch(request, { ...init, headers });
      }
    }

    return fetch(input, { ...init, headers });
  };
}

/**
 * Factory creating the configured Supabase client instance.
 */
function createSupabaseClient() {
  const SUPABASE_URL =
    import.meta.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"];
  const SUPABASE_PUBLISHABLE_KEY =
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || process.env["SUPABASE_PUBLISHABLE_KEY"];

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missingKeys = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missingKeys.join(", ")}. Please check your credentials in .env.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY),
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

// Internal singleton reference
let _supabaseClientInstance: ReturnType<typeof createSupabaseClient> | undefined;

/**
 * Global Supabase client singleton.
 * Accessible across all frontend components and client services:
 *
 * ```ts
 * import { supabase } from "@/integrations/supabase/client";
 * ```
 */
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, property, receiver) {
    if (!_supabaseClientInstance) {
      _supabaseClientInstance = createSupabaseClient();
    }
    return Reflect.get(_supabaseClientInstance, property, receiver);
  },
});
