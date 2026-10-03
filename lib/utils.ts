import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { PricingTier } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Half-up rounding to 2 decimals, matching the server's Decimal ROUND_HALF_UP.
 * `toFixed(2)` rounds the binary float (1.005 -> "1.00"), so the value is first
 * normalised to 12 significant digits to strip representation error.
 */
export function round2(value: number): number {
  const scaled = Number((value * 100).toPrecision(12));
  const rounded = scaled < 0 ? -Math.round(-scaled) : Math.round(scaled);
  return rounded / 100;
}

/**
 * Whole-number percent off, half-up, computed on integer paise so it matches
 * the server's `pct` (1.2 golden vectors: 12/9 -> 25, 3/2 -> 33, 200/199 -> 1).
 * Returns 0 when there is no real discount.
 */
export function discountPercent(mrp: number, price: number): number {
  const mrpPaise = Math.round(mrp * 100);
  const pricePaise = Math.round(price * 100);
  if (mrpPaise <= 0 || pricePaise >= mrpPaise) return 0;
  return Math.floor(((mrpPaise - pricePaise) * 200 + mrpPaise) / (2 * mrpPaise));
}

export interface DisplayDiscount {
  mrp: number;
  percent: number;
}

/**
 * Discount to render next to a price, or null when none should show. The
 * percent is the gate: a missing or 0% value hides the MRP too (the server
 * nulls all display fields at 0%), as does an MRP that isn't above the price.
 */
export function toDisplayDiscount(
  price: number,
  mrp: number | undefined,
  percent: number | undefined
): DisplayDiscount | null {
  if (mrp === undefined || percent === undefined || percent < 1 || mrp <= price) return null;
  return { mrp, percent };
}

/** Discount for a priced unit from its price and optional MRP (cart/order lines). */
export function getUnitDiscount(price: number, mrp: number | undefined): DisplayDiscount | null {
  if (mrp === undefined) return null;
  return toDisplayDiscount(price, mrp, discountPercent(mrp, price));
}

/**
 * Discount for the same "From" tier getDisplayPricePerUnit prices. Detail
 * payloads carry it on the tier; card/search payloads carry it on the product.
 */
export function getDisplayDiscount(product: {
  pricingTiers: PricingTier[];
  priceFrom?: number;
  mrpFrom?: number;
  discountPercent?: number;
}): DisplayDiscount | null {
  const price = getDisplayPricePerUnit(product);
  const tier =
    product.pricingTiers.find((t) => t.isBestValue) ??
    (product.pricingTiers.length > 0
      ? product.pricingTiers.reduce((a, b) => (b.pricePerUnit < a.pricePerUnit ? b : a))
      : undefined);
  if (tier) return toDisplayDiscount(price, tier.mrpPerUnit, tier.discountPercent);
  return toDisplayDiscount(price, product.mrpFrom, product.discountPercent);
}

/** "Sale ends 12 Oct, 6:30 pm IST" — always IST regardless of viewer timezone. */
export function formatSaleEnd(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const text = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return `${text} IST`;
}

/**
 * The "From" price merchandises the best-value tier, not the mathematically
 * cheapest per-unit price (usually the highest-quantity tier). Falls back to
 * the true lowest tier price, then `priceFrom`, if no tier is flagged —
 * `Math.min()` on an empty array returns `Infinity`, so the `priceFrom`
 * fallback only kicks in when `pricingTiers` is actually empty.
 */
export function getDisplayPricePerUnit(product: {
  pricingTiers: PricingTier[];
  priceFrom?: number;
}): number {
  const bestValueTier = product.pricingTiers.find((t) => t.isBestValue);
  if (bestValueTier) return bestValueTier.pricePerUnit;
  if (product.pricingTiers.length > 0) {
    return Math.min(...product.pricingTiers.map((t) => t.pricePerUnit));
  }
  return product.priceFrom ?? 0;
}

export function formatPrice(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPricePerUnit(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}
