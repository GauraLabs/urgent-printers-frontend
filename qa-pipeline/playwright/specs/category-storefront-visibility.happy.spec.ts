// Hand-authored — see ../../../pipeline/README.md's "Known infra findings" for why the
// MCP-driven Generator agent isn't in use yet (same infra bug affects both apps).
import { test, expect } from '../capture.js';

test.use({
  captureOptions: {
    feature: 'Category Storefront Visibility',
    plan: 'qa-pipeline/artifacts/plans/category-storefront-visibility-plan.json',
    axe: 'per-navigation',
    lighthouse: 'off',
  },
});

test.describe('Category Storefront Visibility', () => {
  test('browse categories from the homepage, a category page, and the product filter', async ({ page, capture }) => {
    // ── hp-01: homepage category grid ──
    await capture.step('hp-01', 'Load the homepage', null, () => page.goto('/'));
    await expect(page.getByRole('heading', { name: 'Shop by Category' })).toBeVisible();
    const businessCardsTile = page
      .getByRole('heading', { name: 'Business Cards', level: 3 })
      .locator('xpath=ancestor::a[1]');
    await expect(businessCardsTile).toBeVisible();
    await expect(businessCardsTile.getByText(/\d+ products/)).toBeVisible();
    await businessCardsTile.scrollIntoViewIfNeeded();

    // ── hp-02: click a category tile ──
    await capture.step('hp-02', 'Click a category tile', businessCardsTile, async (el) => {
      await el.click();
      await page.waitForURL('**/products/business-cards');
    });

    // ── hp-03: category page header ──
    await capture.step('hp-03', 'Observe the category page header', null, async () => {
      await expect(page.getByRole('heading', { name: 'Business Cards', level: 1 })).toBeVisible();
      const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
      await expect(breadcrumb).toBeVisible();
      await expect(breadcrumb.getByText('Business Cards')).toHaveAttribute('aria-current', 'page');
    });

    // ── hp-04: product grid scoped to the category ──
    await capture.step('hp-04', 'Observe the product grid scoped to this category', null, async () => {
      await expect(page.getByText(/^\d+ products?$/)).toBeVisible();
    });

    // ── hp-05: category filter on the general listing ──
    await capture.step('hp-05', 'Open the general product listing and view the Category filter', null, async () => {
      await page.goto('/products');
      await expect(page.getByText('Category', { exact: true })).toBeVisible();
      await expect(page.getByLabel('All Products')).toBeVisible();
    });

    // ── hp-06: select a category radio ──
    // .click() rather than .check() — this radio's `checked` is driven entirely by the URL
    // (useProductFilters -> router navigation), not local component state, so the DOM
    // `checked` property doesn't flip synchronously with the click the way .check()'s
    // built-in assertion expects; asserting on the resulting URL/content is the real signal.
    await capture.step('hp-06', 'Select a category from the filter', page.getByLabel('Flyers & Leaflets'), async (el) => {
      await el.click();
      await page.waitForURL(/category=flyers-leaflets/);
      await expect(page.getByText('Flyers & Leaflets').first()).toBeVisible();
    });
  });
});
