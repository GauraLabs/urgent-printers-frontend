import type { PricingTier, RateTier } from "@/types";
import { priceTier } from "@/features/products/configurator/pricing";
import { round2 } from "@/lib/utils";

export const DEFAULT_UNIT_LABEL = "pcs";
export const MAX_LINE_QUANTITY = 1_000_000;
export const NUDGE_MAX_EXTRA_PERCENT = 5;

const countFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** Indian digit grouping (1,000 / 1,00,000); the feed title uses the same formatting. */
export function formatCount(n: number): string {
  return countFormat.format(n);
}

/** Unit noun for a count: "pc"/"pcs" for the default label, labels the admin chose are left as written. */
export function unitNoun(qty: number, unitLabel?: string | null): string {
  const label = normalizeUnitLabel(unitLabel);
  return label === DEFAULT_UNIT_LABEL && qty === 1 ? "pc" : label;
}

export function normalizeUnitLabel(label?: string | null): string {
  return label && label.trim() ? label.trim() : DEFAULT_UNIT_LABEL;
}

/** "120 pcs"; "1 pc" for the default label only (custom labels are left as the admin wrote them). */
export function formatQty(qty: number, unitLabel?: string | null): string {
  return `${formatCount(qty)} ${unitNoun(qty, unitLabel)}`;
}

/** "/pc" for the default label, " each" otherwise. */
export function perPieceSuffix(unitLabel?: string | null): string {
  return normalizeUnitLabel(unitLabel) === DEFAULT_UNIT_LABEL ? "/pc" : " each";
}

/** Historical order lines may carry a pack snapshot; new lines never do. */
export function formatOrderQuantity(qty: number, packSize?: number | null, unitLabel?: string | null): string {
  if (typeof packSize === "number" && packSize > 1) {
    const packs = Math.floor(qty / packSize);
    return `${formatCount(packs)} ${packs === 1 ? "pack" : "packs"} (${formatQty(qty, unitLabel)})`;
  }
  return formatQty(qty, unitLabel);
}

export function summarizeOrderQuantity(items: { quantity: number; packSize?: number; unitLabel?: string }[]): string {
  if (items.length === 1) return formatOrderQuantity(items[0].quantity, items[0].packSize, items[0].unitLabel);
  return `Total ${formatCount(items.reduce((s, i) => s + i.quantity, 0))} items`;
}

export interface QuantityBounds {
  min: number;
  max: number | null;
  listing: number;
}

interface BoundsInput {
  pricingTiers?: Pick<PricingTier, "quantity">[];
  minOrderQuantity?: number | null;
  maxOrderQuantity?: number | null;
  listingQuantity?: number | null;
}

export function clampQuantity(qty: number, min: number, max: number | null): number {
  return Math.min(Math.max(qty, min), max ?? MAX_LINE_QUANTITY);
}

/** Server-effective bounds with fallbacks for a payload that predates them (min = lowest tier, no max). */
export function effectiveBounds(product: BoundsInput): QuantityBounds {
  const tiers = product.pricingTiers ?? [];
  const lowest = tiers.length > 0 ? Math.min(...tiers.map((t) => t.quantity)) : 1;
  const min = product.minOrderQuantity ?? lowest;
  const max = product.maxOrderQuantity != null && product.maxOrderQuantity >= min ? product.maxOrderQuantity : null;
  return { min, max, listing: clampQuantity(product.listingQuantity ?? min, min, max) };
}

export function stepFor(min: number): number {
  if (min < 10) return 1;
  if (min < 100) return 5;
  if (min < 1000) return 10;
  return 100;
}

export function stepQuantity(qty: number, dir: "up" | "down", min: number, max: number | null): number {
  const step = stepFor(min);
  const next = dir === "up" ? (Math.floor(qty / step) + 1) * step : (Math.ceil(qty / step) - 1) * step;
  return clampQuantity(next, min, max);
}

export function tierForQuantity<T extends Pick<PricingTier, "quantity">>(tiers: T[], qty: number): T | undefined {
  if (tiers.length === 0) return undefined;
  const sorted = [...tiers].sort((a, b) => a.quantity - b.quantity);
  let found = sorted[0];
  for (const t of sorted) if (t.quantity <= qty) found = t;
  return found;
}

