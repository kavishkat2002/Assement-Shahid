import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCategories, PAGE_SIZE, searchVehicles } from "@/services/vehicles";
import { VehicleCard } from "@/components/site/VehicleCard";
import { EmptyState, ErrorState, LoadingState, PageHeader, selectClass } from "@/components/site/common";
import { LOCATIONS } from "@/components/site/SearchBar";
import { friendlyError, todayColombo } from "@/lib/format";
import { validateDates } from "@/lib/booking";

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  transmission: z.enum(["automatic", "manual"]).optional(),
  minSeats: z.coerce.number().int().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  location: z.string().optional(),
  pickup: z.string().optional(),
  ret: z.string().optional(),
  sort: z.enum(["price_asc", "price_desc", "seats_desc", "newest"]).optional(),
  page: z.coerce.number().int().positive().optional(),
});

export const Route = createFileRoute("/vehicles/")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Vehicles for rent — SwiftDrive Rentals" },
      { name: "description", content: "Search economy cars, SUVs, vans and luxury vehicles by date, price, seats and transmission." },
      { property: "og:title", content: "Vehicles for rent — SwiftDrive Rentals" },
      { property: "og:description", content: "Filter the SwiftDrive fleet by dates, price, seats and transmission." },
    ],
  }),
  component: Catalogue,
});

function Catalogue() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/vehicles/" });
  const today = todayColombo();
  const [q, setQ] = useState(s.q ?? "");
  const cats = useQuery({ queryKey: ["categories"], queryFn: getCategories });

  const update = (patch: Partial<typeof s>) => navigate({ search: (prev) => ({ ...prev, ...patch, page: patch.page ?? undefined }), replace: true });

  // Debounced text search
  useEffect(() => {
    const t = setTimeout(() => { if ((s.q ?? "") !== q) update({ q: q || undefined }); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const dateError = s.pickup || s.ret ? validateDates(s.pickup ?? "", s.ret ?? "", today) : null;
  const filters = { ...s, pickup: dateError ? undefined : s.pickup, ret: dateError ? undefined : s.ret };
  const result = useQuery({ queryKey: ["vehicles", filters], queryFn: () => searchVehicles(filters), placeholderData: keepPreviousData });
  const page = s.page ?? 1;
  const pages = Math.max(1, Math.ceil((result.data?.total ?? 0) / PAGE_SIZE));

  return (
    <>
      <PageHeader title="Our vehicles" description="Choose dates to see only vehicles that are free for your whole trip." />
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[260px_1fr]">
        <aside aria-label="Filters" className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="f-q" className="text-sm font-medium">Search</label>
            <Input id="f-q" placeholder="e.g. Prado, Aqua" value={q} onChange={(e) => setQ(e.target.value)} className="bg-card" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label htmlFor="f-p" className="text-sm font-medium">Pickup</label>
              <Input id="f-p" type="date" min={today} value={s.pickup ?? ""} onChange={(e) => update({ pickup: e.target.value || undefined })} className="bg-card px-2" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="f-r" className="text-sm font-medium">Return</label>
              <Input id="f-r" type="date" min={s.pickup ?? today} value={s.ret ?? ""} onChange={(e) => update({ ret: e.target.value || undefined })} className="bg-card px-2" />
            </div>
          </div>
          {dateError && <p role="alert" className="text-xs text-destructive">{dateError}</p>}
          <FilterSelect id="f-c" label="Vehicle type" value={s.category} onChange={(v) => update({ category: v })} options={(cats.data ?? []).map((c) => [c.slug, c.name])} />
          <FilterSelect id="f-t" label="Transmission" value={s.transmission} onChange={(v) => update({ transmission: v as "automatic" | "manual" | undefined })} options={[["automatic", "Automatic"], ["manual", "Manual"]]} />
          <FilterSelect id="f-s" label="Minimum seats" value={s.minSeats?.toString()} onChange={(v) => update({ minSeats: v ? Number(v) : undefined })} options={[["4", "4+"], ["5", "5+"], ["7", "7+"], ["10", "10+"]]} />
          <FilterSelect id="f-m" label="Max price per day" value={s.maxPrice?.toString()} onChange={(v) => update({ maxPrice: v ? Number(v) : undefined })} options={[["10000", "LKR 10,000"], ["20000", "LKR 20,000"], ["35000", "LKR 35,000"], ["50000", "LKR 50,000"]]} />
          <FilterSelect id="f-l" label="Location" value={s.location} onChange={(v) => update({ location: v })} options={LOCATIONS.map((l) => [l, l])} />
          <Button variant="outline" className="w-full" onClick={() => { setQ(""); navigate({ search: {} }); }}>Reset filters</Button>
        </aside>

        <section aria-live="polite">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{result.data ? `${result.data.total} vehicle${result.data.total === 1 ? "" : "s"} found` : " "}</p>
            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="text-sm">Sort by</label>
              <select id="sort" className={selectClass + " w-auto"} value={s.sort ?? "price_asc"} onChange={(e) => update({ sort: e.target.value as typeof s.sort })}>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="seats_desc">Most seats</option>
                <option value="newest">Newest model</option>
              </select>
            </div>
          </div>
          {result.isLoading ? <LoadingState label="Finding vehicles…" /> : result.error ? <ErrorState message={friendlyError(result.error)} onRetry={() => result.refetch()} /> :
            result.data!.vehicles.length === 0 ? (
              <EmptyState title="No vehicles match these filters" description="Try different dates or remove a filter." action={<Button variant="outline" onClick={() => { setQ(""); navigate({ search: {} }); }}>Reset filters</Button>} />
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {result.data!.vehicles.map((v) => <VehicleCard key={v.id} v={v} search={{ pickup: filters.pickup, ret: filters.ret }} />)}
                </div>
                {pages > 1 && (
                  <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-3">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => update({ page: page - 1 })}>Previous</Button>
                    <span className="text-sm">Page {page} of {pages}</span>
                    <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => update({ page: page + 1 })}>Next</Button>
                  </nav>
                )}
              </>
            )}
        </section>
      </div>
    </>
  );
}

function FilterSelect({ id, label, value, onChange, options }: { id: string; label: string; value?: string | undefined; onChange: (v: string | undefined) => void; options: string[][] }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <select id={id} className={selectClass} value={value ?? ""} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">Any</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}
