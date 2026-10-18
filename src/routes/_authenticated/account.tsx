import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, ErrorState, Field, LoadingState, PageHeader, StatusBadge } from "@/components/site/common";
import { useAuth } from "@/lib/auth";
import { formatDate, formatDateTime, formatLKR, friendlyError, todayColombo } from "@/lib/format";
import { outstanding } from "@/lib/booking";

export const Route = createFileRoute("/_authenticated/account")({
  validateSearch: (s) => z.object({ booking: z.string().optional() }).parse(s),
  head: () => ({ meta: [
    { title: "My account — SwiftDrive Rentals" },
    { name: "description", content: "Your bookings, payments, inquiries and profile." },
    { property: "og:title", content: "My account — SwiftDrive Rentals" },
    { property: "og:description", content: "Your bookings, payments, inquiries and profile." },
  ] }),
  component: Account,
});

const BOOKING_SELECT = "*, vehicle:vehicles(make, model, year, registration_no, images:vehicle_images(url, sort_order)), payments(id, amount_lkr, kind, method, status, provider_reference, created_at)";

function Account() {
  const { user } = useAuth();
  const { booking: highlight } = Route.useSearch();
  const bookings = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select(BOOKING_SELECT).eq("customer_id", user!.id).order("pickup_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const today = todayColombo();
  const upcoming = bookings.data?.filter((b) => ["pending", "confirmed", "active"].includes(b.status)) ?? [];
  const past = bookings.data?.filter((b) => !["pending", "confirmed", "active"].includes(b.status)) ?? [];

  return (
    <>
      <PageHeader title="My account" description={user?.email ?? ""} />
      <div className="container-page py-8">
        <Tabs defaultValue="bookings">
          <TabsList>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="inquiries">Inquiries</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>
          <TabsContent value="bookings" className="mt-6 space-y-8">
            {bookings.isLoading ? <LoadingState /> : bookings.error ? <ErrorState message={friendlyError(bookings.error)} onRetry={() => bookings.refetch()} /> : (
              <>
                <section>
                  <h2 className="mb-3 text-lg font-semibold">Upcoming and current</h2>
                  {upcoming.length === 0 ? <EmptyState title="No upcoming bookings" description="When you reserve a vehicle it will appear here with its status." action={<Button asChild><Link to="/vehicles">Find a vehicle</Link></Button>} /> :
                    <div className="space-y-4">{upcoming.map((b) => <BookingCard key={b.id} b={b} today={today} highlight={b.id === highlight} />)}</div>}
                </section>
                <section>
                  <h2 className="mb-3 text-lg font-semibold">Past bookings</h2>
                  {past.length === 0 ? <p className="text-sm text-muted-foreground">No past bookings yet.</p> :
                    <div className="space-y-4">{past.map((b) => <BookingCard key={b.id} b={b} today={today} />)}</div>}
                </section>
              </>
            )}
          </TabsContent>
          <TabsContent value="inquiries" className="mt-6"><MyInquiries /></TabsContent>
          <TabsContent value="profile" className="mt-6"><Profile /></TabsContent>
        </Tabs>
      </div>
    </>
  );
}

type Booking = NonNullable<ReturnType<typeof useQuery<any>>["data"]>;

function BookingCard({ b, highlight }: { b: Booking; today: string; highlight?: boolean }) {
  const qc = useQueryClient();
  const paid = (b.payments ?? []).filter((p: any) => p.status === "succeeded" && p.kind !== "refund").reduce((s: number, p: any) => s + Number(p.amount_lkr), 0);
  const total = Number(b.rental_amount_lkr) + Number(b.deposit_lkr);
  const img = [...(b.vehicle?.images ?? [])].sort((x: any, y: any) => x.sort_order - y.sort_order)[0];
  const cancel = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("customer_cancel_booking", { _booking_id: b.id });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (r) => { toast.success(r === "cancelled" ? "Booking cancelled." : "Cancellation request sent to our team."); qc.invalidateQueries({ queryKey: ["my-bookings"] }); },
    onError: (e) => toast.error(friendlyError(e)),
  });
  const [review, setReview] = useState(false);

  return (
    <article className={"rounded-lg border bg-card p-5 " + (highlight ? "ring-2 ring-primary" : "")}>
      <div className="flex flex-col gap-4 sm:flex-row">
        {img && <img src={img.url} alt="" loading="lazy" className="h-24 w-36 rounded object-cover" />}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{b.vehicle?.make} {b.vehicle?.model}</h3>
            <StatusBadge status={b.status} />
            {b.cancellation_requested && <StatusBadge status="cancellation requested" className="bg-warning-soft text-warning" />}
          </div>
          <p className="text-sm text-muted-foreground">Ref {b.reference}</p>
          <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <div><dt className="inline text-muted-foreground">Pickup: </dt><dd className="inline">{formatDate(b.pickup_date)} · {b.pickup_location}</dd></div>
            <div><dt className="inline text-muted-foreground">Return: </dt><dd className="inline">{formatDate(b.return_date)} · {b.return_location}</dd></div>
            <div><dt className="inline text-muted-foreground">Rental ({b.rental_days} days): </dt><dd className="inline">{formatLKR(b.rental_amount_lkr)}</dd></div>
            <div><dt className="inline text-muted-foreground">Deposit: </dt><dd className="inline">{formatLKR(b.deposit_lkr)}</dd></div>
            <div><dt className="inline text-muted-foreground">Paid: </dt><dd className="inline">{formatLKR(paid)}</dd></div>
            <div><dt className="inline text-muted-foreground">Outstanding: </dt><dd className="inline font-semibold">{formatLKR(outstanding(total, paid))}</dd></div>
          </dl>
          {b.payments?.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              {b.payments.map((p: any) => <li key={p.id}>{formatDateTime(p.created_at)} — {formatLKR(p.amount_lkr)} {p.kind} via {p.method.replace("_", " ")} ({p.status}){p.provider_reference ? ` · ref ${p.provider_reference}` : ""}</li>)}
            </ul>
          )}
          {b.staff_notes && <p className="mt-2 text-sm"><span className="text-muted-foreground">Note from SwiftDrive:</span> {b.staff_notes}</p>}
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          {["pending", "confirmed"].includes(b.status) && !b.cancellation_requested && (
            <Button variant="outline" size="sm" disabled={cancel.isPending} onClick={() => { if (confirm("Cancel this booking? Within the cancellation window this becomes a request reviewed by our team.")) cancel.mutate(); }}>
              {b.status === "pending" ? "Cancel booking" : "Cancel / request cancellation"}
            </Button>
          )}
          {b.status === "completed" && <Button variant="outline" size="sm" onClick={() => setReview(!review)}>Leave a review</Button>}
        </div>
      </div>
      {review && <ReviewForm bookingId={b.id} onDone={() => setReview(false)} />}
    </article>
  );
}

