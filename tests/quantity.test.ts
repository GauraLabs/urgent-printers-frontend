import { describe, it, expect } from "vitest";
import {
  clampQuantity, effectiveBounds, formatOrderQuantity, formatQty, nextTierNudge, priceForQuantity,
  stepFor, stepQuantity, summarizeOrderQuantity, tierForQuantity, tierGuideEntries,
} from "@/lib/quantity";
import type { PricingTier } from "@/types";

const t = (quantity: number, pricePerUnit: number, extra: Partial<PricingTier> = {}): PricingTier => ({
  quantity, pricePerUnit, totalPrice: quantity * pricePerUnit, ...extra,
});

// The three prod products the spec uses as golden vectors.
const stickers = [t(50, 6), t(100, 4), t(150, 3.4), t(200, 3, { isBestValue: true })];
const tags = [t(25, 16), t(50, 10), t(100, 6.5)];
const boards = [t(1, 1100), t(2, 1000), t(3, 900)];

describe("formatQty", () => {
  it("groups digits and uses the singular only for pcs", () => {
    expect(formatQty(120, "pcs")).toBe("120 pcs");
    expect(formatQty(1, "pcs")).toBe("1 pc");
    expect(formatQty(5000, "pcs")).toBe("5,000 pcs");
    expect(formatQty(1, "boards")).toBe("1 boards");
    expect(formatQty(40)).toBe("40 pcs");
    expect(formatQty(100000)).toBe("1,00,000 pcs");
    expect(formatQty(1000000)).toBe("10,00,000 pcs");
    expect(formatQty(40, " ")).toBe("40 pcs");
  });
  it("renders historical pack snapshots and plain lines", () => {
    expect(formatOrderQuantity(150, 50, "pcs")).toBe("3 packs (150 pcs)");
    expect(formatOrderQuantity(50, 50, "pcs")).toBe("1 pack (50 pcs)");
    expect(formatOrderQuantity(150, undefined, "pcs")).toBe("150 pcs");
    expect(formatOrderQuantity(150, 1, undefined)).toBe("150 pcs");
    expect(summarizeOrderQuantity([{ quantity: 120 }])).toBe("120 pcs");
    expect(summarizeOrderQuantity([{ quantity: 100 }, { quantity: 20 }])).toBe("Total 120 items");
  });
});

describe("effectiveBounds", () => {
  it("uses server effective values", () => {
    expect(effectiveBounds({ pricingTiers: stickers, minOrderQuantity: 40, maxOrderQuantity: 5000, listingQuantity: 100 }))
      .toEqual({ min: 40, max: 5000, listing: 100 });
  });
  it("falls back for a stale payload: min = lowest tier, no max, listing = min", () => {
    expect(effectiveBounds({ pricingTiers: stickers })).toEqual({ min: 50, max: null, listing: 50 });
    expect(effectiveBounds({ pricingTiers: tags })).toEqual({ min: 25, max: null, listing: 25 });
    expect(effectiveBounds({ pricingTiers: boards })).toEqual({ min: 1, max: null, listing: 1 });
    expect(effectiveBounds({})).toEqual({ min: 1, max: null, listing: 1 });
  });
  it("treats an explicit null max as no limit and clamps a stray listing quantity", () => {
    expect(effectiveBounds({ minOrderQuantity: 40, maxOrderQuantity: null, listingQuantity: 10 })).toEqual({ min: 40, max: null, listing: 40 });
  });
});

describe("clamp and step", () => {
  it("clamps into [min, max]", () => {
    expect(clampQuantity(10, 40, 5000)).toBe(40);
    expect(clampQuantity(9000, 40, 5000)).toBe(5000);
    expect(clampQuantity(9000, 40, null)).toBe(9000);
    expect(clampQuantity(9_999_999, 40, null)).toBe(1_000_000);
    expect(clampQuantity(120, 40, 5000)).toBe(120);
  });
  it.each([[1, 1], [9, 1], [10, 5], [99, 5], [100, 10], [999, 10], [1000, 100]])("stepFor(%i) = %i", (min, step) => {
    expect(stepFor(min)).toBe(step);
  });
  it("snaps to the next/previous multiple and clamps", () => {
    expect(stepQuantity(42, "up", 40, null)).toBe(45);
    expect(stepQuantity(42, "down", 40, null)).toBe(40);
    expect(stepQuantity(45, "down", 40, null)).toBe(40);
    expect(stepQuantity(40, "down", 40, null)).toBe(40);
    expect(stepQuantity(5000, "up", 40, 5000)).toBe(5000);
    expect(stepQuantity(1, "up", 1, null)).toBe(2);
    expect(stepQuantity(1, "down", 1, null)).toBe(1);
    expect(stepQuantity(100, "up", 100, null)).toBe(110);
  });
});

