/**
 * SwiftDrive Rentals — Password Recovery Request Route
 *
 * Allows users to request a secure password reset link dispatched via email.
 * The redirect destination points to the /reset-password route.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/site/common";
import { friendlyError } from "@/lib/format";
import { AuthCard } from "./login";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — SwiftDrive Rentals" },
      { name: "description", content: "Request a password reset link for your SwiftDrive account." },
      { property: "og:title", content: "Reset your password — SwiftDrive Rentals" },
      { property: "og:description", content: "Request a password reset link for your SwiftDrive account." },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Basic email format validation
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + "/reset-password",
      });

      if (error) {
        setErrorMessage(friendlyError(error));
        return;
      }

      setSuccessMessage(
        "If an account exists for this email address, a password reset link has been dispatched to your inbox.",
      );
    } catch (err) {
      setErrorMessage(friendlyError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard title="Reset your password">
      <p className="mb-6 text-sm text-muted-foreground">
        Enter the email address associated with your SwiftDrive account and we will send you a link to reset your password.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field label="Email address" htmlFor="f-email" error={errorMessage}>
          <Input
            id="f-email"
            type="email"
            autoComplete="email"
            placeholder="e.g. name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        {successMessage && (
          <p role="status" className="rounded-md bg-success-soft p-3 text-sm font-medium text-success">
            {successMessage}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Sending link…" : "Send reset link"}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm">
        <Link to="/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    </AuthCard>
  );
}

