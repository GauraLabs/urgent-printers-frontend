import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { isRedundantDescription, isSingleChoice, prettySize } from "@/features/products/configurator/optionText";
import { PdpPriceLineView, summarisePdpPrice, type ConfiguratorState } from "@/features/products/PdpStateContext";
import { buildSpecRows } from "@/features/products/ProductSpecs";
import type { Product } from "@/types";

describe("option description dedupe", () => {
  it("hides descriptions that repeat the label, ignoring case and spacing", () => {
    expect(isRedundantDescription("Spot UV", "Spot UV")).toBe(true);
    expect(isRedundantDescription("400 GSM Premium Board", "  400  gsm premium board ")).toBe(true);
    expect(isRedundantDescription("Matte", undefined)).toBe(true);
    expect(isRedundantDescription("Matte", "")).toBe(true);
  });
  it("keeps real descriptions", () => {
    expect(isRedundantDescription("Matte", "Soft, non-reflective finish")).toBe(false);
  });
});

describe("single choice detection", () => {
  it("is true only for exactly one option", () => {
    expect(isSingleChoice([])).toBe(false);
    expect(isSingleChoice([{ id: "a" }])).toBe(true);
    expect(isSingleChoice([{ id: "a" }, { id: "b" }])).toBe(false);
  });
  it("prettifies sizes for display only", () => {
    expect(prettySize("3.5 x 2 in (Standard)")).toBe("3.5 × 2 in (Standard)");
    expect(prettySize("A4")).toBe("A4");
  });
});

describe("one price source for the line, card and sticky bar", () => {
  const state: ConfiguratorState = {
    isInCart: false,
    totalPrice: 3937.5,
    savings: 437.5,
    discountPercent: 10,
    quantityLabel: "50 pcs",
  };
  it("derives total, quantity, MRP, percent and saving from the same state", () => {
    const s = summarisePdpPrice(state);
    expect(s.total).toBe("₹3,937.50");
    expect(s.quantity).toBe("50 pcs");
    expect(s.mrpTotal).toBe(4375);
    expect(s.percent).toBe(10);
    expect(s.saving).toBe("₹437.50");
  });
  it("the mobile price line renders exactly the summary", () => {
    const html = renderToStaticMarkup(<PdpPriceLineView state={state} />);
    expect(html).toContain("₹3,937.50");
    expect(html).toContain("for 50 pcs");
    expect(html).toContain("10% off");
    expect(html).toContain("line-through");
  });
  it("shows no MRP or chip without a discount", () => {
    const html = renderToStaticMarkup(<PdpPriceLineView state={{ ...state, savings: 0, discountPercent: undefined }} />);
    expect(html).not.toContain("line-through");
    expect(html).not.toContain("off");
  });
});

describe("specification rows", () => {
  it("lists only groups that exist", () => {
    const rows = buildSpecRows({
      printSpec: {
        sizes: [{ label: "3.5 x 2 in" }],
        papers: [],
        finishes: [{ label: "Matte" }, { label: "Gloss" }],
        sides: [],
        minDpi: 300,
        bleedMm: 3,
      },
    } as unknown as Pick<Product, "printSpec">);
    expect(rows.map((r) => r.label)).toEqual(["Size", "Finish", "Artwork resolution", "Bleed"]);
    expect(rows[1].value).toBe("Matte, Gloss");
  });
});
