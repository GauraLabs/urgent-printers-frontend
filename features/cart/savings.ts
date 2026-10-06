import type { CartItem } from "@/types";
import { getUnitDiscount, round2, type DisplayDiscount } from "@/lib/utils";
import { formatPackSize, isPack, normalizePack, packPrice } from "@/lib/pack";

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

// Per-unit line price for a cart line, or per-pack ("/ 50 pcs") for pack
// products. The percent is the per-unit one, so it never changes with packs.
export function cartLinePrice(item: {
  pricePerUnit: number;
  mrpPerUnit?: number;
  config: { packSize?: number; unitLabel?: string };
}): LineUnitPrice {
  const discount = cartItemDiscount(item);
  const { packSize, unitLabel } = normalizePack(item.config.packSize, item.config.unitLabel);
  if (!isPack(packSize)) {
    return { price: item.pricePerUnit, mrp: discount?.mrp, percent: discount?.percent, unitLabel: "/unit" };
  }
  return {
    price: packPrice(item.pricePerUnit, packSize),
    mrp: discount ? packPrice(discount.mrp, packSize) : undefined,
    percent: discount?.percent,
    unitLabel: ` / ${formatPackSize(packSize, unitLabel)}`,
  };
}

// Same as cartLinePrice for a placed order's snapshotted line.
export function orderLinePrice(item: {
  pricePerUnit: number;
  mrpPerUnit?: number;
  packSize?: number;
  unitLabel?: string;
}): LineUnitPrice {
  return cartLinePrice({
    pricePerUnit: item.pricePerUnit,
    mrpPerUnit: item.mrpPerUnit,
    config: { packSize: item.packSize, unitLabel: item.unitLabel },
  });
}
