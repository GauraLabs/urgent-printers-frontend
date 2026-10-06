import { describe, it, expect } from "vitest";
import {
  formatPackSize, formatQuantity, formatQuantityLine, isValidPackQuantity, normalizePack, packPrice,
  snapToPack, stepQuantity, summarizeOrderQuantity,
} from "@/lib/pack";
import { getFromPackPrice } from "@/lib/utils";

describe("normalizePack", () => {
  it("falls back to 1 / pcs when absent or invalid", () => {
    expect(normalizePack()).toEqual({ packSize: 1, unitLabel: "pcs" });
    expect(normalizePack(null, "")).toEqual({ packSize: 1, unitLabel: "pcs" });
    expect(normalizePack(0)).toEqual({ packSize: 1, unitLabel: "pcs" });
    expect(normalizePack(2.5)).toEqual({ packSize: 1, unitLabel: "pcs" });
    expect(normalizePack(50, " stickers ")).toEqual({ packSize: 50, unitLabel: "stickers" });
  });
});

describe("packPrice (integer cents)", () => {
  it("multiplies without float drift", () => {
    expect(packPrice(6, 50)).toBe(300);
    expect(packPrice(5.4, 50)).toBe(270);
    expect(packPrice(0.07, 3)).toBe(0.21);
    expect(packPrice(1.1, 3)).toBe(3.3);
    expect(packPrice(19.99, 1)).toBe(19.99);
    expect(packPrice(0.29, 100)).toBe(29);
  });
});

describe("formatQuantity", () => {
  it("renders packs and keeps plain quantities for pack_size 1", () => {
    expect(formatQuantity(150, 50, "pcs")).toBe("3 packs (150 pcs)");
    expect(formatQuantity(50, 50, "pcs")).toBe("1 pack (50 pcs)");
    expect(formatQuantity(5000, 25, "tags")).toBe("200 packs (5,000 tags)");
    expect(formatQuantity(1500, 1)).toBe("1,500");
    expect(formatQuantity(1500)).toBe("1,500");
  });
  it("formatQuantityLine keeps the legacy 'N units' text", () => {
    expect(formatQuantityLine(1500)).toBe("1,500 units");
    expect(formatQuantityLine(100, 50, "pcs")).toBe("2 packs (100 pcs)");
  });
  it("formatPackSize", () => {
    expect(formatPackSize(50, "pcs")).toBe("50 pcs");
  });
});

describe("snapToPack mirrors the backend vectors", () => {
  it.each([
    [120, 50, 100, true],
    [125, 50, 150, true],
    [20, 50, 50, true],
    [50, 50, 50, false],
    [30, 1, 30, false],
  ])("%i / pack %i -> %i", (qty, pack, expected, corrected) => {
    expect(snapToPack(qty, pack)).toEqual({ quantity: expected, corrected });
  });
  it("validity", () => {
    expect(isValidPackQuantity(100, 50)).toBe(true);
    expect(isValidPackQuantity(120, 50)).toBe(false);
    expect(isValidPackQuantity(0, 50)).toBe(false);
    expect(isValidPackQuantity(7, 1)).toBe(true);
  });
});

describe("stepQuantity", () => {
  it("steps whole packs for pack products, never below one pack", () => {
    expect(stepQuantity(50, "up", 50)).toBe(100);
    expect(stepQuantity(100, "down", 50)).toBe(50);
    expect(stepQuantity(50, "down", 50)).toBe(50);
    expect(stepQuantity(25, "up", 25)).toBe(50);
    expect(stepQuantity(5000, "up", 25)).toBe(5025);
  });
  it("snaps a legacy non-multiple line before stepping", () => {
    expect(stepQuantity(120, "up", 50)).toBe(150);
    expect(stepQuantity(120, "down", 50)).toBe(50);
  });
  it("keeps the legacy 25/50 steps for pack_size 1 or absent", () => {
    expect(stepQuantity(25, "up")).toBe(50);
    expect(stepQuantity(100, "up", 1)).toBe(150);
    expect(stepQuantity(100, "down", 1)).toBe(75);
    expect(stepQuantity(500, "down")).toBe(450);
    expect(stepQuantity(25, "down", 1, { legacyMin: 25 })).toBe(25);
    expect(stepQuantity(25, "down", 1)).toBe(1);
  });
});

describe("summarizeOrderQuantity", () => {
  it("is unchanged for non-pack orders", () => {
    expect(summarizeOrderQuantity([{ quantity: 100 }, { quantity: 50 }])).toBe("150 total units");
  });
  it("shows the pack line for a single pack item", () => {
    expect(summarizeOrderQuantity([{ quantity: 150, packSize: 50, unitLabel: "pcs" }])).toBe("3 packs (150 pcs)");
  });
  it("counts items for mixed orders", () => {
    expect(summarizeOrderQuantity([{ quantity: 100, packSize: 50, unitLabel: "pcs" }, { quantity: 10 }])).toBe("2 items");
  });
});

describe("getFromPackPrice", () => {
  const base = { pricingTiers: [], priceFrom: 5.4, mrpFrom: 6, discountPercent: 10 };
  it("equals the per-unit From price for pack_size 1", () => {
    expect(getFromPackPrice(base)).toEqual({ price: 5.4, discount: { mrp: 6, percent: 10 } });
  });
  it("uses server pack figures and keeps the percent", () => {
    expect(getFromPackPrice({ ...base, packSize: 50, priceFromPack: 270, mrpFromPack: 300 })).toEqual({
      price: 270,
      discount: { mrp: 300, percent: 10 },
    });
  });
  it("derives pack figures when the server omits them", () => {
    expect(getFromPackPrice({ ...base, packSize: 50 })).toEqual({ price: 270, discount: { mrp: 300, percent: 10 } });
  });
});

import { makeCartItemId } from "@/features/cart/cartItemId";
describe("makeCartItemId option normalisation", () => {
  it("is identical for legacy and canonical option ids", () => {
    expect(makeCartItemId("1", "2-5x3-5-inch", "a-b", "", "Single Side", "standard")).toBe(
      makeCartItemId("1", "25x35-inch", "ab", "", "single-side", "Standard")
    );
  });
});

import { migrateCartState } from "@/features/cart/store";
describe("migrateCartState", () => {
  it("survives malformed persisted state", () => {
    expect(migrateCartState(undefined)).toBeUndefined();
    expect(migrateCartState({ items: "x" })).toEqual({ items: "x" });
    const bad = { cartItemId: "keep" };
    const out = migrateCartState({ items: [bad, null] }) as { items: unknown[] };
    expect(out.items).toEqual([bad, null]);
  });
});
