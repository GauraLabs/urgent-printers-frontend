import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { discountPercent, round2, toDisplayDiscount, getDisplayDiscount, getUnitDiscount } from "@/lib/utils";
import { priceTier } from "@/features/products/configurator/pricing";
import { cartMrpSavings, cartTotalSavings, eligibleSubtotal, cartItemDiscount } from "@/features/cart/savings";
import { mapCartItem } from "@/lib/api/cart";
import { GOLDEN_VECTORS, cartItemOnSale, cartItemLegacy } from "./fixtures/mrp-contract";
import type { CartItem, PricingTier } from "@/types";

describe("discountPercent (spec 1.2 golden vectors)", () => {
  for (const [mrp, price, pct] of GOLDEN_VECTORS) {
    it(`${mrp} -> ${price} is ${pct}%`, () => assert.equal(discountPercent(mrp, price), pct));
  }
  it("is 0 without a real discount", () => {
    assert.equal(discountPercent(10, 10), 0);
    assert.equal(discountPercent(10, 12), 0);
    assert.equal(discountPercent(0, 0), 0);
  });
});

describe("round2 matches Decimal ROUND_HALF_UP", () => {
  it("rounds representation-error halves up where toFixed does not", () => {
    assert.equal(round2(1.005), 1.01);
    assert.equal(round2(2.675), 2.68);
    assert.equal(round2(1.255), 1.26);
    assert.equal((1.005).toFixed(2), "1.00");
  });
  it("leaves exact values alone", () => {
    assert.equal(round2(9), 9);
    assert.equal(round2(12.34), 12.34);
  });
});

describe("toDisplayDiscount hides unless percent >= 1", () => {
  it("absent or 0% percent hides MRP too", () => {
    assert.equal(toDisplayDiscount(9, 12, undefined), null);
    assert.equal(toDisplayDiscount(996, 1000, 0), null);
  });
  it("absent MRP hides", () => assert.equal(toDisplayDiscount(9, undefined, 25), null));
  it("MRP not above price hides", () => assert.equal(toDisplayDiscount(9, 9, 25), null));
  it("shows a real discount", () => assert.deepEqual(toDisplayDiscount(9, 12, 25), { mrp: 12, percent: 25 }));
});

describe("getUnitDiscount", () => {
  it("derives percent from rounded unit figures", () => {
    assert.deepEqual(getUnitDiscount(2, 3), { mrp: 3, percent: 33 });
    assert.equal(getUnitDiscount(996, 1000), null);
    assert.equal(getUnitDiscount(9, undefined), null);
  });
});

const tier = (over: Partial<PricingTier>): PricingTier => ({
  quantity: 100, pricePerUnit: 9, totalPrice: 900, ...over,
});

describe("getDisplayDiscount follows the 'From' tier", () => {
  it("uses the best-value tier's discount", () => {
    const d = getDisplayDiscount({
      pricingTiers: [tier({ pricePerUnit: 10, mrpPerUnit: 20, discountPercent: 50 }), tier({ pricePerUnit: 9, mrpPerUnit: 12, discountPercent: 25, isBestValue: true })],
    });
    assert.deepEqual(d, { mrp: 12, percent: 25 });
  });
  it("falls back to card fields when no tiers are loaded", () => {
    assert.deepEqual(getDisplayDiscount({ pricingTiers: [], priceFrom: 9, mrpFrom: 12, discountPercent: 25 }), { mrp: 12, percent: 25 });
  });
  it("old backend: no fields -> null", () => {
    assert.equal(getDisplayDiscount({ pricingTiers: [], priceFrom: 9 }), null);
  });
});

