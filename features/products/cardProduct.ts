import type { Product } from "@/types";

const CARD_KEYS = [
  "id", "slug", "name", "categorySlug", "categoryName", "shortDescription", "mediumUrl",
  "averageRating", "reviewCount", "badge", "onSale",
  "pricingTiers", "priceFrom", "mrpFrom", "discountPercent", "printSpec", "unitLabel",
  "listingQuantity", "listingQuery", "listingPrice", "listingMrp", "listingDiscountPercent",
] as const satisfies readonly (keyof Product)[];

/** The fields a product card (image, name, rating, badge, price, wishlist, link) actually reads. */
export type CardProduct = Pick<Product, (typeof CARD_KEYS)[number] | "images">;

/**
 * Trims a full Product to what a card renders. Cards are client components, so
 * everything passed to them is serialised into the RSC payload; the homepage
 * renders the same product in several rails and used to ship each one in full.
 */
export function toCardProduct(product: CardProduct): CardProduct {
  const out: Record<string, unknown> = {};
  for (const key of CARD_KEYS) {
    if (product[key] !== undefined) out[key] = product[key];
  }
  out.images = product.images.slice(0, 1);
  return out as unknown as CardProduct;
}
