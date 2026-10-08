// Hand-authored (pipeline/README.md "The hand-authoring fallback"). The full coupon matrix as a
// customer actually meets it: the cart's coupon field is the only place a coupon can be applied
// or removed (the checkout review renders it read-only), so every message is asserted there.
//
// The coupons are the QA-CHECKOUT-* rows created for this run via the admin API; ONCE and PERUSER
// were deliberately consumed by two earlier orders so their limit messages are reachable.
import { test, expect } from '../capture.js';
import {
  P, cartSummary, couponInput, applyCouponButton, couponError, removeCoupon, removeButton,
  cartLine, row, breakdown, restoreSession, emptyCart, addToCart, dismissCookieBanner, reachReview,
} from './checkout-pricing-coupons.helpers';

const PLAN = 'qa-pipeline/artifacts/plans/checkout-pricing-coupons-plan.json';

test.use({
  captureOptions: {
    feature: 'Checkout Coupon Error Paths',
    plan: PLAN,
    // Deliberately off: this spec stays on /cart and the point is a clean signal on the
    // coupon messages, not a second audit of a page the happy path already audits.
    axe: 'off',
    lighthouse: 'off',
  },
});

/** Type a code, press Apply, and assert the rejection copy the server sent. */
async function expectRejected(page: import('@playwright/test').Page, code: string, message: string) {
  await couponInput(page).fill(code);
  await applyCouponButton(page).click();
  await expect(couponError(page)).toHaveText(message, { timeout: 20_000 });
  await expect(page.getByText(`${code} applied`)).toHaveCount(0);
  await expect(cartSummary(page)).not.toContainText('After coupon');
}

