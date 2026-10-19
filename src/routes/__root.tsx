/**
 * Root Route Layout & Application Shell
 *
 * Defines the top-level application wrapper for SwiftDrive Rentals.
 * Responsibilities:
 *  - Configures global HTML document headers, meta tags, and font stylesheets.
 *  - Provides TanStack QueryClient and Supabase Authentication context.
 *  - Synchronizes user auth changes (login/logout/token refresh) with router cache.
 *  - Renders the global navigation header, page content outlet, and footer.
 *  - Implements global 404 Not Found and 500 Error boundary fallback UI.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * 404 Not Found fallback displayed when an invalid URL route is visited.
 */
function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-5xl font-bold tracking-tight text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you are looking for does not exist or has been moved to a new address.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Global Error Boundary component that captures uncaught runtime/rendering errors.
 * Gives users the option to invalidate stale route data or return home safely.
 */
function ErrorComponent({ error, reset }: ErrorComponentProps) {
  // Log full error details for developer debugging
  console.error("[Root Error Boundary]:", error);
  const router = useRouter();

  const handleRetry = () => {
    // Invalidate stale router caches and trigger component re-render
    router.invalidate();
    reset();
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Unable to load this page</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          An unexpected error occurred while loading this section. Please try again or head back to the main page.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Root route definition with typed router context (includes TanStack QueryClient).
 */
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SwiftDrive Rentals — Car rental in Negombo, Sri Lanka" },
      {
        name: "description",
        content:
          "Rent economy cars, SUVs, vans and luxury vehicles from Negombo, Sri Lanka. Transparent pricing and local airport pickup.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "data:," }, // Suppress default favicon 404
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Source+Sans+3:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

/**
 * The outer document shell for SSR output.
 * Renders the top-level <html>, <head>, and <body> tags required by TanStack Start.
 */
function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <style>{`.nav-link{font-size:.9375rem;font-weight:500;color:var(--color-foreground)}.nav-link:hover{color:var(--color-primary)}`}</style>
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/**
 * The root React component mounting all core application providers and listeners.
 */
function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  // Listen to Supabase auth events (sign-in, sign-out, session refresh)
  // to ensure cached queries and route data remain strictly in sync with auth state.
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") {
        return;
      }

      // Invalidate router loaders so role-gated routes evaluate immediately
      router.invalidate();

      if (event === "SIGNED_OUT") {
        // Clear cached user data immediately upon sign out to prevent data leaks
        queryClient.clear();
      } else {
        // Re-fetch queries with fresh credentials upon sign in or user update
        queryClient.invalidateQueries();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Accessible skip link for keyboard & screen reader navigation */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2 focus:shadow"
        >
          Skip to content
        </a>

        {/* Global application layout frame */}
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main id="main" className="flex-1">
            <Outlet />
          </main>
          <SiteFooter />
        </div>

        {/* Toast notification container */}
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

