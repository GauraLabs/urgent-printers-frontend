// Hand-authored (see the Module 2 note in subcategories-category-seo.md).
// axe stays on per-navigation rather than off: the not-found page is a real page a crawler
// and a customer both land on, so its accessibility reading is signal, not noise.
import { test, expect } from '../capture.js';
import {
  PLAN, CAT, MOVED_PRODUCT, canonicalHref, productCardHrefs, robotsContent, siteOrigin,
} from './subcategories-category-seo.helpers';

test.use({
  captureOptions: {
    feature: 'Subcategories Category SEO Error Paths',
    plan: PLAN,
    axe: 'per-navigation',
    lighthouse: 'off',
  },
});

test.describe('Subcategories and category SEO (Storefront) — error paths', () => {
  test.describe.configure({ timeout: 300_000 });

  test('real 404s, facet noindex and the category-page search handoff', async ({ page, capture }) => {
    // ── err-01: unknown category slug -> a REAL 404, not a soft-404 with status 200 ──
    await capture.step('err-01', 'Request a category slug that does not exist', null, async () => {
      const res = await page.goto('/products/nope-category', { waitUntil: 'domcontentloaded' });
      expect(res?.status(), 'a missing category must be a real HTTP 404').toBe(404);
      // Asserted on the response, not just the rendered page: a soft-404 looks identical on screen.
      const head = await page.request.get('/products/nope-category', { maxRedirects: 0 });
      expect(head.status()).toBe(404);
    });

    // ── err-02: a valid product under a junk category segment -> 404, not a cached 308 ──
    await capture.step('err-02', 'Request a valid product under an unknown category segment', null, async () => {
      const res = await page.goto(`/products/bogus-cat/${MOVED_PRODUCT.slug}`, { waitUntil: 'domcontentloaded' });
      expect(res?.status(), 'isKnownCategorySlug must refuse to redirect a junk segment').toBe(404);
      const direct = await page.request.get(`/products/bogus-cat/${MOVED_PRODUCT.slug}`, { maxRedirects: 0 });
      expect(direct.status()).toBe(404);
      // Specifically NOT a redirect — one cached 308 per junk prefix is the failure mode here.
      expect(direct.headers()['location']).toBeUndefined();
    });

    // ── err-03: a facet param makes an otherwise-indexable listing noindex, canonical to base ──
    await capture.step('err-03', 'Load an indexable category with a sort facet applied', null, async () => {
      const res = await page.goto(`/products/${CAT.parent.slug}?sort=price_asc`, { waitUntil: 'domcontentloaded' });
      expect(res?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1, name: CAT.parent.name })).toBeVisible({ timeout: 90_000 });
      expect(await robotsContent(page)).toBe('noindex, follow');
      // Canonical collapses back to the bare listing, dropping the facet.
      expect(await canonicalHref(page)).toBe(`${siteOrigin(page)}/products/${CAT.parent.slug}`);
    });

    // ── err-04: a search from a category page hands off to the unscoped listing ──
    await capture.step('err-04', 'Submit a search from a category URL', null, async () => {
      await page.goto(`/products/${CAT.parent.slug}?q=flyers`, { waitUntil: 'domcontentloaded' });
      // The Typesense endpoint cannot be category-scoped, so the page redirects rather than
      // silently ignoring the category or returning wrong results.
      await page.waitForURL(/\/products\?q=flyers/, { timeout: 90_000 });
      expect(new URL(page.url()).pathname).toBe('/products');
      expect(new URL(page.url()).searchParams.get('q')).toBe('flyers');
    });

    // The bare listing's product set, to compare the invalid-facet cases against.
    await page.goto(`/products/${CAT.parent.slug}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: CAT.parent.name })).toBeVisible({ timeout: 90_000 });
    const baseline = (await productCardHrefs(page)).sort();
    expect(baseline.length, 'baseline listing must not be empty').toBeGreaterThan(0);

    // ── err-05: an unrecognised sort value must be IGNORED, not break the listing ──
    // Regression guard. Found as a real defect by this run: an unmapped sort went out as the
    // literal string `sort_by=undefined`, the backend 422'd, getProducts swallowed the error
    // and the page served an empty grid at HTTP 200. Fixed with parseSortParam.
    await capture.step('err-05', 'Apply unrecognised sort values to the category listing', null, async () => {
      for (const bad of ['bogus', 'price_asc', 'toString']) {
        const res = await page.goto(`/products/${CAT.parent.slug}?sort=${bad}`, { waitUntil: 'domcontentloaded' });
        expect(res?.status()).toBe(200);
        await expect(page.getByRole('heading', { level: 1, name: CAT.parent.name })).toBeVisible({ timeout: 90_000 });
        await expect(page.getByText('No products found'), `?sort=${bad} must not empty the grid`).toHaveCount(0);
        expect((await productCardHrefs(page)).sort(), `?sort=${bad} must match the bare listing`).toEqual(baseline);
      }
      // A VALID value must still actually sort — the guard must not have disabled sorting.
      await page.goto(`/products/${CAT.parent.slug}?sort=price-asc`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('No products found')).toHaveCount(0);
      expect((await productCardHrefs(page)).sort()).toEqual(baseline);
    });

    // ── err-06: same defect class on the other first-class facet ──
    await capture.step('err-06', 'Apply unrecognised badge values to the category listing', null, async () => {
      for (const bad of ['bogus', 'toString', '__proto__']) {
        const res = await page.goto(`/products/${CAT.parent.slug}?badge=${encodeURIComponent(bad)}`, { waitUntil: 'domcontentloaded' });
        expect(res?.status()).toBe(200);
        await expect(page.getByRole('heading', { level: 1, name: CAT.parent.name })).toBeVisible({ timeout: 90_000 });
        await expect(page.getByText('No products found'), `?badge=${bad} must not empty the grid`).toHaveCount(0);
        expect((await productCardHrefs(page)).sort(), `?badge=${bad} must match the bare listing`).toEqual(baseline);
      }
      // `sale` maps to on_sale=true and neither of this category's products is discounted, so
      // its empty result is CORRECT. Asserting it stays empty is what proves the fix dropped
      // only unrecognised values rather than neutering the badge filter altogether.
      await page.goto(`/products/${CAT.parent.slug}?badge=sale`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1, name: CAT.parent.name })).toBeVisible({ timeout: 90_000 });
      await expect(page.getByText('No products found')).toHaveCount(1);
    });
  });
});
