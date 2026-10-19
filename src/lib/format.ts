/**
 * SwiftDrive Rentals — Localization, Date Utilities & Error Formatting
 *
 * Provides shared formatters tailored to the Sri Lankan rental market:
 *  - Currency formatting in Sri Lankan Rupees (LKR)
 *  - Date/Time localization using the en-GB format (Day-Month-Year)
 *  - Colombo timezone (UTC+05:30) date evaluation to prevent booking date shift
 *  - User-facing error message sanitization for backend Supabase exceptions
 */

/**
 * Formats a monetary value into standard Sri Lankan Rupee representation (e.g. "LKR 15,000").
 *
 * @param value Number, string, or null/undefined
 * @returns Formatted currency string
 */
export function formatLKR(value: number | string | null | undefined): string {
  const numericValue = Number(value ?? 0);
  return (
    "LKR " +
    numericValue.toLocaleString("en-LK", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  );
}

/**
 * Formats an ISO date string into standard Day Month Year format (e.g. "15 Nov 2026").
 *
 * @param value ISO date string (YYYY-MM-DD or full ISO timestamp)
 * @returns Formatted date string, or "—" if empty
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  // If only a date portion is provided, treat it as local calendar date
  const parsedDate = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  return parsedDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Formats an ISO timestamp into a readable date and time string (e.g. "15 Nov 2026, 14:30").
 * Used for inspection logs, payment receipts, and audit trail entries.
 *
 * @param value ISO timestamp string
 * @returns Formatted date-time string, or "—" if empty
 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Retrieves today's calendar date specifically in the Sri Lanka timezone (Asia/Colombo, UTC+05:30).
 *
 * CRITICAL FOR TOURIST RESERVATIONS:
 * Foreign visitors browsing from European or American timezones would otherwise receive
 * an inaccurate "today" from their local system clock, causing premature "date in the past"
 * validation errors or permitting booking dates that have already begun in Sri Lanka.
 *
 * @param now Reference JavaScript Date object (defaults to current system time)
 * @returns Today's date string in YYYY-MM-DD format
 */
export function todayColombo(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(now);
}

/**
 * Adds an integer number of calendar days to an ISO date string.
 *
 * @param iso Base date in YYYY-MM-DD format
 * @param days Positive or negative integer count of days to add
 * @returns New ISO date string in YYYY-MM-DD format
 */
export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Known backend error codes mapped to clear, user-friendly explanations.
 * Prevents raw database schema errors or internal function names from leaking to customers.
 */
const ERROR_CODE_TRANSLATIONS: Record<string, string> = {
  INVALID_DATES: "The return date must be after the pickup date.",
  PICKUP_IN_PAST: "The pickup date cannot be in the past.",
  DURATION_OUT_OF_RANGE: "This rental length is outside the allowed range. Please adjust your dates.",
  VEHICLE_UNAVAILABLE:
    "Sorry, this vehicle is already reserved for some of those dates. Please choose other dates or another vehicle.",
  VEHICLE_NOT_FOUND: "This vehicle is no longer available for booking.",
  NOT_AUTHENTICATED: "Please sign in to continue. Your session may have expired.",
  INVALID_LOCATION: "Please enter a valid pickup and return location.",
  INVALID_TRANSITION: "This action is not allowed for the booking's current status.",
  FORBIDDEN: "You don't have permission to perform that action.",
  NOT_FOUND: "We couldn't find the requested record.",
  DUPLICATE_INQUIRY: "We have already received this message. Our team will get back to you shortly.",
  INVALID_AMOUNT: "Please enter a valid monetary amount.",
  USER_NOT_FOUND: "No account exists with that email address.",
  CANNOT_REMOVE_SELF: "You cannot remove your own administrator access privileges.",
  INVALID_ROLE: "That role cannot be modified from this interface.",
};

/**
 * Translates arbitrary error objects (PostgreSQL errors, Auth exceptions, network failures)
 * into friendly, actionable notifications for the user interface.
 *
 * @param err The caught error instance or message string
 * @returns Polite, informative error string safe for display
 */
export function friendlyError(err: unknown): string {
  const rawMessage =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err ?? "");

  // Match known application business error codes
  for (const [code, userMessage] of Object.entries(ERROR_CODE_TRANSLATIONS)) {
    if (rawMessage.includes(code)) {
      return userMessage;
    }
  }

  // Handle common Supabase Authentication error messages
  if (/User already registered/i.test(rawMessage)) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (/Invalid login credentials/i.test(rawMessage)) {
    return "Incorrect email or password.";
  }
  if (/Email not confirmed/i.test(rawMessage)) {
    return "Please confirm your email address first — check your inbox for the activation link.";
  }
  if (/rate limit|over_email_send_rate_limit/i.test(rawMessage)) {
    return "Too many requests. Please wait a few minutes before trying again.";
  }
  if (/email.*invalid/i.test(rawMessage)) {
    return "Please enter a valid email address (e.g. name@example.com).";
  }
  if (/Failed to fetch|NetworkError/i.test(rawMessage)) {
    return "We couldn't reach the server. Please check your internet connection and try again.";
  }
  if (/JWT|expired/i.test(rawMessage)) {
    return "Your session has expired. Please sign in again.";
  }

  // Safe fallback
  if (
    rawMessage &&
    rawMessage !== "undefined" &&
    rawMessage !== "null" &&
    rawMessage.length < 120
  ) {
    return rawMessage;
  }

  return "Something went wrong. Please try again or contact our support team.";
}