function ReviewForm({ bookingId, onDone }: { bookingId: string; onDone: () => void }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (comment.trim().length < 5) return setErr("Please write a short comment.");
    if (name.trim().length < 2) return setErr("Please enter a display name.");
    const { error } = await supabase.from("reviews").insert({ booking_id: bookingId, customer_id: user!.id, rating, comment: comment.trim(), display_name: name.trim() });
    if (error) return setErr(error.code === "23505" ? "You've already reviewed this rental." : friendlyError(error));
    toast.success("Thank you for your review.");
    onDone();
  }
  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-[120px_1fr]">
      <Field label="Rating" htmlFor={`rv-r-${bookingId}`}>
        <select id={`rv-r-${bookingId}`} className="h-10 rounded-md border bg-card px-2" value={rating} onChange={(e) => setRating(Number(e.target.value))}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} / 5</option>)}</select>
      </Field>
      <Field label="Display name" htmlFor={`rv-n-${bookingId}`}><Input id={`rv-n-${bookingId}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></Field>
      <div className="sm:col-span-2"><Field label="Comment" htmlFor={`rv-c-${bookingId}`} error={err}><Textarea id={`rv-c-${bookingId}`} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} /></Field></div>
      <div><Button type="submit" size="sm">Submit review</Button></div>
    </form>
  );
}

function MyInquiries() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["my-inquiries", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("rental_inquiries").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  if (q.isLoading) return <LoadingState />;
  if (q.error) return <ErrorState message={friendlyError(q.error)} onRetry={() => q.refetch()} />;
  if (!q.data!.length) return <EmptyState title="No inquiries yet" description="Messages you send while signed in appear here with our reply." action={<Button asChild variant="outline"><Link to="/contact">Send an inquiry</Link></Button>} />;
  return (
    <ul className="space-y-3">
      {q.data!.map((i) => (
        <li key={i.id} className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2"><StatusBadge status={i.status} /><span className="text-xs text-muted-foreground">{formatDateTime(i.created_at)} · {i.category.replace("_", " ")}</span></div>
          <p className="mt-2 text-sm">{i.message}</p>
          {i.staff_response && <p className="mt-2 rounded bg-secondary p-3 text-sm"><span className="font-semibold">SwiftDrive: </span>{i.staff_response}</p>}
        </li>
      ))}
    </ul>
  );
}

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Please enter your name.").max(100),
  phone: z.string().trim().max(20).regex(/^[+0-9 ()-]*$/, "Enter a valid phone number."),
  nic_or_passport: z.string().trim().max(30),
  driving_licence: z.string().trim().max(30),
  address: z.string().trim().max(300),
});

function Profile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const p = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [v, setV] = useState({ full_name: "", phone: "", nic_or_passport: "", driving_licence: "", address: "" });
  const [err, setErr] = useState("");
  const [pw, setPw] = useState("");
  useEffect(() => {
    if (p.data) setV({ full_name: p.data.full_name ?? "", phone: p.data.phone ?? "", nic_or_passport: p.data.nic_or_passport ?? "", driving_licence: p.data.driving_licence ?? "", address: p.data.address ?? "" });
  }, [p.data]);

  async function save(e: FormEvent) {
    e.preventDefault();
    const r = profileSchema.safeParse(v);
    if (!r.success) return setErr(r.error.issues[0]?.message ?? "Please check the form.");
    setErr("");
    const { error } = await supabase.from("profiles").update({ ...r.data, updated_at: new Date().toISOString() }).eq("id", user!.id);
    if (error) return setErr(friendlyError(error));
    toast.success("Profile saved.");
    qc.invalidateQueries({ queryKey: ["profile"] });
  }
  async function changePw(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return void toast.error("Use at least 8 characters.");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return void toast.error(friendlyError(error));
    setPw(""); toast.success("Password changed.");
  }
  if (p.isLoading) return <LoadingState />;
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  return (
    <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      <form onSubmit={save} className="grid gap-4 rounded-lg border bg-card p-6 sm:grid-cols-2">
        <Field label="Full name" htmlFor="p-n"><Input id="p-n" value={v.full_name} onChange={set("full_name")} /></Field>
        <Field label="Phone" htmlFor="p-p"><Input id="p-p" type="tel" value={v.phone} onChange={set("phone")} /></Field>
        <Field label="NIC or passport no." htmlFor="p-id"><Input id="p-id" value={v.nic_or_passport} onChange={set("nic_or_passport")} /></Field>
        <Field label="Driving licence no." htmlFor="p-dl"><Input id="p-dl" value={v.driving_licence} onChange={set("driving_licence")} /></Field>
        <div className="sm:col-span-2"><Field label="Address" htmlFor="p-a"><Textarea id="p-a" rows={2} value={v.address} onChange={set("address")} /></Field></div>
        {err && <p role="alert" className="text-sm text-destructive sm:col-span-2">{err}</p>}
        <div><Button type="submit">Save profile</Button></div>
      </form>
      <form onSubmit={changePw} className="space-y-4 rounded-lg border bg-card p-6">
        <h2 className="font-semibold">Change password</h2>
        <Field label="New password" htmlFor="p-pw"><Input id="p-pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
        <Button type="submit" variant="outline">Update password</Button>
      </form>
    </div>
  );
}
