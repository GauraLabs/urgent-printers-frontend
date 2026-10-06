export const DEFAULT_UNIT_LABEL = "pcs";

export interface PackInfo {
  packSize: number;
  unitLabel: string;
}

/** Absent/invalid pack data (stale backend, old persisted cart) means "no pack": size 1, default label. */
export function normalizePack(packSize?: number | null, unitLabel?: string | null): PackInfo {
  const size = typeof packSize === "number" && Number.isInteger(packSize) && packSize >= 1 ? packSize : 1;
  const label = unitLabel && unitLabel.trim() ? unitLabel.trim() : DEFAULT_UNIT_LABEL;
  return { packSize: size, unitLabel: label };
}

export function isPack(packSize?: number | null): boolean {
  return normalizePack(packSize).packSize > 1;
}

/** Pack price from a per-unit price in integer cents, so it always equals the server's `unit * quantity`. */
export function packPrice(unitPrice: number, packSize?: number | null): number {
  const { packSize: size } = normalizePack(packSize);
  return (Math.round(unitPrice * 100) * size) / 100;
}

/** "50 pcs" */
export function formatPackSize(packSize: number, unitLabel?: string | null): string {
  const info = normalizePack(packSize, unitLabel);
  return `${info.packSize.toLocaleString("en-IN")} ${info.unitLabel}`;
}

/** "3 packs (150 pcs)"; plain "150" for non-pack products so existing renderings are unchanged. */
export function formatQuantity(quantity: number, packSize?: number | null, unitLabel?: string | null): string {
  const info = normalizePack(packSize, unitLabel);
  if (info.packSize === 1) return quantity.toLocaleString("en-IN");
  const packs = Math.floor(quantity / info.packSize);
  const noun = packs === 1 ? "pack" : "packs";
  return `${packs.toLocaleString("en-IN")} ${noun} (${quantity.toLocaleString("en-IN")} ${info.unitLabel})`;
}

/** Quantity text for lines that previously read "N units". */
export function formatQuantityLine(quantity: number, packSize?: number | null, unitLabel?: string | null): string {
  return isPack(packSize) ? formatQuantity(quantity, packSize, unitLabel) : `${quantity.toLocaleString("en-IN")} units`;
}

/** Mirrors the backend snap: nearest multiple, ties up, never below one pack. */
export function snapToPack(quantity: number, packSize?: number | null): { quantity: number; corrected: boolean } {
  const { packSize: size } = normalizePack(packSize);
  if (size <= 1) return { quantity, corrected: false };
  const lower = Math.floor(quantity / size) * size;
  const diffDown = quantity - lower;
  const snapped = Math.max(size, diffDown * 2 >= size ? lower + size : lower);
  return { quantity: snapped, corrected: snapped !== quantity };
}

export function isValidPackQuantity(quantity: number, packSize?: number | null): boolean {
  const { packSize: size } = normalizePack(packSize);
  return size <= 1 || (quantity >= size && quantity % size === 0);
}

export interface StepOptions {
  /** Floor for non-pack products (cart page 25, drawer 1). */
  legacyMin?: number;
}

/** Next cart quantity: whole packs for pack products, the legacy 25/50 steps otherwise. */
export function stepQuantity(
  quantity: number,
  direction: "up" | "down",
  packSize?: number | null,
  { legacyMin = 1 }: StepOptions = {}
): number {
  const { packSize: size } = normalizePack(packSize);
  if (size > 1) {
    const base = snapToPack(quantity, size).quantity;
    return direction === "up" ? base + size : Math.max(size, base - size);
  }
  if (direction === "up") return quantity + (quantity < 100 ? 25 : 50);
  return Math.max(legacyMin, quantity - (quantity <= 100 ? 25 : 50));
}

/** "/pc" for the default label, " each" for free-text labels ("stickers"). */
export function perUnitSuffix(unitLabel?: string | null): string {
  return normalizePack(1, unitLabel).unitLabel === DEFAULT_UNIT_LABEL ? "/pc" : " each";
}

/** Order-list summary: "150 total units" as before, or the pack line when one pack product is the whole order. */
export function summarizeOrderQuantity(items: { quantity: number; packSize?: number; unitLabel?: string }[]): string {
  if (items.length === 1 && isPack(items[0].packSize)) {
    return formatQuantity(items[0].quantity, items[0].packSize, items[0].unitLabel);
  }
  if (items.some((i) => isPack(i.packSize))) return `${items.length} items`;
  return `${items.reduce((s, i) => s + i.quantity, 0).toLocaleString("en-IN")} total units`;
}
