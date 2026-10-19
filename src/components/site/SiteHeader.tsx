import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const NAV = [
  { to: "/vehicles", label: "Vehicles" },
  { to: "/about", label: "About" },
  { to: "/terms", label: "Rental terms" },
  { to: "/blog", label: "Travel guides" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, isStaff, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const accountLinks = user ? (
    <>
      {isAdmin && <Link to="/admin" className="nav-link" onClick={() => setOpen(false)}>Admin</Link>}
      {isStaff && <Link to="/staff" className="nav-link" onClick={() => setOpen(false)}>Staff</Link>}
      <Link to="/account" className="nav-link" onClick={() => setOpen(false)}>My account</Link>
      <Button variant="outline" size="sm" onClick={async () => { await signOut(); setOpen(false); navigate({ to: "/" }); }}>
        Sign out
      </Button>
    </>
  ) : (
    <>
      <Link to="/login" className="nav-link" onClick={() => setOpen(false)}>Sign in</Link>
      <Button asChild size="sm"><Link to="/signup" onClick={() => setOpen(false)}>Create account</Link></Button>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b bg-card">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-1.5 font-display text-lg font-bold text-foreground">
          SwiftDrive <span className="font-medium text-muted-foreground">Rentals</span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-6 lg:flex">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="nav-link" activeProps={{ className: "nav-link text-primary" }}>{n.label}</Link>
          ))}
        </nav>
        <div className="hidden items-center gap-4 lg:flex">{accountLinks}</div>
        <button className="rounded-md p-2 lg:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t bg-card lg:hidden">
          <nav aria-label="Mobile" className="container-page flex flex-col gap-1 py-3 [&_.nav-link]:py-2">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="nav-link" onClick={() => setOpen(false)}>{n.label}</Link>
            ))}
            <div className="mt-2 flex flex-col items-start gap-2 border-t pt-3">{accountLinks}</div>
          </nav>
        </div>
      )}
    </header>
  );
}
