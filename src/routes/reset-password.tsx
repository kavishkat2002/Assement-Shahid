import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/site/common";
import { friendlyError } from "@/lib/format";
import { AuthCard } from "./login";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Choose a new password — SwiftDrive Rentals" },
    { name: "description", content: "Set a new password for your account." },
    { property: "og:title", content: "Choose a new password — SwiftDrive Rentals" },
    { property: "og:description", content: "Set a new password for your account." },
  ] }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setErr("Use at least 8 characters.");
    if (pw !== pw2) return setErr("The passwords don't match.");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return setErr(friendlyError(error));
    toast.success("Password updated.");
    navigate({ to: "/account" });
  }
  return (
    <AuthCard title="Choose a new password">
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="New password" htmlFor="r-1"><Input id="r-1" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
        <Field label="Confirm password" htmlFor="r-2" error={err}><Input id="r-2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
        <Button type="submit" className="w-full">Update password</Button>
      </form>
    </AuthCard>
  );
}
