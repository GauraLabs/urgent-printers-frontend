import { isInfrastructureFailure } from "@/lib/api/errorClassification";
import { useDegradedStore } from "./degradedStore";

// Feeds the "degraded" site-status banner from real fetch outcomes in the
// cart/checkout flow — never from a health-check poll (see order-halt plan
// Phase 6: polling a second endpoint is no more reliable than the request
// that already failed, and adds detection lag). Call sites wrap the exact
// promise returned by a lib/api/* call; the original error is rethrown
// untouched so existing catch blocks / toasts at each call site keep working
// unmodified — this only observes the outcome, it never changes it.
export async function trackConnectivity<T>(promise: Promise<T>): Promise<T> {
  try {
    const result = await promise;
    useDegradedStore.getState().reportRecovery();
    return result;
  } catch (err) {
    if (isInfrastructureFailure(err)) {
      useDegradedStore.getState().reportFailure();
    }
    throw err;
  }
}
