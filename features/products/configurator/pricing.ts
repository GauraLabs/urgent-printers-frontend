import type { PricingTier } from "@/types";
import { discountPercent, round2 } from "@/lib/utils";

export interface TierPricing {
  pricePerUnit: number;
  totalPrice: number;
  // Present only when the rounded MRP is still above the rounded price, as on the server.
  mrpPerUnit?: number;
  discountPercent?: number;
}

// Mirrors the backend pricing core: option multipliers scale both the MRP and
// the price, each quantized half-up to 0.01, and the line only counts as
// discounted if mrp_unit > unit_price after rounding. The percent is derived
// from the rounded figures. Prices on `tier` are already the charged-now
// values, so no window logic lives here.
export function priceTier(tier: Pick<PricingTier, "quantity" | "pricePerUnit" | "mrpPerUnit">, optionMultiplier: number): TierPricing {
  const pricePerUnit = round2(tier.pricePerUnit * optionMultiplier);
  const totalPrice = round2(pricePerUnit * tier.quantity);
  if (tier.mrpPerUnit === undefined) return { pricePerUnit, totalPrice };

  const mrpPerUnit = round2(tier.mrpPerUnit * optionMultiplier);
  if (mrpPerUnit <= pricePerUnit) return { pricePerUnit, totalPrice };

  const percent = discountPercent(mrpPerUnit, pricePerUnit);
  return percent >= 1
    ? { pricePerUnit, totalPrice, mrpPerUnit, discountPercent: percent }
    : { pricePerUnit, totalPrice, mrpPerUnit };
}
