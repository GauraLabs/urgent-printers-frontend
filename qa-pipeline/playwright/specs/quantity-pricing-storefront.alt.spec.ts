// Hand-authored — see pipeline/README.md's "The hand-authoring fallback".
// Two alternate paths: the feed/shopping-ad preselect landing (the thing that makes an
// advertised price trustworthy), and a maximum-limited, MRP-less product including the
// non-monotonic-tier case the real dev data happens to provide.
import { test, expect } from '../capture.js';
import {
  PRODUCTS, summary, qtyInput, incButton, decButton, currentChip, tierChips, nudge,
  typeQuantity, waitForConfigurator, productJsonLd, bringIntoView,
} from './quantity-pricing-storefront.helpers';

const PLAN = 'qa-pipeline/artifacts/plans/quantity-pricing-storefront-plan.json';

test.use({
  captureOptions: {
    feature: 'Quantity Pricing Storefront Preselect And Limits',
    plan: PLAN,
    axe: 'per-navigation',
    lighthouse: 'off',
  },
});

test.describe('Quantity Pricing (Storefront) — preselect, stepping and limit cases', () => {
  test.describe.configure({ timeout: 300_000 });

  test('feed preselect, JSON-LD parity, stepping and chip selection', async ({ page, capture }) => {
    const P = PRODUCTS.cards;

    // ── alt-01: the feed's own qty param lands on that exact quantity and price ──
    await capture.step('alt-01', 'Open the PDP with the feed preselect ?qty=1000', null, async () => {
      await page.goto(`${P.url}?qty=1000`);
      await waitForConfigurator(page, '1000');
      await expect(summary(page)).toContainText('1,000 pcs');
      await expect(summary(page)).toContainText('₹4.95/pc');
      await expect(summary(page).getByText('₹4,950.00', { exact: true })).toBeVisible();
      await expect(currentChip(page)).toContainText('1,000+');
    });

    // ── alt-02: JSON-LD advertises the LISTING quantity and its price ──
    await capture.step('alt-02', 'Read the JSON-LD Product block', null, async () => {
      const node = await productJsonLd(page);
      // The listing quantity (250), not the preselected 1,000 — the structured data describes
      // what the card advertises, which is what a shopping surface indexes.
      expect(node.name).toBe('Matte Finish Business Cards - 250 pcs');
      const offers = node.offers as Record<string, unknown> | Record<string, unknown>[];
      const offer = Array.isArray(offers) ? offers[0] : offers;
      expect(Number(offer.price)).toBe(2250);
      expect(offer.priceCurrency).toBe('INR');
    });

    // ── alt-03: an out-of-range preselect is clamped, not honoured or rejected ──
    await capture.step('alt-03', 'Open the PDP with an out-of-range preselect ?qty=7', null, async () => {
      await page.goto(`${P.url}?qty=7`);
      // Clamped up to the effective minimum of 100.
      await waitForConfigurator(page, '100');
      await expect(summary(page)).toContainText('₹12.60/pc');
      await expect(summary(page).getByText('₹1,260.00', { exact: true })).toBeVisible();
    });

    // ── alt-04: + / - snap to the step derived from the minimum ──
    await bringIntoView(incButton(page));
    await capture.step('alt-04', 'Step the quantity with the + and - buttons', incButton(page), async () => {
      // stepFor(min=100) is 10.
      await expect(decButton(page)).toBeDisabled();
      await incButton(page).click();
      await expect(qtyInput(page)).toHaveValue('110');
      await incButton(page).click();
      await expect(qtyInput(page)).toHaveValue('120');
      await decButton(page).click();
      await expect(qtyInput(page)).toHaveValue('110');
      // A value off the step snaps to the next multiple rather than adding blindly.
      await typeQuantity(page, '117');
      await qtyInput(page).blur();
      await incButton(page).click();
      await expect(qtyInput(page)).toHaveValue('120');
      // No maximum on this product, so + is never disabled.
      await expect(incButton(page)).toBeEnabled();
    });

    // ── alt-05: a tier chip doubles as a one-tap quantity picker ──
    await bringIntoView(page.getByRole('button', { name: /^2,500\+/ }));
    await capture.step('alt-05', 'Tap the 2,500+ tier chip', page.getByRole('button', { name: /^2,500\+/ }), async (el) => {
      await el.click();
      await expect(qtyInput(page)).toHaveValue('2500');
      await expect(summary(page).getByText('₹10,125.00', { exact: true })).toBeVisible({ timeout: 15_000 });
      await expect(currentChip(page)).toContainText('2,500+');
    });
  });

  test('a maximum-limited, MRP-less product with non-monotonic tier rates', async ({ page, capture }) => {
    const P = PRODUCTS.stickers;

    // ── alt-06: no MRP anywhere means no discount furniture at all ──
    await capture.step('alt-06', 'Read the stickers card, whose tiers carry no MRP', null, async () => {
      await page.goto(`/products/${P.category}`);
      const card = page.locator('article').filter({ hasText: P.name }).first();
      await expect(card).toBeVisible({ timeout: 30_000 });
      await expect(card).toContainText('50 pcs for ₹300.00');
      // Suppressed entirely rather than rendering ₹0.00 / 0% off.
      await expect(card.locator('s')).toHaveCount(0);
      await expect(card.getByText('% off')).toHaveCount(0);
    });

    // ── alt-07: the admin-set maximum reaches the storefront ──
    await capture.step('alt-07', 'Open the stickers PDP and read the range hint', null, async () => {
      await page.goto(P.url);
      await waitForConfigurator(page, '50');
      await expect(page.getByText('Min 50 pcs · Max 1,000 pcs')).toBeVisible();
      await expect(summary(page).getByText('₹300.00', { exact: true })).toBeVisible();
    });

    // ── alt-08: the guide renders a rising rate faithfully ──
    await bringIntoView(tierChips(page).first());
    await capture.step('alt-08', 'Read the non-monotonic tier guide', tierChips(page).first(), async () => {
      // 100 @ ₹10/pc sits ABOVE 50 @ ₹6/pc in the real dev data. The guide shows exactly
      // what is stored; the 1,000 tier is still visible because the maximum is 1,000, not below it.
      await expect(tierChips(page)).toHaveText([
        /^50\+ ₹6\.00\/pc$/,
        /^100\+ ₹10\.00\/pc$/,
        /^250\+ ₹6\.00\/pc$/,
        /^500\+ ₹4\.00\/pc$/,
        /^1,000\+ ₹2\.50\/pc$/,
      ]);
      await expect(currentChip(page)).toContainText('50+');
    });

    // ── alt-09: the nudge's negative case ──
    await bringIntoView(qtyInput(page));
    await capture.step('alt-09', 'Type 99 and confirm no nudge is offered', qtyInput(page), async () => {
      await typeQuantity(page, '99');
      await expect(summary(page).getByText('₹594.00', { exact: true })).toBeVisible({ timeout: 15_000 });
      // The next tier (100 @ ₹10 = ₹1,000) is neither cheaper nor within 5% of ₹594, so
      // nextTierNudge correctly returns null and no banner is rendered.
      await expect(nudge(page)).toHaveCount(0);
    });
  });
});
