// Hand-authored — see pipeline/README.md's "The hand-authoring fallback". Every locator is
// grounded in the component source the plan cites and was confirmed against the live DOM with a
// throwaway probe spec before this file was written.
//
// Every rupee asserted here was first computed by the server itself (POST /orders/preview on the
// same configurations) so the test compares the UI against the backend, not against my own
// arithmetic.
import { test, expect } from '../capture.js';
import {
  P, summary, qtyInput, addToCartButton, optionButton, turnaroundCard, cartLine, cartSummary,
  couponInput, applyCouponButton, breakdown, row, placeOrderButton, repricingBanner,
  signIn, emptyCart, addToCart, dismissCookieBanner, bringIntoView, typeQuantity,
} from './checkout-pricing-coupons.helpers';

const PLAN = 'qa-pipeline/artifacts/plans/checkout-pricing-coupons-plan.json';

test.use({
  captureOptions: {
    feature: 'Checkout Pricing and Coupons Happy Path',
    plan: PLAN,
    axe: 'per-navigation',
    lighthouse: 'on',
  },
});

test.describe('Checkout pricing and coupons — happy path', () => {
  test.describe.configure({ timeout: 600_000 });

  test('price a configuration, build a 3-line cart, coupon it, and pay COD', async ({ page, capture }) => {
    // ── hp-01: sign in (email + password; the phone tab is Firebase-only in dev) ──
    await capture.step('hp-01', 'Sign in with the test customer email and password', page.locator('#email-address'), async () => {
      await signIn(page);
      await dismissCookieBanner(page);
      await expect(page).toHaveURL(/\/account/, { timeout: 30_000 });
    });
    await capture.lighthouseCheckpoint('initial_load');
    await emptyCart(page);

    // ── hp-02: the PDP opens on the listing quantity at the sale rate ──
    await page.goto(P.cards.url);
    await expect(qtyInput(page).first()).toBeVisible({ timeout: 30_000 });
    await dismissCookieBanner(page);
    await bringIntoView(summary(page));
    await capture.step('hp-02', 'Read the live price for the default configuration', summary(page), async (el) => {
      await expect(qtyInput(page).first()).toHaveValue('250');
      await expect(el).toContainText('250 pcs');
      await expect(el).toContainText('₹9.00/pc');
      await expect(el.getByText('₹2,250.00', { exact: true })).toBeVisible();
      // The product's discount window (2026-10-03 → 2026-10-23) is active, so the MRP is struck.
      await expect(el.getByText('Original price ₹10.00')).toBeVisible();
      await expect(el).toContainText('10% off');
      await expect(el).toContainText('You save ₹250.00 on this quantity');
    });

    // ── hp-03: one option multiplier, applied to the per-piece rate ──
    // bringIntoView first: capture.js measures the bounding box BEFORE the action, and
    // validate.mjs rejects a run whose box lies outside the 1280x720 capture viewport.
    await bringIntoView(optionButton(page, '2.5 x 2.5 in (Square)').first());
    await capture.step('hp-03', 'Switch the size to 2.5 x 2.5 in (Square), a x1.1 option', optionButton(page, '2.5 x 2.5 in (Square)'), async (el) => {
      await el.first().click();
      // 9.00 x 1.1 = 9.90 (server: unit 9.9, line 2475.00)
      await expect(summary(page)).toContainText('₹9.90/pc', { timeout: 15_000 });
      await expect(summary(page).getByText('₹2,475.00', { exact: true })).toBeVisible();
      await expect(summary(page).getByText('Original price ₹11.00')).toBeVisible();
    });

    // ── hp-04: every multiplier stacked, with the server's HALF_UP rounding ──
    await capture.step('hp-04', 'Stack 350 GSM Matte, UV Coating and Double Sided on top', optionButton(page, 'UV Coating'), async () => {
      await optionButton(page, '350 GSM Matte').first().click();
      await optionButton(page, 'UV Coating').first().click();
      await optionButton(page, 'Double Sided').first().click();
      // 9.00 x 1.1 x 1.1 x 1.3 x 1.4 = 19.8198 -> HALF_UP 19.82; x 250 = 4,955.00 (server-confirmed)
      await expect(summary(page)).toContainText('₹19.82/pc', { timeout: 15_000 });
      await expect(summary(page).getByText('₹4,955.00', { exact: true })).toBeVisible();
      await expect(summary(page).getByText('Original price ₹22.02')).toBeVisible();
    });

    // ── hp-05: the turnaround surcharge is per line, not per piece ──
    await capture.step('hp-05', 'Return to the default options and pick the Express turnaround (+₹150)', turnaroundCard(page, 'Express'), async (el) => {
      await optionButton(page, '3.5 x 2 in (Standard)').first().click();
      await optionButton(page, '300 GSM Matte').first().click();
      await optionButton(page, 'Matte Lamination').first().click();
      await optionButton(page, 'Single Sided').first().click();
      await expect(summary(page).getByText('₹2,250.00', { exact: true })).toBeVisible({ timeout: 15_000 });
      await el.click();
      // Rate stays ₹9.00/pc; the flat ₹150 is added once: 2,250.00 + 150.00
      await expect(summary(page).getByText('₹2,400.00', { exact: true })).toBeVisible({ timeout: 15_000 });
      await expect(summary(page)).toContainText('₹9.00/pc');
      await turnaroundCard(page, 'Standard').click();
      await expect(summary(page).getByText('₹2,250.00', { exact: true })).toBeVisible({ timeout: 15_000 });
    });

    // ── hp-06: a typed quantity either side of a tier boundary ──
    await bringIntoView(qtyInput(page).first());
    await capture.step('hp-06', 'Type 249 and then 250 to cross a tier boundary', qtyInput(page).first(), async () => {
      await typeQuantity(page, '249');
      // 249 still pays the 100-tier rate: 12.60 x 249 = 3,137.40 (server-confirmed)
      await expect(summary(page)).toContainText('₹12.60/pc', { timeout: 15_000 });
      await expect(summary(page).getByText('₹3,137.40', { exact: true })).toBeVisible();
      await typeQuantity(page, '250');
      await expect(summary(page)).toContainText('₹9.00/pc', { timeout: 15_000 });
      await expect(summary(page).getByText('₹2,250.00', { exact: true })).toBeVisible();
    });

    // ── hp-07: add the configured line ──
    await bringIntoView(addToCartButton(page));
    await capture.step('hp-07', 'Add 250 standard business cards to the cart', addToCartButton(page), async (el) => {
      await expect(el).toContainText('Add to Cart · ₹2,250.00');
      await el.click();
      await expect(addToCartButton(page)).toContainText('Update Cart', { timeout: 30_000 });
    });

    // ── hp-08: two more products, one with its own turnaround surcharge ──
    await capture.step('hp-08', 'Add 100 die-cut stickers and 250 express A5 flyers', null, async () => {
      // stickers: the 100 tier is ₹10.00/pc in the real dev data -> ₹1,000.00
      await addToCart(page, P.stickers, { quantity: '100', expectTotal: '₹1,000.00' });
      // flyers: 250 x ₹4.00 = ₹1,000.00 + ₹200.00 express = ₹1,200.00
      await addToCart(page, P.flyers, { quantity: '250', turnaround: 'Express', expectTotal: '₹1,200.00' });
    });

    // ── hp-09: the cart's own summary ──
    await page.goto('/cart');
    await expect(cartLine(page, P.cards.name)).toBeVisible({ timeout: 30_000 });
    await capture.step('hp-09', 'Read the cart order summary for all three lines', cartSummary(page), async (el) => {
      await expect(page.getByText('3 items')).toBeVisible();
      await expect(row(el, 'Items subtotal')).toContainText('₹4,450.00');
      await expect(el).toContainText('Free — above ₹999');
      await expect(el).toContainText('Incl. GST: ₹678.81');
      await expect(el).toContainText('You save ₹250.00');
    });

    // ── hp-10: a percentage coupon, applied in the cart ──
    // One step, not two, so the run log's step_ids stay 1:1 with the plan; typedText is passed
    // through capture.step's meta so the keystrokes are still recorded.
    await capture.step('hp-10', 'Type and apply the percentage coupon QA-CHECKOUT-PCT10', couponInput(page), async (el) => {
      await el.fill('QA-CHECKOUT-PCT10');
      await applyCouponButton(page).click();
      await expect(page.getByText('QA-CHECKOUT-PCT10 applied')).toBeVisible({ timeout: 20_000 });
      // 10% of the ₹4,450.00 subtotal = ₹445.00
      await expect(cartSummary(page)).toContainText('−₹445.00');
      await expect(row(cartSummary(page), 'After coupon')).toContainText('₹4,005.00');
      await expect(cartSummary(page)).toContainText('Incl. GST: ₹610.93');
      await expect(cartSummary(page)).toContainText('You save ₹695.00');
    }, { typedText: 'QA-CHECKOUT-PCT10' });

    // ── hp-11: address step ──
    await capture.step('hp-11', 'Proceed to checkout and continue with the saved default address', page.getByRole('link', { name: /Proceed to Checkout/ }), async (el) => {
      await el.click();
      await page.waitForURL('**/checkout', { timeout: 30_000 });
      await expect(page.getByText('QA Checkout Home')).toBeVisible({ timeout: 30_000 });
      await page.getByRole('button', { name: /Continue to Payment/ }).click();
      await expect(page.getByText('Payment Method')).toBeVisible({ timeout: 20_000 });
    });

    // ── hp-12: payment step ──
    await capture.step('hp-12', 'Choose Cash on Delivery and continue to the review step', page.getByRole('button', { name: /Cash on Delivery/ }), async (el) => {
      await el.click();
      await page.getByRole('button', { name: /Review Order/ }).click();
      await expect(page.getByText('Review Your Order')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText('Confirming prices…')).toHaveCount(0, { timeout: 30_000 });
    });

    // ── hp-13: the review breakdown must equal the server's own preview ──
    await bringIntoView(breakdown(page));
    await capture.step('hp-13', 'Check every figure in the server-confirmed price breakdown', breakdown(page), async (el) => {
      await expect(row(el, 'Items subtotal')).toContainText('₹4,450.00');
      await expect(row(el, 'Coupon discount')).toContainText('−₹445.00');
      await expect(row(el, 'After coupon')).toContainText('₹4,005.00');
      await expect(row(el, 'Shipping')).toContainText('Free');
      await expect(el).toContainText('Inclusive of GST: ₹610.93');
      await expect(el).toContainText('₹4,005.00');
      await expect(el).toContainText('You save ₹695.00');
      await expect(el).toContainText('Discount on MRP');
      // A clean flow must not claim the prices moved.
      await expect(repricingBanner(page)).toHaveCount(0);
      await expect(page.getByText('Could not confirm pricing')).toHaveCount(0);
      await expect(placeOrderButton(page)).toContainText('Place Order · ₹4,005.00');
    });

    // ── hp-14: place the order ──
    await bringIntoView(placeOrderButton(page));
    await capture.step('hp-14', 'Place the Cash-on-Delivery order', placeOrderButton(page), async (el) => {
      await el.click();
      await page.waitForURL('**/checkout/confirmation/**', { timeout: 60_000 });
    });

    // ── hp-15: confirmation repeats the same figures ──
    await capture.step('hp-15', 'Read the order confirmation totals', page.locator('main').first(), async () => {
      await expect(page.getByText(/UP-\d{4}-[0-9A-F]+/).first()).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText('₹4,450.00').first()).toBeVisible();
      await expect(page.getByText('−₹445.00').first()).toBeVisible();
      await expect(page.getByText('Inclusive of GST: ₹610.93')).toBeVisible();
      // The code appears twice (the coupon row and the savings breakdown) — both are correct.
      await expect(page.getByText(/QA-CHECKOUT-PCT10/).first()).toBeVisible();
      await expect(page.getByText('You save ₹695.00')).toBeVisible();
      await expect(page.getByText('Pay ₹4,005.00 in cash')).toBeVisible();
      // Items, quantities and options survive the order snapshot.
      await expect(page.getByText('250 pcs · Standard')).toBeVisible();
      await expect(page.getByText('100 pcs · Standard')).toBeVisible();
      await expect(page.getByText('250 pcs · Express')).toBeVisible();
    });

    // ── hp-16: the same order, read back from account history ──
    const orderId = new URL(page.url()).pathname.split('/').pop() as string;
    await capture.step('hp-16', 'Open the same order from account order history', null, async () => {
      await page.goto('/account/orders');
      await expect(page.getByText(/UP-\d{4}-[0-9A-F]+/).first()).toBeVisible({ timeout: 30_000 });
      await page.goto(`/account/orders/${orderId}`);
      await expect(page.getByText('₹4,450.00').first()).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText('−₹445.00').first()).toBeVisible();
      await expect(page.getByText('Inclusive of GST: ₹610.93')).toBeVisible();
      await expect(page.getByText('You save ₹695.00')).toBeVisible();
      // Line-by-line: the three line totals and their quantities survived the order snapshot.
      await expect(page.getByText('₹2,250.00').first()).toBeVisible();
      await expect(page.getByText('₹1,000.00').first()).toBeVisible();
      await expect(page.getByText('₹1,200.00').first()).toBeVisible();
      await expect(page.getByText('250 pcs').first()).toBeVisible();
      await expect(page.getByText('100 pcs').first()).toBeVisible();
      await expect(page.getByText('₹4,005.00').first()).toBeVisible();
    });

    await capture.lighthouseCheckpoint('final_state');
  });
});
