import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { PricingTier } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