describe("tierForQuantity and priceForQuantity", () => {
  it("picks the highest tier <= qty, the lowest when below", () => {
    expect(tierForQuantity(stickers, 99)?.quantity).toBe(50);
    expect(tierForQuantity(stickers, 100)?.quantity).toBe(100);
    expect(tierForQuantity(stickers, 1000)?.quantity).toBe(200);
    expect(tierForQuantity(stickers, 10)?.quantity).toBe(50);
    expect(tierForQuantity([], 10)).toBeUndefined();
  });
  it("prices non-multiples exactly as the server (rounded per piece, then x qty)", () => {
    expect(priceForQuantity(stickers, 120, 1)).toMatchObject({ pricePerUnit: 4, subtotal: 480, total: 480 });
    expect(priceForQuantity(tags, 33, 1)).toMatchObject({ pricePerUnit: 16, total: 528 });
    expect(priceForQuantity(tags, 77, 1)).toMatchObject({ pricePerUnit: 10, total: 770 });
    expect(priceForQuantity(boards, 1, 1)?.total).toBe(1100);
  });
  it("applies the option multiplier with half-up per-piece rounding and the flat turnaround extra", () => {
    // 3.4 x 1.15 = 3.91 per piece
    expect(priceForQuantity(stickers, 150, 1.15, 50)).toMatchObject({ pricePerUnit: 3.91, subtotal: 586.5, total: 636.5 });
  });
  it("reports MRP savings only for a real discount", () => {
    const tiers = [t(40, 6, { mrpPerUnit: 7.5 }), t(100, 4)];
    expect(priceForQuantity(tiers, 40, 1)).toMatchObject({ mrpPerUnit: 7.5, discountPercent: 20, savings: 60 });
    expect(priceForQuantity(tiers, 100, 1)).toMatchObject({ mrpPerUnit: undefined, savings: 0 });
  });
});

describe("nextTierNudge", () => {
  it("qty 99 of stickers: add 1 and save", () => {
    expect(nextTierNudge(99, stickers, 1, 0, null)).toEqual({
      addQty: 1, newQty: 100, newPerPiece: 4, newTotal: 400, currentTotal: 594, saving: 194, extra: 0,
    });
  });
  it("shows when the next tier costs at most 5 percent more", () => {
    // 24 tags fall back to the lowest tier rate: 24 x 16 = 384 -> 25 x 16 = 400 (+4.2%)
    const n = nextTierNudge(24, tags, 1, 0, null);
    expect(n).toMatchObject({ addQty: 1, newQty: 25, extra: 16, saving: 0 });
  });
  it("hides when the next tier costs more than 5 percent extra", () => {
    // 50 x 6 = 300 -> 100 x 4 = 400 (+33%)
    expect(nextTierNudge(50, stickers, 1, 0, null)).toBeNull();
  });
  it("hides when the next tier is above the maximum", () => {
    expect(nextTierNudge(99, stickers, 1, 0, 99)).toBeNull();
    expect(nextTierNudge(99, stickers, 1, 0, 100)).not.toBeNull();
  });
  it("is null on the last tier and counts the turnaround surcharge in both totals", () => {
    expect(nextTierNudge(250, stickers, 1, 0, null)).toBeNull();
    expect(nextTierNudge(99, stickers, 1, 100, null)).toMatchObject({ currentTotal: 694, newTotal: 500, saving: 194 });
  });
});

describe("tierGuideEntries", () => {
  it("highlights the tier containing the quantity", () => {
    const e = tierGuideEntries(stickers, 120, 1, 50, null);
    expect(e.map((x) => [x.label, x.pricePerUnit, x.current])).toEqual([[50, 6, false], [100, 4, true], [150, 3.4, false], [200, 3, false]]);
    expect(e[3].isBestValue).toBe(true);
  });
  it("hides tiers above max and tiers below min except the covering one; labels start at min", () => {
    const e = tierGuideEntries(stickers, 60, 1, 60, 160);
    expect(e.map((x) => x.label)).toEqual([60, 100, 150]);
    expect(e[0].current).toBe(true);
  });
  it("includes option multipliers in the chip rate", () => {
    expect(tierGuideEntries(stickers, 50, 1.15, 50, null)[0].pricePerUnit).toBe(6.9);
  });
});
