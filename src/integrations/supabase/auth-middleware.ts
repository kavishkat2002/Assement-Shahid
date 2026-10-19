/**
 * @file auth-middleware.ts
 * @description Server function middleware validating incoming Supabase Bearer JWTs in TanStack Start.
 *
 * Operational Flow:
 * 1. Intercepts incoming server function requests via `getRequest()`.
 * 2. Extracts and verifies the `Authorization: Bearer <token>` header.
 * 3. Validates the structural integrity of the compact JWT (3 dot-separated base64 segments).
 * 4. Initializes a request-scoped Supabase client configured with the caller's JWT, ensuring
 *    database operations respect Postgres Row-Level Security (RLS) under the user's identity.
 * 5. Calls `supabase.auth.getClaims(token)` to cryptographically verify claims and extract the `sub` (user UUID).
 * 6. Injects `{ supabase, userId, claims }` into the downstream execution context.
 */

import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Checks whether the API key is a modern Supabase opaque token.
 */
function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

/**
 * Creates a fetch instance that attaches the service apikey while preserving user auth headers.
 */
function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

/**
 * Middleware requiring valid Supabase user authentication for server function execution.
 */
export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const SUPABASE_URL = process.env["SUPABASE_URL"];
    const SUPABASE_PUBLISHABLE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"];

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      const missingKeys = [
        ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
        ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
      ];
      const message = `Missing Supabase environment variable(s): ${missingKeys.join(", ")}. Please verify your server credentials.`;
      console.error(`[Supabase Auth Middleware] ${message}`);
      throw new Error(message);
    }

    const request = getRequest();
    if (!request?.headers) {
      throw new Error("Unauthorized: No request headers available");
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Unauthorized: No authorization header provided");
    }

    if (!authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized: Only Bearer tokens are supported");
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      throw new Error("Unauthorized: No token provided");
    }

    // Fast fail on malformed JWT structure
    if (token.split(".").length !== 3) {
      throw new Error("Unauthorized: Invalid token");
    }

    // Instantiate client scoped to the authenticated caller's identity
    const scopedSupabase = createClient<Database>(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Cryptographically verify token claims with Supabase Auth
    const { data, error } = await scopedSupabase.auth.getClaims(token);
    if (error || !data?.claims) {
      throw new Error("Unauthorized: Invalid token");
    }

    if (!data.claims.sub) {
      throw new Error("Unauthorized: No user ID found in token");
    }

    // Provide verified context to downstream server handler
    return next({
      context: {
        supabase: scopedSupabase,
        userId: data.claims.sub,
        claims: data.claims,
      },
    });
  }
);
