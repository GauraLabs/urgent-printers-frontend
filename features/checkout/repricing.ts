import type { CartItem, OrderPreview } from "@/types";

const EPSILON = 0.005;

function differs(a: number, b: number): boolean {
  return Math.abs(a - b) > EPSILON;
}

// The preview echoes request lines in order, so index alignment (guarded by
// productId + quantity) is how a preview line maps back to its cart line.
function lineFor(preview: OrderPreview, item: CartItem, index: number) {
  const line = preview.items[index];
  return line && line.productId === item.product.id && line.quantity === item.config.quantity ? line : null;
}

// True when the server's authoritative line prices differ from what the cart
// shows — a sale window opened or closed, or the price was edited, since the
// item was added.
export function pricesDiffer(items: CartItem[], preview: OrderPreview): boolean {
  if (preview.items.length !== items.length) return true;
  return items.some((item, i) => {
    const line = lineFor(preview, item, i);
    if (!line) return true;
    // Charged prices only: the MRP is display-only, and preview lines keep the
    // true MRP at 0% while public tiers null it, so comparing it would raise a
    // false "prices updated" banner.
    return differs(line.pricePerUnit, item.pricePerUnit) || differs(line.totalPrice, item.totalPrice);
  });
}

// Cart lines carrying the preview's prices. A line with no MRP in the preview
// drops any stale mrpPerUnit so an ended sale stops rendering as discounted.
export function applyPreviewPrices(items: CartItem[], preview: OrderPreview): CartItem[] {
  return items.map((item, i) => {
    const line = lineFor(preview, item, i);
    if (!line) return item;
    return {
      ...item,
      pricePerUnit: line.pricePerUnit,
      totalPrice: line.totalPrice,
      mrpPerUnit: line.mrpPerUnit,
    };
  });
}
