/**
 * SwiftDrive Rentals — User Sign-In Route
 *
 * Provides authentication via email/password credentials or Google OAuth.
 * Implements safe redirection handling to protect against open-redirect vulnerabilities.
 */

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/site/common";
import { friendlyError } from "@/lib/format";

/**
 * Validates and sanitizes post-login redirect destinations.
 * Protects against Open Redirect vulnerabilities by requiring relative paths
 * beginning with a single '/' and disallowing protocol-relative '//' URLs.
 *
 * @param path Optional target redirect URL
 * @returns Safe relative path string defaulting to '/account'
 */
export const safePath = (path?: string): string => {
  if (path && path.startsWith("/") && !path.startsWith("//")) {
    return path;
  }
  return "/account";
};

/**
 * Route definition for /login with search param validation for redirects.
 */
export const Route = createFileRoute("/login")({
  validateSearch: (search) =>
    z.object({ redirect: z.string().optional() }).parse(search),
  head: () => ({
    meta: [
      { title: "Sign in — SwiftDrive Rentals" },
      { name: "description", content: "Sign in to manage your SwiftDrive rentals and bookings." },
      { property: "og:title", content: "Sign in — SwiftDrive Rentals" },
      { property: "og:description", content: "Sign in to manage your SwiftDrive rentals and bookings." },
    ],
  }),
  component: Login,
});

/**
 * Reusable card container for authentication forms (Sign In, Sign Up, Password Reset).
 */
export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="container-page flex justify-center py-14">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

/**
 * Initiates Google OAuth federated sign-in.
 * Temporarily stores the user's intended destination in sessionStorage so it can be restored
 * after the OAuth redirect loop finishes.
 *
 * @param redirect Target destination path after successful authentication
 * @returns Error message string if authentication initiation failed
 */
export async function googleSignIn(redirect: string): Promise<string> {
  try {
    sessionStorage.setItem("sd_after_login", redirect);
    const response = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/login",
      },
    });

    if (response.error) {
      return friendlyError(response.error);
    }
    return "";
  } catch (err) {
    return friendlyError(err);
  }
}

/**
 * Main Login view component.
 */
function Login() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resume navigation if returning from a third-party Google OAuth redirect
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const storedRedirect = sessionStorage.getItem("sd_after_login");
      if (data.session && storedRedirect) {
        sessionStorage.removeItem("sd_after_login");
        void navigate({ to: safePath(storedRedirect) });
      }
    });
  }, [navigate]);

  /**
   * Handles email + password credential submission.
   */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(friendlyError(signInError));
        return;
      }

      // Navigate to the validated redirect destination
      void navigate({ to: safePath(redirect) });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleGoogleSignIn = async () => {
    const errorMsg = await googleSignIn(safePath(redirect));
    if (errorMsg) {
      setError(errorMsg);
    }
  };

  return (
    <AuthCard title="Sign in">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field label="Email" htmlFor="l-email">
          <Input
            id="l-email"
            type="email"
            autoComplete="email"
            placeholder="e.g. customer@swiftdrive.lk"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label="Password" htmlFor="l-pw">
          <Input
            id="l-pw"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        variant="outline"
        className="w-full"
        type="button"
        onClick={handleGoogleSignIn}
      >
        Continue with Google
      </Button>

      <div className="mt-6 flex justify-between text-sm">
        <Link to="/forgot-password" className="text-primary hover:underline">
          Forgot password?
        </Link>
        <Link to="/signup" search={{ redirect }} className="text-primary hover:underline">
          Create an account
        </Link>
      </div>
    </AuthCard>
  );
}

