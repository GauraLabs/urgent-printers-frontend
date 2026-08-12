// Hand-authored — see ./product-catalog-storefront.md and pipeline/README.md's
// "The hand-authoring fallback" for why the MCP-driven Generator agent isn't in use here.
// Every locator below is grounded in the component source the plan cites.
import { test, expect } from '../capture.js';

const PLAN = 'qa-pipeline/artifacts/plans/product-catalog-storefront-plan.json';

test.use({
  captureOptions: {
    feature: 'Product Catalog Storefront Happy Path',
    plan: PLAN,
    axe: 'per-navigation',
    lighthouse: 'on',
  },
});

/** Read every product card's "From ₹x.xx" value, top-to-bottom, as numbers. */
async function cardPrices(page: import('@playwright/test').Page): Promise<number[]> {
  const cards = page.locator('article');
  const count = await cards.count();
  const prices: number[] = [];
  for (let i = 0; i < count; i++) {
    const text = await cards.nth(i).getByText(/^₹[\d,]+\.\d{2}$/).first().textContent();
    prices.push(Number((text ?? '').replace(/[₹,]/g, '')));
  }
  return prices;
}

test.describe('Product Catalog (Storefront) — happy path', () => {
  // Playwright's 30s default counts the two Lighthouse audits (10-20s each) plus 16 real
  // interactions against one test. The audits are instrumentation, not user time — the run
  // log already subtracts them from timestamp_ms — but the test clock does not know that.
  test.describe.configure({ timeout: 300_000 });

  test('browse, filter, sort and configure a product', async ({ page, capture }) => {
    // ── hp-01: the full catalog listing ──
    await capture.step('hp-01', 'Navigate to the full catalog listing', null, async () => {
      await page.goto('/products');
      await expect(page.getByRole('heading', { name: 'All Products', level: 1 })).toBeVisible();
      await expect(
        page.getByText('Premium printing for every business need — delivered fast across India'),
      ).toBeVisible();
      // 10 real, categorised products in the dev DB; the count line is "<n> products".
      await expect(page.getByText(/^\d+ products$/)).toBeVisible();
    });
    await capture.lighthouseCheckpoint('initial_load');

    const sidebar = page.locator('aside');

    // ── hp-02: the desktop filter sidebar ──
    await capture.step('hp-02', 'Observe the desktop filter sidebar', sidebar, async () => {
      await expect(sidebar.getByText('Filters', { exact: true })).toBeVisible();
      await expect(sidebar.getByText('Category', { exact: true })).toBeVisible();
      await expect(sidebar.getByText('Price per Unit (₹)')).toBeVisible();
      await expect(sidebar.getByText('Highlights')).toBeVisible();
      await expect(sidebar.getByText('Tags', { exact: true })).toBeVisible();
      // CATEGORY_VISIBLE_LIMIT = 6, and the dev DB has 8 categories.
      await expect(sidebar.getByRole('radio')).toHaveCount(7); // "All Products" + 6
    });

    // ── hp-03: expand the truncated category list ──
    const showAll = sidebar.getByRole('button', { name: /^Show all \d+ categories$/ });
    await capture.step('hp-03', 'Expand the truncated category list', showAll, async (el) => {
      await el.click();
      await expect(sidebar.getByRole('radio')).toHaveCount(9); // "All Products" + 8
      await expect(sidebar.getByRole('button', { name: 'Show less' })).toBeVisible();
    });

    // ── hp-04: filter to a category ──
    // .click() not .check(): `checked` is driven by the URL via useProductFilters, so it does
    // not flip synchronously the way .check()'s built-in assertion expects.
    const businessCards = sidebar.getByLabel('Business Cards');
    await capture.step('hp-04', "Select the 'Business Cards' category radio", businessCards, async (el) => {
      await el.click();
      await page.waitForURL(/category=business-cards/);
      await expect(page.getByText(/^3 products$/)).toBeVisible();
      await expect(page.getByText('Active:')).toBeVisible();
      // ActiveFilters has no categoryName on /products, so the chip shows the slug.
      await expect(page.getByRole('button', { name: 'Remove business-cards filter' })).toBeVisible();
    });

    // ── hp-05: sort the filtered results by price ──
    const sortTrigger = page.getByRole('button', { name: 'Most Popular' });
    await capture.step('hp-05', "Open the sort dropdown and choose 'Price: Low to High'", sortTrigger, async (el) => {
      await el.click();
      await page.getByRole('menuitem', { name: 'Price: Low to High' }).click();
      await page.waitForURL(/sort=price-asc/);
      await expect(page.getByRole('button', { name: 'Price: Low to High' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Remove Sort: price asc filter' })).toBeVisible();
      // The control claims an ordering; the cards must actually honour it.
      const prices = await cardPrices(page);
      expect(prices.length).toBe(3);
      expect(prices, `card "From" prices under sort=price-asc: ${JSON.stringify(prices)}`)
        .toEqual([...prices].sort((a, b) => a - b));
    });

    // ── hp-06: read a product card ──
    const card = page.locator('article').filter({
      has: page.getByRole('heading', { name: 'Standard Business Cards' }),
    });
    await capture.step('hp-06', 'Read a product card', card, async (el) => {
      await el.scrollIntoViewIfNeeded();
      await expect(el.getByText('Business Cards', { exact: true })).toBeVisible();
      await expect(el.getByRole('heading', { name: 'Standard Business Cards' })).toBeVisible();
      await expect(el.getByText('From', { exact: true })).toBeVisible();
      await expect(el.getByText('per unit', { exact: true })).toBeVisible();
      await expect(el.getByText(/^₹[\d,]+\.\d{2}$/)).toBeVisible();
      await expect(el.getByRole('link', { name: /Configure/ })).toBeVisible();
      // WishlistButton renders the SSR default until useMounted flips; by now it is hydrated.
      await expect(el.getByRole('button', { name: 'Add to wishlist' })).toBeVisible();
    });

    // ── hp-07: open the product detail page ──
    const configure = card.getByRole('link', { name: /Configure/ });
    await capture.step('hp-07', 'Open the product detail page from the card', configure, async (el) => {
      await el.click();
      await page.waitForURL('**/products/business-cards/standard-business-cards');
      await expect(page.getByRole('heading', { name: 'Standard Business Cards', level: 1 })).toBeVisible();
      const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
      await expect(breadcrumb.getByRole('link', { name: 'All Products' })).toBeVisible();
      await expect(breadcrumb.getByRole('link', { name: 'Business Cards' })).toBeVisible();
      await expect(breadcrumb.getByText('Standard Business Cards')).toHaveAttribute('aria-current', 'page');
    });

    // ── hp-08: the live pricing summary ──
    await capture.step('hp-08', 'Observe the live pricing summary', null, async () => {
      await expect(page.getByText('Price per unit')).toBeVisible();
      // Best-value tier is 500 @ ₹4.50 (backend pricing_tiers, is_best_value true).
      await expect(page.getByText('Total for 500 units')).toBeVisible();
      await expect(page.getByText('₹4.50').first()).toBeVisible();
      await expect(page.getByText('GST and shipping calculated at checkout')).toBeVisible();
    });

    // ── hp-09: change a print option and watch the price recalculate ──
    const paper300 = page.getByRole('button', { name: /300 GSM Card/ });
    // Scroll BEFORE the capture step: capture.step measures the bounding box pre-action so
    // the renderer can animate a cursor toward it, and an off-viewport box is unusable.
    await paper300.scrollIntoViewIfNeeded();
    await capture.step('hp-09', 'Select the 300 GSM Card paper option', paper300, async (el) => {
      await el.click();
      // 300 GSM Card carries price_multiplier 1.1, so the ₹4.50 best-value tier becomes
      // ₹4.95/unit and the 500-unit total ₹2,475.00. (The static "From ₹4.50 / unit" line in
      // the product header is merchandising copy and deliberately does NOT track options.)
      await expect(page.getByText('₹4.95', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('₹2,475.00', { exact: true }).first()).toBeVisible();
    });

    // ── hp-10: select a different quantity tier ──
    const tier1000 = page.getByRole('button').filter({ hasText: '1,000' }).first();
    await tier1000.scrollIntoViewIfNeeded();
    await capture.step('hp-10', 'Select the 1,000-unit quantity tier', tier1000, async (el) => {
      await el.click();
      await expect(page.getByText('Total for 1,000 units')).toBeVisible();
    });

    // ── hp-11: select a paid turnaround option ──
    const rush = page.getByRole('button').filter({ hasText: 'Rush' }).first();
    await rush.scrollIntoViewIfNeeded();
    await capture.step('hp-11', 'Select the Rush turnaround option', rush, async (el) => {
      await expect(el.getByText('1 business days')).toBeVisible();
      await expect(el.getByText('+₹150.00')).toBeVisible();
      await el.click();
    });

    // ── hp-12: the delivery check is gated until the pincode is well-formed ──
    const pincode = page.getByLabel('Pincode');
    const check = page.getByRole('button', { name: 'Check', exact: true });
    await check.scrollIntoViewIfNeeded();
    await capture.step('hp-12', 'Confirm Check is disabled before a full pincode is entered', check, async (el) => {
      await expect(el).toBeDisabled();
    });

    // ── hp-13: enter a serviceable pincode ──
    await capture.type('hp-13', 'Enter a serviceable 6-digit pincode', pincode, '110001');

    // ── hp-14: submit the delivery check ──
    await capture.step('hp-14', 'Submit the delivery check', check, async (el) => {
      await expect(el).toBeEnabled();
      await el.click();
      await expect(page.getByText(/^Delivery by /)).toBeVisible({ timeout: 15_000 });
    });

    // ── hp-15: back to the filtered catalog ──
    await capture.step('hp-15', 'Return to the filtered catalog', null, async () => {
      await page.goto('/products?category=business-cards&sort=price-asc');
      await expect(page.getByText(/^3 products$/)).toBeVisible();
    });

    // ── hp-16: clear every active filter ──
    const clearAll = page.locator('aside').getByRole('button', { name: /^Clear all \(\d+\)$/ });
    await capture.step('hp-16', 'Clear every active filter', clearAll, async (el) => {
      await expect(el).toHaveText(/Clear all \(2\)/);
      await el.click();
      await page.waitForURL((url) => url.pathname === '/products' && url.search === '');
      await expect(page.getByText(/^10 products$/)).toBeVisible();
      await expect(page.getByText('Active:')).toHaveCount(0);
    });

    await capture.lighthouseCheckpoint('final_state');
  });
});
