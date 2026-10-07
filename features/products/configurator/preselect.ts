import type { Product } from "@/types";
import { normalizeOptionKey } from "@/features/cart/cartItemId";
import { clampQuantity, effectiveBounds, MAX_LINE_QUANTITY } from "@/lib/quantity";

export interface ParamSource {
  get(name: string): string | null;
}

export interface Preselection {
  quantity?: number;
  sizeId?: string;
  paperId?: string;
  finishId?: string;
  sides?: string;
  turnaroundId?: string;
}

/**
 * Resolves the PDP landing configuration from the shopping-feed query params
 * (qty, size, paper, finish, sides, turnaround). Every value is validated
 * against the product (quantity is clamped into its allowed range); anything unknown is dropped so the default is kept.
 */
export function resolvePreselection(
  product: Pick<Product, "pricingTiers" | "printSpec" | "turnaroundOptions"> &
    Partial<Pick<Product, "minOrderQuantity" | "maxOrderQuantity" | "listingQuantity">>,
  params: ParamSource
): Preselection {
  const out: Preselection = {};

  const qtyRaw = params.get("qty");
  if (qtyRaw && /^\d+$/.test(qtyRaw)) {
    const qty = Number(qtyRaw);
    if (Number.isSafeInteger(qty) && qty >= 1) {
      const { min, max } = effectiveBounds(product);
      out.quantity = clampQuantity(Math.min(qty, MAX_LINE_QUANTITY), min, max);
    }
  }

  // Backend ids are slugified labels with punctuation stripped, and the
  // backend matches them with all non-alphanumerics removed; do the same
  // against both id and label so feed links always resolve.
  const find = <T extends { id?: string; label: string }>(options: T[], raw: string | null): T | undefined => {
    if (!raw) return undefined;
    const key = normalizeOptionKey(raw);
    if (!key) return undefined;
    return options.find((o) => normalizeOptionKey(o.id ?? "") === key || normalizeOptionKey(o.label) === key);
  };

  const size = find(product.printSpec.sizes, params.get("size"));
  if (size) out.sizeId = size.id;

  const paper = find(product.printSpec.papers, params.get("paper"));
  if (paper) out.paperId = paper.id;

  const finish = find(product.printSpec.finishes, params.get("finish"));
  if (finish) out.finishId = finish.id;

  const sides = find(product.printSpec.sides, params.get("sides"));
  if (sides) out.sides = sides.label;

  const turnaround = find(product.turnaroundOptions, params.get("turnaround"));
  if (turnaround) out.turnaroundId = turnaround.id;

  return out;
}
