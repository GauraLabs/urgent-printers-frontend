// Hand-authored (pipeline/README.md "The hand-authoring fallback"). Cart editing, line removal,
// the ₹999 free-shipping boundary from both sides and exactly on it, and the handoff amount to
// Razorpay. Every expected figure was produced by the server's own POST /orders/preview first.
import { test, expect } from '../capture.js';
import {
  P, cartLine, cartSummary, qtyInput, couponInput, applyCouponButton, removeCoupon,
  removeButton, breakdown, row, placeOrderButton, restoreSession, emptyCart, addToCart,
  dismissCookieBanner, reachReview, bringIntoView,
} from './checkout-pricing-coupons.helpers';

const PLAN = 'qa-pipeline/artifacts/plans/checkout-pricing-coupons-plan.json';

test.use({
  captureOptions: {
    feature: 'Checkout Pricing Cart Edits and Shipping Thresholds',
    plan: PLAN,
    // The cart edits change state repeatedly without navigating, so per-navigation axe would
    // only ever audit /cart once and miss the edited states.
    axe: 'per-step',
    lighthouse: 'off',
  },
});

test.describe('Checkout pricing — cart edits, shipping thresholds, gateway amount', () => {
  test.describe.configure({ timeout: 600_000 });

  test('edit quantities, remove a line, cross the free-shipping threshold, hand off to Razorpay', async ({ page, capture }) => {
    await restoreSession(page);
    await dismissCookieBanner(page);
    await emptyCart(page);
    await addToCart(page, P.cards, { quantity: '250', expectTotal: '₹2,250.00' });
    await addToCart(page, P.stickers, { quantity: '100', expectTotal: '₹1,000.00' });
    await addToCart(page, P.flyers, { quantity: '250', turnaround: 'Express', expectTotal: '₹1,200.00' });
    await page.goto('/cart');
    await expect(cartLine(page, P.stickers.name)).toBeVisible({ timeout: 30_000 });

    const stickerLine = cartLine(page, P.stickers.name);
    const stickerQty = stickerLine.getByLabel('Quantity', { exact: true });

    // ── alt-01: + steps by 5 because the product minimum (50) is under 100 ──
    await bringIntoView(stickerLine);
    await capture.step('alt-01', 'Step the stickers quantity up with the + button', stickerLine.getByRole('button', { name: 'Increase quantity' }), async (el) => {
      await el.click();
      await expect(stickerQty).toHaveValue('105');
      // Still the 100 tier at ₹10.00/pc: 105 x 10.00 = ₹1,050.00
      await expect(stickerLine).toContainText('₹1,050.00', { timeout: 15_000 });
      // ...and back down again, so both stepper directions are exercised on a real line.
      await stickerLine.getByRole('button', { name: 'Decrease quantity' }).click();
      await expect(stickerQty).toHaveValue('100');
      await expect(stickerLine).toContainText('₹1,000.00', { timeout: 15_000 });
    });

    // ── alt-02: a typed quantity crossing a tier boundary ──
    await capture.step('alt-02', 'Type 250 into the cart line to cross into the cheaper tier', stickerQty, async (el) => {
      await el.click();
      await el.fill('250');
      await el.blur();
      // 250 tier is ₹6.00/pc: ₹1,500.00
      await expect(stickerLine).toContainText('₹6.00/pc', { timeout: 15_000 });
      await expect(stickerLine).toContainText('₹1,500.00');
    });

    // ── alt-03: above the product maximum clamps, never errors ──
    await capture.step('alt-03', 'Type 1500 where this product allows at most 1,000', stickerQty, async (el) => {
      await el.click();
      await el.fill('1500');
      await el.blur();
      await expect(stickerQty).toHaveValue('1000');
      // 1,000 tier is ₹2.50/pc: ₹2,500.00
      await expect(stickerLine).toContainText('₹2.50/pc', { timeout: 15_000 });
      await expect(stickerLine).toContainText('₹2,500.00');
      await expect(page.locator('p.text-destructive')).toHaveCount(0);
    });

    // ── alt-04: the drawer is a second, independent QuantityInput consumer ──
    await capture.step('alt-04', 'Edit the same line from the cart drawer instead of the cart page', page.getByRole('button', { name: /^Cart, \d+ item/ }), async (el) => {
      await page.goto(`/products/${P.cards.category}`);
      await expect(page.locator('article').first()).toBeVisible({ timeout: 30_000 });
      await el.click();
      await expect(page.getByText('Your Cart')).toBeVisible({ timeout: 15_000 });
      const drawerStickers = page.locator('div').filter({ hasText: P.stickers.name }).last();
      const drawerQty = drawerStickers.getByLabel('Quantity', { exact: true }).first();
      await expect(drawerQty).toHaveValue('1000');
      await drawerQty.click();
      await drawerQty.fill('100');
      await drawerQty.blur();
      await expect(page.getByText('₹1,000.00').first()).toBeVisible({ timeout: 20_000 });
      await page.keyboard.press('Escape');
    });

    // ── alt-05: removing a line recomputes everything ──
    await page.goto('/cart');
    await expect(cartLine(page, P.flyers.name)).toBeVisible({ timeout: 30_000 });
    await capture.step('alt-05', 'Remove the A5 Flyers line', removeButton(page, P.flyers.name), async (el) => {
      await el.click();
      await expect(cartLine(page, P.flyers.name)).toHaveCount(0, { timeout: 15_000 });
      await expect(page.getByText('2 items')).toBeVisible();
      // 2,250.00 + 1,000.00
      await expect(row(cartSummary(page), 'Items subtotal')).toContainText('₹3,250.00');
      await expect(cartSummary(page)).toContainText('Incl. GST: ₹495.76');
    });

    // ── alt-06: just below the free-shipping threshold ──
    await capture.step('alt-06', 'Reduce the cart to a single ₹594.00 line, just under the ₹999 threshold', removeButton(page, P.cards.name), async (el) => {
      await el.click();
      await expect(cartLine(page, P.cards.name)).toHaveCount(0, { timeout: 15_000 });
      const qty = cartLine(page, P.stickers.name).getByLabel('Quantity', { exact: true });
      await qty.click();
      await qty.fill('99');
      await qty.blur();
      // 99 pays the 50-tier rate ₹6.00: ₹594.00; shipping ₹99.00; total ₹693.00; GST ₹90.61
      await expect(row(cartSummary(page), 'Items subtotal')).toContainText('₹594.00', { timeout: 20_000 });
      await expect(cartSummary(page)).toContainText('Add ₹405.00 for free');
      await expect(cartSummary(page)).toContainText('₹99.00');
      await expect(cartSummary(page)).toContainText('Incl. GST: ₹90.61');
      await expect(cartSummary(page)).toContainText('₹693.00');
    });

    // ── alt-07: above the threshold ──
    await capture.step('alt-07', 'Raise the line to 100 pcs (₹1,000.00), above the threshold', cartLine(page, P.stickers.name).getByLabel('Quantity', { exact: true }), async (el) => {
      await el.click();
      await el.fill('100');
      await el.blur();
      await expect(row(cartSummary(page), 'Items subtotal')).toContainText('₹1,000.00', { timeout: 20_000 });
      await expect(cartSummary(page)).toContainText('Free — above ₹999');
      await expect(cartSummary(page)).toContainText('Incl. GST: ₹152.54');
    });

    // ── alt-08: exactly on the threshold after a coupon ──
    await capture.step('alt-08', 'Apply a ₹1 coupon so the post-coupon total is exactly ₹999.00', couponInput(page), async (el) => {
      await el.fill('QA-CHECKOUT-SHIPEDGE');
      await applyCouponButton(page).click();
      await expect(page.getByText('QA-CHECKOUT-SHIPEDGE applied')).toBeVisible({ timeout: 20_000 });
      await expect(row(cartSummary(page), 'After coupon')).toContainText('₹999.00');
      // The rule is `taxable >= 999`, so exactly ₹999.00 still ships free.
      await expect(cartSummary(page)).toContainText('Free — above ₹999');
      await expect(cartSummary(page)).toContainText('Incl. GST: ₹152.39');
    }, { typedText: 'QA-CHECKOUT-SHIPEDGE' });

    // ── alt-09: a coupon that drops the cart under the threshold ──
    await capture.step('alt-09', 'Swap in a ₹200 coupon so the order falls below the threshold again', couponInput(page), async () => {
      await removeCoupon(page);
      await couponInput(page).fill('QA-CHECKOUT-FLAT200');
      await applyCouponButton(page).click();
      await expect(page.getByText('QA-CHECKOUT-FLAT200 applied')).toBeVisible({ timeout: 20_000 });
      await expect(row(cartSummary(page), 'After coupon')).toContainText('₹800.00');
      await expect(cartSummary(page)).toContainText('Add ₹199.00 for free');
      await expect(cartSummary(page)).toContainText('₹899.00');
      await expect(cartSummary(page)).toContainText('Incl. GST: ₹122.03');
    }, { typedText: 'QA-CHECKOUT-FLAT200' });

    // ── alt-10: the server preview agrees with the cart ──
    await capture.step('alt-10', 'Carry the below-threshold coupon through to the checkout review', null, async () => {
      await reachReview(page, 'online');
      const b = breakdown(page);
      await expect(row(b, 'Items subtotal')).toContainText('₹1,000.00');
      await expect(row(b, 'Coupon discount')).toContainText('−₹200.00');
      await expect(row(b, 'After coupon')).toContainText('₹800.00');
      await expect(row(b, 'Shipping')).toContainText('₹99.00');
      await expect(b).toContainText('Inclusive of GST: ₹122.03');
      await expect(b).toContainText('₹899.00');
    });

    // ── alt-11: the gateway is handed exactly the server's total, in paise ──
    // The Razorpay modal itself is a third-party iframe that cannot be driven here, so the SDK
    // constructor is replaced with a recorder: the ORDER is still created for real (Razorpay
    // test mode returns a real order_... id), only the modal is stubbed.
    await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      w.__rzpOptions = [];
      // Non-writable so a late-loading checkout.razorpay.com script cannot clobber the recorder.
      Object.defineProperty(window, 'Razorpay', {
        configurable: true,
        writable: false,
        value: function (opts: unknown) {
          (w.__rzpOptions as unknown[]).push(opts);
          return { open: () => {}, on: () => {} };
        },
      });
    });
    await bringIntoView(placeOrderButton(page));
    await capture.step('alt-11', 'Press Pay and check the amount handed to Razorpay', placeOrderButton(page), async (el) => {
      await expect(el).toContainText('Pay ₹899.00 securely');
      const created = page.waitForResponse((r) => r.url().includes('/api/v1/orders') && r.request().method() === 'POST');
      await el.click();
      const res = await created;
      expect(res.status()).toBe(201);
      const body = await res.json();
      const payment = body.data.payment;
      expect(payment.amount).toBe(899);
      expect(String(payment.razorpayOrderId)).toMatch(/^order_/);
      const opts = await page.evaluate(() => (window as unknown as { __rzpOptions: { amount: number; currency: string; order_id: string }[] }).__rzpOptions);
      expect(opts).toHaveLength(1);
      // rupees → paise, the figure Razorpay actually charges
      expect(opts[0].amount).toBe(89900);
      expect(opts[0].currency).toBe('INR');
      expect(opts[0].order_id).toBe(payment.razorpayOrderId);
    });
  });
});
