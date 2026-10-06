import { describe, it, expect } from "vitest";
import { resolvePreselection } from "@/features/products/configurator/preselect";
import type { Product } from "@/types";

const product: Pick<Product, "pricingTiers" | "printSpec" | "turnaroundOptions"> = {
  pricingTiers: [
    { quantity: 50, pricePerUnit: 6, totalPrice: 300 },
    { quantity: 100, pricePerUnit: 5.5, totalPrice: 550 },
  ],
  printSpec: {
    sizes: [{ id: "2x2-in", label: "2x2 in", width: 2, height: 2, unit: "in", priceMultiplier: 1, isDefault: true }],
    papers: [{ id: "vinyl", label: "Vinyl", weight: "", description: "", priceMultiplier: 1, isDefault: true }],
    finishes: [{ id: "matte", label: "Matte", description: "", priceMultiplier: 1, isDefault: true }],
    sides: [{ label: "Single Side", priceMultiplier: 1, isDefault: true }],
    minDpi: 300,
    bleedMm: 3,
  },
  turnaroundOptions: [{ id: "standard", label: "Standard", businessDays: 5, extraCost: 0 }],
};

const q = (s: string) => new URLSearchParams(s);

describe("resolvePreselection", () => {
  it("accepts a full valid set", () => {
    expect(resolvePreselection(product, q("qty=100&size=2x2-in&paper=vinyl&finish=matte&sides=Single%20Side&turnaround=standard"))).toEqual({
      quantity: 100, sizeId: "2x2-in", paperId: "vinyl", finishId: "matte", sides: "Single Side", turnaroundId: "standard",
    });
  });
  it("matches sides by slug of the label", () => {
    expect(resolvePreselection(product, q("sides=single-side"))).toEqual({ sides: "Single Side" });
  });
  it("ignores invalid values and keeps the valid ones (partial)", () => {
    expect(resolvePreselection(product, q("qty=75&size=nope&paper=vinyl&finish=&turnaround=express&sides=Triple"))).toEqual({ paperId: "vinyl" });
  });
  it("rejects non-numeric and non-tier quantities", () => {
    expect(resolvePreselection(product, q("qty=abc"))).toEqual({});
    expect(resolvePreselection(product, q("qty=50.5"))).toEqual({});
    expect(resolvePreselection(product, q("qty=-50"))).toEqual({});
  });
  it("returns nothing without params", () => {
    expect(resolvePreselection(product, q(""))).toEqual({});
  });
});

describe("resolvePreselection with punctuated production labels", () => {
  const norm = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  // Backend _slugify strips punctuation (dots, ×) before hyphenating.
  const backendId = (label: string) =>
    label.trim().toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const cases: [string, string][] = [
    ["1.5x1.5 inch (Standard)", "15x15-inch-standard"],
    ["2 × 2 inch (Standard)", "2-2-inch-standard"],
    ["7.75x3.6 inch ", "775x36-inch"],
    ["1.5 x 1.5 mm (Euro)", "15-x-15-mm-euro"],
  ];

  it.each(cases)("%s resolves from the backend id and from the legacy id", (label, id) => {
    expect(backendId(label)).toBe(id);
    const p = {
      ...product,
      printSpec: {
        ...product.printSpec,
        sizes: [{ id: norm(label), label, width: 1, height: 1, unit: "in" as const, priceMultiplier: 1, isDefault: true }],
      },
    };
    expect(resolvePreselection(p, q(`size=${encodeURIComponent(id)}`)).sizeId).toBe(norm(label));
    const canonical = { ...p, printSpec: { ...p.printSpec, sizes: [{ ...p.printSpec.sizes[0], id }] } };
    expect(resolvePreselection(canonical, q(`size=${encodeURIComponent(id)}`)).sizeId).toBe(id);
  });

  it("finish with a trailing space in its label", () => {
    const label = "Matte Lamination with Golden Foil ";
    const p = {
      ...product,
      printSpec: { ...product.printSpec, finishes: [{ id: "matte-lamination-with-golden-foil", label, description: "", priceMultiplier: 1, isDefault: true }] },
    };
    expect(resolvePreselection(p, q("finish=matte-lamination-with-golden-foil")).finishId).toBe("matte-lamination-with-golden-foil");
  });
});
