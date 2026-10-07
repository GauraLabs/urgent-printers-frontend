// Shared, source-grounded locators for the Quantity Pricing (Storefront) specs.
//
// Every locator here was derived from the real components, not a live DOM snapshot
// (see pipeline/README.md's "The hand-authoring fallback"):
//   components/common/QuantityInput.tsx  — the field carries aria-label="Quantity"; the
//     helper line is a sibling <p role="status"> that is sr-only while empty, and the
//     +/- buttons are aria-label="Increase quantity"/"Decrease quantity".
//   features/products/configurator/ProductConfigurator.tsx — the live price summary is the
//     only element containing "GST and shipping calculated at checkout", which is what the
//     `summary()` helper anchors on. Both the per-piece rate and the Total are <PriceValue>s,
//     i.e. framer-motion AnimatePresence nodes: during a 180 ms transition the OLD value is
//     still mounted alongside the new one, so assert with toContainText / getByText on the
//     new value rather than asserting the old one is gone.
//   features/products/configurator/TierRateGuide.tsx — chips are <button>s whose text is
//     "<count>+ <₹rate>/pc"; the chip covering the current quantity carries aria-current="true".
//   features/products/configurator/TierNudge.tsx — banner is role="status"; its accept button
//     text is exactly "Add N more".
//   components/common/PriceDisplay.tsx — StruckMrp renders an sr-only "Original price "
//     prefix before the struck amount, so its accessible text is "Original price ₹X".
import { expect, type Page, type Locator } from '@playwright/test';

export const PRODUCTS = {
  /** Matte Finish Business Cards: tiers 100@12.60, 250@9.00, 500@6.75, 1000@4.95, 2500@4.05
   *  (MRP on every tier, 10% off). Every option multiplier is 1.0 and the default turnaround
   *  surcharge is 0, so the advertised listing price and the PDP landing price are identical —
   *  which is why this product, not one with option multipliers, carries the happy path.
   *  listing_quantity was set to 250 for this run (min stays automatic at 100, no maximum). */
  cards: {
    slug: 'matte-finish-business-cards',
    category: 'business-cards',
    name: 'Matte Finish Business Cards',
    url: '/products/business-cards/matte-finish-business-cards',
  },
  /** Custom Die-Cut Stickers: tiers 50@6, 100@10, 250@6, 500@4, 1000@2.50, no MRP anywhere.
   *  The 100 tier is deliberately left dearer per piece than the 50 tier — that is the real
   *  dev data, and it is what the non-monotonic-tier and no-nudge cases exercise. */
  stickers: {
    slug: 'custom-diecut-stickers',
    category: 'stickers-labels',
    name: 'Custom Die-Cut Stickers',
    url: '/products/stickers-labels/custom-diecut-stickers',
  },
};

/** The live price summary box — the only element containing the GST note. */
export function summary(page: Page): Locator {
  return page
    .locator('div')
    .filter({ has: page.getByText('GST and shipping calculated at checkout') })
    .last();
}

export const qtyInput = (page: Page): Locator => page.getByLabel('Quantity', { exact: true });
export const incButton = (page: Page): Locator => page.getByRole('button', { name: 'Increase quantity' });
export const decButton = (page: Page): Locator => page.getByRole('button', { name: 'Decrease quantity' });

/** The QuantityInput's own helper/notice line (sr-only when there is nothing to say). */
export const qtyHelper = (page: Page): Locator =>
  page.locator('p[role="status"]').filter({ hasText: /Minimum order is|Maximum order is|Adjusted to/ });

export const tierChips = (page: Page): Locator =>
  page.getByRole('button', { name: /^[\d,]+\+ ₹/ });
export const currentChip = (page: Page): Locator => page.locator('button[aria-current="true"]');

export const nudge = (page: Page): Locator =>
  page.locator('div[role="status"]').filter({ hasText: /and pay ₹/ });

/**
 * The configurator's own full-width CTA. StickyAddToCart renders a SECOND button with the
 * same accessible name (`h-10 px-5`, in the fixed bar), so this must be narrowed by the
 * `w-full h-12` classes the configurator's button carries — `.first()` alone would depend on
 * DOM order between the two.
 */
export const addToCartButton = (page: Page): Locator =>
  page.locator('button.w-full.h-12').filter({ hasText: /Add to Cart|Update Cart|Enter a quantity/ });

/** The fixed-bar CTA rendered by StickyAddToCart, for the steps that assert on it. */
export const stickyAddToCartButton = (page: Page): Locator =>
  page.locator('button.h-10.px-5').filter({ hasText: /Add to Cart|Update Cart|Enter a quantity/ });

/** The PDP range hint under the quantity field ("Min 100 pcs · Max 1,000 pcs"). */
export const rangeHint = (page: Page): Locator => page.getByText(/^Min [\d,]+ /);

/**
 * Type a quantity and wait for the debounced (150 ms) reprice to land.
 * `fill` fires one input event with the whole string, which is exactly what
 * QuantityInput.handleType expects — it strips non-digits and slices to 7 chars itself.
 */
export async function typeQuantity(page: Page, value: string) {
  const input = qtyInput(page);
  await input.click();
  await input.fill(value);
}

/** Wait until the PDP configurator has mounted and settled on a quantity. */
export async function waitForConfigurator(page: Page, expectedQuantity: string) {
  await expect(qtyInput(page)).toHaveValue(expectedQuantity, { timeout: 30_000 });
  await expect(summary(page)).toContainText('Total', { timeout: 15_000 });
}

/** Read the single JSON-LD Product block the PDP emits. */
export async function productJsonLd(page: Page): Promise<Record<string, unknown>> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  for (const raw of blocks) {
    const parsed = JSON.parse(raw) as Record<string, unknown> | Record<string, unknown>[];
    const list = Array.isArray(parsed) ? parsed : [parsed];
    for (const node of list) {
      if (node['@type'] === 'Product') return node;
    }
  }
  throw new Error('no JSON-LD Product block found on the page');
}

/**
 * Scroll a step's target into the viewport BEFORE handing it to capture.step().
 *
 * capture.js measures the locator's bounding box *before* running the step body, and the PDP
 * configurator is taller than the 1280x720 capture viewport — so a target below the fold is
 * recorded with y > 720 and validate.mjs rejects the run ("bounding_box lies entirely outside
 * the viewport"). It also makes the step's screenshot actually show the thing being described,
 * which is what the documentation renderer embeds.
 */
export async function bringIntoView(locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded({ timeout: 5_000 }).catch(() => {});
}
