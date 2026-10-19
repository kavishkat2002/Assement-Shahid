/**
 * @file server.ts
 * @description Production HTTP server entry point for TanStack Start SSR on Node.js/Nitro.
 *
 * Architecture & Failure Recovery:
 * 1. Server Entry Resolution:
 *    - Lazily loads `@tanstack/react-start/server-entry` to dispatch requests to the router.
 * 2. Catastrophic Error Normalization:
 *    - The Nitro/h3 HTTP layer converts unhandled SSR crashes into a raw JSON 500 response:
 *      `{"unhandled": true, "message": "HTTPError"}`.
 *    - In an HTML browsing context, presenting raw JSON 500 bodies degrades user experience.
 *    - `normalizeCatastrophicSsrResponse` intercepts these JSON responses, consumes the true
 *      underlying stack trace captured via `./lib/error-capture`, logs it for observability,
 *      and renders the polite, zero-dependency fallback HTML document (`renderErrorPage`).
 */

import "./lib/error-capture";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

interface ServerEntry {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
}

let serverEntryPromise: Promise<ServerEntry> | undefined;

/**
 * Dynamically imports and caches the TanStack Start server entry dispatcher.
 */
async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (mod) => (mod.default ?? mod) as ServerEntry
    );
  }
  return serverEntryPromise;
}

/**
 * Checks whether an HTTP response body corresponds to an h3 swallowed exception.
 */
function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

/**
 * Inspects outgoing 500 responses to replace opaque JSON error bodies with friendly HTML pages.
 */
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) {
    return response;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return response;
  }

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) {
    return response;
  }

  // Log original unrolled error from out-of-band capture
  const originalError =
    consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`);
  console.error(originalError);

  // Return formatted HTML error document
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

/**
 * Default server export fulfilling the Web Standard Fetch API contract.
 */
export default {
  async fetch(request: Request, env: unknown, ctx: unknown): Promise<Response> {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (fatalError) {
      console.error(fatalError);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
