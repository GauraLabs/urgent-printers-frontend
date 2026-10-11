// Hand-authored (see the Module 2 note in subcategories-category-seo.md).
// Read-only against the dev catalog. Product 16 is NOT moved back: a browser-cached 308 is
// not revocable, so the old->new direction is asserted and never reversed.
import { test, expect } from '../capture.js';
import {
  PLAN, CAT, MOVED_PRODUCT, breadcrumbJsonLdNames, bringIntoView, canonicalHref, jsonLd,
  productCard, relatedSubcategories, robotsContent, siteOrigin, subcategoryTiles, visibleCrumbs,
} from './subcategories-category-seo.helpers';

test.use({
  captureOptions: {
    feature: 'Subcategories Category SEO Alternate Paths',
    plan: PLAN,
    axe: 'per-navigation',
    lighthouse: 'off',
  },
});

test.describe('Subcategories and category SEO (Storefront) — alternate paths', () => {
  test.describe.configure({ timeout: 420_000 });

  test('thin child, direct-product parent, and the moved product 308', async ({ page, capture }) => {
    // ── alt-01: 1 rolled-up product < MIN_INDEXABLE_SUBCATEGORY_PRODUCTS (3) => noindex,follow ──
    await capture.step('alt-01', 'Load the thin child category and read robots + canonical', null, async () => {
      const res = await page.goto(`/products/${CAT.childPosters.slug}`, { waitUntil: 'domcontentloaded' });
      expect(res?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1, name: CAT.childPosters.name })).toBeVisible({ timeout: 60_000 });
      await expect(page).toHaveTitle('Posters | Urgent Printers');
      // Crawlable but out of the index — "follow" matters, the page's links still carry equity.
      expect(await robotsContent(page)).toBe('noindex, follow');
      // Still self-canonical, not canonicalised away to the parent.
      expect(await canonicalHref(page)).toBe(`${siteOrigin(page)}/products/${CAT.childPosters.slug}`);
    });

    // ── alt-02: ancestors come from the API, not from the (flat) URL ──
    await capture.step('alt-02', 'Read the child BreadcrumbList JSON-LD', null, async () => {
      expect(await breadcrumbJsonLdNames(page)).toEqual(['Home', 'All Products', 'Marketing Prints', 'Posters']);
      // The URL has one segment; the 4-level trail proves `ancestors` is being used.
      expect(new URL(page.url()).pathname).toBe(`/products/${CAT.childPosters.slug}`);
    });

    // ── alt-03: one click back up to the parent ──
    const shopAll = relatedSubcategories(page).getByRole('link', { name: `Shop all ${CAT.parent.name}` });
    await bringIntoView(shopAll);
    await capture.step('alt-03', 'Click "Shop all Marketing Prints" in the sibling row', shopAll, async (el) => {
      await el.click();
      await page.waitForURL(`**/products/${CAT.parent.slug}`, { timeout: 60_000 });
      await expect(page.getByRole('heading', { level: 1, name: CAT.parent.name })).toBeVisible({ timeout: 60_000 });
    });

    // ── alt-04: a root with its own product plus a child; roots are never "thin" ──
    await capture.step('alt-04', 'Load the parent that also owns a direct product', null, async () => {
      const res = await page.goto(`/products/${CAT.stickers.slug}`, { waitUntil: 'domcontentloaded' });
      expect(res?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1, name: CAT.stickers.name })).toBeVisible({ timeout: 60_000 });
      // 2 rolled-up products, but a root is indexable regardless of the thin-subcategory rule.
      expect(await robotsContent(page)).toBeNull();
    });

    // ── alt-05: rollup must ADD the descendant, not replace the parent's own product ──
    const diecutCard = productCard(page, MOVED_PRODUCT.name);
    await bringIntoView(diecutCard);
    await capture.step('alt-05', 'Check the Die-cut tile and both products in the grid', diecutCard, async (el) => {
      const tiles = subcategoryTiles(page, CAT.stickers.name);
      await expect(tiles).toBeVisible({ timeout: 30_000 });
      await expect(tiles.getByRole('link', { name: new RegExp(CAT.childDiecut.name) }).first())
        .toHaveAttribute('href', `/products/${CAT.childDiecut.slug}`);
      // The descendant...
      await expect(el).toBeVisible({ timeout: 30_000 });
      // ...and the parent's OWN direct product.
      await expect(productCard(page, 'test')).toBeVisible();
      // The descendant's card still links through its own child category.
      await expect(el.locator(`a[aria-label="${MOVED_PRODUCT.name}"]`)).toHaveAttribute(
        'href', new RegExp(`^/products/${CAT.childDiecut.slug}/${MOVED_PRODUCT.slug}`),
      );
    });

    // ── alt-06: the old URL must be a REAL 308, not a 200 shell that redirects client-side ──
    await capture.step('alt-06', 'Request the moved product at its old URL without following redirects', null, async () => {
      const res = await page.request.get(MOVED_PRODUCT.oldPath, { maxRedirects: 0 });
      expect(res.status(), 'permanentRedirect must surface as a real 308').toBe(308);
      const location = res.headers()['location'];
      expect(location).toBeTruthy();
      expect(new URL(location, siteOrigin(page)).pathname).toBe(MOVED_PRODUCT.newPath);
    });

    // ── alt-07: 5-level breadcrumb on the canonical PDP ──
    await capture.step('alt-07', 'Follow to the canonical PDP and read the breadcrumb', null, async () => {
      const res = await page.goto(MOVED_PRODUCT.newPath, { waitUntil: 'domcontentloaded' });
      expect(res?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1, name: MOVED_PRODUCT.name })).toBeVisible({ timeout: 90_000 });
      const expected = ['Home', 'All Products', CAT.stickers.name, CAT.childDiecut.name, MOVED_PRODUCT.name];
      expect(await visibleCrumbs(page)).toEqual(expected);
      expect(await breadcrumbJsonLdNames(page)).toEqual(expected);
    });

    // ── alt-08: Product JSON-LD carries the full category PATH, not just the leaf name ──
    await capture.step('alt-08', 'Read the Product JSON-LD on the canonical PDP', null, async () => {
      const block = await jsonLd(page, 'Product');
      expect(block.category).toBe(`${CAT.stickers.name} > ${CAT.childDiecut.name}`);
      // sku is the client-side product id, which is a STRING (numeric backend ids are
      // normalised to strings at the API boundary — see the plan's grounding notes).
      // schema.org/sku is Text, so a string is correct here, not a defect.
      expect(block.sku).toBe(String(MOVED_PRODUCT.id));
      expect(block.url).toBe(`${siteOrigin(page)}${MOVED_PRODUCT.newPath}`);
    });

    // ── alt-09: the canonical and the 308 target agree ──
    await capture.step('alt-09', 'Read the PDP canonical link', null, async () => {
      expect(await canonicalHref(page)).toBe(`${siteOrigin(page)}${MOVED_PRODUCT.newPath}`);
    });
  });
});
