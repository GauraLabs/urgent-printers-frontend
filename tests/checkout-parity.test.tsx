// Storefront cart/checkout totals vs the backend order preview, across the generated cart matrix
// (urgent-printers-backend/tests/pricing_parity_matrix.py -> tests/fixtures/checkout-parity.json).
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useCartStore } from "@/features/cart/store";
import { buildClientPricing } from "@/features/checkout/clientPricing";
import { pricesDiffer } from "@/features/checkout/repricing";
import { makeCartItemId } from "@/features/cart/cartItemId";
import { CouponScopeNote } from "@/features/cart/CouponScopeNote";
import { cartMrpSavings, cartTotalSavings, eligibleSubtotal, isLineEligible } from "@/features/cart/savings";
import { ReviewStep, SHIPPING_COST, SHIPPING_THRESHOLD } from "@/features/checkout/ReviewStep";
import { effectiveBounds, priceForQuantity } from "@/lib/quantity";
import { discountPercent, formatPrice } from "@/lib/utils";
import type { AppliedCoupon, CartItem, OrderPreview } from "@/types";
import { checkoutFixture, mapProducts, paise, pdpConfig, pricingFixture, rateTiers, select, type FxCart } from "./fixtures/parity";

const pricing = pricingFixture();
const products = mapProducts(pricing);
const checkout = checkoutFixture();
const okCarts = checkout.carts.filter((c) => !c.err);

/** Lines the backend treats as discounted although the percent rounds to 0 (the storefront must still count them). */
const hasZeroPercentLine = (cart: FxCart) => cart.lines_e!.some((l) => l.mrp !== null && l.save !== null && discountPercent(l.mrp / 100, l.unit / 100) < 1);

/** Cart lines exactly as the PDP's Add-to-cart creates them (real store addItem). */
function buildCart(cart: FxCart): CartItem[] {
  useCartStore.setState({ items: [] });
  for (const ln of cart.lines) {
    const { product } = products.get(ln.p)!;
    const bounds = effectiveBounds(product);
    const sel = select(product, { size_id: ln.size_id, paper_id: ln.paper_id, finish_id: ln.finish_id, sides: ln.sides, ta: ln.ta });
    const p = priceForQuantity(rateTiers(product), ln.q, sel.optionMultiplier, sel.turnaroundExtra)!;
    const stub = { id: product.id, slug: product.slug, name: product.name, images: [], thumbnailUrl: null, categoryName: "", categorySlug: "" };
    // Two lines with an identical configuration cannot coexist in the storefront cart (same cartItemId);
    // the server can hold them, e.g. when the artwork differs, so repeats get a distinct artwork key.
    const cfg = pdpConfig(product, sel, ln.q, bounds);
    const dup = useCartStore.getState().items.some((i) => i.cartItemId === makeCartItemId(product.id, cfg.sizeId ?? "", cfg.paperId ?? "", cfg.finishId ?? "", cfg.sides ?? "", cfg.turnaroundId));
    useCartStore.getState().addItem(stub, dup ? { ...cfg, artworkFileKey: `second-line-${useCartStore.getState().items.length}` } : cfg, p.pricePerUnit, p.mrpPerUnit);
  }
  return useCartStore.getState().items;
}

const appliedCoupon = (cart: FxCart): AppliedCoupon | null =>
  cart.coupon && cart.validate
    ? { code: cart.coupon, discountType: "flat", discountValue: 0, discountAmount: cart.validate.discount / 100, description: null, message: "", appliesToDiscountedItems: true }
    : null;

beforeEach(() => useCartStore.setState({ items: [], appliedCoupon: null }));

describe("checkout fixture shape", () => {
  it("covers many multi-line carts, every coupon kind and the threshold edge cases", () => {
    expect(checkout.carts.length).toBeGreaterThanOrEqual(200);
    expect(okCarts.some((c) => c.lines.length >= 3)).toBe(true);
    expect(new Set(checkout.carts.map((c) => c.coupon).filter(Boolean)).size).toBe(Object.keys(checkout.coupons).length);
    expect(okCarts.some((c) => c.e!.shipping === 0)).toBe(true);
    expect(okCarts.some((c) => c.e!.shipping === 9900)).toBe(true);
  });
});

