/**
 * @file booking.test.ts
 * @description Comprehensive unit test suite for core rental business logic,
 * pricing formulas, date boundary validations, and booking lifecycle state machines.
 *
 * Test Scenarios:
 * 1. Date Range Validation:
 *    - Rejection of identical pickup and return dates (minimum 1-day rental required).
 *    - Rejection of inverted date ranges (return before pickup).
 *    - Rejection of retrospective reservations (pickup in the past relative to reference date).
 * 2. Duration Calculation:
 *    - Day span counting between calendar date strings.
 * 3. Tiered Pricing Quotation:
 *    - Short-term rentals (< 7 days) evaluated at flat daily rates.
 *    - Extended rentals (>= 7 days) evaluated with weekly rate bundle discounts + daily remainders.
 *    - Fallback computation when weekly rates are unconfigured.
 * 4. State Machine Transition Verification:
 *    - Staff-permitted lifecycle pathways.
 *    - Terminal status immutability.
 * 5. Overdue Detection & Financial Balance Guardrails:
 *    - Past-return date flagging for active fleet rentals.
 *    - Clamp against negative balances on overpayments or deposits.
 */

import { describe, expect, it } from "vitest";
import {
  estimatePrice,
  isOverdue,
  outstanding,
  rentalDays,
  STAFF_TRANSITIONS,
  validateDates,
} from "./booking";

describe("Booking Domain Rules & Financial Calculations", () => {
  describe("validateDates", () => {
    it("rejects a return date on or before pickup", () => {
      // Identical calendar date (same-day return is prohibited by rental policy)
      expect(validateDates("2026-11-10", "2026-11-10", "2026-11-01")).toMatch(
        /after the pickup/i
      );

      // Inverted chronological order (return date prior to pickup date)
      expect(validateDates("2026-11-10", "2026-11-09", "2026-11-01")).toMatch(
        /after the pickup/i
      );
    });

    it("rejects a pickup date in the past", () => {
      // Pickup requested on October 1st when current date is October 14th
      expect(validateDates("2026-10-01", "2026-10-05", "2026-10-14")).toMatch(
        /past/i
      );
    });
  });

  describe("rentalDays", () => {
    it("counts rental days as return minus pickup", () => {
      // 3 full 24-hour rental intervals between Nov 1 and Nov 4
      expect(rentalDays("2026-11-01", "2026-11-04")).toBe(3);
    });
  });

  describe("estimatePrice", () => {
    it("uses daily rate below 7 days", () => {
      // 3 days at 8,500 LKR/day = 25,500 LKR
      expect(estimatePrice(3, 8500, 52000)).toBe(25500);
    });

    it("uses weekly rate for full weeks plus daily for the remainder", () => {
      // 9 days = 1 full week (52,000 LKR) + 2 remainder days (2 * 8,500 LKR = 17,000 LKR) = 69,000 LKR
      const expectedTotal = 52000 + 2 * 8500;
      expect(estimatePrice(9, 8500, 52000)).toBe(expectedTotal);
    });

    it("falls back to daily rate when no weekly rate is set", () => {
      // 8 days at 10,000 LKR/day with null weekly rate = 80,000 LKR
      expect(estimatePrice(8, 10000, null)).toBe(80000);
    });
  });

  describe("STAFF_TRANSITIONS state machine", () => {
    it("only lets staff move pending bookings to confirmed, rejected or cancelled", () => {
      expect(STAFF_TRANSITIONS.pending).toEqual(["confirmed", "rejected", "cancelled"]);
    });

    it("treats completed rentals as terminal immutable states", () => {
      expect(STAFF_TRANSITIONS.completed).toEqual([]);
    });
  });

  describe("isOverdue", () => {
    it("flags active rentals past their return date as overdue", () => {
      // An active rental scheduled to return on Oct 10 evaluated on Oct 14 is overdue
      expect(isOverdue("active", "2026-10-10", "2026-10-14")).toBe(true);

      // A confirmed booking is not yet active, so it cannot be overdue
      expect(isOverdue("confirmed", "2026-10-10", "2026-10-14")).toBe(false);
    });
  });

  describe("outstanding", () => {
    it("never shows a negative outstanding balance", () => {
      // Total 1,000 LKR with 1,500 LKR paid -> 0 LKR outstanding (no negative debt)
      expect(outstanding(1000, 1500)).toBe(0);

      // Total 1,000 LKR with 250 LKR paid -> 750 LKR outstanding
      expect(outstanding(1000, 250)).toBe(750);
    });
  });
});
