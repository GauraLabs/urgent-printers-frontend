import { ROUTES } from "@/lib/constants/routes";
import type { Product } from "@/types";

/** PDP link that lands on the configuration the card price was computed for (canonical stays the bare URL). */
export function productHref(product: Pick<Product, "categorySlug" | "slug" | "listingQuery" | "listingPrice">): string {
  const base = ROUTES.product(product.categorySlug, product.slug);
  return product.listingPrice !== undefined && product.listingQuery ? `${base}?${product.listingQuery}` : base;
}