describe("storefront cart/checkout totals equal the backend preview", () => {
  it("every line (per-piece, turnaround-inclusive line total, MRP) equals the preview line", () => {
    const bad: string[] = [];
    for (const cart of okCarts) {
      const items = buildCart(cart);
      items.forEach((it, i) => {
        const want = cart.lines_e![i];
        const got = { unit: paise(it.pricePerUnit), total: paise(it.totalPrice), mrp: paise(it.mrpPerUnit) };
        if (got.unit !== want.unit || got.total !== want.total || got.mrp !== want.mrp) bad.push(`${cart.id} line ${i}: ${JSON.stringify(got)} vs ${JSON.stringify(want)}`);
      });
    }
    expect(bad, bad.slice(0, 8).join("\n")).toEqual([]);
  });

  it("clientPricing subtotal and grand total (coupon, free-shipping threshold) equal the preview totals", () => {
    const bad: string[] = [];
    for (const cart of okCarts) {
      const items = buildCart(cart);
      const coupon = appliedCoupon(cart);
      const cp = buildClientPricing(items, coupon);
      if (!cp) { bad.push(`${cart.id}: no client pricing`); continue; }
      const e = cart.e!;
      if (paise(cp.subtotal) !== e.subtotal) bad.push(`${cart.id}: subtotal ${paise(cp.subtotal)} vs ${e.subtotal}`);
      if (paise(cp.total) !== e.total) bad.push(`${cart.id}: total ${paise(cp.total)} vs ${e.total}`);
      if (paise(cp.total) !== e.razorpay) bad.push(`${cart.id}: razorpay paise ${paise(cp.total)} vs ${e.razorpay}`);
    }
    expect(bad, bad.slice(0, 8).join("\n")).toEqual([]);
  });

  it("the coupon discount the storefront shows (coupon validation) equals the discount applied at preview", () => {
    for (const cart of okCarts.filter((c) => c.coupon)) {
      expect(cart.validate!.valid, cart.id).toBe(true);
      expect(cart.validate!.discount, cart.id).toBe(cart.e!.discount);
    }
  });

  it("the eligible subtotal sent with coupon validation equals the backend's eligible (non-discounted) subtotal", () => {
    const bad: string[] = [];
    for (const cart of okCarts) {
      const items = buildCart(cart);
      // The display-only figure is unscoped (the server scopes by line); it must match for scoped carts too.
      const got = paise(eligibleSubtotal(items));
      if (got !== cart.e!.eligible) bad.push(`${cart.id}: ${got} vs ${cart.e!.eligible}`);
    }
    expect(bad, bad.slice(0, 8).join("\n")).toEqual([]);
  });

  it("cart MRP savings and total savings equal the preview's", () => {
    const bad: string[] = [];
    for (const cart of okCarts) {
      const items = buildCart(cart);
      if (paise(cartMrpSavings(items)) !== cart.e!.mrp_savings) bad.push(`${cart.id}: mrp ${paise(cartMrpSavings(items))} vs ${cart.e!.mrp_savings}`);
      const total = cartTotalSavings(items, cart.e!.discount / 100);
      if (paise(total) !== cart.e!.total_savings) bad.push(`${cart.id}: total ${paise(total)} vs ${cart.e!.total_savings}`);
    }
    expect(bad, bad.slice(0, 8).join("\n")).toEqual([]);
  });

  it("repricing finds no difference between the cart and the backend preview", () => {
    const bad: string[] = [];
    for (const cart of okCarts) {
      const items = buildCart(cart);
      const preview = {
        pricing: { subtotal: cart.e!.subtotal / 100, discountAmount: cart.e!.discount / 100, shippingCost: cart.e!.shipping / 100, gstAmount: cart.e!.gst / 100, totalAmount: cart.e!.total / 100, gstRate: 18, mrpSavings: 0, totalSavings: 0 },
        items: items.map((it, i) => ({
          productId: it.product.id, productName: it.product.name, quantity: it.config.quantity, turnaroundLabel: "",
          pricePerUnit: cart.lines_e![i].unit / 100, totalPrice: cart.lines_e![i].total / 100,
        })),
      } as unknown as OrderPreview;
      if (pricesDiffer(items, preview)) bad.push(cart.id);
    }
    expect(bad, bad.slice(0, 8).join("\n")).toEqual([]);
  });

  it("the free-shipping rule uses the same threshold, inclusive, on the post-coupon amount", () => {
    expect(SHIPPING_THRESHOLD).toBe(999);
    expect(SHIPPING_COST).toBe(99);
    const edge = okCarts.filter((c) => c.id.startsWith("edge-unit-"));
    expect(edge.length).toBeGreaterThan(50);
    for (const cart of edge) {
      const taxable = cart.e!.subtotal - cart.e!.discount;
      expect(cart.e!.shipping, cart.id).toBe(taxable >= 99900 ? 0 : 9900);
    }
  });
});

