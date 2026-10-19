/**
 * @file VehicleCard.tsx
 * @description Product summary card for vehicle listings across catalogue grids and carousel showcases.
 *
 * Design & Accessibility Features:
 * - Semantic `<article>` container with image aspect-ratio preservation (`aspect-[3/2]`).
 * - Primary vehicle media display with descriptive fallback alt text.
 * - Icon-annotated specification badges (Passenger seating, transmission type, fuel source).
 * - Sri Lankan Rupee (LKR) daily rate formatting.
 * - Deep linking to the vehicle details route (`/vehicles/$id`), forwarding current active pickup/return search params.
 * - Screen-reader only (`.sr-only`) title enrichment on call-to-action anchor links.
 */

import { Link } from "@tanstack/react-router";
import { Fuel, Gauge, Users } from "lucide-react";
import { formatLKR } from "@/lib/format";
import { primaryImage, type VehicleListItem } from "@/services/vehicles";
import { DemoBadge } from "./common";

/**
 * Props for the VehicleCard component.
 */
interface VehicleCardProps {
  /** The vehicle listing record including resolved category and media relations */
  v: VehicleListItem;
  /** Optional active search parameters to preserve during route transitions */
  search?: {
    pickup?: string | undefined;
    ret?: string | undefined;
  };
}

/**
 * VehicleCard component.
 */
export function VehicleCard({ v, search }: VehicleCardProps) {
  // Extract designated primary photograph or first media asset
  const heroImage = primaryImage(v);

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md">
      {/* Aspect-ratio clamped vehicle image container */}
      <div className="aspect-[3/2] overflow-hidden bg-secondary">
        {heroImage && (
          <img
            src={heroImage.url}
            alt={heroImage.alt || `${v.make} ${v.model}`}
            loading="lazy"
            width={600}
            height={400}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
      </div>

      {/* Vehicle metadata body */}
      <div className="flex flex-1 flex-col p-4">
        {/* Category tag & demo indicator */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {v.category?.name}
          </p>
          {v.is_demo && <DemoBadge />}
        </div>

        {/* Vehicle title and manufacture year */}
        <h3 className="mt-1 text-lg font-semibold text-foreground">
          {v.make} {v.model}{" "}
          <span className="text-sm font-normal text-muted-foreground">{v.year}</span>
        </h3>

        {/* Key operational specifications */}
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <li className="flex items-center gap-1">
            <Users className="h-4 w-4" aria-hidden="true" />
            <span>{v.seats} seats</span>
          </li>
          <li className="flex items-center gap-1 capitalize">
            <Gauge className="h-4 w-4" aria-hidden="true" />
            <span>{v.transmission}</span>
          </li>
          <li className="flex items-center gap-1 capitalize">
            <Fuel className="h-4 w-4" aria-hidden="true" />
            <span>{v.fuel_type}</span>
          </li>
        </ul>

        {/* Pricing footer & CTA link */}
        <div className="mt-auto flex items-end justify-between pt-4">
          <p>
            <span className="text-lg font-bold text-foreground">
              {formatLKR(v.daily_rate_lkr)}
            </span>{" "}
            <span className="text-sm text-muted-foreground">/ day</span>
          </p>

          <Link
            to="/vehicles/$id"
            params={{ id: v.id }}
            search={search ?? {}}
            className="text-sm font-semibold text-primary hover:underline"
          >
            View details
            <span className="sr-only"> for {v.make} {v.model}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
