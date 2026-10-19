/**
 * SwiftDrive Rentals — Rental Domain Logic & Booking Calculations
 *
 * This module defines shared booking business logic used for instant client-side
 * feedback across reservation forms, search filters, and staff dashboards.
 *
 * NOTE: The definitive and legally binding price calculation, date exclusivity,
 * and state transitions are always enforced by the PostgreSQL database functions
 * (`calc_rental`, `quote_rental`, `create_booking`, `set_booking_status`).
 * The functions here mirror those database rules for a responsive UI experience.
 */

/**
 * Valid lifecycle states for vehicle reservations.
 *  - pending: Initial reservation created by customer; awaiting staff review.
 *  - confirmed: Approved by staff; vehicle allocated and ready for pickup.
 *  - active: Vehicle physically handed over to customer; trip is in progress.
 *  - completed: Vehicle returned, final condition inspected, and rental closed.
 *  - cancelled: Booking cancelled by customer or staff before pickup.
 *  - rejected: Booking declined by staff (e.g. invalid documents or vehicle maintenance).
 */
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled"
  | "rejected";

/**
 * Calculates the number of calendar rental days between pickup and return dates.
 * Uses UTC timestamps to avoid daylight saving or local timezone date shift anomalies.
 *
 * @param pickup ISO date string (YYYY-MM-DD)
 * @param ret ISO date string (YYYY-MM-DD)
 * @returns Total number of rental days, or NaN if either date is invalid
 */
export function rentalDays(pickup: string, ret: string): number {
  const pickupTimestamp = Date.parse(`${pickup}T00:00:00Z`);
  const returnTimestamp = Date.parse(`${ret}T00:00:00Z`);

  if (Number.isNaN(pickupTimestamp) || Number.isNaN(returnTimestamp)) {
    return NaN;
  }

  // 86,400,000 ms in a standard 24-hour day
  const ONE_DAY_MS = 86_400_000;
  return Math.round((returnTimestamp - pickupTimestamp) / ONE_DAY_MS);
}

/**
 * Validates selected pickup and return dates against business constraints.
 *
 * @param pickup User-selected pickup date (YYYY-MM-DD)
 * @param ret User-selected return date (YYYY-MM-DD)
 * @param today Reference date in Colombo timezone (YYYY-MM-DD)
 * @returns Validation error message string, or null if dates are valid
 */
export function validateDates(pickup: string, ret: string, today: string): string | null {
  if (!pickup || !ret) {
    return "Please choose both a pickup and a return date.";
  }

  if (pickup < today) {
    return "The pickup date cannot be in the past.";
  }

  if (ret <= pickup) {
    return "The return date must be after the pickup date.";
  }

  return null;
}

/**
 * Estimates the rental total given days and vehicle pricing tiers.
 *
 * Pricing Formula:
 * If a weekly discounted rate is configured AND the rental is 7 days or more:
 *   Total = (Full Weeks * Weekly Rate) + (Remainder Days * Daily Rate)
 * Otherwise:
 *   Total = Days * Daily Rate
 *
 * @param days Total number of billable rental days
 * @param daily Daily rental rate in LKR
 * @param weekly Optional discounted rate for each 7-day block in LKR
 * @returns Estimated total rental charge in LKR
 */
export function estimatePrice(days: number, daily: number, weekly: number | null): number {
  if (!(days > 0)) {
    return 0;
  }

  // Apply weekly package discount for 7+ days if configured
  if (weekly && days >= 7) {
    const fullWeeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    return fullWeeks * weekly + remainingDays * daily;
  }

  return days * daily;
}

/**
 * State transition matrix permitted for staff members via the management UI.
 *
 * Notes:
 *  - Moving from 'confirmed' to 'active' requires a physical pickup inspection report
 *    and is handled by `record_pickup_handover` in the database.
 *  - Moving from 'active' to 'completed' requires a return condition report and
 *    is handled by `record_return_handover`.
 *  - Direct manual transitions here mirror `set_booking_status` in PostgreSQL.
 */
export const STAFF_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "rejected", "cancelled"],
  confirmed: ["cancelled"],
  active: [],
  completed: [],
  cancelled: [],
  rejected: [],
};

/**
 * Checks whether an active booking is past its expected return date.
 *
 * @param status Current booking lifecycle status
 * @param returnDate Contracted return date (YYYY-MM-DD)
 * @param today Current date in Sri Lanka (YYYY-MM-DD)
 */
export function isOverdue(status: BookingStatus, returnDate: string, today: string): boolean {
  return status === "active" && returnDate < today;
}

/**
 * Computes the remaining balance owed on a booking.
 * Ensures the value is rounded to 2 decimal places and never drops below zero.
 *
 * @param total Total due (rental amount + security deposit)
 * @param paid Total amount paid and verified so far
 */
export function outstanding(total: number, paid: number): number {
  const diff = total - paid;
  return Math.max(0, Math.round(diff * 100) / 100);
}