describe("scoped coupons", () => {
  const scoped = () => okCarts.filter((c) => c.id.startsWith("scope-"));
  it("one scoped cart is refused as not applicable", () => {
    expect(checkout.carts.filter((c) => c.id.startsWith("scope-") && c.err === "coupon_not_applicable")).toHaveLength(1);
  });

  it("the matrix has scoped carts where only some lines are eligible", () => {
    expect(scoped().length).toBe(7);
    expect(scoped().some((c) => c.eligible_line_indexes!.length < c.lines.length)).toBe(true);
  });
  it("per-line eligibility from the server's line indexes matches the product ids it reports", () => {
    for (const cart of scoped()) {
      const items = buildCart(cart);
      items.forEach((it, i) => {
        const byLine = isLineEligible(i, it.product.id, { eligibleLineIndexes: cart.eligible_line_indexes });
        expect(byLine, `${cart.id} line ${i}`).toBe(cart.eligible_line_indexes!.includes(i));
        if (byLine) expect(cart.eligible_item_ids, `${cart.id} line ${i}`).toContain(it.product.id);
      });
    }
  });
  it("the scope note counts exactly the eligible lines", () => {
    for (const cart of scoped()) {
      const items = buildCart(cart);
      const { container, unmount } = render(<CouponScopeNote items={items} eligibleItemIds={cart.eligible_item_ids} eligibleLineIndexes={cart.eligible_line_indexes} />);
      const n = cart.eligible_line_indexes!.length;
      expect(container.textContent ?? "", cart.id).toContain(n === items.length ? "" : `Applied to ${n} of ${items.length} items`);
      unmount();
    }
  });
});

describe("carts containing a line whose discount rounds to 0%", () => {
  const affected = () => okCarts.filter((c) => hasZeroPercentLine(c));

  it("the matrix contains such carts, including one with an exclude-discounted-items coupon", () => {
    const carts = affected();
    expect(carts.length).toBeGreaterThan(0);
    expect(carts.length).toBeGreaterThan(0);
    expect(carts.some((c) => c.coupon && checkout.coupons[c.coupon].applies_to_discounted_items === false)).toBe(true);
  });

  // Storefront sends eligibleSubtotal() with coupon validation; the backend excludes lines with an (even 0%) active
  // MRP discount from the exclusive-coupon basis, so e.g. EXCLPCT20 shows a larger discount than the order gets.
  it("eligible subtotal and MRP savings equal the backend's", () => {
    for (const cart of affected()) {
      const items = buildCart(cart);
      expect(paise(eligibleSubtotal(items)), `${cart.id} eligible`).toBe(cart.e!.eligible);
      expect(paise(cartMrpSavings(items)), `${cart.id} mrp savings`).toBe(cart.e!.mrp_savings);
    }
  });

  it("totals, GST and shipping still match because the MRP is display-only", () => {
    for (const cart of affected()) {
      const cp = buildClientPricing(buildCart(cart), appliedCoupon(cart))!;
      expect(paise(cp.total), cart.id).toBe(cart.e!.total);
    }
  });
});

describe("ReviewStep's own fallback maths (shown before the server preview arrives) equals the backend", () => {
  it("shipping, GST and grand total shown with no preview match the preview for every cart", () => {
    const bad: string[] = [];
    for (const cart of okCarts.slice(0, 120)) {
      const items = buildCart(cart);
      const coupon = appliedCoupon(cart);
      useCartStore.setState({ appliedCoupon: coupon });
      const { unmount } = render(
        <ReviewStep
          items={items}
          address={{ label: "Home", fullName: "A", phone: "1", line1: "x", city: "c", state: "s", postalCode: "1", country: "IN" }}
          paymentMethod="cod" preview={null} previewLoading={false} previewError={null}
          onPlaceOrder={async () => {}} onBack={() => {}} isPlacing={false} ordersHalted={false} haltMessage={null} priceNotice={null}
        />
      );
      const e = cart.e!;
      const gstText = `Inclusive of GST: ${formatPrice(e.gst / 100)}`;
      if (!screen.queryByText(gstText)) bad.push(`${cart.id}: GST text "${gstText}" not shown (${screen.queryByText(/Inclusive of GST/)?.textContent})`);
      if (!screen.queryByText(`Place Order · ${formatPrice(e.total / 100)}`)) bad.push(`${cart.id}: total ${formatPrice(e.total / 100)} not on the button`);
      unmount();
    }
    useCartStore.setState({ appliedCoupon: null });
    expect(bad, bad.slice(0, 8).join("\n")).toEqual([]);
  });
});

