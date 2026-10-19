/**
 * SwiftDrive Rentals — Vehicle Details & Booking Route (/vehicles/$id)
 *
 * Detailed vehicle page providing:
 *  - High-resolution photo gallery with thumbnail switcher
 *  - Vehicle technical specifications (seats, transmission, fuel, luggage capacity, base location)
 *  - Feature tags and detailed description
 *  - Real-time rental quote engine (`quote_rental` RPC)
 *  - Atomic booking reservation submission (`create_booking` RPC)
 *  - Known reserved date ranges visual feedback
 *  - Global deposit and cancellation policy terms
 */

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
import {
  DemoBadge,
  ErrorState,
  Field,
  LoadingState,
  selectClass,
} from "@/components/site/common";
import { LOCATIONS } from "@/components/site/SearchBar";
import {
  addDays,
  formatDate,
  formatLKR,
  friendlyError,
  todayColombo,
} from "@/lib/format";
import { validateDates } from "@/lib/booking";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/vehicles/$id")({
  validateSearch: (search) =>
    z.object({ pickup: z.string().optional(), ret: z.string().optional() }).parse(search),
  head: () => ({
    meta: [
      { title: "Vehicle details — SwiftDrive Rentals" },
      {
        name: "description",
        content: "Specifications, rates, availability and booking for this SwiftDrive vehicle.",
      },
      { property: "og:title", content: "Vehicle details — SwiftDrive Rentals" },
      {
        property: "og:description",
        content: "Check availability and the full rental cost before booking.",
      },
    ],
  }),
  component: VehicleDetails,
});

/**
 * Server-computed rental quote response shape from the database RPC `quote_rental`.
 */
type QuoteResult = {
  rental_days: number;
  rental_amount_lkr: number;
  deposit_lkr: number;
  available: boolean;
};

