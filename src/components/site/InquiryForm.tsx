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

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(100),
  email: z.string().trim().email("Please enter a valid email address.").max(255),
  phone: z.string().trim().max(30, "Phone number is too long.").regex(/^[+0-9 ()-]*$/, "Use digits, spaces, + or - only.").optional(),
  category: z.enum(["general", "booking", "pricing", "corporate", "long_term", "other"]),
  message: z.string().trim().min(10, "Please write at least 10 characters.").max(2000, "Please keep it under 2000 characters."),
});

export function InquiryForm() {
  const { user } = useAuth();
  const [values, setValues] = useState({ name: "", email: user?.email ?? "", phone: "", category: "general", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [formError, setFormError] = useState("");

  const set = (k: keyof typeof values) => (e: { target: { value: string } }) => setValues({ ...values, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    const parsed = schema.safeParse({ ...values, phone: values.phone || undefined });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (errs[String(i.path[0])] = i.message));
      setErrors(errs);
      return;
    }
    setErrors({});
    setStatus("sending");
    const { error } = await supabase.from("rental_inquiries").insert({ ...parsed.data, phone: parsed.data.phone ?? null, user_id: user?.id ?? null });
    if (error) {
      setStatus("idle");
      setFormError(friendlyError(error)); // form data is kept so the user can retry
      return;
    }
    setStatus("done");
  }

  if (status === "done")
    return (
      <div role="status" className="flex flex-col items-start gap-2 rounded-lg border bg-success-soft p-6">
        <CheckCircle2 className="h-6 w-6 text-success" aria-hidden />
        <p className="font-semibold">Thank you — your inquiry has been received.</p>
        <p className="text-sm text-muted-foreground">Our team will reply to {values.email}.{user ? " You can also follow it in your account." : ""}</p>
        <Button variant="outline" size="sm" onClick={() => { setValues({ ...values, message: "" }); setStatus("idle"); }}>Send another</Button>
      </div>
    );

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name" htmlFor="inq-name" error={errors["name"]}>
        <Input id="inq-name" value={values.name} onChange={set("name")} autoComplete="name" aria-invalid={!!errors["name"]} />
      </Field>
      <Field label="Email" htmlFor="inq-email" error={errors["email"]}>
        <Input id="inq-email" type="email" value={values.email} onChange={set("email")} autoComplete="email" aria-invalid={!!errors["email"]} />
      </Field>
      <Field label="Telephone (optional)" htmlFor="inq-phone" error={errors["phone"]}>
        <Input id="inq-phone" type="tel" value={values.phone} onChange={set("phone")} autoComplete="tel" />
      </Field>
      <Field label="Inquiry type" htmlFor="inq-cat">
        <select id="inq-cat" className={selectClass} value={values.category} onChange={set("category")}>
          <option value="general">General question</option>
          <option value="booking">Existing booking</option>
          <option value="pricing">Rates and pricing</option>
          <option value="long_term">Long-term rental</option>
          <option value="corporate">Corporate / events</option>
          <option value="other">Other</option>
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Message" htmlFor="inq-msg" error={errors["message"]}>
          <Textarea id="inq-msg" rows={5} value={values.message} onChange={set("message")} aria-invalid={!!errors["message"]} />
        </Field>
      </div>
      {formError && <p role="alert" className="text-sm text-destructive sm:col-span-2">{formError}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Send inquiry"}</Button>
      </div>
    </form>
  );
}