// Regression carts the backend always emits; a missing id means the fixture lost coverage.
const PINNED = [
  "pin-mrp0-exclude-EXCLPCT20", "pin-mrp0-exclude-EXCLFIXED75", "pin-mrp0-exclude-EXCLMIN300", "pin-mrp0-exclude-only",
  "pin-halfup-coupon-tie307", "pin-halfup-coupon-rand02", "pin-scope-same-product-two-lines",
  "pin-under999-after-coupon", "pin-exactly999-after-coupon",
] as const;

describe("pinned regression carts", () => {
  it.each(PINNED)("%s exists in the fixture", (id) => {
    expect(checkout.carts.some((c) => c.id === id), `${id} disappeared from checkout-parity.json`).toBe(true);
  });

  it("pin-mrp0-exclude-only is refused as invalid_coupon (nothing eligible)", () => {
    const cart = checkout.carts.find((c) => c.id === "pin-mrp0-exclude-only")!;
    expect(cart.err).toBe("invalid_coupon");
  });

  it.each(PINNED.filter((id) => id !== "pin-mrp0-exclude-only"))("%s: lines, eligibility, discount and totals equal the backend", (id) => {
    const cart = checkout.carts.find((c) => c.id === id)!;
    const items = buildCart(cart);
    items.forEach((it, i) => {
      const want = cart.lines_e![i];
      expect({ unit: paise(it.pricePerUnit), total: paise(it.totalPrice), mrp: paise(it.mrpPerUnit) }, `${id} line ${i}`)
        .toEqual({ unit: want.unit, total: want.total, mrp: want.mrp });
    });
    expect(paise(eligibleSubtotal(items)), `${id} eligible`).toBe(cart.e!.eligible);
    expect(cart.validate!.valid).toBe(true);
    expect(cart.validate!.discount, `${id} validate vs preview`).toBe(cart.e!.discount);
    const cp = buildClientPricing(items, appliedCoupon(cart))!;
    expect(paise(cp.subtotal), `${id} subtotal`).toBe(cart.e!.subtotal);
    expect(paise(cp.total), `${id} total`).toBe(cart.e!.total);
    expect(cart.e!.shipping).toBe(cart.e!.subtotal - cart.e!.discount >= 99900 ? 0 : 9900);
  });

  it.each(PINNED.filter((id) => id !== "pin-mrp0-exclude-only" && !id.startsWith("pin-mrp0-exclude-")))(
    "%s: validate and preview report the same eligible lines", (id) => {
      const cart = checkout.carts.find((c) => c.id === id)!;
      expect(cart.validate!.eligible_line_indexes, id).toEqual(cart.eligible_line_indexes);
    }
  );

  // For exclude-discounted coupons both validate and preview leave the 0%-MRP line out of the eligible lines.
  it.each(["pin-mrp0-exclude-EXCLPCT20", "pin-mrp0-exclude-EXCLFIXED75", "pin-mrp0-exclude-EXCLMIN300"])(
    "%s: validate and preview report the same eligible lines", (id) => {
      const cart = checkout.carts.find((c) => c.id === id)!;
      expect(cart.validate!.eligible_line_indexes, id).toEqual(cart.eligible_line_indexes);
    }
  );

  it.each(["pin-mrp0-exclude-EXCLPCT20", "pin-mrp0-exclude-EXCLFIXED75", "pin-mrp0-exclude-EXCLMIN300"])(
    "%s: a line whose MRP is 1 paisa above its price is excluded from the exclude-discounted basis",
    (id) => {
      const cart = checkout.carts.find((c) => c.id === id)!;
      const items = buildCart(cart);
      expect(checkout.coupons[cart.coupon!].applies_to_discounted_items).toBe(false);
      expect(items[0].mrpPerUnit).toBeGreaterThan(items[0].pricePerUnit);
      expect(paise(eligibleSubtotal(items))).toBe(cart.e!.eligible);
      expect(paise(eligibleSubtotal(items))).toBe(paise(items[1].totalPrice));
      expect(paise(cartMrpSavings(items))).toBe(cart.e!.mrp_savings);
    }
  );

  it("pin-scope-same-product-two-lines: the same product is eligible on one line only", () => {
    const cart = checkout.carts.find((c) => c.id === "pin-scope-same-product-two-lines")!;
    const items = buildCart(cart);
    expect(items[0].product.id).toBe(items[1].product.id);
    const scope = { eligibleItemIds: cart.eligible_item_ids, eligibleLineIndexes: cart.eligible_line_indexes };
    expect(isLineEligible(0, items[0].product.id, scope)).toBe(true);
    expect(isLineEligible(1, items[1].product.id, scope)).toBe(false);
    const { container } = render(<CouponScopeNote items={items} {...scope} />);
    expect(container.textContent).toContain("Applied to 1 of 2 items");
  });
});