function VehicleDetails() {
  const { id } = Route.useParams();
  const searchParams = Route.useSearch();
  const today = todayColombo();
  const { user } = useAuth();
  const navigate = useNavigate();

  // 1. Query vehicle specifications and images
  const vehicleQuery = useQuery({
    queryKey: ["vehicle", id],
    queryFn: () => getVehicle(id),
  });

  // 2. Query business policies (deposit requirements & cancellation windows)
  const policiesQuery = useQuery({
    queryKey: ["policies"],
    queryFn: getPolicies,
  });

  // 3. Query existing booked date intervals to inform customer of conflicting dates
  const bookedRangesQuery = useQuery({
    queryKey: ["booked", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("vehicle_booked_ranges", {
        _vehicle_id: id,
      });
      if (error) throw error;
      return data;
    },
  });

  // Booking form state
  const [pickupDate, setPickupDate] = useState(
    searchParams.pickup ?? addDays(today, 1),
  );
  const [returnDate, setReturnDate] = useState(
    searchParams.ret ?? addDays(today, 4),
  );
  const [pickupLocation, setPickupLocation] = useState("Negombo");
  const [returnLocation, setReturnLocation] = useState("Negombo");
  const [customerNotes, setCustomerNotes] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Validate dates client-side before requesting a server quote
  const dateValidationError = validateDates(pickupDate, returnDate, today);

  /**
   * Authoritative price and availability quote computed directly by PostgreSQL.
   * Ensures the exact amount displayed here matches what will be recorded on booking.
   */
  const quoteQuery = useQuery({
    queryKey: ["quote", id, pickupDate, returnDate],
    enabled: !dateValidationError,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("quote_rental", {
        _vehicle_id: id,
        _pickup: pickupDate,
        _return: returnDate,
      });
      if (error) throw error;
      return data as unknown as QuoteResult;
    },
  });

  /**
   * Reservation mutation creating an atomic booking row in Supabase.
   */
  const bookMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("create_booking", {
        _vehicle_id: id,
        _pickup: pickupDate,
        _return: returnDate,
        _pickup_location: pickupLocation,
        _return_location: returnLocation,
        _notes: customerNotes,
      });
      if (error) throw error;
      return data as unknown as { id: string; reference: string };
    },
    onSuccess: (bookingData) => {
      toast.success(
        `Booking ${bookingData.reference} received! It is now pending staff confirmation.`,
      );
      void navigate({ to: "/account", search: { booking: bookingData.id } });
    },
    onError: () => {
      // Refresh quote and booked ranges on collision/error
      quoteQuery.refetch();
      bookedRangesQuery.refetch();
    },
  });

  if (vehicleQuery.isLoading) {
    return <LoadingState label="Loading vehicle details…" />;
  }

  if (vehicleQuery.error) {
    return (
      <div className="container-page py-10">
        <ErrorState
          message={friendlyError(vehicleQuery.error)}
          onRetry={() => vehicleQuery.refetch()}
        />
      </div>
    );
  }

  const vehicle = vehicleQuery.data;
  if (!vehicle) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="text-2xl font-bold">Vehicle not found</h1>
        <p className="mt-2 text-muted-foreground">The requested vehicle listing does not exist.</p>
        <Link to="/vehicles" className="mt-4 inline-block font-semibold text-primary hover:underline">
          ← Return to vehicle catalogue
        </Link>
      </div>
    );
  }

  const galleryImages = [...vehicle.images].sort((a, b) => a.sort_order - b.sort_order);
  const activeImage = galleryImages[activeImageIndex] ?? galleryImages[0];

  /**
   * Handles booking form submission.
   * If unauthenticated, safely redirects to login while preserving the selected dates.
   */
  function handleBookingSubmit(e: FormEvent) {
    e.preventDefault();

    if (!user) {
      void navigate({
        to: "/login",
        search: {
          redirect: `/vehicles/${id}?pickup=${pickupDate}&ret=${returnDate}`,
        },
      });
      return;
    }

    bookMutation.mutate();
  }

  return (
    <div className="container-page py-8">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
        <Link to="/vehicles" className="hover:text-primary">
          Vehicles
        </Link>{" "}
        / {vehicle.make} {vehicle.model}
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        {/* Left Column: Media & Specifications */}
        <div>
          {/* Main Gallery Display */}
          <div className="overflow-hidden rounded-lg border bg-secondary">
            {activeImage && (
              <img
                src={activeImage.url}
                alt={activeImage.alt || `${vehicle.make} ${vehicle.model}`}
                width={1200}
                height={800}
                className="aspect-[3/2] w-full object-cover"
              />
            )}
          </div>

          {/* Thumbnail Gallery Row */}
          {galleryImages.length > 1 && (
            <div className="mt-3 flex gap-2">
              {galleryImages.map((imgItem, idx) => (
                <button
                  key={imgItem.url}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  aria-label={`View photo ${idx + 1}`}
                  aria-pressed={idx === activeImageIndex}
                  className={
                    "overflow-hidden rounded border-2 transition-all " +
                    (idx === activeImageIndex ? "border-primary ring-2 ring-primary/20" : "border-transparent opacity-80 hover:opacity-100")
                  }
                >
                  <img
                    src={imgItem.url}
                    alt=""
                    loading="lazy"
                    className="h-16 w-24 object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Title & Category Badge */}
          <div className="mt-6 flex items-center gap-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              {vehicle.category?.name}
            </p>
            {vehicle.is_demo && <DemoBadge />}
          </div>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            {vehicle.make} {vehicle.model}{" "}
            <span className="text-xl font-normal text-muted-foreground">{vehicle.year}</span>
          </h1>

          <p className="mt-3 text-muted-foreground">{vehicle.description}</p>

          {/* Key Specifications Grid */}
          <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <SpecItem icon={Users} label="Seats" value={`${vehicle.seats} passengers`} />
            <SpecItem icon={Gauge} label="Transmission" value={vehicle.transmission} />
            <SpecItem icon={Fuel} label="Fuel type" value={vehicle.fuel_type} />
            <SpecItem icon={Luggage} label="Luggage" value={`${vehicle.luggage} large bags`} />
            <SpecItem icon={MapPin} label="Base location" value={vehicle.location} />
          </dl>

          {/* Vehicle Feature Chips */}
          {vehicle.features.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2">
              {vehicle.features.map((feature) => (
                <li
                  key={feature}
                  className="rounded-full bg-secondary px-3 py-1 text-sm font-medium text-foreground"
                >
                  {feature}
                </li>
              ))}
            </ul>
          )}

          {/* Pricing Rates Card */}
          <div className="mt-8 rounded-lg border bg-card p-5">
            <h2 className="font-semibold text-foreground">Rental rates</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Daily rate</dt>
                <dd className="text-base font-semibold">{formatLKR(vehicle.daily_rate_lkr)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Weekly rate (7+ days)</dt>
                <dd className="text-base font-semibold">
                  {vehicle.weekly_rate_lkr ? formatLKR(vehicle.weekly_rate_lkr) : "Standard daily rate"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Refundable deposit</dt>
                <dd className="text-base font-semibold">
                  {formatLKR(vehicle.deposit_lkr ?? policiesQuery.data?.default_deposit_lkr)}
                </dd>
              </div>
            </dl>

            {policiesQuery.data && (
              <div className="mt-4 space-y-2 border-t pt-4 text-xs text-muted-foreground">
                <p>{policiesQuery.data.deposit_terms}</p>
                <p>{policiesQuery.data.cancellation_terms}</p>
                <Link to="/terms" className="inline-block font-semibold text-primary hover:underline">
                  Read complete rental terms and driver conditions →
                </Link>
              </div>
            )}
          </div>

          {/* Reserved Intervals Notice */}
          {bookedRangesQuery.data && bookedRangesQuery.data.length > 0 && (
            <div className="mt-6 rounded-lg border bg-card p-4">
              <h2 className="text-sm font-semibold text-foreground">Current confirmed bookings</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                This vehicle is already reserved for the following periods:
              </p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {bookedRangesQuery.data.map((range, idx) => (
                  <li key={idx} className="font-mono">
                    • {formatDate(range.pickup_date)} → {formatDate(range.return_date)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: Sticky Booking Widget */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <form
            onSubmit={handleBookingSubmit}
            className="space-y-4 rounded-lg border bg-card p-5 shadow-sm"
            aria-label="Book this vehicle"
          >
            <h2 className="text-lg font-semibold text-foreground">Reserve this vehicle</h2>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Pickup date" htmlFor="book-pickup">
                <Input
                  id="book-pickup"
                  type="date"
                  min={today}
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                />
              </Field>
              <Field label="Return date" htmlFor="book-return">
                <Input
                  id="book-return"
                  type="date"
                  min={pickupDate}
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Pickup location" htmlFor="book-pickup-loc">
                <select
                  id="book-pickup-loc"
                  className={selectClass}
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                >
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Return location" htmlFor="book-return-loc">
                <select
                  id="book-return-loc"
                  className={selectClass}
                  value={returnLocation}
                  onChange={(e) => setReturnLocation(e.target.value)}
                >
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Special notes (optional)" htmlFor="book-notes">
              <Textarea
                id="book-notes"
                rows={2}
                maxLength={1000}
                placeholder="Flight arrival number, child seats, or route details..."
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
              />
            </Field>

            {/* Live Pricing Breakdown */}
            <div aria-live="polite" className="rounded-md bg-secondary p-4 text-sm">
              {dateValidationError ? (
                <p className="text-destructive">{dateValidationError}</p>
              ) : quoteQuery.isLoading ? (
                <p className="text-muted-foreground">Checking live vehicle availability…</p>
              ) : quoteQuery.error ? (
                <p className="text-destructive">{friendlyError(quoteQuery.error)}</p>
              ) : (
                quoteQuery.data && (
                  <>
                    <p
                      className={
                        "mb-3 flex items-center gap-1.5 font-semibold " +
                        (quoteQuery.data.available ? "text-success" : "text-destructive")
                      }
                    >
                      {quoteQuery.data.available ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 shrink-0" />
                      )}
                      {quoteQuery.data.available
                        ? "Available for these dates"
                        : "Vehicle is already booked on those dates"}
                    </p>

                    <dl className="space-y-1.5">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">
                          Rental ({quoteQuery.data.rental_days} day
                          {quoteQuery.data.rental_days === 1 ? "" : "s"})
                        </dt>
                        <dd className="font-medium">
                          {formatLKR(quoteQuery.data.rental_amount_lkr)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Refundable deposit</dt>
                        <dd className="font-medium">{formatLKR(quoteQuery.data.deposit_lkr)}</dd>
                      </div>
                      <div className="flex justify-between border-t pt-2 font-semibold">
                        <dt>Estimated total due at pickup</dt>
                        <dd>
                          {formatLKR(
                            Number(quoteQuery.data.rental_amount_lkr) +
                              Number(quoteQuery.data.deposit_lkr),
                          )}
                        </dd>
                      </div>
                    </dl>
                  </>
                )
              )}
            </div>

            {bookMutation.error && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {friendlyError(bookMutation.error)}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={
                !!dateValidationError ||
                !quoteQuery.data?.available ||
                bookMutation.isPending
              }
            >
              {bookMutation.isPending
                ? "Submitting reservation…"
                : user
                  ? "Request booking"
                  : "Sign in to book"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              No online card charge is taken now. Handover payment and deposit inspection are conducted in person at pickup.
            </p>
          </form>
        </aside>
      </div>
    </div>
  );
}

/**
 * Reusable specification item block with icon.
 */
function SpecItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-card p-3 shadow-xs">
      <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <div>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-sm font-medium capitalize text-foreground">{value}</dd>
      </div>
    </div>
  );
}

