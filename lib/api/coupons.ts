import type { AppliedCoupon, CartItem, CouponScope } from "@/types";
import { apiFetch } from "./client";

// ─── Backend response shape ───────────────────────────────────────────────────

export interface BackendCouponResponse {
  code: string;
  is_valid: boolean;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  discount_amount: number;
  description: string | null;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  message: string;   // always present; show directly in UI
  applies_to_discounted_items?: boolean;
  eligible_item_ids?: (string | number)[] | null;
  eligible_line_indexes?: number[] | null;
  error_code?: string | null;
  coupon_scope?: { product_names?: string[]; category_names?: string[]; all_items?: boolean } | null;
}

export function mapCouponScope(s: { product_names?: string[]; category_names?: string[]; all_items?: boolean } | null | undefined): CouponScope | undefined {
  if (!s) return undefined;
  return { productNames: s.product_names ?? [], categoryNames: s.category_names ?? [], allItems: s.all_items ?? true };
}

// ─── API function ─────────────────────────────────────────────────────────────

export function buildCouponBody(code: string, subtotal: number, eligibleSubtotal?: number, items?: CartItem[]) {
  return {
    code: code.trim().toUpperCase(),
    subtotal,
    ...(eligibleSubtotal !== undefined && { eligible_subtotal: eligibleSubtotal }),
    ...(items && items.length > 0 && { items: items.map((i) => ({
      product_id: i.product.id,
      total_price: i.totalPrice,
      ...(i.mrpPerUnit !== undefined && i.mrpPerUnit > i.pricePerUnit && { discounted: true }),
    })) }),
  };
}

/** The server judged the coupon unusable for this cart (as opposed to the request failing). */
export class CouponRejectedError extends Error {
  readonly code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "CouponRejectedError";
    this.code = code;
  }
}

export function mapCoupon(data: BackendCouponResponse): AppliedCoupon {
  return {
    code:          data.code,
    discountType:  data.discount_type === "fixed" ? "flat" : "percentage",
    discountValue: data.discount_value,
    discountAmount: data.discount_amount,
    description:   data.description,
    message:       data.message,
    appliesToDiscountedItems: data.applies_to_discounted_items,
    ...(data.min_order_amount != null && { minOrderAmount: data.min_order_amount }),
    ...(data.eligible_item_ids && { eligibleItemIds: data.eligible_item_ids.map(String) }),
    ...(data.eligible_line_indexes && { eligibleLineIndexes: data.eligible_line_indexes }),
    ...(data.coupon_scope && { scope: mapCouponScope(data.coupon_scope) }),
  };
}

export async function validateCoupon(
  code: string,
  subtotal: number,
  token?: string,
  eligibleSubtotal?: number,
  items?: CartItem[],
  signal?: AbortSignal
): Promise<AppliedCoupon> {
  // REAL API: POST /api/v1/coupons/validate
  // Always returns 200. Check is_valid to determine success or failure.
  // message is always user-friendly and can be shown directly.
  // eligible_subtotal is display-only; preview/create compute the real figure.
  const data = await apiFetch<BackendCouponResponse>("/coupons/validate", {
    method: "POST",
    ...(signal && { signal }),
    ...(token && { headers: { Authorization: `Bearer ${token}` } }),
    body: JSON.stringify(buildCouponBody(code, subtotal, eligibleSubtotal, items)),
  });

  if (!data.is_valid) {
    // Throw so the caller (cart page / ReviewStep) can surface the message inline
    throw new CouponRejectedError(data.message, data.error_code ?? undefined);
  }

  return mapCoupon(data);
}