const toCents = (n: number): number => Math.round(n * 100);

export interface QuantityPricing {
  tier: RateTier;
  pricePerUnit: number;
  mrpPerUnit?: number;
  discountPercent?: number;
  /** pricePerUnit x qty, no turnaround surcharge. */
  subtotal: number;
  /** Server-equal total: subtotal plus the flat turnaround surcharge. */
  total: number;
  savings: number;
}

/** Equals the server's `unit_price * qty + extra`: per-piece rounded first, then multiplied in integer cents. */
export function priceForQuantity(
  tiers: RateTier[],
  qty: number,
  optionMultiplier: number,
  turnaroundExtra = 0
): QuantityPricing | null {
  const tier = tierForQuantity(tiers, qty);
  if (!tier) return null;
  const p = priceTier(tier, optionMultiplier);
  const subtotal = (toCents(p.pricePerUnit) * qty) / 100;
  const savings = p.mrpPerUnit !== undefined && p.discountPercent !== undefined
    ? (toCents(p.mrpPerUnit) - toCents(p.pricePerUnit)) * qty / 100
    : 0;
  return {
    tier,
    pricePerUnit: p.pricePerUnit,
    mrpPerUnit: p.mrpPerUnit,
    discountPercent: p.discountPercent,
    subtotal,
    total: round2(subtotal + turnaroundExtra),
    savings: round2(savings),
  };
}

export interface TierNudge {
  addQty: number;
  newQty: number;
  newPerPiece: number;
  newTotal: number;
  currentTotal: number;
  /** currentTotal - newTotal when positive, else 0. */
  saving: number;
  /** newTotal - currentTotal when positive, else 0. */
  extra: number;
}

export function nextTierNudge(
  qty: number,
  tiers: RateTier[],
  optionMultiplier: number,
  turnaroundExtra: number,
  max: number | null
): TierNudge | null {
  const next = [...tiers].sort((a, b) => a.quantity - b.quantity).find((t) => t.quantity > qty);
  if (!next || next.quantity > (max ?? MAX_LINE_QUANTITY)) return null;
  const current = priceForQuantity(tiers, qty, optionMultiplier, turnaroundExtra);
  const upgraded = priceForQuantity(tiers, next.quantity, optionMultiplier, turnaroundExtra);
  if (!current || !upgraded) return null;
  const cur = toCents(current.total);
  const nxt = toCents(upgraded.total);
  if (!(nxt <= cur || (nxt - cur) * 100 <= cur * NUDGE_MAX_EXTRA_PERCENT)) return null;
  return {
    addQty: next.quantity - qty,
    newQty: next.quantity,
    newPerPiece: upgraded.pricePerUnit,
    newTotal: upgraded.total,
    currentTotal: current.total,
    saving: nxt < cur ? (cur - nxt) / 100 : 0,
    extra: nxt > cur ? (nxt - cur) / 100 : 0,
  };
}

export interface TierGuideEntry {
  quantity: number;
  label: number;
  pricePerUnit: number;
  isBestValue: boolean;
  current: boolean;
}

/** Chips for the tier-rate guide: hides tiers below min (except the one covering it) and above max. */
export function tierGuideEntries(
  tiers: PricingTier[],
  qty: number,
  optionMultiplier: number,
  min: number,
  max: number | null
): TierGuideEntry[] {
  const sorted = [...tiers].sort((a, b) => a.quantity - b.quantity);
  const belowMin = sorted.filter((t) => t.quantity < min);
  const covering = belowMin.length > 0 ? belowMin[belowMin.length - 1] : undefined;
  const visible = sorted.filter((t) => (t.quantity >= min || t === covering) && t.quantity <= (max ?? MAX_LINE_QUANTITY));
  const active = tierForQuantity(visible, qty);
  return visible.map((t) => ({
    quantity: t.quantity,
    label: Math.max(t.quantity, min),
    pricePerUnit: priceTier(t, optionMultiplier).pricePerUnit,
    isBestValue: Boolean(t.isBestValue),
    current: t === active,
  }));
}
