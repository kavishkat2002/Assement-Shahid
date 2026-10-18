import { Link } from "@tanstack/react-router";
import { Fuel, Gauge, Users } from "lucide-react";
import { formatLKR } from "@/lib/format";
import { primaryImage, type VehicleListItem } from "@/services/vehicles";
import { DemoBadge } from "./common";

export function VehicleCard({ v, search }: { v: VehicleListItem; search?: { pickup?: string | undefined; ret?: string | undefined } }) {
  const img = primaryImage(v);
  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md">
      <div className="aspect-[3/2] overflow-hidden bg-secondary">
        {img && <img src={img.url} alt={img.alt || `${v.make} ${v.model}`} loading="lazy" width={600} height={400} className="h-full w-full object-cover" />}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{v.category?.name}</p>
          {v.is_demo && <DemoBadge />}
        </div>
        <h3 className="mt-1 text-lg font-semibold">{v.make} {v.model} <span className="text-sm font-normal text-muted-foreground">{v.year}</span></h3>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <li className="flex items-center gap-1"><Users className="h-4 w-4" aria-hidden /> {v.seats} seats</li>
          <li className="flex items-center gap-1 capitalize"><Gauge className="h-4 w-4" aria-hidden /> {v.transmission}</li>
          <li className="flex items-center gap-1 capitalize"><Fuel className="h-4 w-4" aria-hidden /> {v.fuel_type}</li>
        </ul>
        <div className="mt-auto flex items-end justify-between pt-4">
          <p><span className="text-lg font-bold">{formatLKR(v.daily_rate_lkr)}</span> <span className="text-sm text-muted-foreground">/ day</span></p>
          <Link to="/vehicles/$id" params={{ id: v.id }} search={search ?? {}} className="text-sm font-semibold text-primary hover:underline">
            View details<span className="sr-only"> for {v.make} {v.model}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