describe("configurator priceTier rounds like the server", () => {
  it("scales MRP and price together and derives percent from rounded figures", () => {
    // 3.00/2.00 base, x1.5 -> 4.50/3.00 -> 33%
    assert.deepEqual(priceTier(tier({ pricePerUnit: 2, mrpPerUnit: 3 }), 1.5), {
      pricePerUnit: 3, totalPrice: 300, mrpPerUnit: 4.5, discountPercent: 33,
    });
  });
  it("drops the discount when rounding makes MRP <= price", () => {
    // 1.00/0.99 x0.5 -> 0.50 / 0.495 -> 0.50 (half-up): equal -> not discounted
    const p = priceTier(tier({ pricePerUnit: 0.99, mrpPerUnit: 1 }), 0.5);
    assert.equal(p.mrpPerUnit, undefined);
    assert.equal(p.discountPercent, undefined);
  });
  it("keeps MRP but no percent at 0% (cart still snapshots the real MRP)", () => {
    const p = priceTier(tier({ pricePerUnit: 996, mrpPerUnit: 1000 }), 1);
    assert.equal(p.mrpPerUnit, 1000);
    assert.equal(p.discountPercent, undefined);
  });
  it("no MRP -> price only", () => {
    assert.deepEqual(priceTier(tier({}), 1.25), { pricePerUnit: 11.25, totalPrice: 1125 });
  });
});

describe("cart savings are counted once", () => {
  const onSale: CartItem = mapCartItem(cartItemOnSale);
  const plain: CartItem = mapCartItem({ ...cartItemLegacy, productId: "2", pricePerUnit: 5, totalPrice: 500 });

  it("maps mrpPerUnit from the cart payload; absent stays undefined", () => {
    assert.equal(onSale.mrpPerUnit, 12);
    assert.equal(plain.mrpPerUnit, undefined);
  });
  it("MRP savings = sum (mrp - price) x qty", () => assert.equal(cartMrpSavings([onSale, plain]), 300));
  it("total = MRP savings + coupon, once", () => assert.equal(cartTotalSavings([onSale, plain], 50), 350));
  it("no discounts -> only the coupon", () => assert.equal(cartTotalSavings([plain], 50), 50));
  it("eligible subtotal excludes discounted lines", () => assert.equal(eligibleSubtotal([onSale, plain]), 500));
  it("line discount hidden at 0%", () => {
    assert.equal(cartItemDiscount({ pricePerUnit: 996, mrpPerUnit: 1000 }), null);
    assert.deepEqual(cartItemDiscount({ pricePerUnit: 9, mrpPerUnit: 12 }), { mrp: 12, percent: 25 });
  });
});

import { getCornerBadge } from "@/features/products/badge";

describe("card corner badge", () => {
  it("never renders a stored 'sale' badge", () => {
    assert.equal(getCornerBadge({ badge: "sale", onSale: false }), null);
  });
  it("uses onSale instead, unless another badge claims the slot", () => {
    assert.deepEqual(getCornerBadge({ badge: "none", onSale: true }), { kind: "sale" });
    assert.deepEqual(getCornerBadge({ badge: "sale", onSale: true }), { kind: "sale" });
    assert.deepEqual(getCornerBadge({ badge: "bestseller", onSale: true }), { kind: "label", label: "bestseller" });
    assert.equal(getCornerBadge({ badge: "none", onSale: false }), null);
  });
});

import { mockProducts } from "@/lib/mock-data";

describe("mock data discounts", () => {
  const onSale = mockProducts.filter((p) => p.onSale);
  it("some products are discounted and some are not", () => {
    assert.ok(onSale.length >= 2);
    assert.ok(mockProducts.some((p) => !p.onSale && p.pricingTiers.every((t) => t.mrpPerUnit === undefined)));
  });
  it("follows the contract: mrp > price and percent matches the golden rounding", () => {
    for (const p of onSale) {
      for (const t of p.pricingTiers) {
        if (t.mrpPerUnit === undefined) continue;
        assert.ok(t.mrpPerUnit > t.pricePerUnit);
        assert.equal(t.discountPercent, discountPercent(t.mrpPerUnit, t.pricePerUnit));
      }
      assert.ok(getDisplayDiscount(p));
    }
  });
  it("never carries a stored 'sale' badge", () => {
    assert.ok(mockProducts.every((p) => p.badge !== "sale"));
  });
});
