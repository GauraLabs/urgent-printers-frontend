// Hand-authored (pipeline/README.md "The hand-authoring fallback"). The one window in which a
// customer could be charged a price they never saw: between the review-step preview and
// POST /orders. The price is really changed in the admin API mid-flow and restored afterwards.
//
// The admin call goes to the QA backend instance on :8001 (same database and Redis as :8000, so
// the product cache invalidation and revalidation are shared) rather than to :8000, because
// POST /admin/auth/login is rate-limited to 10/hour/IP per process and the admin-panel captures
// share that budget. Credentials are the committed dev defaults from
// urgent-printers-backend/scripts/seed_super_admin.py, overridable by env.
import { request as pwRequest } from '@playwright/test';
import { test, expect } from '../capture.js';
import {
  P, breakdown, row, placeOrderButton, repricingBanner, restoreSession, emptyCart, addToCart,
  dismissCookieBanner, reachReview, bringIntoView,
} from './checkout-pricing-coupons.helpers';

const PLAN = 'qa-pipeline/artifacts/plans/checkout-pricing-coupons-plan.json';

const QA_API = process.env.QA_ADMIN_API ?? 'http://127.0.0.1:8001/api/v1';
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL ?? 'admin@urgentprinters.com';
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD ?? 'SuperAdmin@123';

const STICKER_TIERS = (hundred: number) => [
  { quantity: 50, price_per_unit: 6.0 },
  { quantity: 100, price_per_unit: hundred },
  { quantity: 250, price_per_unit: 6.0, is_best_value: true },
  { quantity: 500, price_per_unit: 4.0 },
  { quantity: 1000, price_per_unit: 2.5 },
];

async function setStickerHundredTierPrice(price: number): Promise<void> {
  const api = await pwRequest.newContext();
  try {
    const login = await api.post(`${QA_API}/admin/auth/login`, { data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
    expect(login.status(), 'admin sign-in for the mid-checkout price edit').toBe(200);
    const token = (await login.json()).data.access_token as string;
    const patch = await api.patch(`${QA_API}/admin/products/16`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { pricing_tiers: STICKER_TIERS(price) },
    });
    expect(patch.status(), `admin price edit to ₹${price}/pc`).toBe(200);
  } finally {
    await api.dispose();
  }
}

test.use({
  captureOptions: {
    feature: 'Checkout Price Change Mid Checkout',
    plan: PLAN,
    axe: 'per-navigation',
    lighthouse: 'off',
  },
});

test.describe('Checkout pricing — a price edited while the customer is on the review step', () => {
  test.describe.configure({ timeout: 600_000 });

  test('the stale total is refused, re-previewed, and only then charged', async ({ page, capture }) => {
    await restoreSession(page);
    await dismissCookieBanner(page);
    await emptyCart(page);
    // 100 die-cut stickers at the ₹10.00 100-tier = ₹1,000.00, free shipping (>= ₹999).
    await addToCart(page, P.stickers, { quantity: '100', expectTotal: '₹1,000.00' });

    try {
      // ── edge-01: a clean, server-confirmed review ──
      await capture.step('edge-01', 'Reach the review step with a server-confirmed preview', null, async () => {
        await reachReview(page, 'cod');
        await expect(row(breakdown(page), 'Items subtotal')).toContainText('₹1,000.00');
        await expect(row(breakdown(page), 'Shipping')).toContainText('Free');
        await expect(breakdown(page)).toContainText('Inclusive of GST: ₹152.54');
        await expect(placeOrderButton(page)).toContainText('Place Order · ₹1,000.00');
        await expect(repricingBanner(page)).toHaveCount(0);
      });

      // ── edge-02: an admin raises the price while the customer sits on review ──
      await capture.step('edge-02', 'An admin raises the 100+ tier from ₹10.00 to ₹11.00 while the customer waits', null, async () => {
        await setStickerHundredTierPrice(11.0);
        // The page is untouched: it still shows the old total, which is the whole point.
        await expect(placeOrderButton(page)).toContainText('Place Order · ₹1,000.00');
      });

      // ── edge-03: the stale expectedTotal must be refused, and create nothing ──
      await capture.step('edge-03', 'Press Place Order with the total the customer was shown', placeOrderButton(page), async (el) => {
        const create = page.waitForResponse((r) => r.url().includes('/api/v1/orders') && r.request().method() === 'POST');
        await el.click();
        const res = await create;
        // 409 price_changed — no order row, no payment session.
        expect(res.status()).toBe(409);
        expect((await res.json()).error).toBe('price_changed');
        await expect(repricingBanner(page)).toBeVisible({ timeout: 30_000 });
        await expect(page.getByText('Prices changed while you were checking out. Nothing has been charged. Please review the new total and confirm again.')).toBeVisible();
        await expect(page).toHaveURL(/\/checkout$/);
      });

      // ── edge-04: the re-previewed total is the new one, and it is what gets charged ──
      await bringIntoView(breakdown(page));
      await capture.step('edge-04', 'Read the re-previewed total and confirm the order at the new price', placeOrderButton(page), async () => {
        await expect(row(breakdown(page), 'Items subtotal')).toContainText('₹1,100.00', { timeout: 30_000 });
        await expect(breakdown(page)).toContainText('Inclusive of GST: ₹167.80');
        await expect(placeOrderButton(page)).toContainText('Place Order · ₹1,100.00');
        await placeOrderButton(page).click();
        await page.waitForURL('**/checkout/confirmation/**', { timeout: 60_000 });
        await expect(page.getByText('₹1,100.00').first()).toBeVisible({ timeout: 30_000 });
        await expect(page.getByText('Pay ₹1,100.00 in cash')).toBeVisible();
      });
    } finally {
      // Always put the catalogue back, even if an assertion above failed.
      await setStickerHundredTierPrice(10.0);
    }
  });
});
