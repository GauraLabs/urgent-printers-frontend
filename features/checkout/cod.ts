import { formatCardPrice } from "@/lib/utils";
import type { OrderPreview } from "@/types";

export interface CodConfig {
  enabled: boolean;
  min_order_amount: number | null;
  max_order_amount: number | null;
}

export interface CodAvailability {
  available: boolean;
  reason: string | null;
}

export const COD_UNAVAILABLE_CODE = "cod_unavailable";
export const COD_OUT_OF_RANGE_CODE = "cod_amount_out_of_range";

export const DEFAULT_COD_CONFIG: CodConfig = { enabled: true, min_order_amount: null, max_order_amount: null };

const toPaise = (rupees: number): number => Math.round(rupees * 100);

// Mirrors the backend wording. Client-side evaluation is a UX hint only; the
// preview's codAvailable and the create call's 422 are authoritative.
export function evaluateCod(cod: CodConfig, total: number | null): CodAvailability {
  if (!cod.enabled) return { available: false, reason: "Cash on Delivery is currently unavailable" };
  const { min_order_amount: min, max_order_amount: max } = cod;
  if (total === null) return { available: true, reason: null };
  const t = toPaise(total);
  const belowMin = min !== null && t < toPaise(min);
  const aboveMax = max !== null && t > toPaise(max);
  if (!belowMin && !aboveMax) return { available: true, reason: null };
  if (min !== null && max !== null) {
    return { available: false, reason: `Cash on Delivery is available for orders between ${formatCardPrice(min)} and ${formatCardPrice(max)}` };
  }
  if (min !== null) {
    return { available: false, reason: `Cash on Delivery is available for orders of ${formatCardPrice(min)} or more` };
  }
  return { available: false, reason: `Cash on Delivery is available for orders up to ${formatCardPrice(max ?? 0)}` };
}

export function resolveCod(
  cod: CodConfig,
  fallbackTotal: number | null,
  preview: OrderPreview | null
): CodAvailability {
  if (preview && typeof preview.codAvailable === "boolean") {
    return {
      available: preview.codAvailable,
      reason: preview.codAvailable ? null : preview.codReason ?? evaluateCod(cod, preview.pricing.totalAmount).reason ?? "Cash on Delivery is currently unavailable",
    };
  }
  return evaluateCod(cod, preview ? preview.pricing.totalAmount : fallbackTotal);
}

export interface ServerCodBlock {
  reason: string;
  config: CodConfig;
}

const sameCodConfig = (a: CodConfig, b: CodConfig): boolean =>
  a.enabled === b.enabled && a.min_order_amount === b.min_order_amount && a.max_order_amount === b.max_order_amount;

// A server rejection only holds while the COD config is the one it was made
// under; an admin change since then makes it stale.
export function codBlockApplies(block: ServerCodBlock | null, current: CodConfig): block is ServerCodBlock {
  return block !== null && sameCodConfig(block.config, current);
}
