// Hand-authored — see pipeline/README.md's "The hand-authoring fallback" for why the
// MCP-driven Generator agent isn't in use here (the single `playwright-test` MCP server is
// pinned to the admin panel's cwd, so it cannot drive the storefront without a reconnect).
// Every locator is grounded in the component source the plan cites.
import { test, expect } from '../capture.js';
import {
  PRODUCTS, summary, qtyInput, currentChip, tierChips, nudge, addToCartButton,
  rangeHint, typeQuantity, waitForConfigurator, bringIntoView,
} from './quantity-pricing-storefront.helpers';

const PLAN = 'qa-pipeline/artifacts/plans/quantity-pricing-storefront-plan.json';

test.use({
  captureOptions: {
    feature: 'Quantity Pricing Storefront Happy Path',
    plan: PLAN,
    axe: 'per-navigation',
    lighthouse: 'off',
  },
});

test.describe('Quantity Pricing (Storefront) — happy path', () => {
  test.describe.configure({ timeout: 300_000 });

  test('advertised quantity, live repricing, nudge and cart edit', async ({ page, capture }) => {
    const P = PRODUCTS.cards;

    // ── hp-01: the card prices a concrete quantity, not a vague "from" rate ──
    await capture.step('hp-01', 'Open the Business Cards listing and read the quantity-priced card', null, async () => {
      await page.goto(`/products/${P.category}`);
      const card = page.locator('article').filter({ hasText: P.name }).first();
      await expect(card).toBeVisible({ timeout: 30_000 });
      // listingQuantity 250 x the 250-tier rate ₹9.00 = ₹2,250.00, with the listing MRP struck.
      await expect(card).toContainText('250 pcs for ₹2,250.00');
      await expect(card.getByText('Original price ₹2,500.00')).toBeVisible();
      await expect(card.getByText('10% off')).toBeVisible();
      // The pre-feature per-unit wording must be gone from the card entirely.
      await expect(card).not.toContainText('per unit');
      await expect(card).not.toContainText('From ₹');
    });

    // ── hp-02: the PDP opens on the advertised quantity, not the minimum ──
    await capture.step('hp-02', 'Open the product detail page', page.getByRole('link', { name: P.name }).first(), async (el) => {
      await el.click();
      await page.waitForURL(`**${P.url}`, { timeout: 30_000 });
      await waitForConfigurator(page, '250');
      // 250 is listing_quantity; the effective minimum is 100. Landing on 250 is the point.
      await expect(qtyInput(page)).toHaveValue('250');
    });

    // ── hp-03: range hint omits the max clause when there is no maximum ──
    await bringIntoView(rangeHint(page));
    await capture.step('hp-03', 'Read the min/max range hint under the quantity field', rangeHint(page), async (el) => {
      await expect(el).toHaveText('Min 100 pcs');
      // max_order_quantity is null, so the internal 1,000,000 ceiling must never surface.
      await expect(el).not.toContainText('Max');
      await expect(el).not.toContainText('1,000,000');
    });

    // ── hp-04: the live price summary equals the card's advertised price ──
    await bringIntoView(summary(page));
    await capture.step('hp-04', 'Read the live price summary at the advertised quantity', summary(page), async (el) => {
      await expect(el).toContainText('250 pcs');
      await expect(el).toContainText('₹9.00/pc');
      await expect(el.getByText('₹2,250.00', { exact: true })).toBeVisible();
      await expect(el.getByText('Original price ₹10.00')).toBeVisible();
      await expect(el.getByText('10% off')).toBeVisible();
      await expect(el).toContainText('You save ₹250.00 on this quantity');
    });

    // ── hp-05: tier guide chips, with the covering tier highlighted ──
    await bringIntoView(tierChips(page).first());
    await capture.step('hp-05', 'Read the tier-rate guide and its highlighted chip', tierChips(page).first(), async () => {
      await expect(tierChips(page)).toHaveText([
        /^100\+ ₹12\.60\/pc$/,
        /^250\+ ₹9\.00\/pc$/,
        /^500\+ ₹6\.75\/pc$/,
        /^1,000\+ ₹4\.95\/pc$/,
        /^2,500\+ ₹4\.05\/pc$/,
      ]);
      await expect(currentChip(page)).toHaveCount(1);
      await expect(currentChip(page)).toContainText('250+');
    });

    // ── hp-06: typing reprices live, with no error state ──
    await bringIntoView(qtyInput(page));
    await capture.step('hp-06', 'Type 499 and watch the price follow the tier live', qtyInput(page), async () => {
      await typeQuantity(page, '499');
      // Still the 250 tier: ₹9.00 x 499 = ₹4,491.00.
      await expect(summary(page).getByText('₹4,491.00', { exact: true })).toBeVisible({ timeout: 15_000 });
      await expect(summary(page)).toContainText('499 pcs');
      await expect(summary(page)).toContainText('₹9.00/pc');
      await expect(currentChip(page)).toContainText('250+');
    });

    // ── hp-07: the price-jump nudge offers the cheaper next tier ──
    await bringIntoView(nudge(page));
    await capture.step('hp-07', 'Read the price-jump nudge', nudge(page), async (el) => {
      await expect(el).toBeVisible({ timeout: 15_000 });
      // 499 @ ₹9.00 = ₹4,491.00 vs 500 @ ₹6.75 = ₹3,375.00 → a ₹1,116.00 saving for one more piece.
      await expect(el).toContainText('Add 1 more pc and pay ₹6.75/pc: ₹3,375.00 total (you save ₹1,116.00)');
    });

    // ── hp-08: accepting the nudge moves the quantity and the price ──
    await bringIntoView(page.getByRole('button', { name: 'Add 1 more', exact: true }));
    await capture.step('hp-08', 'Accept the nudge with its one-tap button', page.getByRole('button', { name: 'Add 1 more', exact: true }), async (el) => {
      await el.click();
      await expect(qtyInput(page)).toHaveValue('500');
      await expect(summary(page).getByText('₹3,375.00', { exact: true })).toBeVisible({ timeout: 15_000 });
      await expect(summary(page)).toContainText('₹6.75/pc');
      await expect(currentChip(page)).toContainText('500+');
      // The banner's whole purpose is served once the tier is reached.
      await expect(nudge(page)).toHaveCount(0);
    });

    // ── hp-09: add the freely-chosen quantity to the cart ──
    await bringIntoView(addToCartButton(page));
    await capture.step('hp-09', 'Add the configured 500 pieces to the cart', addToCartButton(page), async (el) => {
      await expect(el).toContainText('Add to Cart · ₹3,375.00');
      await el.click();
      await expect(addToCartButton(page)).toContainText('Update Cart', { timeout: 30_000 });
    });

    // ── hp-10: the cart line carries the quantity and its price ──
    await capture.step('hp-10', 'Open the cart page and read the line', null, async () => {
      await page.goto('/cart');
      const line = page.locator('li, article, div').filter({ hasText: P.name }).last();
      await expect(line).toBeVisible({ timeout: 30_000 });
      await expect(qtyInput(page).first()).toHaveValue('500', { timeout: 30_000 });
      await expect(page.getByText('₹3,375.00').first()).toBeVisible();
    });

    // ── hp-12: the cart DRAWER edits and reprices the same way the page does ──
    // Added because the drawer is a second, independent QuantityInput consumer
    // (features/cart/CartDrawerItem.tsx) and the brief calls out both surfaces.
    await capture.step('hp-12', 'Open the cart drawer from the header and edit the quantity there', page.getByRole('button', { name: /^Cart, \d+ item/ }), async (el) => {
      // Open the drawer from the category listing, not the PDP or /cart: those pages carry
      // their own Quantity inputs, so the drawer's would not be unambiguously `.first()`.
      await page.goto(`/products/${PRODUCTS.cards.category}`);
      await expect(page.locator('article').first()).toBeVisible({ timeout: 30_000 });
      await el.click();
      await expect(page.getByText('Your Cart')).toBeVisible({ timeout: 15_000 });
      const drawerQty = page.getByLabel('Quantity', { exact: true }).first();
      await expect(drawerQty).toHaveValue('500');
      await drawerQty.click();
      await drawerQty.fill('1000');
      await drawerQty.blur();
      // 1,000 crosses into the ₹4.95 tier: 4.95 x 1,000 = ₹4,950.00.
      await expect(page.getByText('₹4,950.00').first()).toBeVisible({ timeout: 20_000 });
      // The drawer honours the same bounds: below the minimum snaps rather than erroring.
      await drawerQty.fill('5');
      await drawerQty.blur();
      await expect(drawerQty).toHaveValue('100');
    });

    // ── hp-11: editing the cart quantity reprices immediately ──
    await capture.step('hp-11', 'Change the cart line from 500 to 250 and blur', qtyInput(page).first(), async (el) => {
      await el.click();
      await el.fill('250');
      await el.blur();
      await expect(el).toHaveValue('250');
      // The 250 tier rate ₹9.00 x 250 = ₹2,250.00 — same tier lookup as the PDP.
      await expect(page.getByText('₹2,250.00').first()).toBeVisible({ timeout: 15_000 });
    });
  });
});
