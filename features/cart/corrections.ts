import { formatCount, formatQty } from "@/lib/quantity";
import type { CartItem } from "@/types";

/** The single toast shown per sync when the server clamped one or more lines. */
export function correctionMessage(lines: CartItem[]): string | null {
  if (lines.length === 0) return null;
  if (lines.length > 1) return `Quantity updated to fit the allowed range for ${lines.length} items`;
  const { product, config } = lines[0];
  const min = config.minQuantity;
  const max = config.maxQuantity ?? null;
  const allowed =
    min === undefined ? "" : max === null ? ` (minimum ${formatCount(min)})` : ` (allowed ${formatCount(min)} to ${formatCount(max)})`;
  return `${product.name}: quantity adjusted to ${formatQty(config.quantity, config.unitLabel)}${allowed}`;
}
