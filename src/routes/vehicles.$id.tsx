import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, Fuel, Gauge, Luggage, MapPin, Users, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getPolicies, getVehicle } from "@/services/vehicles";
import { DemoBadge, ErrorState, Field, LoadingState, selectClass } from "@/components/site/common";
import { LOCATIONS } from "@/components/site/SearchBar";
import { addDays, formatDate, formatLKR, friendlyError, todayColombo } from "@/lib/format";
import { validateDates } from "@/lib/booking";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/vehicles/$id")({
  validateSearch: (s) => z.object({ pickup: z.string().optional(), ret: z.string().optional() }).parse(s),
  head: () => ({
    meta: [
      { title: "Vehicle details — SwiftDrive Rentals" },
      { name: "description", content: "Specifications, rates, availability and booking for this SwiftDrive vehicle." },
      { property: "og:title", content: "Vehicle details — SwiftDrive Rentals" },
      { property: "og:description", content: "Check availability and the full rental cost before booking." },
    ],
  }),
  component: VehicleDetails,
});

type Quote = { rental_days: number; rental_amount_lkr: number; deposit_lkr: number; available: boolean };

function VehicleDetails() {
  const { id } = Route.useParams();
  const s = Route.useSearch();
  const today = todayColombo();
  const { user } = useAuth();
  const navigate = useNavigate();
  const vehicle = useQuery({ queryKey: ["vehicle", id], queryFn: () => getVehicle(id) });
  const policies = useQuery({ queryKey: ["policies"], queryFn: getPolicies });
  const booked = useQuery({
    queryKey: ["booked", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("vehicle_booked_ranges", { _vehicle_id: id });
      if (error) throw error;
      return data;
    },
  });

  const [pickup, setPickup] = useState(s.pickup ?? addDays(today, 1));
  const [ret, setRet] = useState(s.ret ?? addDays(today, 4));
  const [pickupLoc, setPickupLoc] = useState("Negombo");
  const [returnLoc, setReturnLoc] = useState("Negombo");
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(0);
  const dateError = validateDates(pickup, ret, today);

  // Quote is calculated by the database so the displayed total matches what will be charged.
  const quote = useQuery({
    queryKey: ["quote", id, pickup, ret],
    enabled: !dateError,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("quote_rental", { _vehicle_id: id, _pickup: pickup, _return: ret });
      if (error) throw error;
      return data as unknown as Quote;
    },
  });

  const book = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("create_booking", {
        _vehicle_id: id, _pickup: pickup, _return: ret, _pickup_location: pickupLoc, _return_location: returnLoc, _notes: notes,
      });
      if (error) throw error;
      return data as unknown as { id: string; reference: string };
    },
    onSuccess: (d) => {
      toast.success(`Booking ${d.reference} received. It is pending confirmation by our team.`);
      navigate({ to: "/account", search: { booking: d.id } });
    },
    onError: () => { quote.refetch(); booked.refetch(); },
  });

  if (vehicle.isLoading) return <LoadingState />;
  if (vehicle.error) return <div className="container-page py-10"><ErrorState message={friendlyError(vehicle.error)} onRetry={() => vehicle.refetch()} /></div>;
  const v = vehicle.data;
  if (!v) return <div className="container-page py-16 text-center"><h1 className="text-2xl font-bold">Vehicle not found</h1><Link to="/vehicles" className="mt-4 inline-block text-primary">Back to vehicles</Link></div>;
  const images = [...v.images].sort((a, b) => a.sort_order - b.sort_order);
  const img = images[active] ?? images[0];

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) { void navigate({ to: "/login", search: { redirect: `/vehicles/${id}?pickup=${pickup}&ret=${ret}` } }); return; }
    book.mutate();
  }

  return (
    <div className="container-page py-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground"><Link to="/vehicles" className="hover:text-primary">Vehicles</Link> / {v.make} {v.model}</nav>
      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="overflow-hidden rounded-lg border bg-secondary">
            {img && <img src={img.url} alt={img.alt || `${v.make} ${v.model}`} width={1200} height={800} className="aspect-[3/2] w-full object-cover" />}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {images.map((im, i) => (
                <button key={im.url} onClick={() => setActive(i)} aria-label={`Show photo ${i + 1}`} aria-pressed={i === active} className={"overflow-hidden rounded border-2 " + (i === active ? "border-primary" : "border-transparent")}>
                  <img src={im.url} alt="" loading="lazy" className="h-16 w-24 object-cover" />
                </button>
              ))}
            </div>
          )}
          <div className="mt-6 flex items-center gap-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">{v.category?.name}</p>
            {v.is_demo && <DemoBadge />}
          </div>
          <h1 className="mt-1 text-3xl font-bold">{v.make} {v.model} <span className="text-xl font-normal text-muted-foreground">{v.year}</span></h1>
          <p className="mt-3 text-muted-foreground">{v.description}</p>
          <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Spec icon={Users} label="Seats" value={String(v.seats)} />
            <Spec icon={Gauge} label="Transmission" value={v.transmission} />
            <Spec icon={Fuel} label="Fuel" value={v.fuel_type} />
            <Spec icon={Luggage} label="Luggage" value={`${v.luggage} bags`} />
            <Spec icon={MapPin} label="Based at" value={v.location} />
          </dl>
          {v.features.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2">{v.features.map((f) => <li key={f} className="rounded-full bg-secondary px-3 py-1 text-sm">{f}</li>)}</ul>
          )}
          <div className="mt-8 rounded-lg border bg-card p-5">
            <h2 className="font-semibold">Rates</h2>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <div><dt className="text-muted-foreground">Daily</dt><dd className="font-semibold">{formatLKR(v.daily_rate_lkr)}</dd></div>
              <div><dt className="text-muted-foreground">Weekly (7 days)</dt><dd className="font-semibold">{v.weekly_rate_lkr ? formatLKR(v.weekly_rate_lkr) : "Not offered"}</dd></div>
              <div><dt className="text-muted-foreground">Security deposit</dt><dd className="font-semibold">{formatLKR(v.deposit_lkr ?? policies.data?.default_deposit_lkr)}</dd></div>
            </dl>
            {policies.data && (
              <div className="mt-4 space-y-2 border-t pt-4 text-sm text-muted-foreground">
                <p>{policies.data.deposit_terms}</p>
                <p>{policies.data.cancellation_terms}</p>
                <Link to="/terms" className="font-medium text-primary hover:underline">Read full rental terms</Link>
              </div>
            )}
          </div>
          {booked.data && booked.data.length > 0 && (
            <div className="mt-6">
              <h2 className="font-semibold">Already reserved</h2>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {booked.data.map((b, i) => <li key={i}>{formatDate(b.pickup_date)} → {formatDate(b.return_date)}</li>)}
              </ul>
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <form onSubmit={submit} className="space-y-4 rounded-lg border bg-card p-5 shadow-sm" aria-label="Book this vehicle">
            <h2 className="text-lg font-semibold">Book this vehicle</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pickup date" htmlFor="b-p"><Input id="b-p" type="date" min={today} value={pickup} onChange={(e) => setPickup(e.target.value)} /></Field>
              <Field label="Return date" htmlFor="b-r"><Input id="b-r" type="date" min={pickup} value={ret} onChange={(e) => setRet(e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pickup location" htmlFor="b-pl"><select id="b-pl" className={selectClass} value={pickupLoc} onChange={(e) => setPickupLoc(e.target.value)}>{LOCATIONS.map((l) => <option key={l}>{l}</option>)}</select></Field>
              <Field label="Return location" htmlFor="b-rl"><select id="b-rl" className={selectClass} value={returnLoc} onChange={(e) => setReturnLoc(e.target.value)}>{LOCATIONS.map((l) => <option key={l}>{l}</option>)}</select></Field>
            </div>
            <Field label="Notes for our team (optional)" htmlFor="b-n"><Textarea id="b-n" rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>

            <div aria-live="polite" className="rounded-md bg-secondary p-4 text-sm">
              {dateError ? <p className="text-destructive">{dateError}</p> :
                quote.isLoading ? <p className="text-muted-foreground">Checking availability…</p> :
                quote.error ? <p className="text-destructive">{friendlyError(quote.error)}</p> :
                quote.data && (
                  <>
                    <p className={"mb-3 flex items-center gap-1.5 font-semibold " + (quote.data.available ? "text-success" : "text-destructive")}>
                      {quote.data.available ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      {quote.data.available ? "Available for these dates" : "Not available for these dates"}
                    </p>
                    <dl className="space-y-1.5">
                      <div className="flex justify-between"><dt>Rental ({quote.data.rental_days} day{quote.data.rental_days === 1 ? "" : "s"})</dt><dd>{formatLKR(quote.data.rental_amount_lkr)}</dd></div>
                      <div className="flex justify-between"><dt>Refundable deposit</dt><dd>{formatLKR(quote.data.deposit_lkr)}</dd></div>
                      <div className="flex justify-between border-t pt-2 font-semibold"><dt>Due at pickup</dt><dd>{formatLKR(Number(quote.data.rental_amount_lkr) + Number(quote.data.deposit_lkr))}</dd></div>
                    </dl>
                  </>
                )}
            </div>
            {book.error && <p role="alert" className="text-sm text-destructive">{friendlyError(book.error)}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={!!dateError || !quote.data?.available || book.isPending}>
              {book.isPending ? "Reserving…" : user ? "Request booking" : "Sign in to book"}
            </Button>
            <p className="text-xs text-muted-foreground">No payment is taken online. Your booking is held as pending until our team confirms it.</p>
          </form>
        </aside>
      </div>
    </div>
  );
}

function Spec({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-card p-3">
      <Icon className="h-4 w-4 text-primary" aria-hidden />
      <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-sm font-medium capitalize">{value}</dd></div>
    </div>
  );
}
