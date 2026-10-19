/**
 * SwiftDrive Rentals — Vehicle Fleet Data Service
 *
 * Encapsulates all database interactions for the vehicle catalogue, search queries,
 * vehicle detail retrieval, category listings, and business policies.
 *
 * Integrates directly with Supabase PostgreSQL, leveraging server-side RPC functions
 * for live date-overlap collision checks.
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Normalized vehicle item representation including joined category metadata
 * and ordered gallery images.
 */
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

/**
 * Standard PostgreSQL SELECT projection used to fetch vehicle records
 * along with relational joins for categories and media images.
 */
export const VEHICLE_SELECT =
  "id, make, model, year, transmission, fuel_type, seats, luggage, daily_rate_lkr, weekly_rate_lkr, deposit_lkr, location, description, features, is_demo, is_active, category:vehicle_categories(id, slug, name), images:vehicle_images(url, alt, sort_order)";

/**
 * Filter parameters supported by the vehicle catalogue search interface.
 */
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

/**
 * Default number of vehicle cards rendered per catalogue page.
 */
export const PAGE_SIZE = 9;

/**
 * Executes a server-side filtered, sorted, and paginated query against the vehicle fleet.
 *
 * Live Availability Mechanism:
 * When pickup and return dates are supplied, the function calls the PostgreSQL RPC
 * `unavailable_vehicle_ids` which scans all confirmed and active reservations overlapping
 * the requested date range. Any vehicle with an active conflict is excluded from the result set.
 *
 * @param filters User search criteria and pagination options
 * @returns Object containing the matched vehicle list and total matching count
 */
export async function searchVehicles(filters: VehicleFilters) {
  let excludedVehicleIds: string[] = [];

  // 1. Exclude vehicles booked during overlapping date intervals
  if (filters.pickup && filters.ret && filters.ret > filters.pickup) {
    const { data: unavailableIds, error: rpcError } = await supabase.rpc(
      "unavailable_vehicle_ids",
      {
        _pickup: filters.pickup,
        _return: filters.ret,
      },
    );

    if (rpcError) {
      console.error("[VehicleService] Error checking vehicle availability:", rpcError);
      throw rpcError;
    }

    excludedVehicleIds = (unavailableIds ?? []) as unknown as string[];
  }

  // 2. Resolve category UUID if a category slug is specified
  let categoryId: string | undefined;
  if (filters.category) {
    const { data: catData } = await supabase
      .from("vehicle_categories")
      .select("id")
      .eq("slug", filters.category)
      .maybeSingle();

    // Use a non-existent UUID fallback if category slug is unrecognized
    categoryId = catData?.id ?? "00000000-0000-0000-0000-000000000000";
  }

  // 3. Build the Supabase query with exact count calculation
  let query = supabase
    .from("vehicles")
    .select(VEHICLE_SELECT, { count: "exact" })
    .eq("is_active", true);

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }
  if (filters.transmission) {
    query = query.eq("transmission", filters.transmission);
  }
  if (filters.minSeats) {
    query = query.gte("seats", filters.minSeats);
  }
  if (filters.maxPrice) {
    query = query.lte("daily_rate_lkr", filters.maxPrice);
  }
  if (filters.location) {
    query = query.eq("location", filters.location);
  }

  // Text search across vehicle make and model
  if (filters.q) {
    // Sanitize search tokens to prevent SQL ILIKE syntax errors
    const sanitizedTerm = filters.q.replace(/[%,()]/g, " ").trim();
    if (sanitizedTerm) {
      query = query.or(`make.ilike.%${sanitizedTerm}%,model.ilike.%${sanitizedTerm}%`);
    }
  }

  // Exclude unavailable vehicles from this date window
  if (excludedVehicleIds.length > 0) {
    query = query.not("id", "in", `(${excludedVehicleIds.join(",")})`);
  }

  // 4. Apply sorting order
  const sort = filters.sort ?? "price_asc";
  if (sort === "price_asc") {
    query = query.order("daily_rate_lkr", { ascending: true });
  } else if (sort === "price_desc") {
    query = query.order("daily_rate_lkr", { ascending: false });
  } else if (sort === "seats_desc") {
    query = query.order("seats", { ascending: false });
  } else if (sort === "newest") {
    query = query.order("year", { ascending: false });
  }

  // 5. Apply pagination offsets
  const currentPage = Math.max(1, filters.page ?? 1);
  const fromIndex = (currentPage - 1) * PAGE_SIZE;
  const toIndex = currentPage * PAGE_SIZE - 1;
  query = query.range(fromIndex, toIndex);

  const { data, error, count } = await query;
  if (error) {
    console.error("[VehicleService] Error fetching vehicle list:", error);
    throw error;
  }

  return {
    vehicles: (data ?? []) as unknown as VehicleListItem[],
    total: count ?? 0,
  };
}

/**
 * Fetches full details for a single vehicle by its primary ID.
 *
 * @param id Vehicle UUID
 * @returns The vehicle data object, or null if not found
 */
export async function getVehicle(id: string) {
  const { data, error } = await supabase
    .from("vehicles")
    .select(VEHICLE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(`[VehicleService] Error loading vehicle ${id}:`, error);
    throw error;
  }

  return data as unknown as VehicleListItem | null;
}

/**
 * Retrieves all vehicle categories sorted in display order.
 */
export async function getCategories() {
  const { data, error } = await supabase
    .from("vehicle_categories")
    .select("*")
    .order("sort_order");

  if (error) {
    console.error("[VehicleService] Error loading vehicle categories:", error);
    throw error;
  }

  return data ?? [];
}

/**
 * Retrieves global business policies (deposit rules, cancellation window, driver requirements).
 */
export async function getPolicies() {
  const { data, error } = await supabase
    .from("business_policies")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("[VehicleService] Error loading business policies:", error);
    throw error;
  }

  return data;
}

/**
 * Resolves the primary showcase image for a vehicle card.
 * Selects the image with the lowest sort order.
 *
 * @param vehicle Vehicle containing an array of image descriptors
 * @returns The primary image record, or undefined if no images are registered
 */
export function primaryImage(vehicle: Pick<VehicleListItem, "images">) {
  const sortedImages = [...(vehicle.images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  return sortedImages[0];
}

