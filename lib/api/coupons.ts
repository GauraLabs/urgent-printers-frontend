import type { AppliedCoupon } from "@/types";
import { apiFetch } from "./client";

// ─── Backend response shape ───────────────────────────────────────────────────

interface BackendCouponResponse {
  code: string;
  is_valid: boolean;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  discount_amount: number;
  description: string | null;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  message: string;   // always present; show directly in UI
}

// ─── API function ─────────────────────────────────────────────────────────────

export async function validateCoupon(
  code: string,
  subtotal: number,
  token?: string
): Promise<AppliedCoupon> {
  // REAL API: POST /api/v1/coupons/validate
  // Always returns 200. Check is_valid to determine success or failure.
  // message is always user-friendly and can be shown directly.
  const data = await apiFetch<BackendCouponResponse>("/coupons/validate", {
    method: "POST",
    ...(token && { headers: { Authorization: `Bearer ${token}` } }),
    body: JSON.stringify({ code: code.trim().toUpperCase(), subtotal }),
  });

  if (!data.is_valid) {
    // Throw so the caller (cart page / ReviewStep) can surface the message inline
    throw new Error(data.message);
  }

  return {
    code:          data.code,
    discountType:  data.discount_type === "fixed" ? "flat" : "percentage",
    discountValue: data.discount_value,
    discountAmount: data.discount_amount,
    description:   data.description,
    message:       data.message,
  };
}
