import type { Product } from "@/types";

export type CornerBadge =
  | { kind: "label"; label: string }
  | { kind: "sale" };

// A stored "sale" badge is no longer a merchandising flag (the backend maps it
// to "none"; mock data may still carry it), so it never renders as text.
// Discount display comes from live pricing (onSale).
export function getCornerBadge(product: Pick<Product, "badge" | "onSale">): CornerBadge | null {
  if (product.badge && product.badge !== "none" && product.badge !== "sale") {
    return { kind: "label", label: product.badge };
  }
  return product.onSale ? { kind: "sale" } : null;
}
