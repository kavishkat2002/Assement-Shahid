/**
 * @file SiteHeader.tsx
 * @description Global sticky navigation header for SwiftDrive Rentals.
 *
 * Responsibilities:
 * - Brand identification and home route linking.
 * - Primary desktop and mobile responsive navigation links.
 * - Dynamic authentication menu:
 *    - Anonymous users: "Sign in" link and "Create account" button.
 *    - Authenticated users: Role-aware links (Admin / Staff / Customer Account)
 *      and instantaneous sign-out action with route redirection.
 * - Accessible mobile hamburger drawer with ARIA disclosure states.
 */

import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

/**
 * Primary navigation items accessible to all users.
 */
const MAIN_NAV_ITEMS = [
  { to: "/vehicles", label: "Vehicles" },
  { to: "/about", label: "About" },
  { to: "/terms", label: "Rental terms" },
  { to: "/blog", label: "Travel guides" },
  { to: "/contact", label: "Contact" },
] as const;

/**
 * SiteHeader component.
 * Renders sticky top navigation across all public and authenticated application routes.
 */
export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isStaff, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  /**
   * Closes mobile navigation drawer upon selecting any navigation link.
   */
  const closeMenu = () => setMobileMenuOpen(false);

  /**
   * Action handler for user logout.
   * Signs the user out of the active Supabase session and routes them to the homepage.
   */
  const handleSignOut = async () => {
    closeMenu();
    await signOut();
    navigate({ to: "/" });
  };

  /**
   * Conditional links rendered based on whether a session is currently active.
   */
  const renderAuthLinks = () => {
    if (user) {
      return (
        <>
          {isAdmin && (
            <Link to="/admin" className="nav-link" onClick={closeMenu}>
              Admin
            </Link>
          )}
          {isStaff && (
            <Link to="/staff" className="nav-link" onClick={closeMenu}>
              Staff
            </Link>
          )}
          <Link to="/account" className="nav-link" onClick={closeMenu}>
            My account
          </Link>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </>
      );
    }

    return (
      <>
        <Link to="/login" className="nav-link" onClick={closeMenu}>
          Sign in
        </Link>
        <Button asChild size="sm">
          <Link to="/signup" onClick={closeMenu}>
            Create account
          </Link>
        </Button>
      </>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-card">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        {/* Brand identity logo */}
        <Link
          to="/"
          className="flex items-center gap-1.5 font-display text-lg font-bold text-foreground"
        >
          SwiftDrive <span className="font-medium text-muted-foreground">Rentals</span>
        </Link>

        {/* Desktop primary navigation */}
        <nav aria-label="Main" className="hidden items-center gap-6 lg:flex">
          {MAIN_NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="nav-link"
              activeProps={{ className: "nav-link text-primary font-medium" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop authentication and account actions */}
        <div className="hidden items-center gap-4 lg:flex">
          {renderAuthLinks()}
        </div>

        {/* Mobile menu toggle button */}
        <button
          className="rounded-md p-2 lg:hidden text-foreground hover:bg-muted transition-colors"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((prev) => !prev)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile navigation collapse panel */}
      {mobileMenuOpen && (
        <div className="border-t bg-card lg:hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <nav
            aria-label="Mobile"
            className="container-page flex flex-col gap-1 py-3 [&_.nav-link]:py-2"
          >
            {MAIN_NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="nav-link"
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col items-start gap-2 border-t pt-3">
              {renderAuthLinks()}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