test.describe('Checkout coupons — every rejection and boundary', () => {
  test.describe.configure({ timeout: 600_000 });

  test('each invalid coupon explains itself and changes no total', async ({ page, capture }) => {
    await restoreSession(page);
    await dismissCookieBanner(page);
    await emptyCart(page);
    // ₹1,000.00 exactly — the figure the minimum-order cases are built around.
    await addToCart(page, P.stickers, { quantity: '100', expectTotal: '₹1,000.00' });
    await page.goto('/cart');
    await expect(cartLine(page, P.stickers.name)).toBeVisible({ timeout: 30_000 });
    await expect(row(cartSummary(page), 'Items subtotal')).toContainText('₹1,000.00');

    await capture.step('err-01', 'Apply a coupon code that does not exist', couponInput(page), async () => {
      await expectRejected(page, 'QA-CHECKOUT-NOPE', 'Invalid or inactive coupon code');
    }, { typedText: 'QA-CHECKOUT-NOPE' });

    await capture.step('err-02', 'Apply a deactivated coupon (is_active = false)', couponInput(page), async () => {
      // Deliberately indistinguishable from a non-existent code — a deactivated code must not
      // confirm to a stranger that it was ever real.
      await expectRejected(page, 'QA-CHECKOUT-OFF', 'Invalid or inactive coupon code');
    }, { typedText: 'QA-CHECKOUT-OFF' });

    await capture.step('err-03', 'Apply an expired coupon', couponInput(page), async () => {
      await expectRejected(page, 'QA-CHECKOUT-EXPIRED', 'Coupon has expired');
    }, { typedText: 'QA-CHECKOUT-EXPIRED' });

    await capture.step('err-04', 'Apply a coupon whose valid_from is in the future', couponInput(page), async () => {
      await expectRejected(page, 'QA-CHECKOUT-FUTURE', 'Coupon is not active yet');
    }, { typedText: 'QA-CHECKOUT-FUTURE' });

    await capture.step('err-05', 'Apply a coupon whose ₹3,000 minimum this ₹1,000 cart does not meet', couponInput(page), async () => {
      await expectRejected(page, 'QA-CHECKOUT-MIN3000', 'Minimum order amount is ₹3000.00');
    }, { typedText: 'QA-CHECKOUT-MIN3000' });

    await capture.step('err-06', 'Apply a coupon whose ₹1,000 minimum this cart meets exactly', couponInput(page), async (el) => {
      await el.fill('QA-CHECKOUT-MINEXACT');
      await applyCouponButton(page).click();
      // The server test is `basis < minimum`, so equality qualifies.
      await expect(page.getByText('QA-CHECKOUT-MINEXACT applied')).toBeVisible({ timeout: 20_000 });
      await expect(cartSummary(page)).toContainText('−₹100.00');
      await expect(row(cartSummary(page), 'After coupon')).toContainText('₹900.00');
      // ₹900.00 is under the free-shipping threshold, so ₹99.00 shipping returns.
      await expect(cartSummary(page)).toContainText('₹99.00');
      await expect(cartSummary(page)).toContainText('₹999.00');
    }, { typedText: 'QA-CHECKOUT-MINEXACT' });

    // Grow the cart to a mixed ₹4,450.00 (₹2,250.00 discounted business cards + ₹1,000.00
    // stickers + ₹1,200.00 express flyers) for the cap and discounted-items cases.
    await removeCoupon(page);
    await addToCart(page, P.cards, { quantity: '250', expectTotal: '₹2,250.00' });
    await addToCart(page, P.flyers, { quantity: '250', turnaround: 'Express', expectTotal: '₹1,200.00' });
    await page.goto('/cart');
    await expect(row(cartSummary(page), 'Items subtotal')).toContainText('₹4,450.00', { timeout: 30_000 });

    await capture.step('err-07', 'Apply a 50%-off coupon that is capped at ₹100', couponInput(page), async (el) => {
      await el.fill('QA-CHECKOUT-CAP50');
      await applyCouponButton(page).click();
      await expect(page.getByText('QA-CHECKOUT-CAP50 applied')).toBeVisible({ timeout: 20_000 });
      // 50% of ₹4,450.00 would be ₹2,225.00; the cap holds it at ₹100.00.
      await expect(cartSummary(page)).toContainText('−₹100.00');
      await expect(cartSummary(page)).not.toContainText('−₹2,225.00');
      await expect(row(cartSummary(page), 'After coupon')).toContainText('₹4,350.00');
    }, { typedText: 'QA-CHECKOUT-CAP50' });

    await capture.step('err-08', 'Apply a 20% coupon that excludes items already on sale', couponInput(page), async () => {
      await removeCoupon(page);
      await couponInput(page).fill('QA-CHECKOUT-NODISC');
      await applyCouponButton(page).click();
      await expect(page.getByText('QA-CHECKOUT-NODISC applied')).toBeVisible({ timeout: 20_000 });
      // Basis is the ₹2,200.00 of full-price lines only (stickers + flyers), not ₹4,450.00:
      // 20% = ₹440.00. The business cards are inside an active discount window.
      await expect(cartSummary(page)).toContainText('−₹440.00');
      await expect(row(cartSummary(page), 'After coupon')).toContainText('₹4,010.00');
      // ...and the server's own preview must land on the same discount.
      await reachReview(page, 'cod');
      await expect(row(breakdown(page), 'Coupon discount')).toContainText('−₹440.00');
      await expect(breakdown(page)).toContainText('Inclusive of GST: ₹611.69');
      await expect(breakdown(page)).toContainText('₹4,010.00');
      await page.goto('/cart');
    }, { typedText: 'QA-CHECKOUT-NODISC' });

    await capture.step('err-09', 'Apply a coupon whose single global use was already taken', couponInput(page), async () => {
      await removeCoupon(page);
      await expectRejected(page, 'QA-CHECKOUT-ONCE', 'Coupon usage limit reached');
    }, { typedText: 'QA-CHECKOUT-ONCE' });

    await capture.step('err-10', 'Apply a coupon this customer has already used once', couponInput(page), async () => {
      await expectRejected(page, 'QA-CHECKOUT-PERUSER', 'You have already used this coupon the maximum number of times');
    }, { typedText: 'QA-CHECKOUT-PERUSER' });

    await capture.step('err-11', 'Apply a valid coupon and then remove it again', couponInput(page), async (el) => {
      await el.fill('QA-CHECKOUT-PCT10');
      await applyCouponButton(page).click();
      await expect(page.getByText('QA-CHECKOUT-PCT10 applied')).toBeVisible({ timeout: 20_000 });
      await expect(cartSummary(page)).toContainText('−₹445.00');
      await removeCoupon(page);
      await expect(cartSummary(page)).not.toContainText('After coupon');
      await expect(cartSummary(page)).not.toContainText('−₹445.00');
      await expect(row(cartSummary(page), 'Items subtotal')).toContainText('₹4,450.00');
      await expect(cartSummary(page)).toContainText('Incl. GST: ₹678.81');
      await expect(cartSummary(page)).toContainText('₹4,450.00');
    }, { typedText: 'QA-CHECKOUT-PCT10' });

    // ── err-12: a coupon that stops qualifying once the cart shrinks ──
    // Asserts what the code does TODAY, not what it should do: nothing re-validates an applied
    // coupon when the cart changes (features/cart/store.ts only comments that it does), so the
    // cart keeps showing a discount the server will refuse. Reported as a finding.
    await capture.step('err-12', 'Apply a ₹3,000-minimum coupon, then shrink the cart below that minimum', removeButton(page, P.cards.name), async (el) => {
      await couponInput(page).fill('QA-CHECKOUT-MIN3000');
      await applyCouponButton(page).click();
      await expect(page.getByText('QA-CHECKOUT-MIN3000 applied')).toBeVisible({ timeout: 20_000 });
      await expect(cartSummary(page)).toContainText('−₹445.00');
      await el.click();
      await expect(cartLine(page, P.cards.name)).toHaveCount(0, { timeout: 15_000 });
      await expect(row(cartSummary(page), 'Items subtotal')).toContainText('₹2,200.00', { timeout: 20_000 });
      // The stale ₹445.00 (10% of the OLD ₹4,450.00 subtotal) is still on screen and the cart
      // offers checkout anyway.
      await expect(cartSummary(page)).toContainText('−₹445.00');
      // Wait out CartSyncProvider's 500 ms debounced sync before leaving the page. Without this
      // the removal is still only local, and /checkout's own page load re-runs the login merge,
      // whose union of local+server lines RESURRECTS the removed line (observed on the first run
      // of this spec: the cart read ₹2,200.00 and the review step read ₹4,450.00 with 3 products).
      // Reported as a finding; the assertion below is what proves the sync landed.
      await page.waitForTimeout(2500);
      await page.reload();
      await expect(row(cartSummary(page), 'Items subtotal')).toContainText('₹2,200.00', { timeout: 30_000 });
      // At the review step the server refuses the coupon; the UI degrades to client estimates.
      await reachReview(page, 'cod');
      await expect(page.getByText('Could not confirm pricing')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText('Minimum order amount for this coupon is ₹3000.00')).toBeVisible();
    });
  });
});
