/**
 * SwiftDrive Rentals — New Customer Registration Route
 *
 * Allows new customers to register an account with their full name, email,
 * contact telephone number, and password. Validates input schema via Zod.
 * Upon registration, a Supabase confirmation email is dispatched.
 */

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/site/common";
import { friendlyError } from "@/lib/format";
import { AuthCard, googleSignIn, safePath } from "./login";

/**
 * Validation schema for new user sign-up.
 * Enforces realistic phone formats (Sri Lankan standard + international visitors).
 */
const signupSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Please enter your full name.")
    .max(100, "Full name must be under 100 characters."),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .max(255),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9 ()-]{7,20}$/, "Enter a valid phone number, e.g. +94 77 123 4567."),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(72, "Password is too long."),
});

type SignupFormData = z.infer<typeof signupSchema>;

export const Route = createFileRoute("/signup")({
  validateSearch: (search) =>
    z.object({ redirect: z.string().optional() }).parse(search),
  head: () => ({
    meta: [
      { title: "Create an account — SwiftDrive Rentals" },
      { name: "description", content: "Register to book vehicles and track your rentals across Sri Lanka." },
      { property: "og:title", content: "Create an account — SwiftDrive Rentals" },
      { property: "og:description", content: "Register to book vehicles and track your rentals across Sri Lanka." },
    ],
  }),
  component: Signup,
});

function Signup() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<SignupFormData>({
    full_name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  /**
   * Updates a single form field value and clears its specific validation error.
   */
  const handleInputChange = (field: keyof SignupFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  /**
   * Submits the registration form to Supabase Auth.
   */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const parseResult = signupSchema.safeParse(formData);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      parseResult.error.issues.forEach((issue) => {
        const fieldName = String(issue.path[0]);
        fieldErrors[fieldName] = issue.message;
      });
      setValidationErrors(fieldErrors);
      return;
    }

    setValidationErrors({});
    setIsSubmitting(true);
    setFormError("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email: parseResult.data.email,
        password: parseResult.data.password,
        options: {
          emailRedirectTo: window.location.origin + "/account",
          data: {
            full_name: parseResult.data.full_name,
            phone: parseResult.data.phone,
          },
        },
      });

      if (error) {
        console.error("[Signup] Error registering user:", error);
        setFormError(friendlyError(error));
        return;
      }

      // If an existing registered email was submitted, Supabase returns a user record with empty identities
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setFormError("An account with this email already exists. Try signing in instead.");
        return;
      }

      // If email confirmation is disabled or automatic login occurred
      if (data.session) {
        void navigate({ to: safePath(redirect) });
        return;
      }

      // Display the confirmation verification prompt
      setIsSuccess(true);
    } catch (err) {
      console.error("[Signup] Unexpected exception:", err);
      setFormError(friendlyError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  // Render confirmation screen after successful submission
  if (isSuccess) {
    return (
      <AuthCard title="Check your email">
        <p className="text-muted-foreground">
          We have sent an activation confirmation link to <strong>{formData.email}</strong>.
          Please open the link to activate your account, and then sign in to complete your reservation.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link to="/login">Proceed to sign in</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Create your account">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field label="Full name" htmlFor="s-name" error={validationErrors["full_name"]}>
          <Input
            id="s-name"
            autoComplete="name"
            placeholder="e.g. Kasun Silva"
            value={formData.full_name}
            onChange={handleInputChange("full_name")}
          />
        </Field>

        <Field label="Email" htmlFor="s-email" error={validationErrors["email"]}>
          <Input
            id="s-email"
            type="email"
            autoComplete="email"
            placeholder="e.g. kasun@example.com"
            value={formData.email}
            onChange={handleInputChange("email")}
          />
        </Field>

        <Field label="Mobile number" htmlFor="s-phone" error={validationErrors["phone"]}>
          <Input
            id="s-phone"
            type="tel"
            autoComplete="tel"
            placeholder="e.g. +94 77 123 4567"
            value={formData.phone}
            onChange={handleInputChange("phone")}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="s-pw"
          error={validationErrors["password"]}
          hint="Must be at least 8 characters long."
        >
          <Input
            id="s-pw"
            type="password"
            autoComplete="new-password"
            value={formData.password}
            onChange={handleInputChange("password")}
          />
        </Field>

        {formError && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {formError}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating account…" : "Create account"}
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
        onClick={async () => {
          const errorMsg = await googleSignIn(safePath(redirect));
          if (errorMsg) setFormError(errorMsg);
        }}
      >
        Continue with Google
      </Button>

      <p className="mt-6 text-sm text-muted-foreground">
        Already registered?{" "}
        <Link to="/login" search={{ redirect }} className="font-medium text-primary hover:underline">
          Sign in here
        </Link>
      </p>
    </AuthCard>
  );
}

