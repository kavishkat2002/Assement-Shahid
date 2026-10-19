/**
 * SwiftDrive Rentals — Application Router Configuration
 *
 * Configures TanStack Router with TanStack Query integration.
 * In TanStack Start (SSR), this factory function generates a fresh router
 * instance per request on the server, while maintaining client-side state
 * and scroll restoration across route transitions.
 */

import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/**
 * Creates and initializes the TanStack Router instance.
 * Bundles a QueryClient inside the router context so loaders and components
 * can share a unified caching and prefetching layer.
 */
export const getRouter = () => {
  // QueryClient instance configured for SSR hydration and client-side data fetching
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60, // Consider data fresh for 1 minute by default
        refetchOnWindowFocus: false, // Prevent jarring refetches during active user workflows
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // defaultPreloadStaleTime: 0 ensures preloaded route data checks freshness appropriately
    defaultPreloadStaleTime: 0,
  });

  return router;
};

