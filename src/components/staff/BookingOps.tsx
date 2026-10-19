import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  StatusBadge,
  selectClass,
} from "@/components/site/common";
import {
  formatDate,
  formatDateTime,
  formatLKR,
  friendlyError,
  todayColombo,
} from "@/lib/format";
import {
  isOverdue,
  outstanding,
  STAFF_TRANSITIONS,
  type BookingStatus,
} from "@/lib/booking";

/**
 * Deep Supabase relation query retrieving reservation details, assigned vehicle,
 * customer profile information, recorded payments, and handover inspection reports.
 */
const SELECT =
  "*, vehicle:vehicles(make, model, registration_no, mileage_km), customer:profiles!bookings_customer_id_fkey(full_name, phone, nic_or_passport, driving_licence), payments(amount_lkr, kind, status), reports:vehicle_condition_reports(kind, mileage_km, fuel_level, condition, damage_notes, created_at)";

/**
 * ============================================================================
 * Staff Booking Operations Component (BookingOps)
 * ============================================================================
 * Counter desk management console for reservations. Staff members can:
 * 1. Filter bookings by lifecycle state (pending, confirmed, active, overdue, etc.)
 * 2. Search across reference codes, customer names, or vehicle plate numbers
 * 3. Inspect customer credentials (NIC/passport, driving licence)
 * 4. Advance reservations across the state machine (Confirm / Reject / Cancel)
 * 5. Conduct vehicle inspection handovers at pickup and return
 * 6. Record in-person customer payments (cash, card terminal, bank transfer)
 *
 * Security: Every RPC action (set_booking_status, record_handover, record_payment)
 * cryptographically verifies the caller's auth role via Postgres functions.
 */
