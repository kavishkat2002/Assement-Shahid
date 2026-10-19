/**
 * @file error-capture.ts
 * @description Out-of-band error interceptor for server-side SSR and HTTP runtime debugging.
 *
 * Background & Problem Statement:
 * The Nitro/h3 server runtime underpinning TanStack Start intercepts unhandled exceptions
 * thrown during server-side rendering, converting them into generic JSON responses:
 * `{"unhandled": true, "message": "HTTPError"}`.
 * This conversion strips the original JavaScript Error stack trace and nested `.cause` chain,
 * hindering forensic analysis in server telemetry and logs.
 *
 * Solution:
 * 1. Monkey-patches `console.error` and hooks global rejection listeners.
 * 2. Unrolls nested error causes recursively (up to 5 levels) into detailed diagnostic text.
 * 3. Caches the latest captured exception with a 5-second Time-To-Live (TTL) so that
 *    `server.ts` can retrieve the true failure cause when producing fallback HTML.
 */

interface CapturedErrorRecord {
  error: unknown;
  at: number;
}

let lastCapturedError: CapturedErrorRecord | undefined;

/** Maximum time in milliseconds to retain a captured error before expiring it */
const ERROR_TTL_MS = 5_000;

/** Depth limit for traversing chained Error.cause references */
const CAUSE_DEPTH_LIMIT = 5;

/** Maximum character length of serialized error description strings */
const DESCRIPTION_LENGTH_LIMIT = 8_000;

/**
 * Stores an intercepted error in memory with a current timestamp.
 */
function recordError(error: unknown): void {
  lastCapturedError = { error, at: Date.now() };
}

/**
 * Traverses an Error instance and its recursive cause chain, producing a formatted stack string.
 *
 * @param error - The encountered error or thrown object
 * @returns Serialized multi-line error trace
 */
export function describeError(error: unknown): string {
  const traces: string[] = [];
  let current: unknown = error;

  for (let depth = 0; depth < CAUSE_DEPTH_LIMIT && current != null; depth++) {
    if (!(current instanceof Error)) {
      traces.push(typeof current === "string" ? current : safeStringify(current));
      break;
    }

    const causePrefix = depth === 0 ? "" : "caused by: ";
    const statusLabel = describeStatus(current);
    const traceContent = current.stack ?? `${current.name}: ${current.message}`;

    traces.push(`${causePrefix}${traceContent}${statusLabel}`);
    current = current.cause;
  }

  return traces.join("\n").slice(0, DESCRIPTION_LENGTH_LIMIT);
}

/**
 * Extracts HTTP status code metadata attached to custom Error instances if available.
 */
function describeStatus(error: Error): string {
  const { status, statusCode } = error as { status?: unknown; statusCode?: unknown };
  const numericStatus = status ?? statusCode;
  return typeof numericStatus === "number" ? ` (status ${numericStatus})` : "";
}

/**
 * Safely serializes objects without throwing on circular references.
 */
function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * Type guard verifying whether an arbitrary unknown value implements the Error interface.
 */
function isErrorLike(value: unknown): value is Error {
  return value instanceof Error;
}

// Preserve original console.error implementation for dispatch
const originalConsoleError = console.error.bind(console);

// Intercept console.error calls across all server modules to record diagnostic errors
console.error = (...args: unknown[]) => {
  const expandedArgs = args.map((arg) => {
    if (!isErrorLike(arg)) return arg;
    recordError(arg);
    return describeError(arg);
  });
  originalConsoleError(...expandedArgs);
};

// Bind browser and worker-level error event handlers if globalThis supports them
if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => {
    recordError((event as ErrorEvent).error ?? event);
  });

  globalThis.addEventListener("unhandledrejection", (event) => {
    recordError((event as PromiseRejectionEvent).reason);
  });
}

/**
 * Retrieves and clears the most recently captured server error if within the TTL window.
 *
 * @returns The captured Error object or undefined if none exists or has expired
 */
export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;

  const isExpired = Date.now() - lastCapturedError.at > ERROR_TTL_MS;
  if (isExpired) {
    lastCapturedError = undefined;
    return undefined;
  }

  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}
