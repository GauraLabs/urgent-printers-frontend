// Hand-authored (Module 2 fallback) — see pipeline/README.md's "The hand-authoring fallback"
// and findings #4-#8 for why the MCP-driven Generator agent isn't in use here (and note
// `.mcp.json`'s single server is pinned to the admin panel, so it could not drive this app
// without a reconnect). Locators are grounded in the component source the plan cites:
//   features/products/configurator/PricingTable.tsx  — pack row text is
//     "{quantity} {unitLabel} · {formatPrice(totalPrice)}" with a "₹X.XX/pc" secondary.
//   features/products/configurator/ProductConfigurator.tsx — "Price per pack of 50 pcs",
//     "Total for 1 pack (50 pcs)", and "Add to Cart · ₹300.00".
//   features/cart/CartDrawerItem.tsx — aria-label "Increase quantity"/"Decrease quantity".
//   components/common/ProductPrice.tsx — card caption becomes "per 50 pcs".
//
// Test data: Custom Die-Cut Stickers (id 16) is pack_size 50 / unit_label 'pcs', set through
// the admin panel by pack-selling.admin.spec.ts. Its 50-pcs tier is ₹6.00/unit, so one pack
// is ₹300.00 — the same figure the shopping feed advertises as g:price.
import { test, expect } from '../capture.js';

const PLAN = 'qa-pipeline/artifacts/plans/pack-selling-storefront-plan.json';

test.use({
  captureOptions: {
    feature: 'Pack Selling Storefront',
    plan: PLAN,
    axe: 'per-navigation',
    lighthouse: 'off', // this run is about pricing correctness; audits add ~40s per checkpoint
  },
});

const PACK_PDP = '/products/stickers-labels/custom-diecut-stickers';
// Exactly the query the backend's listing_offer emits, i.e. what the feed's g:link carries.
const FEED_QUERY = 'qty=50&size=2-x-2-in-square&paper=vinyl-matte&finish=diecut&sides=single-sided&turnaround=standard';

/** The price the backend says this configuration costs — the single source of truth. */
async function listingOfferPrice(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(async () => {
    const res = await fetch('http://localhost:8000/api/v1/products/custom-diecut-stickers');
    return (await res.json()).data.listing_offer.price as number;
  });
}

