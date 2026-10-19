/**
 * @file SearchBar.tsx
 * @description Primary fleet search and booking inquiry form.
 *
 * Feature Highlights:
 * - Strategic location defaults centered on major arrival hubs (Negombo, BIA Airport, Colombo).
 * - Automatic pickup & return date initialization configured in the local `Asia/Colombo` timezone.
 * - Minimum rental duration and temporal sequence validation powered by pure domain rules (`validateDates`).
 * - Dynamic category lookup synchronized with the database vehicle classification schema.
 * - Synchronous URL query parameter propagation to `/vehicles` for seamless back/forward navigation and link sharing.
 */

import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addDays, todayColombo } from "@/lib/format";
import { validateDates } from "@/lib/booking";
import { getCategories } from "@/services/vehicles";
import { selectClass } from "./common";

/**
 * Supported pickup and drop-off branch locations across Western Sri Lanka.
 */
export const LOCATIONS = [
  "Negombo",
  "Bandaranaike Airport",
  "Colombo",
] as const;

/**
 * SearchBar component.
 * Provides accessible filter inputs and navigation dispatch for rental fleet browsing.
 */
export function SearchBar() {
  const today = todayColombo();
  const navigate = useNavigate();

  // Load published vehicle categories for type-ahead filtering
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  // Default date window: pickup tomorrow, return 4 days later (3 rental days)
  const [location, setLocation] = useState("");
  const [pickupDate, setPickupDate] = useState(addDays(today, 1));
  const [returnDate, setReturnDate] = useState(addDays(today, 4));
  const [categorySlug, setCategorySlug] = useState("");
  const [validationError, setValidationError] = useState("");

  /**
   * Handles search form submission, validating dates prior to route transition.
   */
  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();

    // Validate date logic against local Colombo calendar
    const errorMsg = validateDates(pickupDate, returnDate, today);
    if (errorMsg) {
      setValidationError(errorMsg);
      return;
    }

    setValidationError("");

    // Dispatch transition to vehicles index with search params
    navigate({
      to: "/vehicles",
      search: {
        pickup: pickupDate,
        ret: returnDate,
        location: location || undefined,
        category: categorySlug || undefined,
      },
    });
  }

  return (
    <form
      onSubmit={handleSearchSubmit}
      className="rounded-lg border bg-card p-4 shadow-sm sm:p-5"
      aria-label="Search vehicles"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto] lg:items-end">
        {/* Pickup branch selection */}
        <div className="space-y-1.5">
          <label htmlFor="s-loc" className="text-sm font-medium">
            Pickup location
          </label>
          <select
            id="s-loc"
            className={selectClass}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="">Any location</option>
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        {/* Pickup calendar date */}
        <div className="space-y-1.5">
          <label htmlFor="s-pick" className="text-sm font-medium">
            Pickup date
          </label>
          <Input
            id="s-pick"
            type="date"
            min={today}
            value={pickupDate}
            onChange={(e) => setPickupDate(e.target.value)}
            className="h-10 bg-card"
          />
        </div>

        {/* Return calendar date */}
        <div className="space-y-1.5">
          <label htmlFor="s-ret" className="text-sm font-medium">
            Return date
          </label>
          <Input
            id="s-ret"
            type="date"
            min={pickupDate}
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
            className="h-10 bg-card"
          />
        </div>

        {/* Vehicle category classification */}
        <div className="space-y-1.5">
          <label htmlFor="s-cat" className="text-sm font-medium">
            Vehicle type
          </label>
          <select
            id="s-cat"
            className={selectClass}
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
          >
            <option value="">All types</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Form submit CTA */}
        <Button type="submit" size="lg" className="h-10">
          Search
        </Button>
      </div>

      {/* Inline validation banner */}
      {validationError && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {validationError}
        </p>
      )}
    </form>
  );
}
