import type { AppliedCoupon, CartItem, ClientPricing } from "@/types";
import { SHIPPING_COST, SHIPPING_THRESHOLD } from "./ReviewStep";

// Never throws: telemetry must not affect checkout, so any failure yields null
// and the caller omits the field.
export function buildClientPricing(
  items: CartItem[],
  coupon: AppliedCoupon | null
): ClientPricing | null {
  try {
    if (items.length === 0 || items.length > 100) return null;
    const subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
    const discountedSub = parseFloat((subtotal - (coupon?.discountAmount ?? 0)).toFixed(2));
    const total = discountedSub + (discountedSub >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST);
    return {
      source: "review",
      lines: items.map((item, index) => ({
        index,
        productId: item.product.id,
        quantity: item.config.quantity,
        pricePerUnit: item.pricePerUnit,
        mrpPerUnit: item.mrpPerUnit ?? null,
        totalPrice: item.totalPrice,
        addedAt: item.addedAt ?? null,
      })),
      subtotal: parseFloat(subtotal.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
    };
  } catch {
    return null;
  }
}
