import { toast } from "sonner";
import { validateCoupon, CouponRejectedError } from "@/lib/api/coupons";
import { ApiError } from "@/lib/api/client";
import { useCartStore } from "./store";
import { eligibleSubtotal } from "./savings";

export type RevalidateResult =
  | "removed" // the server rejected the coupon; it was dropped with its message
  | "valid" // confirmed (discount and scope refreshed)
  | "kept" // could not be checked (network, 5xx, 429, ...): kept, retry later
  | "skipped"; // nothing to check

let latest = 0;
let inflight: AbortController | null = null;

// Only a definitive 4xx about the coupon is a verdict. 401/403/429, 5xx and transport failures are
// outages: the coupon stays and the order preview/create re-check it anyway.
const VERDICT_STATUSES = new Set([400, 404, 409, 410, 422]);

function isVerdict(err: unknown): boolean {
  if (err instanceof CouponRejectedError) return true;
  return err instanceof ApiError && VERDICT_STATUSES.has(err.status);
}

/** Changes whenever something the coupon depends on changes (lines, options, quantities, prices, coupon). */
export function cartSignature(): string {
  const { items, appliedCoupon } = useCartStore.getState();
  return JSON.stringify([
    appliedCoupon?.code ?? null,
    items.map((i) => [i.cartItemId, i.config.quantity, Math.round(i.totalPrice * 100), i.mrpPerUnit !== undefined && i.mrpPerUnit > i.pricePerUnit, Boolean(i.pricePending)]),
  ]);
}

/**
 * Re-checks the applied coupon against the server for the current cart. Newer calls cancel older
 * in-flight ones. `force` also checks while a line is still repricing (used before review).
 */
export async function revalidateAppliedCoupon(token?: string, opts: { force?: boolean } = {}): Promise<RevalidateResult> {
  const before = useCartStore.getState();
  const coupon = before.appliedCoupon;
  if (!coupon || before.items.length === 0) return "skipped";
  if (!opts.force && before.items.some((i) => i.pricePending)) return "skipped";

  const seq = ++latest;
  inflight?.abort();
  const controller = new AbortController();
  inflight = controller;
  const stale = () => seq !== latest || useCartStore.getState().appliedCoupon?.code !== coupon.code;

  try {
    const fresh = await validateCoupon(coupon.code, before.subtotal(), token, eligibleSubtotal(before.items), before.items, controller.signal);
    if (stale()) return "kept";
    const sameScope =
      (fresh.eligibleItemIds ?? []).join(",") === (coupon.eligibleItemIds ?? []).join(",") &&
      (fresh.eligibleLineIndexes ?? []).join(",") === (coupon.eligibleLineIndexes ?? []).join(",");
    if (fresh.discountAmount !== coupon.discountAmount || fresh.description !== coupon.description || !sameScope) {
      useCartStore.getState().setAppliedCoupon(fresh);
    }
    return "valid";
  } catch (err) {
    if (stale() || controller.signal.aborted) return "kept";
    if (!isVerdict(err)) return "kept";
    useCartStore.getState().setAppliedCoupon(null);
    const reason = err instanceof Error && err.message ? err.message : "it no longer applies to your cart";
    toast.error(`Coupon ${coupon.code} removed — ${reason}`);
    return "removed";
  }
}
