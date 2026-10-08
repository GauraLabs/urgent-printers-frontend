// Shared loaders/builders for the backend-generated price-parity fixtures
// (urgent-printers-backend/tests/pricing_parity_matrix.py). Money in the
// fixtures is integer paise; the storefront works in rupee floats, so every
// comparison goes through paise().
import { readFileSync } from "node:fs";
import path from "node:path";
import { mapDetail, mapCard, type BackendProductCard, type BackendProductDetail } from "@/lib/api/products";
import type { CartItemConfig, Product, RateTier } from "@/types";

export interface FxRow {
  p: string;
  o: { size_id: string | null; paper_id: string | null; finish_id: string | null; sides: string | null; ta: string | null };
  q: number;
  k: string;
  tie?: boolean;
  err?: string;
  e?: { unit: number; extra: number; total: number; mrp: number | null; disc: number | null; pct: number | null; active: boolean; tier: number };
  n?: { q: number; cur: number; nxt: number; unit: number };
}

export interface FxProduct {
  key: string;
  id: number;
  detail: BackendProductDetail;
  card: BackendProductCard;
  bounds: { min: number; max: number; stored_max: number | null; listing: number };
  frozen_only: boolean;
  admin: {
    window: "none" | "active" | "scheduled" | "expired";
    tiers: { quantity: number; price_per_unit: number; mrp_per_unit?: number | null; is_best_value?: boolean }[];
    specs: Record<string, { id: string; label: string; price_multiplier: number; is_active: boolean; is_default: boolean }[]>;
    limits: { listing: number | null; min: number | null; max: number | null };
    unit_label: string;
    listing: { qty: number; price: number | null; mrp: number | null; pct: number | null };
    min_multiplier: string;
    examples: { q: number; total: number; mrp_total: number | null }[];
    below_lowest_unit: number | null;
  };
}

export interface PricingFixture {
  meta: { rows: number; products: number; tie_rows: number; error_rows: number };
  products: FxProduct[];
  rows: FxRow[];
}

export interface FxCartLine {
  p: string;
  q: number;
  size_id: string | null;
  paper_id: string | null;
  finish_id: string | null;
  sides: string | null;
  ta: string;
}

export interface FxCart {
  id: string;
  lines: FxCartLine[];
  coupon: string | null;
  err?: string;
  lines_e?: { unit: number; extra: number; total: number; mrp: number | null; save: number | null }[];
  e?: Record<"subtotal" | "eligible" | "mrp_savings" | "discount" | "shipping" | "gst" | "total" | "total_savings" | "razorpay", number>;
  validate?: { valid: boolean; discount: number };
}

export interface CheckoutFixture {
  meta: { carts: number };
  coupons: Record<string, Record<string, string | boolean>>;
  carts: FxCart[];
}

const read = <T,>(name: string): T => JSON.parse(readFileSync(path.resolve(__dirname, name), "utf8")) as T;

export const pricingFixture = (): PricingFixture => read<PricingFixture>("pricing-parity.json");
export const checkoutFixture = (): CheckoutFixture => read<CheckoutFixture>("checkout-parity.json");

export const paise = (rupees: number | undefined | null): number | null =>
  rupees === undefined || rupees === null ? null : Math.round(rupees * 100);

export interface Selection {
  size?: Product["printSpec"]["sizes"][number];
  paper?: Product["printSpec"]["papers"][number];
  finish?: Product["printSpec"]["finishes"][number];
  side?: Product["printSpec"]["sides"][number];
  turnaroundExtra: number;
  turnaroundId: string;
  turnaroundLabel: string;
  /** Same left-to-right product ProductConfigurator uses. */
  optionMultiplier: number;
}

export function select(product: Product, o: { size_id: string | null; paper_id: string | null; finish_id: string | null; sides: string | null; ta: string | null }): Selection {
  const size = o.size_id ? product.printSpec.sizes.find((s) => s.id === o.size_id) : undefined;
  const paper = o.paper_id ? product.printSpec.papers.find((s) => s.id === o.paper_id) : undefined;
  const finish = o.finish_id ? product.printSpec.finishes.find((s) => s.id === o.finish_id) : undefined;
  const side = o.sides ? product.printSpec.sides.find((s) => s.label === o.sides) : undefined;
  if ((o.size_id && !size) || (o.paper_id && !paper) || (o.finish_id && !finish) || (o.sides && !side)) {
    throw new Error(`option not found on mapped product ${product.slug}: ${JSON.stringify(o)}`);
  }
  const ta = o.ta ? product.turnaroundOptions.find((t) => t.id === o.ta) : undefined;
  return {
    size, paper, finish, side,
    turnaroundExtra: ta?.extraCost ?? 0,
    turnaroundId: ta?.id ?? o.ta ?? "standard",
    turnaroundLabel: ta?.label ?? "Standard",
    optionMultiplier: (size?.priceMultiplier ?? 1) * (paper?.priceMultiplier ?? 1) * (finish?.priceMultiplier ?? 1) * (side?.priceMultiplier ?? 1),
  };
}

export const rateTiers = (product: Product): RateTier[] =>
  product.pricingTiers.map((t) => ({ quantity: t.quantity, pricePerUnit: t.pricePerUnit, mrpPerUnit: t.mrpPerUnit }));

/** The CartItemConfig the PDP's Add-to-cart builds. */
export function pdpConfig(product: Product, sel: Selection, quantity: number, bounds: { min: number; max: number | null }): CartItemConfig {
  return {
    sizeId: sel.size?.id, sizeLabel: sel.size?.label,
    paperId: sel.paper?.id, paperLabel: sel.paper?.label,
    finishId: sel.finish?.id, finishLabel: sel.finish?.label,
    sides: sel.side?.label,
    quantity,
    turnaroundId: sel.turnaroundId, turnaroundLabel: sel.turnaroundLabel, turnaroundExtraCost: sel.turnaroundExtra,
    unitLabel: product.unitLabel, minQuantity: bounds.min, maxQuantity: bounds.max,
    rateTiers: rateTiers(product), optionMultiplier: sel.optionMultiplier,
  };
}

export const mapProducts = (fx: PricingFixture) => new Map(fx.products.map((p) => [p.key, { fx: p, product: mapDetail(p.detail), card: mapCard(p.card) }]));
