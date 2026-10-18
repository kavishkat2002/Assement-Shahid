import { describe, expect, it } from "vitest";
import { estimatePrice, isOverdue, outstanding, rentalDays, STAFF_TRANSITIONS, validateDates } from "./booking";

describe("booking rules", () => {
  it("rejects a return date on or before pickup", () => {
    expect(validateDates("2026-11-10", "2026-11-10", "2026-11-01")).toMatch(/after the pickup/);
    expect(validateDates("2026-11-10", "2026-11-09", "2026-11-01")).toMatch(/after the pickup/);
  });
  it("rejects a pickup date in the past", () => {
    expect(validateDates("2026-10-01", "2026-10-05", "2026-10-14")).toMatch(/past/);
  });
  it("counts rental days as return minus pickup", () => {
    expect(rentalDays("2026-11-01", "2026-11-04")).toBe(3);
  });
  it("uses daily rate below 7 days", () => {
    expect(estimatePrice(3, 8500, 52000)).toBe(25500);
  });
  it("uses weekly rate for full weeks plus daily for the remainder", () => {
    expect(estimatePrice(9, 8500, 52000)).toBe(52000 + 2 * 8500);
  });
  it("falls back to daily rate when no weekly rate is set", () => {
    expect(estimatePrice(8, 10000, null)).toBe(80000);
  });
  it("only lets staff move pending bookings to confirmed, rejected or cancelled", () => {
    expect(STAFF_TRANSITIONS.pending).toEqual(["confirmed", "rejected", "cancelled"]);
    expect(STAFF_TRANSITIONS.completed).toEqual([]);
  });
  it("flags active rentals past their return date as overdue", () => {
    expect(isOverdue("active", "2026-10-10", "2026-10-14")).toBe(true);
    expect(isOverdue("confirmed", "2026-10-10", "2026-10-14")).toBe(false);
  });
  it("never shows a negative outstanding balance", () => {
    expect(outstanding(1000, 1500)).toBe(0);
    expect(outstanding(1000, 250)).toBe(750);
  });
});
