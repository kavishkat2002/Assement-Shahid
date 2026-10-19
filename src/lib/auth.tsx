/**
 * Authentication & Authorization Context Provider
 *
 * Manages client-side authentication state via Supabase Auth.
 * Tracks the current session, user profile details, and role assignments
 * (customer, staff, administrator).
 *
 * Security Architecture Note:
 * Roles retrieved into client state dictate navigation visibility and UI gates.
 * The primary security boundary is enforced at the PostgreSQL database level
 * using Row Level Security (RLS) policies and SECURITY DEFINER RPC functions.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * System roles supported across SwiftDrive Rentals.
 * - customer: Can reserve vehicles, submit reviews, and track personal bookings.
 * - staff: Can perform vehicle handovers, return inspections, and record payments.
 * - admin: Has full access to fleet CRUD, staff permissions, and financial audit logs.
 */
export type AppRole = "customer" | "staff" | "admin";

/**
 * Global authentication state exposed to the React component tree.
 */
type AuthState = {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/**
 * Wraps application components to provide reactive auth state and session listeners.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    /**
     * Fetches assigned user roles from the 'user_roles' table for the current authenticated user.
     */
    const loadRoles = async (activeSession: Session | null) => {
      if (!activeSession?.user) {
        if (isMounted) setRoles([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", activeSession.user.id);

        if (error) {
          console.warn("[Auth] Failed to retrieve user roles:", error.message);
          return;
        }

        if (isMounted && data) {
          setRoles(data.map((r) => r.role as AppRole));
        }
      } catch (err) {
        console.error("[Auth] Unexpected error fetching roles:", err);
      }
    };

    // Subscribe to auth state changes (login, logout, token refresh)
    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      // Defer role lookup slightly to avoid recursive Supabase client deadlocks
      setTimeout(() => {
        void loadRoles(currentSession);
      }, 0);
    });

    // Check existing stored session on initial mount
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!isMounted) return;
        setSession(data.session);
        await loadRoles(data.session);
      })
      .catch((err) => {
        console.error("[Auth] Session initialization failed:", err);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      authSubscription.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setRoles([]);
      setSession(null);
    } catch (err) {
      console.error("[Auth] Error signing out:", err);
    }
  };

  const contextValue: AuthState = {
    session,
    user: session?.user ?? null,
    roles,
    loading,
    // Staff privileges are granted to staff members as well as administrators
    isStaff: roles.includes("staff") || roles.includes("admin"),
    isAdmin: roles.includes("admin"),
    signOut: handleSignOut,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to access the current authentication state and active user.
 * Throws an explicit error if accessed outside an AuthProvider hierarchy.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be consumed within an <AuthProvider>");
  }
  return context;
}

