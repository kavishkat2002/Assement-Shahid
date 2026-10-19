/** Formatting and user-facing error helpers shared across the app. */

export function formatLKR(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return "LKR " + n.toLocaleString("en-LK", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = value.length === 10 ? new Date(value + "T00:00:00") : new Date(value);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Today's date in Sri Lanka as YYYY-MM-DD. */
export function todayColombo(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(now);
}

export function addDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const MESSAGES: Record<string, string> = {
  INVALID_DATES: "The return date must be after the pickup date.",
  PICKUP_IN_PAST: "The pickup date cannot be in the past.",
  DURATION_OUT_OF_RANGE: "This rental length is outside the allowed range. Please adjust your dates.",
  VEHICLE_UNAVAILABLE: "Sorry, this vehicle is already reserved for some of those dates. Please choose other dates or another vehicle.",
  VEHICLE_NOT_FOUND: "This vehicle is no longer available for booking.",
  NOT_AUTHENTICATED: "Please sign in to continue. Your session may have expired.",
  INVALID_LOCATION: "Please enter a valid pickup and return location.",
  INVALID_TRANSITION: "This action is not allowed for the booking's current status.",
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: "We couldn't find that record.",
  DUPLICATE_INQUIRY: "We've already received this message. Our team will reply soon.",
  INVALID_AMOUNT: "Please enter a valid amount.",
  USER_NOT_FOUND: "No account exists with that email address.",
  CANNOT_REMOVE_SELF: "You cannot remove your own administrator access.",
  INVALID_ROLE: "That role cannot be changed here.",
};

/** Map backend error codes to polite messages without exposing internals. */
export function friendlyError(err: unknown): string {
  const raw = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : String(err ?? "");
  for (const key of Object.keys(MESSAGES)) if (raw.includes(key)) return MESSAGES[key] ?? "";
  if (/User already registered/i.test(raw)) return "An account with this email already exists. Try signing in instead.";
  if (/Invalid login credentials/i.test(raw)) return "Incorrect email or password.";
  if (/Email not confirmed/i.test(raw)) return "Please confirm your email address first — check your inbox.";
  if (/rate limit|over_email_send_rate_limit/i.test(raw)) return "Too many requests. Please wait a few minutes before trying again.";
  if (/email.*invalid/i.test(raw)) return "Please enter a valid email address (e.g. Gmail).";
  if (/Failed to fetch|NetworkError/i.test(raw)) return "We couldn't reach the server. Please check your connection and try again.";
  if (/JWT|expired/i.test(raw)) return "Your session has expired. Please sign in again.";
  return raw && raw !== "undefined" && raw !== "null" && raw.length < 120 ? raw : "Something went wrong. Please try again.";
}
