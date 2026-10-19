import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * ============================================================================
 * Authenticated Layout Gate (_authenticated)
 * ============================================================================
 * Pathless layout wrapper that secures customer, staff, and admin routes.
 *
 * Architecture Notes:
 * 1. ssr: false - The active Supabase session is maintained within the browser's
 *    localStorage. Disabling SSR on authenticated child routes prevents flash of
 *    unauthenticated content and eliminates server-side session desync issues.
 * 2. beforeLoad Hook - Evaluates user existence via supabase.auth.getUser(). If no
 *    active session exists, intercepts navigation and redirects to /login with the
 *    original destination encoded in the search parameters.
 * 3. Defense-in-Depth - Client-side gates provide seamless user UX, but all actual
 *    data queries, mutations, and RPCs are strictly enforced by Postgres Row-Level
 *    Security (RLS) policies at the database layer.
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Verify user authentication with the Supabase client
    const { data } = await supabase.auth.getUser();

    // If unauthenticated, redirect to login while preserving target path
    if (!data.user) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: AuthenticatedLayout,
});

/**
 * Renders nested authenticated child routes (e.g. /account, /staff, /admin)
 */
function AuthenticatedLayout() {
  return <Outlet />;
}

