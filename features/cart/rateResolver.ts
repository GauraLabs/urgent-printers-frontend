import { lookupProductBySlug, type ProductLookup } from "@/lib/api/products";
import { useCartStore } from "./store";
import { effectiveBounds } from "@/lib/quantity";
import { normalizeOptionKey } from "./cartItemId";
import type { CartItem, Product, RateTier } from "@/types";

export interface ResolvedRates {
  rateTiers: RateTier[];
  optionMultiplier: number;
  minQuantity: number;
  maxQuantity: number | null;
  unitLabel?: string;
}

type Option = { id?: string; label: string; priceMultiplier: number; isDefault: boolean };

// A line's saved id (else label) must still exist; a line with no id for a
// category takes that category's default, as the server does.
function pick(options: Option[], id: string | undefined, label: string | undefined): Option | null | undefined {
  if (options.length === 0) return undefined;
  const idKey = normalizeOptionKey(id ?? "");
  const labelKey = normalizeOptionKey(label ?? "");
  if (!idKey && !labelKey) return options.find((o) => o.isDefault) ?? options[0];
  return (
    (idKey ? options.find((o) => normalizeOptionKey(o.id ?? "") === idKey || normalizeOptionKey(o.label) === idKey) : undefined) ??
    (labelKey ? options.find((o) => normalizeOptionKey(o.label) === labelKey) : undefined) ??
    null
  );
}

/** Same option resolution as the PDP; null when the line's options no longer exist. */
export function resolveRates(product: Product, config: CartItem["config"]): ResolvedRates | null {
  const { sizes, papers, finishes, sides } = product.printSpec;
  const chosen = [
    pick(sizes, config.sizeId, config.sizeLabel),
    pick(papers, config.paperId, config.paperLabel),
    pick(finishes, config.finishId, config.finishLabel),
    pick(sides, undefined, config.sides),
  ];
  if (chosen.some((o) => o === null) || product.pricingTiers.length === 0) return null;
  const optionMultiplier = chosen.reduce((m, o) => m * (o?.priceMultiplier ?? 1), 1);
  const { min, max } = effectiveBounds(product);
  return {
    rateTiers: product.pricingTiers.map((t) => ({ quantity: t.quantity, pricePerUnit: t.pricePerUnit, mrpPerUnit: t.mrpPerUnit })),
    optionMultiplier,
    minQuantity: min,
    maxQuantity: max,
    unitLabel: product.unitLabel,
  };
}

const RETRY_DELAYS_MS = [500, 1500];
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const inflight = new Map<string, Promise<ProductLookup>>();

async function lookupWithRetry(slug: string): Promise<ProductLookup> {
  let result = await lookupProductBySlug(slug);
  for (const delay of RETRY_DELAYS_MS) {
    if (result.status !== "error") break;
    await sleep(delay);
    result = await lookupProductBySlug(slug);
  }
  return result;
}

/** One lookup per product slug shared by its lines. Failures are not kept, so Retry refetches. */
export function fetchProductOnce(slug: string): Promise<ProductLookup> {
  let p = inflight.get(slug);
  if (!p) {
    p = lookupWithRetry(slug);
    inflight.set(slug, p);
    void p.then((r) => {
      if (r.status === "error") inflight.delete(slug);
      else setTimeout(() => inflight.delete(slug), 60_000);
    });
  }
  return p;
}

/** Learns a line's rate card; only a missing product or option marks it unavailable. */
export async function loadLineRates(cartItemId: string): Promise<void> {
  const line = useCartStore.getState().items.find((i) => i.cartItemId === cartItemId);
  if (!line) return;
  const store = useCartStore.getState();
  store.setRateError(cartItemId, false);
  const result = await fetchProductOnce(line.product.slug);
  const now = useCartStore.getState();
  if (result.status === "error") return now.setRateError(cartItemId, true);
  const rates = result.status === "ok" ? resolveRates(result.product, line.config) : null;
  if (rates) now.applyResolvedRates(cartItemId, rates);
  else now.markUnavailable(cartItemId);
}
