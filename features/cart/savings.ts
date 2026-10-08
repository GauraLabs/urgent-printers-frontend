import type { AppliedCoupon, CartItem } from "@/types";
import { perPieceSuffix } from "@/lib/quantity";
import { getUnitDiscount, round2, type DisplayDiscount } from "@/lib/utils";

function isDiscounted(item: CartItem): boolean {
  return item.mrpPerUnit !== undefined && item.mrpPerUnit > item.pricePerUnit;
}

// Σ (mrp - price) × quantity — display-only; the server is authoritative at
// preview/create and its totalSavings replaces this from checkout onward.
export function cartMrpSavings(items: CartItem[]): number {
  return round2(
    items.reduce(
      (sum, i) => (isDiscounted(i) ? sum + (i.mrpPerUnit! - i.pricePerUnit) * i.config.quantity : sum),
      0
    )
  );
}

// Cart/drawer "You save": MRP savings plus the coupon, each counted once.
export function cartTotalSavings(items: CartItem[], couponDiscount: number): number {
  return round2(cartMrpSavings(items) + couponDiscount);
}

// Sent with coupon validation so coupons that exclude discounted items can
// show a realistic figure (the authoritative one still comes from preview).
export function eligibleSubtotal(items: CartItem[]): number {
  return round2(items.reduce((sum, i) => (isDiscounted(i) ? sum : sum + i.totalPrice), 0));
}

export type CouponScopeData = Pick<AppliedCoupon, "eligibleItemIds" | "eligibleLineIndexes">;

/**
 * Per-line eligibility. Line indexes (into the items the server was sent) win because one
 * product can be eligible on one line and not another; product ids are the fallback, and
 * without any scope data (old backend, not yet validated) every line counts.
 */
export function isLineEligible(index: number, productId: string, scope?: CouponScopeData | null): boolean {
  if (scope?.eligibleLineIndexes) return scope.eligibleLineIndexes.includes(index);
  if (scope?.eligibleItemIds) return scope.eligibleItemIds.includes(productId);
  return true;
}

// Percent is derived on the rounded per-unit figures, as on the server; a 0%
// result (e.g. 1000 -> 996) hides the whole discount block, MRP included.
export function cartItemDiscount(item: Pick<CartItem, "pricePerUnit" | "mrpPerUnit">): DisplayDiscount | null {
  return getUnitDiscount(item.pricePerUnit, item.mrpPerUnit);
}

export interface LineUnitPrice {
  price: number;
  mrp?: number;
  percent?: number;
  unitLabel: string;
}

function linePrice(pricePerUnit: number, mrpPerUnit: number | undefined, unitLabel?: string): LineUnitPrice {
  const discount = cartItemDiscount({ pricePerUnit, mrpPerUnit });
  return { price: pricePerUnit, mrp: discount?.mrp, percent: discount?.percent, unitLabel: perPieceSuffix(unitLabel) };
}

// Per-piece line price for a cart line.
export function cartLinePrice(item: {
  pricePerUnit: number;
  mrpPerUnit?: number;
  config: { unitLabel?: string };
}): LineUnitPrice {
  return linePrice(item.pricePerUnit, item.mrpPerUnit, item.config.unitLabel);
}

// Same for a placed order's snapshotted line.
export function orderLinePrice(item: { pricePerUnit: number; mrpPerUnit?: number; unitLabel?: string }): LineUnitPrice {
  return linePrice(item.pricePerUnit, item.mrpPerUnit, item.unitLabel);
}
