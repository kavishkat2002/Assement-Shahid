/**
 * @file InquiryForm.tsx
 * @description Contact and custom quote inquiry form for SwiftDrive Rentals.
 *
 * Capabilities & Security:
 * - Robust runtime validation powered by Zod schema rules.
 * - Automatic customer identity binding if the user is authenticated (`user_id`, `email`).
 * - Graceful error state handling: form state is preserved if a database insertion error occurs,
 *   allowing customers to retry without re-typing their message.
 * - Accessible error messaging (`aria-invalid`, `role="alert"`, descriptive labels).
 * - Inline confirmation screen with prompt to submit subsequent inquiries if desired.
 */

import { useState, type FormEvent } from "react";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { friendlyError } from "@/lib/format";
import { Field, selectClass } from "./common";

/**
 * Validation schema for public rental inquiries.
 */
const inquirySchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(100),
  email: z.string().trim().email("Please enter a valid email address.").max(255),
  phone: z
    .string()
    .trim()
    .max(30, "Phone number is too long.")
    .regex(/^[+0-9 ()-]*$/, "Use digits, spaces, + or - only.")
    .optional(),
  category: z.enum([
    "general",
    "booking",
    "pricing",
    "corporate",
    "long_term",
    "other",
  ]),
  message: z
    .string()
    .trim()
    .min(10, "Please write at least 10 characters.")
    .max(2000, "Please keep it under 2000 characters."),
});

type InquiryFormValues = {
  name: string;
  email: string;
  phone: string;
  category: "general" | "booking" | "pricing" | "corporate" | "long_term" | "other";
  message: string;
};

/**
 * InquiryForm component.
 */
export function InquiryForm() {
  const { user } = useAuth();

  // Form field state pre-populated with active user email if available
  const [values, setValues] = useState<InquiryFormValues>({
    name: "",
    email: user?.email ?? "",
    phone: "",
    category: "general",
    message: "",
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "sending" | "done">("idle");
  const [serverError, setServerError] = useState("");

  /**
   * Helper function generating change listeners for individual form inputs.
   */
  const handleFieldChange = (key: keyof InquiryFormValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setValues((prev) => ({ ...prev, [key]: e.target.value }));
  };

  /**
   * Validates values and dispatches inquiry insert to Supabase.
   */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError("");

    // Validate payload against Zod schema rules
    const result = inquirySchema.safeParse({
      ...values,
      phone: values.phone || undefined,
    });

    if (!result.success) {
      const errorMap: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errorMap[String(issue.path[0])] = issue.message;
      });
      setValidationErrors(errorMap);
      return;
    }

    setValidationErrors({});
    setSubmissionStatus("sending");

    // Insert new inquiry into rental_inquiries table
    const { error } = await supabase.from("rental_inquiries").insert({
      ...result.data,
      phone: result.data.phone ?? null,
      user_id: user?.id ?? null,
    });

    if (error) {
      setSubmissionStatus("idle");
      // Retain form inputs so the customer can retry without losing their text
      setServerError(friendlyError(error));
      return;
    }

    setSubmissionStatus("done");
  }

  // Render confirmation state upon successful submission
  if (submissionStatus === "done") {
    return (
      <div
        role="status"
        className="flex flex-col items-start gap-2 rounded-lg border bg-success-soft p-6"
      >
        <CheckCircle2 className="h-6 w-6 text-success" aria-hidden="true" />
        <p className="font-semibold text-foreground">
          Thank you — your inquiry has been received.
        </p>
        <p className="text-sm text-muted-foreground">
          Our team will reply to {values.email}.
          {user ? " You can also follow it in your account." : ""}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setValues((prev) => ({ ...prev, message: "" }));
            setSubmissionStatus("idle");
          }}
        >
          Send another
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      {/* Customer full name */}
      <Field label="Full name" htmlFor="inq-name" error={validationErrors["name"]}>
        <Input
          id="inq-name"
          value={values.name}
          onChange={handleFieldChange("name")}
          autoComplete="name"
          aria-invalid={Boolean(validationErrors["name"])}
        />
      </Field>

      {/* Reply-to email address */}
      <Field label="Email" htmlFor="inq-email" error={validationErrors["email"]}>
        <Input
          id="inq-email"
          type="email"
          value={values.email}
          onChange={handleFieldChange("email")}
          autoComplete="email"
          aria-invalid={Boolean(validationErrors["email"])}
        />
      </Field>

      {/* Telephone number (optional) */}
      <Field
        label="Telephone (optional)"
        htmlFor="inq-phone"
        error={validationErrors["phone"]}
      >
        <Input
          id="inq-phone"
          type="tel"
          value={values.phone}
          onChange={handleFieldChange("phone")}
          autoComplete="tel"
        />
      </Field>

      {/* Inquiry classification category */}
      <Field label="Inquiry type" htmlFor="inq-cat">
        <select
          id="inq-cat"
          className={selectClass}
          value={values.category}
          onChange={handleFieldChange("category")}
        >
          <option value="general">General question</option>
          <option value="booking">Existing booking</option>
          <option value="pricing">Rates and pricing</option>
          <option value="long_term">Long-term rental</option>
          <option value="corporate">Corporate / events</option>
          <option value="other">Other</option>
        </select>
      </Field>

      {/* Inquiry message text */}
      <div className="sm:col-span-2">
        <Field label="Message" htmlFor="inq-msg" error={validationErrors["message"]}>
          <Textarea
            id="inq-msg"
            rows={5}
            value={values.message}
            onChange={handleFieldChange("message")}
            aria-invalid={Boolean(validationErrors["message"])}
          />
        </Field>
      </div>

      {/* Server or network failure message */}
      {serverError && (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {serverError}
        </p>
      )}

      {/* Submission CTA */}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={submissionStatus === "sending"}>
          {submissionStatus === "sending" ? "Sending…" : "Send inquiry"}
        </Button>
      </div>
    </form>
  );
}
