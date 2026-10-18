import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/site/common";
import { friendlyError } from "@/lib/format";
import { AuthCard, googleSignIn } from "./login";

const safePath = (p?: string) => (p && p.startsWith("/") && !p.startsWith("//") ? p : "/account");

const schema = z.object({
  full_name: z.string().trim().min(2, "Please enter your full name.").max(100),
  email: z.string().trim().email("Please enter a valid email address.").max(255),
  phone: z.string().trim().regex(/^[+0-9 ()-]{7,20}$/, "Enter a valid phone number, e.g. +94 77 123 4567."),
  password: z.string().min(8, "Use at least 8 characters.").max(72),
});

export const Route = createFileRoute("/signup")({
  validateSearch: (s) => z.object({ redirect: z.string().optional() }).parse(s),
  head: () => ({ meta: [
    { title: "Create an account — SwiftDrive Rentals" },
    { name: "description", content: "Register to book vehicles and track your rentals." },
    { property: "og:title", content: "Create an account — SwiftDrive Rentals" },
    { property: "og:description", content: "Register to book vehicles and track your rentals." },
  ] }),
  component: Signup,
});

function Signup() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [v, setV] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const p = schema.safeParse(v);
    if (!p.success) {
      const errs: Record<string, string> = {};
      p.error.issues.forEach((i) => (errs[String(i.path[0])] = i.message));
      return setErrors(errs);
    }
    setErrors({}); setBusy(true); setFormError("");
    const { data, error } = await supabase.auth.signUp({
      email: p.data.email, password: p.data.password,
      options: { emailRedirectTo: window.location.origin + "/account", data: { full_name: p.data.full_name, phone: p.data.phone } },
    });
    setBusy(false);
    if (error) {
      console.error("Signup error:", error);
      return setFormError(friendlyError(error));
    }
    // An existing confirmed email returns a user with no identities.
    if (data.user && data.user.identities?.length === 0) return setFormError("An account with this email already exists. Try signing in instead.");
    if (data.session) {
      navigate({ to: safePath(redirect) });
      return;
    }
    setDone(true);
  }

  if (done) return (
    <AuthCard title="Check your email">
      <p className="text-muted-foreground">We've sent a confirmation link to <strong>{v.email}</strong>. Open it to activate your account, then sign in.</p>
      <Button asChild className="mt-6"><Link to="/login">Go to sign in</Link></Button>
    </AuthCard>
  );

  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  return (
    <AuthCard title="Create your account">
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Full name" htmlFor="s-n" error={errors["full_name"]}><Input id="s-n" autoComplete="name" value={v.full_name} onChange={set("full_name")} /></Field>
        <Field label="Email" htmlFor="s-e" error={errors["email"]}><Input id="s-e" type="email" autoComplete="email" value={v.email} onChange={set("email")} /></Field>
        <Field label="Mobile number" htmlFor="s-p" error={errors["phone"]}><Input id="s-p" type="tel" autoComplete="tel" value={v.phone} onChange={set("phone")} /></Field>
        <Field label="Password" htmlFor="s-pw" error={errors["password"]} hint="At least 8 characters."><Input id="s-pw" type="password" autoComplete="new-password" value={v.password} onChange={set("password")} /></Field>
        {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating account…" : "Create account"}</Button>
      </form>
      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
      <Button variant="outline" className="w-full" onClick={async () => setFormError(await googleSignIn(redirect && redirect.startsWith("/") ? redirect : "/account"))}>Continue with Google</Button>
      <p className="mt-6 text-sm">Already registered? <Link to="/login" search={{ redirect }} className="text-primary hover:underline">Sign in</Link></p>
    </AuthCard>
  );
}
