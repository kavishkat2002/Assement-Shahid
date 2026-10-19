/**
 * @file start.ts
 * @description Central runtime configuration for TanStack Start SSR instance.
 *
 * Middleware Pipeline Configuration:
 * 1. Function Middleware (`functionMiddleware`):
 *    - `attachSupabaseAuth`: Client-side middleware that injects the active Supabase JWT
 *      as an Authorization header into every server function RPC invocation.
 * 2. Request Middleware (`requestMiddleware`):
 *    - `errorMiddleware`: Server-side error handler converting unhandled exceptions into friendly HTML.
 *    - `csrfMiddleware`: Origin and header validation securing server functions against
 *      Cross-Site Request Forgery (CSRF).
 */

import {
  createStart,
  createCsrfMiddleware,
  createMiddleware,
} from "@tanstack/react-start";
import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

/**
 * Server-side error middleware catching router-level exceptions.
 */
const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    // Preserve custom HTTP errors that specify explicit status codes (e.g. 404, 401)
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

/**
 * CSRF protection middleware safeguarding server functions (`serverFn`) against unauthorized
 * cross-origin submissions.
 */
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

/**
 * Initialized TanStack Start server instance.
 */
export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
