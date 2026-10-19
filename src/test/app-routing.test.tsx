/**
 * @file app-routing.test.tsx
 * @description Routing architecture test verifying static route tree configuration and root matchers.
 *
 * Testing Strategy:
 * - Tests route tree resolution purely through TanStack Router's matching engine (`router.matchRoutes`).
 * - Skips loader execution and full DOM mounting because:
 *   1. Data loaders depend on external Supabase network connections not present in sandboxed CI test environments.
 *   2. jsdom does not evaluate external CSS stylesheets that React streaming hydration waits on.
 * - Confirms that the primary route path (`/`) resolves to a defined page route rather than
 *   falling through to the unhandled root catch-all or generic 404 state.
 */

import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { routeTree } from "@/routeTree.gen";

describe("Application Routing Architecture", () => {
  it("matches a dedicated homepage component for '/' rather than the unhandled root fallback", () => {
    // Instantiate test router instance using the generated route tree and dummy query client
    const testRouter = createRouter({
      routeTree,
      context: {
        queryClient: new QueryClient({
          defaultOptions: {
            queries: {
              retry: false,
            },
          },
        }),
      },
    });

    // Execute synchronous route matching for the root path
    const matchedRoutes = testRouter.matchRoutes("/");

    // Verify that the deepest matched route is a registered leaf route and not just the root layout
    const leafMatch = matchedRoutes.at(-1);
    expect(leafMatch).toBeDefined();
    expect(leafMatch?.routeId).not.toBe(rootRouteId);
  });
});
