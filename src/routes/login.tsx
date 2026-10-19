import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/site/common";
import { friendlyError } from "@/lib/format";

const safePath = (p?: string) => (p && p.startsWith("/") && !p.startsWith("//") ? p : "/account");

export const Route = createFileRoute("/login")({
  validateSearch: (s) => z.object({ redirect: z.string().optional() }).parse(s),
  head: () => ({ meta: [
    { title: "Sign in — SwiftDrive Rentals" },
    { name: "description", content: "Sign in to manage your SwiftDrive bookings." },
    { property: "og:title", content: "Sign in — SwiftDrive Rentals" },
    { property: "og:description", content: "Sign in to manage your SwiftDrive bookings." },
  ] }),
  component: Login,
});

export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="container-page flex justify-center py-14">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export async function googleSignIn(redirect: string) {
  sessionStorage.setItem("sd_after_login", redirect);
  const r = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + "/login" },
  });
  return r.error ? friendlyError(r.error) : "";
}

function Login() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) return setError("Please enter your email and password.");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return setError(friendlyError(error));
    navigate({ to: safePath(redirect) });
  }

  // After a Google round-trip the session exists; continue to the stored destination.
  if (typeof window !== "undefined") {
    supabase.auth.getSession().then(({ data }) => {
      const stored = sessionStorage.getItem("sd_after_login");
      if (data.session && stored) { sessionStorage.removeItem("sd_after_login"); navigate({ to: safePath(stored) }); }
    });
  }

  return (
    <AuthCard title="Sign in">
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Email" htmlFor="l-email"><Input id="l-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password" htmlFor="l-pw"><Input id="l-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
      </form>
      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
      <Button variant="outline" className="w-full" onClick={async () => setError(await googleSignIn(safePath(redirect)))}>Continue with Google</Button>
      <div className="mt-6 flex justify-between text-sm">
        <Link to="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
        <Link to="/signup" search={{ redirect }} className="text-primary hover:underline">Create an account</Link>
      </div>
    </AuthCard>
  );
}
