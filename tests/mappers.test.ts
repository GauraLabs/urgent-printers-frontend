import { describe, it, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mapCard, mapDetail, mapSearchDoc, getProducts } from "@/lib/api/products";
import { mapCartItem } from "@/lib/api/cart";
import { mapOrderDetail, mapPreview, buildOrderBody, isPriceChangedError } from "@/lib/api/orders";
import { ApiError } from "@/lib/api/client";
import { buildCouponBody, mapCoupon } from "@/lib/api/coupons";
import { applyPreviewPrices, pricesDiffer } from "@/features/checkout/repricing";
import { savingsFromPricing } from "@/components/common/SavingsSummary";
import {
  cardLegacy, cardOnSale, detailOnSale, detailLegacy, searchDocOnSale, searchDocLegacy,
  cartItemOnSale, cartItemLegacy, orderOnSale, orderLegacy, previewRepriced, couponExclusive,
} from "./fixtures/mrp-contract";
import type { CartItem, CreateOrderRequest } from "@/types";

describe("product mappers", () => {
  it("card: maps snake_case discount fields", () => {
    const p = mapCard(cardOnSale);
    assert.deepEqual([p.mrpFrom, p.discountPercent, p.discountAmount, p.onSale, p.priceFrom], [12, 25, 3, true, 9]);
  });
  it("card: old backend (fields absent) maps to no discount", () => {
    const p = mapCard(cardLegacy);
    assert.deepEqual([p.mrpFrom, p.discountPercent, p.discountAmount, p.onSale], [undefined, undefined, undefined, false]);
  });
  it("card: nulls from a no-discount product map to undefined", () => {
    const p = mapCard({ ...cardOnSale, mrp_from: null, discount_percent: null, discount_amount: null, on_sale: false });
    assert.deepEqual([p.mrpFrom, p.discountPercent, p.onSale], [undefined, undefined, false]);
  });
  it("detail: tier discounts and sale end", () => {
    const p = mapDetail(detailOnSale);
    assert.deepEqual(
      [p.pricingTiers[0].mrpPerUnit, p.pricingTiers[0].discountPercent, p.pricingTiers[0].discountPerUnit],
      [12, 25, 3]
    );
    assert.equal(p.pricingTiers[1].mrpPerUnit, undefined);
    assert.equal(p.discountEndsAt, "2026-10-12T13:00:00Z");
    assert.equal(p.onSale, true);
  });
  it("detail: old backend", () => {
    const p = mapDetail(detailLegacy);
    assert.equal(p.pricingTiers[0].mrpPerUnit, undefined);
    assert.equal(p.discountEndsAt, undefined);
    assert.equal(p.onSale, false);
  });
  it("search doc: base_mrp / has_discount", () => {
    const cats = new Map([[2, { slug: "business-cards", name: "Business Cards" }]]);
    const p = mapSearchDoc(searchDocOnSale, cats);
    assert.deepEqual([p.mrpFrom, p.discountPercent, p.discountAmount, p.onSale, p.priceFrom], [12, 25, 3, true, 9]);
    const old = mapSearchDoc(searchDocLegacy, cats);
    assert.deepEqual([old.mrpFrom, old.onSale], [undefined, false]);
  });
});

describe("cart / order / preview mappers", () => {
  it("cart item", () => {
    assert.equal(mapCartItem(cartItemOnSale).mrpPerUnit, 12);
    assert.equal(mapCartItem(cartItemLegacy).mrpPerUnit, undefined);
  });
  it("order: item snapshot + server savings, parsed from decimal strings", () => {
    const o = mapOrderDetail(orderOnSale);
    assert.deepEqual(
      [o.items[0].mrpPerUnit, o.items[0].discountPerUnit, o.items[0].lineSavings, o.pricing.mrpSavings, o.pricing.totalSavings],
      [12, 3, 300, 300, 350]
    );
  });
  it("order: old backend leaves savings undefined (not 0)", () => {
    const o = mapOrderDetail(orderLegacy);
    assert.deepEqual([o.items[0].mrpPerUnit, o.pricing.mrpSavings, o.pricing.totalSavings], [undefined, undefined, undefined]);
  });
  it("savings: server totalSavings is used as-is (no double counting)", () => {
    const s = savingsFromPricing(mapOrderDetail(orderOnSale).pricing);
    assert.deepEqual(s, { total: 350, mrp: 300, coupon: 50, couponCode: "SAVE50" });
  });
  it("savings: old backend falls back to the coupon discount only", () => {
    assert.equal(savingsFromPricing(mapOrderDetail(orderLegacy).pricing).total, 50);
  });
  it("preview lines", () => {
    const pv = mapPreview(previewRepriced);
    assert.equal(pv.items[0].pricePerUnit, 12);
    assert.equal(pv.items[0].mrpPerUnit, undefined);
  });
});

