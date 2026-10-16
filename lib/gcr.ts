import type { Order } from "@/types";

export interface GcrConfig {
  merchant_id: number;
  order_id: string;
  email: string;
  delivery_country: string;
  estimated_delivery_date: string;
}

/** Max turnaround (~5 days) plus shipping (~5 days); used only when the order has no usable ETA. */
export const GCR_FALLBACK_DELIVERY_DAYS = 10;

const COUNTRY_NAMES: Record<string, string> = { india: "IN", bharat: "IN" };

export function gcrCountryCode(country: string | undefined): string {
  const c = (country ?? "").trim();
  if (/^[A-Za-z]{2}$/.test(c)) return c.toUpperCase();
  return COUNTRY_NAMES[c.toLowerCase()] ?? "IN";
}

function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function gcrDeliveryDate(estimatedDelivery: string | undefined, now: Date = new Date()): string {
  const today = ymd(now);
  if (estimatedDelivery) {
    const iso = /^(\d{4}-\d{2}-\d{2})/.exec(estimatedDelivery);
    const candidate = iso ? iso[1] : (() => {
      const d = new Date(estimatedDelivery);
      return Number.isNaN(d.getTime()) ? null : ymd(d);
    })();
    if (candidate && candidate >= today) return candidate;
  }
  const fallback = new Date(now);
  fallback.setDate(fallback.getDate() + GCR_FALLBACK_DELIVERY_DAYS);
  return ymd(fallback);
}

/** Paid online, or COD that is still live. Never for pending/failed payments or cancelled/refunded orders. */
export function isGcrEligible(order: Pick<Order, "paymentStatus" | "paymentMethod" | "status">): boolean {
  if (["cancelled", "refund_initiated", "refunded"].includes(order.status)) return false;
  return order.paymentStatus === "paid" || order.paymentMethod === "cod";
}

export function buildGcrConfig(
  order: Order,
  email: string | undefined,
  merchantIdRaw: string | undefined,
  now: Date = new Date(),
): GcrConfig | null {
  const merchantId = Number(merchantIdRaw);
  if (!Number.isInteger(merchantId) || merchantId <= 0) return null;
  const trimmed = email?.trim();
  if (!trimmed || !isGcrEligible(order) || !order.orderNumber) return null;
  return {
    merchant_id: merchantId,
    order_id: order.orderNumber,
    email: trimmed,
    delivery_country: gcrCountryCode(order.shippingAddress?.country),
    estimated_delivery_date: gcrDeliveryDate(order.estimatedDelivery, now),
  };
}
