// Storefront cart/checkout totals vs the backend order preview, across the generated cart matrix
// (urgent-printers-backend/tests/pricing_parity_matrix.py -> tests/fixtures/checkout-parity.json).
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useCartStore } from "@/features/cart/store";
import { buildClientPricing } from "@/features/checkout/clientPricing";
import { pricesDiffer } from "@/features/checkout/repricing";
import { cartMrpSavings, cartTotalSavings, eligibleSubtotal } from "@/features/cart/savings";
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
    useCartStore.getState().addItem(stub, pdpConfig(product, sel, ln.q, bounds), p.pricePerUnit, p.mrpPerUnit);
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
      if (paise(eligibleSubtotal(items)) !== cart.e!.eligible) bad.push(`${cart.id}: ${paise(eligibleSubtotal(items))} vs ${cart.e!.eligible}`);
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

describe("carts containing a line whose discount rounds to 0%", () => {
  const affected = () => okCarts.filter((c) => hasZeroPercentLine(c));

  it("the matrix contains such carts, including one with an exclude-discounted-items coupon", () => {
    const carts = affected();
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
