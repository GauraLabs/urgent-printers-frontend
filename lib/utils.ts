import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { PricingTier, PrintSpec } from "@/types";

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

type OptionSpec = Partial<Pick<PrintSpec, "sizes" | "papers" | "finishes" | "sides">>;

/**
 * Product of the smallest valid multiplier in each option category, the
 * cheapest configuration the server will charge. A category with no options
 * counts as x1, and a non-finite or <= 0 multiplier is skipped (the detail
 * mapper has already dropped inactive options). Turnaround is excluded.
 */
export function minOptionMultiplier(spec: OptionSpec | undefined): number {
  if (!spec) return 1;
  let product = 1;
  for (const options of [spec.sizes, spec.papers, spec.finishes, spec.sides]) {
    const valid = (options ?? []).map((o) => o.priceMultiplier).filter((m) => Number.isFinite(m) && m > 0);
    if (valid.length > 0) product *= Math.min(...valid);
  }
  return product;
}

export interface FromPriceInput {
  pricingTiers: PricingTier[];
  priceFrom?: number;
  mrpFrom?: number;
  discountPercent?: number;
  printSpec?: OptionSpec;
  listingQuantity?: number;
  listingPrice?: number;
  listingMrp?: number;
  listingDiscountPercent?: number;
  listingQuery?: string;
}

export interface FromPrice {
  price: number;
  discount: DisplayDiscount | null;
}

/**
 * The single "From" price + discount used by cards, search, recent items, the
 * PDP header and sort. The server's priceFrom/mrpFrom/discountPercent (already
 * best-value tier x min active option multipliers) win when present; otherwise
 * it is computed from the best-value (else cheapest) tier the same way:
 * multiplier applied then rounded half-up to 0.01 for price and MRP, percent
 * derived from the rounded figures.
 */
export function getFromPrice(product: FromPriceInput): FromPrice {
  if (product.priceFrom !== undefined) {
    return { price: product.priceFrom, discount: toDisplayDiscount(product.priceFrom, product.mrpFrom, product.discountPercent) };
  }
  const tiers = product.pricingTiers;
  if (tiers.length === 0) return { price: 0, discount: null };

  const tier = tiers.find((t) => t.isBestValue) ?? tiers.reduce((a, b) => (b.pricePerUnit < a.pricePerUnit ? b : a));
  const m = minOptionMultiplier(product.printSpec);
  const price = round2(tier.pricePerUnit * m);
  if (tier.mrpPerUnit === undefined) return { price, discount: null };
  const mrp = round2(tier.mrpPerUnit * m);
  return { price, discount: toDisplayDiscount(price, mrp, discountPercent(mrp, price)) };
}

export interface ListingPrice {
  quantity: number;
  price: number;
  discount: DisplayDiscount | null;
}

/**
 * The "N pcs for ₹X" card price. Null on a backend that predates quantity
 * pricing, in which case callers fall back to the per-unit "From" price.
 */
export function getListingPrice(product: FromPriceInput): ListingPrice | null {
  // The card price is only honest if the link can open the PDP on the same configuration.
  if (product.listingPrice === undefined || !product.listingQuantity || product.listingQuery == null) return null;
  return {
    quantity: product.listingQuantity,
    price: product.listingPrice,
    discount: toDisplayDiscount(product.listingPrice, product.listingMrp, product.listingDiscountPercent),
  };
}

export function getDisplayPricePerUnit(product: FromPriceInput): number {
  return getFromPrice(product).price;
}

export function getDisplayDiscount(product: FromPriceInput): DisplayDiscount | null {
  return getFromPrice(product).discount;
}

export function formatPrice(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Display-only price for product cards and rails: whole rupees drop the ".00"
 * ("₹800"), fractional amounts keep two decimals ("₹6.50"). Cart, checkout and
 * invoices keep using formatPrice, where paise always show.
 */
export function formatCardPrice(amount: number, currency = "INR"): string {
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
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
