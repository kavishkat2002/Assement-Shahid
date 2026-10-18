import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, ErrorState, Field, LoadingState, PageHeader, StatusBadge, selectClass } from "@/components/site/common";
import { RoleGate } from "@/components/site/RoleGate";
import { BookingOps } from "@/components/staff/BookingOps";
import { InquiryOps } from "@/components/staff/InquiryOps";
import { AuditList } from "@/components/staff/AuditList";
import { formatDateTime, formatLKR, friendlyError } from "@/lib/format";
import { getCategories } from "@/services/vehicles";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [
    { title: "Admin dashboard — SwiftDrive Rentals" },
    { name: "description", content: "Fleet, staff, policies, payments and reports." },
    { property: "og:title", content: "Admin dashboard — SwiftDrive Rentals" },
    { property: "og:description", content: "Fleet, staff, policies, payments and reports." },
  ] }),
  component: () => <RoleGate need="admin"><Admin /></RoleGate>,
});

function Admin() {
  return (
    <>
      <PageHeader title="Admin dashboard" description="All figures are calculated from stored records." />
      <div className="container-page py-8">
        <Tabs defaultValue="overview">
          <TabsList className="flex h-auto flex-wrap">
            {["overview", "fleet", "bookings", "payments", "inquiries", "staff", "policies", "activity"].map((t) => <TabsTrigger key={t} value={t} className="capitalize">{t}</TabsTrigger>)}
          </TabsList>
          <TabsContent value="overview" className="mt-6"><Overview /></TabsContent>
          <TabsContent value="fleet" className="mt-6"><Fleet /></TabsContent>
          <TabsContent value="bookings" className="mt-6"><BookingOps /></TabsContent>
          <TabsContent value="payments" className="mt-6"><Payments /></TabsContent>
          <TabsContent value="inquiries" className="mt-6"><InquiryOps /></TabsContent>
          <TabsContent value="staff" className="mt-6"><StaffRoles /></TabsContent>
          <TabsContent value="policies" className="mt-6"><Policies /></TabsContent>
          <TabsContent value="activity" className="mt-6"><AuditList /></TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function Overview() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const q = useQuery({
    queryKey: ["admin-overview", from, to],
    queryFn: async () => {
      const [veh, bk, pay] = await Promise.all([
        supabase.from("vehicles").select("id, is_active"),
        supabase.from("bookings").select("status, rental_amount_lkr, created_at").gte("created_at", from).lte("created_at", to + "T23:59:59"),
        supabase.from("payments").select("amount_lkr, kind, status, created_at").gte("created_at", from).lte("created_at", to + "T23:59:59"),
      ]);
      for (const r of [veh, bk, pay]) if (r.error) throw r.error;
      const byStatus: Record<string, number> = {};
      bk.data!.forEach((b) => (byStatus[b.status] = (byStatus[b.status] ?? 0) + 1));
      const received = pay.data!.filter((p) => p.status === "succeeded" && p.kind !== "refund").reduce((s, p) => s + Number(p.amount_lkr), 0);
      const refunds = pay.data!.filter((p) => p.kind === "refund").reduce((s, p) => s + Number(p.amount_lkr), 0);
      const booked = bk.data!.filter((b) => !["cancelled", "rejected"].includes(b.status)).reduce((s, b) => s + Number(b.rental_amount_lkr), 0);
      return { fleet: veh.data!.length, active: veh.data!.filter((v) => v.is_active).length, bookings: bk.data!.length, byStatus, received, refunds, booked };
    },
  });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="From" htmlFor="o-f"><Input id="o-f" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-card" /></Field>
        <Field label="To" htmlFor="o-t"><Input id="o-t" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-card" /></Field>
      </div>
      {q.isLoading ? <LoadingState /> : q.error ? <ErrorState message={friendlyError(q.error)} onRetry={() => q.refetch()} /> : (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[["Fleet size", q.data!.fleet], ["Active listings", q.data!.active], ["Bookings created", q.data!.bookings], ["Pending", q.data!.byStatus["pending"] ?? 0],
              ["Rental value booked", formatLKR(q.data!.booked)], ["Payments received", formatLKR(q.data!.received)], ["Refunds", formatLKR(q.data!.refunds)], ["Completed", q.data!.byStatus["completed"] ?? 0]]
              .map(([l, v]) => <div key={String(l)} className="rounded-lg border bg-card p-4"><dt className="text-xs text-muted-foreground">{l}</dt><dd className="mt-1 text-xl font-bold">{v}</dd></div>)}
          </dl>
          <div className="rounded-lg border bg-card p-4">
            <p className="mb-3 font-semibold">Bookings by status (selected period)</p>
            {q.data!.bookings === 0 ? <p className="text-sm text-muted-foreground">No bookings in this period.</p> : (
              <ul className="space-y-2">
                {Object.entries(q.data!.byStatus).map(([s, n]) => (
                  <li key={s} className="flex items-center gap-3 text-sm">
                    <span className="w-24"><StatusBadge status={s} /></span>
                    <span className="h-2 rounded bg-primary" style={{ width: `${(n / q.data!.bookings) * 100}%`, minWidth: 4 }} aria-hidden />
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const emptyVehicle = { id: "", category_id: "", make: "", model: "", year: 2022, transmission: "automatic", fuel_type: "petrol", seats: 5, luggage: 2, daily_rate_lkr: 0, weekly_rate_lkr: "" as number | "", deposit_lkr: "" as number | "", location: "Negombo", registration_no: "", mileage_km: 0, description: "", features: "", is_active: true };

function Fleet() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<typeof emptyVehicle | null>(null);
  const list = useQuery({
    queryKey: ["admin-vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("*, category:vehicle_categories(name), images:vehicle_images(id, url, storage_path, sort_order)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <div>
      <Button className="mb-4" onClick={() => setEdit({ ...emptyVehicle })}>Add vehicle</Button>
      {list.isLoading ? <LoadingState /> : list.error ? <ErrorState message={friendlyError(list.error)} onRetry={() => list.refetch()} /> : list.data!.length === 0 ? <EmptyState title="No vehicles yet" /> : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left"><tr>{["Vehicle", "Category", "Reg.", "Daily", "Status", ""].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
            <tbody>
              {list.data!.map((v: any) => (
                <tr key={v.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{v.make} {v.model} {v.year}</td>
                  <td className="px-3 py-2">{v.category?.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{v.registration_no}</td>
                  <td className="px-3 py-2">{formatLKR(v.daily_rate_lkr)}</td>
                  <td className="px-3 py-2">{v.is_active ? <StatusBadge status="active" /> : <StatusBadge status="archived" className="bg-secondary text-muted-foreground" />}</td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => setEdit({ ...v, weekly_rate_lkr: v.weekly_rate_lkr ?? "", deposit_lkr: v.deposit_lkr ?? "", features: v.features.join(", ") })}>Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {edit && <VehicleForm initial={edit} images={(list.data ?? []).find((v: any) => v.id === edit.id)?.images ?? []} onSaved={() => { qc.invalidateQueries({ queryKey: ["admin-vehicles"] }); qc.invalidateQueries({ queryKey: ["vehicles"] }); }} onClose={() => setEdit(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VehicleForm({ initial, images, onSaved, onClose }: { initial: typeof emptyVehicle; images: any[]; onSaved: () => void; onClose: () => void }) {
  const cats = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const [v, setV] = useState(initial);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!v.category_id || !v.make.trim() || !v.model.trim() || !v.registration_no.trim()) return setErr("Category, make, model and registration are required.");
    if (!(Number(v.daily_rate_lkr) > 0)) return setErr("Daily rate must be greater than zero.");
    if (!(Number(v.seats) >= 1 && Number(v.seats) <= 20)) return setErr("Seats must be between 1 and 20.");
    setErr(""); setBusy(true);
    const row = {
      category_id: v.category_id, make: v.make.trim(), model: v.model.trim(), year: Number(v.year), transmission: v.transmission, fuel_type: v.fuel_type,
      seats: Number(v.seats), luggage: Number(v.luggage), daily_rate_lkr: Number(v.daily_rate_lkr),
      weekly_rate_lkr: v.weekly_rate_lkr === "" ? null : Number(v.weekly_rate_lkr), deposit_lkr: v.deposit_lkr === "" ? null : Number(v.deposit_lkr),
      location: v.location, registration_no: v.registration_no.trim().toUpperCase(), mileage_km: Number(v.mileage_km), description: v.description.trim(),
      features: String(v.features).split(",").map((f) => f.trim()).filter(Boolean), is_active: v.is_active, updated_at: new Date().toISOString(),
    };
    const res = v.id ? await supabase.from("vehicles").update(row).eq("id", v.id).select("id").single() : await supabase.from("vehicles").insert(row).select("id").single();
    setBusy(false);
    if (res.error) return setErr(res.error.code === "23505" ? "That registration number is already in use." : friendlyError(res.error));
    toast.success("Vehicle saved.");
    setV({ ...v, id: res.data.id });
    onSaved();
  }

  async function upload(file: File) {
    if (!v.id) return void toast.error("Save the vehicle first.");
    if (!file.type.startsWith("image/")) return void toast.error("Please choose an image file.");
    if (file.size > 5 * 1024 * 1024) return void toast.error("Images must be 5 MB or smaller.");
    const path = `${v.id}/${Date.now()}-${file.name.replace(/[^a-z0-9.]+/gi, "-")}`;
    const up = await supabase.storage.from("vehicle-images").upload(path, file);
    if (up.error) return void toast.error("Upload failed. Please try again.");
    // Private bucket: store a long-lived signed URL for public display.
    const signed = await supabase.storage.from("vehicle-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (signed.error) return void toast.error("Upload saved but the link couldn't be created.");
    const { error } = await supabase.from("vehicle_images").insert({ vehicle_id: v.id, url: signed.data.signedUrl, storage_path: path, alt: `${v.make} ${v.model}`, sort_order: images.length });
    if (error) return void toast.error(friendlyError(error));
    toast.success("Photo added."); onSaved();
  }
  async function removeImage(img: any) {
    if (img.storage_path) await supabase.storage.from("vehicle-images").remove([img.storage_path]);
    const { error } = await supabase.from("vehicle_images").delete().eq("id", img.id);
    if (error) return void toast.error(friendlyError(error));
    onSaved();
  }

  return (
    <>
      <DialogHeader><DialogTitle>{v.id ? "Edit vehicle" : "Add vehicle"}</DialogTitle></DialogHeader>
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-3">
        <Field label="Category" htmlFor="v-c"><select id="v-c" className={selectClass} value={v.category_id} onChange={set("category_id")}><option value="">Choose…</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Make" htmlFor="v-mk"><Input id="v-mk" value={v.make} onChange={set("make")} /></Field>
        <Field label="Model" htmlFor="v-md"><Input id="v-md" value={v.model} onChange={set("model")} /></Field>
        <Field label="Year" htmlFor="v-y"><Input id="v-y" type="number" value={v.year} onChange={set("year")} /></Field>
        <Field label="Transmission" htmlFor="v-t"><select id="v-t" className={selectClass} value={v.transmission} onChange={set("transmission")}><option>automatic</option><option>manual</option></select></Field>
        <Field label="Fuel" htmlFor="v-f"><select id="v-f" className={selectClass} value={v.fuel_type} onChange={set("fuel_type")}>{["petrol", "diesel", "hybrid", "electric"].map((f) => <option key={f}>{f}</option>)}</select></Field>
        <Field label="Seats" htmlFor="v-s"><Input id="v-s" type="number" value={v.seats} onChange={set("seats")} /></Field>
        <Field label="Luggage (bags)" htmlFor="v-l"><Input id="v-l" type="number" value={v.luggage} onChange={set("luggage")} /></Field>
        <Field label="Location" htmlFor="v-loc"><Input id="v-loc" value={v.location} onChange={set("location")} /></Field>
        <Field label="Daily rate (LKR)" htmlFor="v-d"><Input id="v-d" type="number" value={v.daily_rate_lkr} onChange={set("daily_rate_lkr")} /></Field>
        <Field label="Weekly rate (optional)" htmlFor="v-w"><Input id="v-w" type="number" value={v.weekly_rate_lkr} onChange={set("weekly_rate_lkr")} /></Field>
        <Field label="Deposit (blank = default)" htmlFor="v-dep"><Input id="v-dep" type="number" value={v.deposit_lkr} onChange={set("deposit_lkr")} /></Field>
        <Field label="Registration no." htmlFor="v-r"><Input id="v-r" value={v.registration_no} onChange={set("registration_no")} /></Field>
        <Field label="Mileage (km)" htmlFor="v-km"><Input id="v-km" type="number" value={v.mileage_km} onChange={set("mileage_km")} /></Field>
        <Field label="Listing" htmlFor="v-a"><select id="v-a" className={selectClass} value={v.is_active ? "1" : "0"} onChange={(e) => setV({ ...v, is_active: e.target.value === "1" })}><option value="1">Active</option><option value="0">Archived (hidden)</option></select></Field>
        <div className="sm:col-span-3"><Field label="Features (comma separated)" htmlFor="v-ft"><Input id="v-ft" value={v.features} onChange={set("features")} /></Field></div>
        <div className="sm:col-span-3"><Field label="Description" htmlFor="v-ds"><Textarea id="v-ds" rows={2} value={v.description} onChange={set("description")} /></Field></div>
        {err && <p role="alert" className="text-sm text-destructive sm:col-span-3">{err}</p>}
        <div className="flex gap-2 sm:col-span-3"><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save vehicle"}</Button><Button type="button" variant="outline" onClick={onClose}>Close</Button></div>
      </form>
      {v.id && (
        <div className="mt-4 border-t pt-4">
          <p className="mb-2 font-semibold">Photos</p>
          <div className="flex flex-wrap gap-3">
            {images.map((im) => (
              <div key={im.id} className="relative">
                <img src={im.url} alt="" className="h-20 w-28 rounded object-cover" />
                <button type="button" onClick={() => removeImage(im)} className="absolute right-1 top-1 rounded bg-card px-1.5 text-xs" aria-label="Remove photo">✕</button>
              </div>
            ))}
          </div>
          <label className="mt-3 block text-sm">
            <span className="sr-only">Upload photo</span>
            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} className="text-sm" />
          </label>
        </div>
      )}
    </>
  );
}

function Payments() {
  const q = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*, booking:bookings(reference)").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });
  if (q.isLoading) return <LoadingState />;
  if (q.error) return <ErrorState message={friendlyError(q.error)} onRetry={() => q.refetch()} />;
  if (!q.data!.length) return <EmptyState title="No payments recorded" description="Payments appear here once staff record money received at pickup." />;
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-secondary text-left"><tr>{["Date", "Booking", "Type", "Method", "Amount", "Status", "Ref"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
        <tbody>{q.data!.map((p: any) => (
          <tr key={p.id} className="border-t"><td className="px-3 py-2">{formatDateTime(p.created_at)}</td><td className="px-3 py-2 font-mono text-xs">{p.booking?.reference}</td><td className="px-3 py-2 capitalize">{p.kind}</td><td className="px-3 py-2">{p.method.replace("_", " ")}</td><td className="px-3 py-2">{formatLKR(p.amount_lkr)}</td><td className="px-3 py-2"><StatusBadge status={p.status} /></td><td className="px-3 py-2">{p.provider_reference ?? "—"}</td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function StaffRoles() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const q = useQuery({
    queryKey: ["admin-staff"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_staff");
      if (error) throw error;
      return data;
    },
  });
  async function change(e: string, r: "staff" | "admin", grant: boolean) {
    const { error } = await supabase.rpc("admin_set_role", { _email: e, _role: r, _grant: grant });
    if (error) return void toast.error(friendlyError(error));
    toast.success(grant ? "Role granted." : "Role removed.");
    qc.invalidateQueries({ queryKey: ["admin-staff"] });
  }
  return (
    <div className="space-y-6">
      <form onSubmit={(e) => { e.preventDefault(); if (email.trim()) change(email.trim(), role, true).then(() => setEmail("")); }} className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-end">
        <div className="flex-1"><Field label="Registered user's email" htmlFor="st-e" hint="The person must create an account first."><Input id="st-e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field></div>
        <Field label="Role" htmlFor="st-r"><select id="st-r" className={selectClass} value={role} onChange={(e) => setRole(e.target.value as "staff" | "admin")}><option value="staff">Staff</option><option value="admin">Administrator</option></select></Field>
        <Button type="submit">Grant role</Button>
      </form>
      {q.isLoading ? <LoadingState /> : q.error ? <ErrorState message={friendlyError(q.error)} onRetry={() => q.refetch()} /> : (
        <ul className="divide-y rounded-lg border bg-card">
          {q.data!.map((s) => (
            <li key={s.user_id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div><p className="font-medium">{s.full_name || s.email}</p><p className="text-sm text-muted-foreground">{s.email} · {s.roles.join(", ")}</p></div>
              <div className="flex gap-2">
                {s.roles.includes("staff") && <Button size="sm" variant="outline" onClick={() => change(s.email, "staff", false)}>Remove staff</Button>}
                {s.roles.includes("admin") && <Button size="sm" variant="outline" onClick={() => change(s.email, "admin", false)}>Remove admin</Button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Policies() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["policies"], queryFn: async () => (await supabase.from("business_policies").select("*").eq("id", 1).single()).data });
  const [v, setV] = useState<any>(null);
  useEffect(() => { if (q.data) setV(q.data); }, [q.data]);
  if (!v) return <LoadingState />;
  const set = (k: string) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  async function save(e: FormEvent) {
    e.preventDefault();
    const nums = ["default_deposit_lkr", "free_cancellation_hours", "late_return_fee_per_day_lkr", "additional_driver_fee_lkr", "min_rental_days", "max_rental_days"];
    if (nums.some((k) => !(Number(v[k]) >= 0))) return void toast.error("Numbers must be zero or more.");
    if (Number(v.min_rental_days) < 1 || Number(v.max_rental_days) < Number(v.min_rental_days)) return void toast.error("Check the minimum and maximum rental days.");
    const row = Object.fromEntries(nums.map((k) => [k, Number(v[k])]));
    const { error } = await supabase.from("business_policies").update({ ...row, cancellation_terms: v.cancellation_terms, deposit_terms: v.deposit_terms, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) return void toast.error(friendlyError(error));
    toast.success("Policies saved."); qc.invalidateQueries({ queryKey: ["policies"] });
  }
  return (
    <form onSubmit={save} className="grid gap-4 rounded-lg border bg-card p-6 sm:grid-cols-3">
      <Field label="Default deposit (LKR)" htmlFor="pl-1"><Input id="pl-1" type="number" value={v.default_deposit_lkr} onChange={set("default_deposit_lkr")} /></Field>
      <Field label="Free cancellation (hours before pickup)" htmlFor="pl-2"><Input id="pl-2" type="number" value={v.free_cancellation_hours} onChange={set("free_cancellation_hours")} /></Field>
      <Field label="Late return fee / day (LKR)" htmlFor="pl-3"><Input id="pl-3" type="number" value={v.late_return_fee_per_day_lkr} onChange={set("late_return_fee_per_day_lkr")} /></Field>
      <Field label="Additional driver fee (LKR)" htmlFor="pl-4"><Input id="pl-4" type="number" value={v.additional_driver_fee_lkr} onChange={set("additional_driver_fee_lkr")} /></Field>
      <Field label="Minimum rental days" htmlFor="pl-5"><Input id="pl-5" type="number" value={v.min_rental_days} onChange={set("min_rental_days")} /></Field>
      <Field label="Maximum rental days" htmlFor="pl-6"><Input id="pl-6" type="number" value={v.max_rental_days} onChange={set("max_rental_days")} /></Field>
      <div className="sm:col-span-3"><Field label="Cancellation terms" htmlFor="pl-7"><Textarea id="pl-7" value={v.cancellation_terms} onChange={set("cancellation_terms")} /></Field></div>
      <div className="sm:col-span-3"><Field label="Deposit terms" htmlFor="pl-8"><Textarea id="pl-8" value={v.deposit_terms} onChange={set("deposit_terms")} /></Field></div>
      <div><Button type="submit">Save policies</Button></div>
    </form>
  );
}
