import { ApiError } from "./client";

// Used to decide whether a cart/checkout fetch failure should flip on the
// "degraded" site-status banner (see features/site-status/trackConnectivity.ts).
// Deliberately narrow — must return true ONLY for genuine connectivity/
// infrastructure failures, never for validation errors or expected
// business-logic responses (invalid coupon, out of stock, etc.), and never
// for the orders-halted 503 (that has its own dedicated "halted" banner
// driven by lib/api/siteStatus.ts, not this path).
export function isInfrastructureFailure(err: unknown): boolean {
  if (err instanceof ApiError) {
    if (err.code === "orders_halted") return false;
    return err.status >= 500;
  }

  // Browsers throw a TypeError ("Failed to fetch" / "NetworkError...") when
  // fetch() can't even reach the server — offline, DNS failure, connection
  // refused. This never happens for a response that actually came back,
  // including 4xx business-logic errors like validateCoupon's own
  // `throw new Error(data.message)` for an invalid code — those are plain
  // Error instances, not TypeError, so they're correctly excluded below.
  if (err instanceof TypeError) return true;

  // A fetch aborted by a timeout surfaces as a DOMException named AbortError.
  if (err instanceof DOMException && err.name === "AbortError") return true;

  return false;
}