export function BookingOps() {
  const today = todayColombo();
  const [status, setStatus] = useState<string>("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<any>(null);

  // Fetch reservations based on status filter
  const list = useQuery({
    queryKey: ["staff-bookings", status],
    queryFn: async () => {
      let query = supabase
        .from("bookings")
        .select(SELECT)
        .order("pickup_date", { ascending: true })
        .limit(200);

      if (status === "overdue") {
        query = query.eq("status", "active").lt("return_date", today);
      } else if (status === "cancel_req") {
        query = query.eq("cancellation_requested", true);
      } else if (status) {
        query = query.eq("status", status as BookingStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Client-side instant multi-field filter
  const rows = (list.data ?? []).filter((b: any) => {
    if (!q) return true;
    const term = q.toLowerCase();
    return [
      b.reference,
      b.customer?.full_name,
      b.vehicle?.make,
      b.vehicle?.model,
      b.vehicle?.registration_no,
    ].some((field) => field?.toLowerCase().includes(term));
  });

  const current = selected
    ? list.data?.find((b: any) => b.id === selected)
    : null;

  return (
    <div>
      {/* Search & Filter Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          aria-label="Search bookings"
          placeholder="Search reference, customer or vehicle"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="bg-card sm:max-w-xs"
        />
        <select
          aria-label="Filter by status"
          className={selectClass + " sm:w-56"}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All bookings</option>
          {[
            "pending",
            "confirmed",
            "active",
            "completed",
            "cancelled",
            "rejected",
          ].map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
          <option value="overdue">Overdue returns</option>
          <option value="cancel_req">Cancellation requests</option>
        </select>
      </div>

      {/* Bookings Table */}
      {list.isLoading ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState
          message={friendlyError(list.error)}
          onRetry={() => list.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState title="No bookings found" />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left">
              <tr>
                {["Ref", "Customer", "Vehicle", "Dates", "Status", ""].map(
                  (h) => (
                    <th key={h} className="px-3 py-2 font-semibold">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((b: any) => (
                <tr key={b.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{b.reference}</td>
                  <td className="px-3 py-2">{b.customer?.full_name || "—"}</td>
                  <td className="px-3 py-2">
                    {b.vehicle?.make} {b.vehicle?.model}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {formatDate(b.pickup_date)} → {formatDate(b.return_date)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <StatusBadge status={b.status} />
                      {isOverdue(b.status, b.return_date, today) && (
                        <StatusBadge status="overdue" />
                      )}
                      {b.cancellation_requested && (
                        <StatusBadge
                          status="cancel req."
                          className="bg-warning-soft text-warning"
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelected(b.id)}
                    >
                      Manage
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Dialog for Single Booking Inspection and Actions */}
      <Dialog open={!!current} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {current && <BookingManage b={current} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Detailed management view for a selected reservation
 */
function BookingManage({ b }: { b: any }) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["staff-bookings"] });
  const [note, setNote] = useState("");

  // Transition status mutation calling set_booking_status RPC
  const statusMutation = useMutation({
    mutationFn: async (targetStatus: BookingStatus) => {
      const { error } = await supabase.rpc("set_booking_status", {
        _booking_id: b.id,
        _status: targetStatus,
        _note: note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking updated.");
      refresh();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  // Calculate payment status
  const paid = (b.payments ?? [])
    .filter((p: any) => p.status === "succeeded" && p.kind !== "refund")
    .reduce((sum: number, p: any) => sum + Number(p.amount_lkr), 0);

  const total = Number(b.rental_amount_lkr) + Number(b.deposit_lkr);
  const allowed = STAFF_TRANSITIONS[b.status as BookingStatus];

  return (
    <>
      <DialogHeader>
        <DialogTitle>Booking {b.reference}</DialogTitle>
      </DialogHeader>

      <div className="space-y-5 text-sm">
        {/* Core Renter & Vehicle Information Grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Customer</p>
            <p className="font-medium">{b.customer?.full_name || "—"}</p>
            <p>{b.customer?.phone || "No phone"}</p>
            <p className="text-xs text-muted-foreground">
              ID: {b.customer?.nic_or_passport || "—"} · Licence:{" "}
              {b.customer?.driving_licence || "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Vehicle</p>
            <p className="font-medium">
              {b.vehicle?.make} {b.vehicle?.model}
            </p>
            <p className="text-xs">
              {b.vehicle?.registration_no} ·{" "}
              {b.vehicle?.mileage_km?.toLocaleString()} km
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Pickup</p>
            <p>
              {formatDate(b.pickup_date)} · {b.pickup_location}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Return</p>
            <p>
              {formatDate(b.return_date)} · {b.return_location}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Amounts</p>
            <p>
              Rental {formatLKR(b.rental_amount_lkr)} + deposit{" "}
              {formatLKR(b.deposit_lkr)}
            </p>
            <p>
              Paid {formatLKR(paid)} · Outstanding{" "}
              <strong>{formatLKR(outstanding(total, paid))}</strong>
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            <StatusBadge status={b.status} />
            {b.customer_notes && (
              <p className="mt-1 text-xs">Customer note: {b.customer_notes}</p>
            )}
          </div>
        </div>

        {/* State Machine Transition Actions */}
        {allowed.length > 0 && (
          <div className="space-y-2 rounded-md border p-3">
            <p className="font-semibold">Update reservation</p>
            <Textarea
              aria-label="Note to customer"
              placeholder="Optional note shown to the customer"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
            <div className="flex flex-wrap gap-2">
              {allowed.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={s === "confirmed" ? "default" : "outline"}
                  disabled={statusMutation.isPending}
                  onClick={() => statusMutation.mutate(s)}
                >
                  {s === "confirmed"
                    ? "Confirm"
                    : s === "rejected"
                    ? "Reject"
                    : "Cancel booking"}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Handover Inspection Forms */}
        {b.status === "confirmed" && (
          <HandoverForm b={b} kind="pickup" onDone={refresh} />
        )}
        {b.status === "active" && (
          <HandoverForm b={b} kind="return" onDone={refresh} />
        )}

        {/* In-Person Payment Recording */}
        {["confirmed", "active", "completed"].includes(b.status) && (
          <PaymentForm bookingId={b.id} onDone={refresh} />
        )}

        {/* Historical Vehicle Condition Reports */}
        {b.reports?.length > 0 && (
          <div>
            <p className="font-semibold">Condition reports</p>
            <ul className="mt-1 space-y-1 text-xs">
              {b.reports.map((r: any) => (
                <li key={r.kind}>
                  <span className="font-semibold capitalize">{r.kind}</span> ·{" "}
                  {formatDateTime(r.created_at)} · {r.mileage_km} km · fuel{" "}
                  {r.fuel_level.replace("_", " ")} · {r.condition}
                  {r.damage_notes ? ` · ${r.damage_notes}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Handover Form: Records odometer, fuel gauge level, body condition, and damage notes.
 * Calling record_handover automatically advances booking status:
 * - 'pickup': changes status from confirmed -> active
 * - 'return': changes status from active -> completed
 */
function HandoverForm({
  b,
  kind,
  onDone,
}: {
  b: any;
  kind: "pickup" | "return";
  onDone: () => void;
}) {
  const [mileage, setMileage] = useState(String(b.vehicle?.mileage_km ?? ""));
  const [fuel, setFuel] = useState("full");
  const [cond, setCond] = useState("good");
  const [damage, setDamage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const m = Number(mileage);

    // Validate odometer reading
    if (!Number.isInteger(m) || m < 0) {
      return void toast.error("Enter the odometer reading in whole kilometres.");
    }
    if (kind === "return" && m < (b.vehicle?.mileage_km ?? 0)) {
      return void toast.error(
        "Return mileage cannot be lower than the recorded mileage."
      );
    }
    if (cond === "damaged" && !damage.trim()) {
      return void toast.error("Please describe the damage.");
    }

    setBusy(true);
    const { error } = await supabase.rpc("record_handover", {
      _booking_id: b.id,
      _kind: kind,
      _mileage: m,
      _fuel: fuel,
      _condition: cond,
      _damage: damage,
    });
    setBusy(false);

    if (error) return void toast.error(friendlyError(error));

    toast.success(
      kind === "pickup"
        ? "Pickup recorded — rental is now active."
        : "Return recorded — rental completed."
    );
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-md border p-3">
      <p className="font-semibold">Record {kind}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Odometer (km)" htmlFor={`h-m-${kind}`}>
          <Input
            id={`h-m-${kind}`}
            inputMode="numeric"
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
          />
        </Field>
        <Field label="Fuel level" htmlFor={`h-f-${kind}`}>
          <select
            id={`h-f-${kind}`}
            className={selectClass}
            value={fuel}
            onChange={(e) => setFuel(e.target.value)}
          >
            {["full", "three_quarter", "half", "quarter", "empty"].map((f) => (
              <option key={f} value={f}>
                {f.replace("_", " ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Condition" htmlFor={`h-c-${kind}`}>
          <select
            id={`h-c-${kind}`}
            className={selectClass}
            value={cond}
            onChange={(e) => setCond(e.target.value)}
          >
            {["excellent", "good", "fair", "damaged"].map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Damage notes" htmlFor={`h-d-${kind}`}>
        <Textarea
          id={`h-d-${kind}`}
          rows={2}
          value={damage}
          onChange={(e) => setDamage(e.target.value)}
        />
      </Field>
      <Button type="submit" size="sm" disabled={busy}>
        Save {kind}
      </Button>
    </form>
  );
}

/**
 * Payment Form: Enables staff to record payments taken at pickup or return
 */
function PaymentForm({
  bookingId,
  onDone,
}: {
  bookingId: string;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState("deposit");
  const [method, setMethod] = useState("cash");
  const [ref, setRef] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const a = Number(amount);
    if (!(a > 0)) return void toast.error("Enter the amount received.");

    const { error } = await supabase.rpc("record_payment", {
      _booking_id: bookingId,
      _amount: a,
      _kind: kind,
      _method: method,
      _reference: ref,
    });

    if (error) return void toast.error(friendlyError(error));

    toast.success("Payment recorded.");
    setAmount("");
    setRef("");
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-md border p-3">
      <p className="font-semibold">Record payment received</p>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Amount (LKR)" htmlFor="pay-a">
          <Input
            id="pay-a"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Type" htmlFor="pay-k">
          <select
            id="pay-k"
            className={selectClass}
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            {["deposit", "rental", "refund", "other"].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </Field>
        <Field label="Method" htmlFor="pay-m">
          <select
            id="pay-m"
            className={selectClass}
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="cash">Cash</option>
            <option value="card_terminal">Card terminal</option>
            <option value="bank_transfer">Bank transfer</option>
          </select>
        </Field>
        <Field label="Receipt ref." htmlFor="pay-r">
          <Input
            id="pay-r"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            maxLength={100}
          />
        </Field>
      </div>
      <Button type="submit" size="sm" variant="outline">
        Record payment
      </Button>
    </form>
  );
}

