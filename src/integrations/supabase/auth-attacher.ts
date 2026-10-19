/**
 * @file auth-attacher.ts
 * @description Client-side middleware that automatically attaches active Supabase session tokens
 * to outgoing TanStack Start server function requests.
 *
 * Mechanism:
 * - Executes transparently on the browser before any RPC or server function call (`createServerFn`).
 * - Retrieves the current access token from the local Supabase session cache.
 * - Injects the `Authorization: Bearer <token>` header, pairing seamlessly with `requireSupabaseAuth`.
 */

import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

/**
 * Client middleware injecting user session credentials into server function calls.
 */
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    // Read session from local client auth state
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    // Attach Bearer header when an authenticated session exists
    return next({
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
  }
);
