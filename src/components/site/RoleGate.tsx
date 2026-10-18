import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { LoadingState } from "./common";

/** Hides dashboards from users without the role. The database enforces the same rule on every query. */
export function RoleGate({ need, children }: { need: "staff" | "admin"; children: ReactNode }) {
  const { loading, isStaff, isAdmin, roles } = useAuth();
  if (loading || (roles.length === 0)) return <LoadingState label="Checking access…" />;
  const ok = need === "admin" ? isAdmin : isStaff;
  if (!ok)
    return (
      <div className="container-page py-16 text-center">
        <h1 className="text-2xl font-bold">Access restricted</h1>
        <p className="mt-2 text-muted-foreground">This area is only for SwiftDrive {need === "admin" ? "administrators" : "staff"}.</p>
        <Link to="/account" className="mt-4 inline-block text-primary hover:underline">Go to my account</Link>
      </div>
    );
  return <>{children}</>;
}