test.describe('Pack/Set Selling (Storefront)', () => {
  test.describe.configure({ timeout: 300_000 });

  test('Pack pricing from card to cart, plus the feed landing URL and JSON-LD', async ({ page, capture }) => {
    // ── hp-01: the category card prices the pack, not the piece ──
    await capture.step('hp-01', 'Open the Stickers & Labels category and read the pack card price', null, async () => {
      await page.goto('/products/stickers-labels');
      const card = page.locator('article', { hasText: 'Custom Die-Cut Stickers' }).first();
      await expect(card).toBeVisible({ timeout: 30_000 });
      // price_from (₹6.00, the best-value tier) x pack_size 50 = ₹300.00.
      await expect(card).toContainText('₹300.00');
      await expect(card).toContainText('per 50 pcs');
      // The per-unit caption a non-pack card would show must be replaced, not appended.
      await expect(card).not.toContainText('per unit');
    });

    // ── hp-02: PDP tier rows read "50 pcs · ₹300.00" with a ₹/pc secondary ──
    await capture.step('hp-02', 'Open the product and read the pack pricing rows', null, async () => {
      await page.goto(PACK_PDP);
      await expect(page.getByRole('heading', { name: 'Custom Die-Cut Stickers', level: 1 })).toBeVisible({ timeout: 30_000 });
      const onePack = page.getByRole('button').filter({ hasText: '50 pcs · ₹300.00' }).first();
      await expect(onePack).toBeVisible();
      await expect(onePack).toContainText('₹6.00/pc');
      // The 250-pcs tier is 5 packs at the same ₹6.00/unit -> ₹1,500.00 total.
      const fivePacks = page.getByRole('button').filter({ hasText: '250 pcs · ₹1,500.00' }).first();
      await expect(fivePacks).toContainText('₹6.00/pc');
      await expect(fivePacks).toContainText('5 packs');
      await expect(page.getByText('Price per pack of 50 pcs')).toBeVisible();
    });

    // ── hp-03: selecting a tier expresses the choice in packs ──
    const fivePackRow = page.getByRole('button').filter({ hasText: '250 pcs · ₹1,500.00' }).first();
    await fivePackRow.scrollIntoViewIfNeeded();
    await capture.step('hp-03', 'Select the 5-pack (250 pcs) tier', fivePackRow, async (el) => {
      await el.click();
      await expect(page.getByText('Total for 5 packs (250 pcs)')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole('button', { name: /Add to Cart · ₹1,500\.00/ })).toBeVisible();
    });

    // ── hp-04: the cart drawer line is expressed in packs ──
    const addToCart = page.getByRole('button', { name: /Add to Cart · ₹1,500\.00/ }).first();
    await addToCart.scrollIntoViewIfNeeded();
    await capture.step('hp-04', 'Add five packs to the cart', addToCart, async (el) => {
      await el.click();
      await expect(page.getByText('5 packs (250 pcs)').first()).toBeVisible({ timeout: 30_000 });
    });

    // ── hp-05: the stepper moves in whole packs ──
    const increase = page.getByRole('button', { name: 'Increase quantity' }).first();
    await capture.step('hp-05', 'Step the quantity up and back down by one whole pack', increase, async (el) => {
      await el.click();
      // +1 pack = +50 pcs, never the legacy +25/+50-by-threshold step.
      await expect(page.getByText('6 packs (300 pcs)').first()).toBeVisible({ timeout: 15_000 });
      await page.getByRole('button', { name: 'Decrease quantity' }).first().click();
      await expect(page.getByText('5 packs (250 pcs)').first()).toBeVisible({ timeout: 15_000 });
    });

    // ── hp-06: the full cart page agrees ──
    await capture.step('hp-06', 'Open the cart page and confirm the pack quantity and stepper', null, async () => {
      await page.goto('/cart');
      await expect(page.getByText('5 packs (250 pcs)').first()).toBeVisible({ timeout: 30_000 });
      await page.getByRole('button', { name: 'Increase quantity' }).first().click();
      await expect(page.getByText('6 packs (300 pcs)').first()).toBeVisible({ timeout: 15_000 });
    });

    // ── alt-01: the feed's own landing URL preselects the exact configuration ──
    await capture.step('alt-01', 'Land on the PDP using the shopping feed query string', null, async () => {
      await page.goto(`${PACK_PDP}?${FEED_QUERY}`);
      const onePack = page.getByRole('button').filter({ hasText: '50 pcs · ₹300.00' }).first();
      await expect(onePack).toBeVisible({ timeout: 30_000 });
      // The one-pack tier is the selected row on arrival, and the headline total matches.
      await expect(page.getByText('Total for 1 pack (50 pcs)')).toBeVisible();
      const feedPrice = await listingOfferPrice(page);
      expect(feedPrice).toBe(300);
      // makeCartItemId deliberately excludes quantity, so this configuration shares its
      // identity with the line added in hp-04 and the CTA relabels to "Update Cart" — the
      // price, which is the point of this assertion, is identical either way.
      await expect(page.getByRole('button', { name: /(Add to Cart|Update Cart) · ₹300\.00/ })).toBeVisible();
      // Proof the named options really drive the selection rather than the price landing on
      // ₹300 by coincidence: the same URL with the 3x3 size (price_multiplier 1.6) must
      // reprice the pack. OptionButton conveys selection by styling only — it sets no
      // aria-pressed/aria-checked — so price is the observable signal here.
      await page.goto(`${PACK_PDP}?${FEED_QUERY.replace('2-x-2-in-square', '3-x-3-in-square')}`);
      await expect(page.getByText('Total for 1 pack (50 pcs)')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole('button', { name: /(Add to Cart|Update Cart) · ₹480\.00/ })).toBeVisible();
    });

    // ── alt-02: JSON-LD is a single Offer at exactly that price ──
    await capture.step('alt-02', 'Read the JSON-LD offer emitted for the same page', null, async () => {
      const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
      const product = blocks
        .map((b) => JSON.parse(b))
        .flatMap((b) => (Array.isArray(b) ? b : [b]))
        .find((b) => b['@type'] === 'Product');
      expect(product).toBeTruthy();
      // A single Offer, not the old AggregateOffer with a low/high range.
      expect(product.offers['@type']).toBe('Offer');
      expect(product.offers.priceCurrency).toBe('INR');
      expect(Number(product.offers.price)).toBe(await listingOfferPrice(page));
      expect(product.offers.availability).toBe('https://schema.org/InStock');
      expect(product.offers.url).toContain('qty=50');
      // The feed's pack suffix is mirrored in the structured-data name.
      expect(product.name).toContain('Pack of 50 pcs');
    });

    // ── err-01: unknown or malformed preselect params are ignored, never fatal ──
    await capture.step('err-01', 'Open the PDP with invalid preselect params', null, async () => {
      await page.goto(`${PACK_PDP}?qty=37&size=not-a-size&paper=&finish=bogus&turnaround=nope`);
      await expect(page.getByRole('heading', { name: 'Custom Die-Cut Stickers', level: 1 })).toBeVisible({ timeout: 30_000 });
      // qty=37 is not a tier quantity, so the default selection stands and the page is fine.
      await expect(page.getByText('Price per pack of 50 pcs')).toBeVisible();
      await expect(page.getByRole('button').filter({ hasText: '50 pcs · ₹300.00' }).first()).toBeVisible();
    });

    // ── alt-03: a pack_size=1 product is byte-for-byte the old experience ──
    await capture.step('alt-03', 'Confirm a non-pack product is unchanged', null, async () => {
      await page.goto('/products/business-cards/matte-finish-business-cards');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText('Price per unit')).toBeVisible();
      // No pack vocabulary anywhere on a pack_size=1 product.
      await expect(page.getByText(/Price per pack of/)).toHaveCount(0);
      await expect(page.getByText(/\bpacks?\s*\(/)).toHaveCount(0);
      await expect(page.getByText(/\/pc\b/)).toHaveCount(0);
    });
  });
});
