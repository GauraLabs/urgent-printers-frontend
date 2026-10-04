import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getFromPrice, getDisplayPricePerUnit, minOptionMultiplier, discountPercent, round2 } from "@/lib/utils";
import { ProductPrice } from "@/components/common/ProductPrice";
import { mapDetail } from "@/lib/api/products";
import { priceTier } from "@/features/products/configurator/pricing";
import { mockProducts } from "@/lib/mock-data";
import { detailLegacy } from "./fixtures/mrp-contract";
import type { PricingTier, PrintSpec } from "@/types";

const opt = (priceMultiplier: number) => ({ priceMultiplier, isDefault: false });
const spec = (over: Partial<Record<"sizes" | "papers" | "finishes" | "sides", { priceMultiplier: number }[]>>) =>
  ({ sizes: [], papers: [], finishes: [], sides: [], ...over }) as unknown as PrintSpec;
const tier = (over: Partial<PricingTier> = {}): PricingTier => ({ quantity: 100, pricePerUnit: 12, totalPrice: 1200, ...over });

// Dev product "test": one tier 100 @ 12.00; size x1.1, finish x1.3, sides x1.35.
const product19 = {
  pricingTiers: [tier({ isBestValue: true })],
  printSpec: spec({ sizes: [opt(1.1)], finishes: [opt(1.3)], sides: [opt(1.35)] }),
};

describe("From price applies the min active option multipliers", () => {
  it("product 19 shape: 12 x 1.1 x 1.3 x 1.35 = 23.17 on the card", () => {
    expect(getDisplayPricePerUnit(product19)).toBe(23.17);
    const html = renderToStaticMarkup(<ProductPrice variant="card" prefix="From" product={product19 as never} />);
    expect(html).toContain("₹23.17");
    expect(html).not.toContain("₹12.00");
  });

  it("PDP detail payload (mapped, inactive option dropped) gives the same 23.17", () => {
    const p = mapDetail({
      ...detailLegacy,
      price_from: null,
      pricing_tiers: [{ quantity: 100, price_per_unit: 12, is_best_value: true }],
      sizes: [
        { label: "A", width: 1, height: 1, unit: "in", is_active: true, price_multiplier: 1.1, is_default: true },
        { label: "Cheap but inactive", width: 1, height: 1, unit: "in", is_active: false, price_multiplier: 0.5, is_default: false },
      ],
      paper_types: [],
      finishes: [{ label: "F", is_active: true, price_multiplier: 1.3, is_default: true }],
      sides_options: [{ label: "S", price_multiplier: 1.35, is_default: true }],
    });
    expect(getDisplayPricePerUnit(p)).toBe(23.17);
  });

  it("matches the configurator's price for the cheapest selection", () => {
    const m = minOptionMultiplier(product19.printSpec);
    expect(priceTier(product19.pricingTiers[0], m).pricePerUnit).toBe(23.17);
  });

  it("takes the cheapest option per category, empty categories are x1, bad multipliers skipped", () => {
    expect(minOptionMultiplier(spec({ sizes: [opt(1.3), opt(0.9)], papers: [opt(1), opt(1.4)] }))).toBeCloseTo(0.9);
    expect(minOptionMultiplier(spec({}))).toBe(1);
    expect(minOptionMultiplier(undefined)).toBe(1);
    expect(minOptionMultiplier(spec({ sizes: [opt(0), opt(-2), opt(NaN), opt(1.2)] }))).toBeCloseTo(1.2);
    expect(minOptionMultiplier(spec({ sizes: [opt(0), opt(Infinity)] }))).toBe(1);
  });

  it("uses the best-value tier, else the cheapest", () => {
    const tiers = [tier({ pricePerUnit: 10 }), tier({ quantity: 500, pricePerUnit: 6 }), tier({ quantity: 250, pricePerUnit: 8, isBestValue: true })];
    expect(getDisplayPricePerUnit({ pricingTiers: tiers })).toBe(8);
    expect(getDisplayPricePerUnit({ pricingTiers: tiers.map((t) => ({ ...t, isBestValue: false })) })).toBe(6);
  });

  it("discount: price and MRP scaled and rounded, percent from the rounded figures", () => {
    const f = getFromPrice({
      pricingTiers: [tier({ pricePerUnit: 9, mrpPerUnit: 12, isBestValue: true })],
      printSpec: spec({ sizes: [opt(1.1)], finishes: [opt(1.3)] }),
    });
    // 9 x 1.43 = 12.87, 12 x 1.43 = 17.16 -> 25%
    expect(f.price).toBe(12.87);
    expect(f.discount).toEqual({ mrp: 17.16, percent: discountPercent(17.16, 12.87) });
    expect(f.discount?.percent).toBe(25);
  });

  it("0% after rounding hides the discount", () => {
    expect(getFromPrice({ pricingTiers: [tier({ pricePerUnit: 996, mrpPerUnit: 1000 })] }).discount).toBeNull();
  });

  it("prefers the server's priceFrom / mrpFrom / discountPercent when present", () => {
    const f = getFromPrice({
      ...product19,
      priceFrom: 23.17,
      mrpFrom: 30,
      discountPercent: 23,
    });
    expect(f).toEqual({ price: 23.17, discount: { mrp: 30, percent: 23 } });
    // server value wins even when a client-side computation would differ
    expect(getFromPrice({ ...product19, priceFrom: 20 }).price).toBe(20);
  });
});

describe("mock data follows the same rules", () => {
  it("priceFrom equals best-value tier x min multipliers for every product", () => {
    for (const p of mockProducts) {
      const t = p.pricingTiers.find((x) => x.isBestValue) ?? p.pricingTiers[0];
      expect(p.priceFrom).toBe(round2(t.pricePerUnit * minOptionMultiplier(p.printSpec)));
      if (p.onSale) {
        expect(p.mrpFrom).toBeGreaterThan(p.priceFrom!);
        expect(p.discountPercent).toBe(discountPercent(p.mrpFrom!, p.priceFrom!));
      }
    }
  });
});

describe("inactive sides are filtered", () => {
  const base = { ...detailLegacy, price_from: null, pricing_tiers: [{ quantity: 100, price_per_unit: 12, is_best_value: true }], sizes: [], paper_types: [], finishes: [] };
  it("an inactive cheaper side does not lower From; absent is_active means active", () => {
    const p = mapDetail({
      ...base,
      sides_options: [
        { label: "Single", price_multiplier: 1.35, is_default: true },
        { label: "Cheap off", price_multiplier: 0.5, is_default: false, is_active: false },
      ],
    });
    expect(p.printSpec.sides.map((s) => s.label)).toEqual(["Single"]);
    expect(getDisplayPricePerUnit(p)).toBe(16.2);
  });
  it("is_active true is kept", () => {
    const p = mapDetail({ ...base, sides_options: [{ label: "A", price_multiplier: 1, is_default: true, is_active: true }] });
    expect(p.printSpec.sides).toHaveLength(1);
  });
});
