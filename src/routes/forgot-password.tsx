import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/site/common";
import { friendlyError } from "@/lib/format";
import { AuthCard } from "./login";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [
    { title: "Reset your password — SwiftDrive Rentals" },
    { name: "description", content: "Request a password reset link." },
    { property: "og:title", content: "Reset your password — SwiftDrive Rentals" },
    { property: "og:description", content: "Request a password reset link." },
  ] }),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Please enter a valid email address.");
    setErr("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + "/reset-password" });
    if (error) return setErr(friendlyError(error));
    setMsg("If an account exists for this email, a reset link is on its way.");
  }
  return (
    <AuthCard title="Reset your password">
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Email" htmlFor="f-e" error={err}><Input id="f-e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        {msg && <p role="status" className="text-sm text-success">{msg}</p>}
        <Button type="submit" className="w-full">Send reset link</Button>
      </form>
    </AuthCard>
  );
}
