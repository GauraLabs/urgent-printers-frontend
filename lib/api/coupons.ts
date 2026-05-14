import type { AppliedCoupon } from "@/types";
import { apiFetch } from "./client";

export async function validateCoupon(
  code: string,
  subtotal: number,
  token?: string
): Promise<AppliedCoupon> {
  // REAL API: POST /api/v1/coupons/validate
  // Backend checks: exists, active, not expired, min order met,
  // user eligibility (new customer / usage limits / assigned user).
  // Returns computed discountAmount based on the provided subtotal.
  return apiFetch<AppliedCoupon>("/api/v1/coupons/validate", {
    method: "POST",
    ...(token && { headers: { Authorization: `Bearer ${token}` } }),
    body: JSON.stringify({ code: code.trim().toUpperCase(), subtotal }),
  });
}