describe("order request + errors", () => {
  const base: CreateOrderRequest = {
    items: [],
    shippingAddress: { label: "Home", fullName: "A", phone: "1", line1: "x", city: "c", state: "s", postalCode: "1", country: "IN" },
    paymentMethod: "cod",
  };
  it("sends expected_total only when set", () => {
    assert.equal("expected_total" in buildOrderBody(base), false);
    assert.equal(buildOrderBody({ ...base, expectedTotal: 949 }).expected_total, 949);
  });
  it("detects 409 price_changed only", () => {
    assert.equal(isPriceChangedError(new ApiError("Prices have changed", 409, "price_changed")), true);
    assert.equal(isPriceChangedError(new ApiError("conflict", 409, "other")), false);
    assert.equal(isPriceChangedError(new ApiError("x", 503, "orders_halted")), false);
    assert.equal(isPriceChangedError(new Error("price_changed")), false);
  });
});

describe("coupons", () => {
  it("sends eligible_subtotal only when provided", () => {
    assert.deepEqual(buildCouponBody(" save50 ", 1400), { code: "SAVE50", subtotal: 1400 });
    assert.deepEqual(buildCouponBody("save50", 1400, 500), { code: "SAVE50", subtotal: 1400, eligible_subtotal: 500 });
  });
  it("reads applies_to_discounted_items", () => {
    assert.equal(mapCoupon(couponExclusive).appliesToDiscountedItems, false);
    assert.equal(mapCoupon({ ...couponExclusive, applies_to_discounted_items: undefined }).appliesToDiscountedItems, undefined);
  });
});

describe("checkout repricing", () => {
  const cart: CartItem[] = [mapCartItem(cartItemOnSale)];
  it("detects a sale that ended since the item was added", () => {
    assert.equal(pricesDiffer(cart, mapPreview(previewRepriced)), true);
  });
  it("no difference when preview matches the cart", () => {
    const same = mapPreview({
      ...previewRepriced,
      items: [{ ...previewRepriced.items[0], pricePerUnit: 9, totalPrice: 900, mrpPerUnit: 12, discountPerUnit: 3 }],
    });
    assert.equal(pricesDiffer(cart, same), false);
  });
  it("a 0%-discount preview line (true MRP kept) is not a price change", () => {
    const zeroPct = mapCartItem({ ...cartItemLegacy, pricePerUnit: 996, totalPrice: 99600 });
    const pv = mapPreview({
      ...previewRepriced,
      items: [{ ...previewRepriced.items[0], pricePerUnit: 996, totalPrice: 99600, mrpPerUnit: 1000, discountPerUnit: 4 }],
    });
    assert.equal(pricesDiffer([zeroPct], pv), false);
  });
  it("adopts preview prices and clears a stale MRP", () => {
    const [line] = applyPreviewPrices(cart, mapPreview(previewRepriced));
    assert.deepEqual([line.pricePerUnit, line.totalPrice, line.mrpPerUnit], [12, 1200, undefined]);
  });
  it("a line count mismatch counts as differing and leaves items untouched", () => {
    const pv = mapPreview({ ...previewRepriced, items: [] });
    assert.equal(pricesDiffer(cart, pv), true);
    assert.deepEqual(applyPreviewPrices(cart, pv), cart);
  });
});

describe("On Sale filter", () => {
  const realFetch = globalThis.fetch;
  let url = "";
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = "http://api.test";
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      url = String(input);
      return new Response(JSON.stringify({ data: [], message: "", meta: { page: 1, page_size: 12, total: 0, total_pages: 0 } }), { status: 200 });
    }) as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it("badge=sale sends on_sale=true and no badge param", async () => {
    await getProducts({ badge: "sale" });
    const q = new URL(url, "http://x").searchParams;
    assert.equal(q.get("on_sale"), "true");
    assert.equal(q.has("badge"), false);
  });
  it("other badges still use badge=", async () => {
    await getProducts({ badge: "bestseller" });
    const q = new URL(url, "http://x").searchParams;
    assert.equal(q.get("badge"), "bestseller");
    assert.equal(q.has("on_sale"), false);
  });
});
