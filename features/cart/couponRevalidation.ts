import { toast } from "sonner";
import { validateCoupon } from "@/lib/api/coupons";
import { ApiError } from "@/lib/api/client";
import { useCartStore } from "./store";
import { eligibleSubtotal } from "./savings";

let latest = 0;

/**
 * Re-checks the applied coupon against the server for the current cart.
 * Drops it with a message when it no longer applies, refreshes the discount
 * when only the amount changed, and keeps it on network errors (the order
 * preview is the final authority). Resolves true when the coupon was removed.
 */
export async function revalidateAppliedCoupon(token?: string): Promise<boolean> {
  const before = useCartStore.getState();
  const coupon = before.appliedCoupon;
  if (!coupon || before.items.length === 0 || before.items.some((i) => i.pricePending)) return false;

  const seq = ++latest;
  try {
    const fresh = await validateCoupon(coupon.code, before.subtotal(), token, eligibleSubtotal(before.items));
    const now = useCartStore.getState();
    if (seq !== latest || now.appliedCoupon?.code !== coupon.code) return false;
    if (fresh.discountAmount !== coupon.discountAmount || fresh.description !== coupon.description) now.setAppliedCoupon(fresh);
    return false;
  } catch (err) {
    if (err instanceof ApiError) return false;
    const now = useCartStore.getState();
    if (seq !== latest || now.appliedCoupon?.code !== coupon.code) return false;
    now.setAppliedCoupon(null);
    const reason = err instanceof Error && err.message ? err.message : "it no longer applies to your cart";
    toast.error(`Coupon ${coupon.code} removed — ${reason}`);
    return true;
  }
}
