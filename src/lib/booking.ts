/**
 * Booking rules shared by the UI.
 * The authoritative price is always computed by the database (calc_rental / create_booking);
 * these helpers only give instant feedback and must mirror the same rules.
 */

export type BookingStatus = "pending" | "confirmed" | "active" | "completed" | "cancelled" | "rejected";

export function rentalDays(pickup: string, ret: string) {
  const a = Date.parse(pickup + "T00:00:00Z");
  const b = Date.parse(ret + "T00:00:00Z");
  if (Number.isNaN(a) || Number.isNaN(b)) return NaN;
  return Math.round((b - a) / 86_400_000);
}

export function validateDates(pickup: string, ret: string, today: string): string | null {
  if (!pickup || !ret) return "Please choose both a pickup and a return date.";
  if (pickup < today) return "The pickup date cannot be in the past.";
  if (ret <= pickup) return "The return date must be after the pickup date.";
  return null;
}

/** Full weeks use the weekly rate (when configured and the rental is 7+ days); remaining days use the daily rate. */
export function estimatePrice(days: number, daily: number, weekly: number | null) {
  if (!(days > 0)) return 0;
  if (weekly && days >= 7) return Math.floor(days / 7) * weekly + (days % 7) * daily;
  return days * daily;
}

/** Staff-allowed status changes (pickup/return are recorded separately). Mirrors set_booking_status in SQL. */
export const STAFF_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "rejected", "cancelled"],
  confirmed: ["cancelled"],
  active: [],
  completed: [],
  cancelled: [],
  rejected: [],
};

export function isOverdue(status: BookingStatus, returnDate: string, today: string) {
  return status === "active" && returnDate < today;
}

export function outstanding(total: number, paid: number) {
  return Math.max(0, Math.round((total - paid) * 100) / 100);
}
