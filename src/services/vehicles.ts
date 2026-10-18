import { supabase } from "@/integrations/supabase/client";

export type VehicleListItem = {
  id: string;
  make: string;
  model: string;
  year: number;
  transmission: string;
  fuel_type: string;
  seats: number;
  luggage: number;
  daily_rate_lkr: number;
  weekly_rate_lkr: number | null;
  deposit_lkr: number | null;
  location: string;
  description: string;
  features: string[];
  is_demo: boolean;
  is_active: boolean;
  category: { id: string; slug: string; name: string } | null;
  images: { url: string; alt: string; sort_order: number }[];
};

export const VEHICLE_SELECT =
  "id, make, model, year, transmission, fuel_type, seats, luggage, daily_rate_lkr, weekly_rate_lkr, deposit_lkr, location, description, features, is_demo, is_active, category:vehicle_categories(id, slug, name), images:vehicle_images(url, alt, sort_order)";

export type VehicleFilters = {
  q?: string | undefined;
  category?: string | undefined;
  transmission?: string | undefined;
  minSeats?: number | undefined;
  maxPrice?: number | undefined;
  location?: string | undefined;
  pickup?: string | undefined;
  ret?: string | undefined;
  sort?: "price_asc" | "price_desc" | "seats_desc" | "newest" | undefined;
  page?: number | undefined;
};

export const PAGE_SIZE = 9;

/** Server-side filtered + paginated vehicle search. Date filtering excludes vehicles with overlapping live bookings. */
export async function searchVehicles(f: VehicleFilters) {
  let excluded: string[] = [];
  if (f.pickup && f.ret && f.ret > f.pickup) {
    const { data, error } = await supabase.rpc("unavailable_vehicle_ids", { _pickup: f.pickup, _return: f.ret });
    if (error) throw error;
    excluded = (data ?? []) as unknown as string[];
  }

  let categoryId: string | undefined;
  if (f.category) {
    const { data } = await supabase.from("vehicle_categories").select("id").eq("slug", f.category).maybeSingle();
    categoryId = data?.id ?? "00000000-0000-0000-0000-000000000000";
  }

  let query = supabase.from("vehicles").select(VEHICLE_SELECT, { count: "exact" }).eq("is_active", true);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (f.transmission) query = query.eq("transmission", f.transmission);
  if (f.minSeats) query = query.gte("seats", f.minSeats);
  if (f.maxPrice) query = query.lte("daily_rate_lkr", f.maxPrice);
  if (f.location) query = query.eq("location", f.location);
  if (f.q) {
    const term = f.q.replace(/[%,()]/g, " ").trim();
    if (term) query = query.or(`make.ilike.%${term}%,model.ilike.%${term}%`);
  }
  if (excluded.length) query = query.not("id", "in", `(${excluded.join(",")})`);

  const sort = f.sort ?? "price_asc";
  if (sort === "price_asc") query = query.order("daily_rate_lkr", { ascending: true });
  if (sort === "price_desc") query = query.order("daily_rate_lkr", { ascending: false });
  if (sort === "seats_desc") query = query.order("seats", { ascending: false });
  if (sort === "newest") query = query.order("year", { ascending: false });

  const page = Math.max(1, f.page ?? 1);
  query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const { data, error, count } = await query;
  if (error) throw error;
  return { vehicles: (data ?? []) as unknown as VehicleListItem[], total: count ?? 0 };
}

export async function getVehicle(id: string) {
  const { data, error } = await supabase.from("vehicles").select(VEHICLE_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as VehicleListItem | null;
}

export async function getCategories() {
  const { data, error } = await supabase.from("vehicle_categories").select("*").order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function getPolicies() {
  const { data, error } = await supabase.from("business_policies").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return data;
}

export function primaryImage(v: Pick<VehicleListItem, "images">) {
  const sorted = [...(v.images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  return sorted[0];
}
