import { ApiError, NetworkError } from "./client";

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

  // apiFetch converts a rejected fetch() into NetworkError. A bare TypeError is NOT
  // connectivity: it is just as likely a mapping bug after a 2xx response.
  if (err instanceof NetworkError) return true;

  // A fetch aborted by a timeout surfaces as a DOMException named AbortError.
  if (err instanceof DOMException && err.name === "AbortError") return true;

  return false;
}
