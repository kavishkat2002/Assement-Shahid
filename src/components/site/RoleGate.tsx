/**
 * @file RoleGate.tsx
 * @description Client-side role authorization guard component.
 *
 * Security & Defense-in-Depth Note:
 * - This component serves as a UX gate to prevent unauthorized users from rendering
 *   management dashboard views (such as `/staff` or `/admin`).
 * - CRITICAL: Client-side gates provide navigational ergonomics, NOT security boundaries.
 *   The actual security boundary is enforced at the database level by PostgreSQL Row-Level
 *   Security (RLS) policies and Security Definer RPC functions on every transaction.
 */

import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { LoadingState } from "./common";

interface RoleGateProps {
  /** The minimum role required to render child components */
  need: "staff" | "admin";
  /** Protected children rendered when authorization succeeds */
  children: ReactNode;
}

/**
 * RoleGate component.
 * Evaluates current user authentication and roles state before displaying protected content.
 */
export function RoleGate({ need, children }: RoleGateProps) {
  const { loading, isStaff, isAdmin, roles } = useAuth();

  // Display accessible loading indicator while role hydration is in-flight
  if (loading || roles.length === 0) {
    return <LoadingState label="Checking access…" />;
  }

  // Determine role satisfaction
  const isAuthorized = need === "admin" ? isAdmin : isStaff;

  // Render polite access restriction view if requirements are unmet
  if (!isAuthorized) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">Access restricted</h1>
        <p className="mt-2 text-muted-foreground">
          This area is only for SwiftDrive {need === "admin" ? "administrators" : "staff"}.
        </p>
        <Link
          to="/account"
          className="mt-4 inline-block text-primary hover:underline font-medium"
        >
          Go to my account
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
