/**
 * SwiftDrive Rentals — Set New Password Route
 *
 * Handles the password update confirmation when a user arrives from
 * an email recovery link. Calls supabase.auth.updateUser to persist the new password.
 */

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
  head: () => ({
    meta: [
      { title: "Choose a new password — SwiftDrive Rentals" },
      { name: "description", content: "Set a new password for your SwiftDrive account." },
      { property: "og:title", content: "Choose a new password — SwiftDrive Rentals" },
      { property: "og:description", content: "Set a new password for your SwiftDrive account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setErrorMessage(friendlyError(error));
        return;
      }

      toast.success("Password updated successfully. You are now signed in.");
      void navigate({ to: "/account" });
    } catch (err) {
      setErrorMessage(friendlyError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard title="Choose a new password">
      <p className="mb-6 text-sm text-muted-foreground">
        Please enter and confirm your new account password below.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field label="New password" htmlFor="r-pw">
          <Input
            id="r-pw"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Field label="Confirm password" htmlFor="r-confirm-pw" error={errorMessage}>
          <Input
            id="r-confirm-pw"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Field>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Updating password…" : "Update password"}
        </Button>
      </form>
    </AuthCard>
  );
}

