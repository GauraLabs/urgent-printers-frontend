// Hand-authored — see ./product-catalog-storefront.md.
// Boundary conditions the plan's `edge_cases` grounds in real code. Edge cases whose
// `existing_validation` is null are deliberately NOT generated here (asserting behaviour no
// code implements is a failing test, not a finding) — they are listed in the .md for the
// Analyzer instead.
import { test, expect } from '../capture.js';

const PLAN = 'qa-pipeline/artifacts/plans/product-catalog-storefront-plan.json';

// Several of these scenarios chain a dozen real navigations plus a debounced search
// round-trip; Playwright's 30s default is a test-harness limit, not a product SLA.
test.describe.configure({ timeout: 180_000 });

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Product Catalog (Storefront) — search threshold and pagination bounds', () => {
  test.use({
    captureOptions: { feature: 'Product Catalog Storefront Edge Query Bounds', plan: PLAN, axe: 'off', lighthouse: 'off' },
  });

  test('a one-character query is not a search, and a page past the end renders empty', async ({ page, capture }) => {
    await capture.step('edge-01', 'Request the catalog with a one-character query', null, async () => {
      await page.goto('/products?q=a');
      // Both the server page and useProductFilters gate on length >= 2.
      await expect(page.getByRole('heading', { name: 'All Products', level: 1 })).toBeVisible();
      await expect(page.getByText(/^10 products$/)).toBeVisible();
      await expect(page.getByText('Active:')).toHaveCount(0);
      // Filters must stay usable below the threshold.
      await expect(page.locator('aside').getByText('Filters unavailable')).toHaveCount(0);
    });

    await capture.step('edge-02', 'Request a page past the end of the result set', null, async () => {
      await page.goto('/products?page=999');
      // The backend returns an empty page with total still 11, so the toolbar count and the
      // grid disagree. Recorded as observed behaviour, not asserted as desirable.
      await expect(page.getByRole('heading', { name: 'No products found' })).toBeVisible();
      await expect(page.getByText(/^10 products$/)).toBeVisible();
    });

    await capture.step('edge-03', 'Confirm the end-of-list line on a result set smaller than one page', null, async () => {
      await page.goto('/products');
      // 10 products, PAGE_SIZE 12 -> hasMore is false, so the sentinel never arms.
      await expect(page.getByText('You’ve seen all 10 products.')).toBeVisible();
      await expect(page.getByText('Loading more…')).toHaveCount(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Product Catalog (Storefront) — every catalog card must lead somewhere real', () => {
  test.use({
    captureOptions: { feature: 'Product Catalog Storefront Edge Card Links', plan: PLAN, axe: 'off', lighthouse: 'off' },
  });

  test('no product card links to a malformed route or advertises a zero price', async ({ page, capture }) => {
    await capture.step('edge-04', 'Audit every product card link and price on the full catalog', null, async () => {
      await page.goto('/products');
      await expect(page.getByText(/^10 products$/)).toBeVisible();

      const hrefs = await page
        .locator('article a[href^="/products/"]')
        .evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''));
      expect(hrefs.length).toBeGreaterThan(0);

      // ROUTES.product(categorySlug, slug) yields '/products//<slug>' when a product has no
      // category — a route that cannot resolve.
      const malformed = hrefs.filter((h) => h.includes('//'));
      expect(malformed, `product cards linking to an unresolvable route: ${JSON.stringify(malformed)}`)
        .toEqual([]);

      // displayPrice falls back to `product.priceFrom ?? 0`, so a product with no usable
      // price is merchandised at ₹0.00.
      const zeroPriced = await page.getByText('₹0.00', { exact: true }).count();
      expect(zeroPriced, 'product cards advertising a ₹0.00 starting price').toBe(0);
    });

    await capture.step('edge-05', 'Follow the first product card and confirm it resolves to a real product page', null, async () => {
      const first = page.locator('article').first();
      const name = (await first.getByRole('heading').first().innerText()).trim();
      await first.getByRole('link', { name: /Configure/ }).click();
      await page.waitForURL(/\/products\/[^/]+\/[^/]+$/);
      await expect(page.getByRole('heading', { name: 'Page Not Found' })).toHaveCount(0);
      await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Product Catalog (Storefront) — product detail URL integrity', () => {
  test.use({
    captureOptions: { feature: 'Product Catalog Storefront Edge Detail Url', plan: PLAN, axe: 'off', lighthouse: 'off' },
  });

  test('a product cannot be served under a category it does not belong to', async ({ page, capture }) => {
    await capture.step('edge-06', 'Request a real product under a real but wrong category', null, async () => {
      // Photo Mugs lives in mugs-promotional, not business-cards. The detail page fetches
      // the product and the category independently and never cross-checks them.
      await page.goto('/products/business-cards/photo-mugs');
      await expect(
        page.getByRole('heading', { name: 'Page Not Found', level: 1 }),
        'a product served under the wrong category is duplicate content with a wrong breadcrumb',
      ).toBeVisible();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Product Catalog (Storefront) — price sort across the whole catalog', () => {
  test.use({
    captureOptions: { feature: 'Product Catalog Storefront Edge Price Sort', plan: PLAN, axe: 'off', lighthouse: 'off' },
  });

  test('both price sorts order the catalog by the price the cards actually display', async ({ page, capture }) => {
    async function cardPrices(): Promise<number[]> {
      const cards = page.locator('article');
      const count = await cards.count();
      const prices: number[] = [];
      for (let i = 0; i < count; i++) {
        const text = await cards.nth(i).getByText(/^₹[\d,]+\.\d{2}$/).first().textContent();
        prices.push(Number((text ?? '').replace(/[₹,]/g, '')));
      }
      return prices;
    }

    await capture.step('edge-07', 'Sort the whole catalog low-to-high', null, async () => {
      await page.goto('/products?sort=price-asc');
      await expect(page.getByText(/^10 products$/)).toBeVisible();
      const prices = await cardPrices();
      expect(prices, `"From" prices under sort=price-asc: ${JSON.stringify(prices)}`)
        .toEqual([...prices].sort((a, b) => a - b));
    });

    await capture.step('edge-08', 'Sort the whole catalog high-to-low', null, async () => {
      await page.goto('/products?sort=price-desc');
      await expect(page.getByText(/^10 products$/)).toBeVisible();
      const prices = await cardPrices();
      expect(prices, `"From" prices under sort=price-desc: ${JSON.stringify(prices)}`)
        .toEqual([...prices].sort((a, b) => b - a));
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Product Catalog (Storefront) — category counts', () => {
  test.use({
    captureOptions: { feature: 'Product Catalog Storefront Edge Category Counts', plan: PLAN, axe: 'off', lighthouse: 'off' },
  });

  test('the product count a category advertises matches the number of products it lists', async ({ page, capture }) => {
    await capture.step('edge-09', 'Read every homepage category tile count, then compare it with that category page', null, async () => {
      await page.goto('/');
      const tiles = page.locator('a[href^="/products/"]').filter({ hasText: /\d+ products$/ });
      const advertised: { slug: string; count: number }[] = [];
      for (let i = 0; i < (await tiles.count()); i++) {
        const tile = tiles.nth(i);
        const href = (await tile.getAttribute('href')) ?? '';
        const text = (await tile.innerText()).match(/(\d+) products/);
        if (href && text) advertised.push({ slug: href.replace('/products/', ''), count: Number(text[1]) });
      }
      expect(advertised.length).toBeGreaterThan(0);

      const mismatches: string[] = [];
      for (const { slug, count } of advertised) {
        await page.goto(`/products/${slug}`);
        const listed = (await page.getByText(/^\d+ products?$/).first().innerText()).match(/(\d+)/);
        const listedCount = Number(listed?.[1] ?? -1);
        if (listedCount !== count) mismatches.push(`${slug}: tile says ${count}, page lists ${listedCount}`);
      }
      expect(mismatches, `category tile counts that do not match the category page: ${JSON.stringify(mismatches)}`)
        .toEqual([]);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Product Catalog (Storefront) — category route param handling', () => {
  test.use({
    captureOptions: { feature: 'Product Catalog Storefront Edge Category Params', plan: PLAN, axe: 'off', lighthouse: 'off' },
  });

  test('a path-scoped category wins over a stray query param, and a query redirects before the category lookup', async ({ page, capture }) => {
    await capture.step('edge-10', 'Open a category route carrying a stray ?category= param', null, async () => {
      await page.goto('/products/business-cards?category=posters');
      // current.category prefers the path segment, so the page must stay Business Cards.
      await expect(page.getByRole('heading', { name: 'Business Cards', level: 1 })).toBeVisible();
      await expect(page.getByText(/^3 products$/)).toBeVisible();
      await expect(page.getByRole('heading', { name: 'A2 Posters' })).toHaveCount(0);
    });

    await capture.step('edge-11', 'Confirm the stray param is stripped on the next filter interaction', null, async () => {
      await page.locator('aside').getByLabel('Bestseller').click();
      await page.waitForURL(/badge=bestseller/);
      // setParam deletes `category` whenever pathCategorySlug is defined.
      await expect(page).not.toHaveURL(/category=/);
    });

    await capture.step('edge-12', 'Search from a category route redirects to the unscoped search view', null, async () => {
      await page.goto('/products/business-cards?q=flyer');
      // The redirect runs before getCategoryBySlug, so this never 404s and never stays scoped.
      await page.waitForURL('**/products?q=flyer');
      await expect(page.getByRole('heading', { name: 'Page Not Found' })).toHaveCount(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Product Catalog (Storefront) — catalog imagery', () => {
  test.use({
    captureOptions: { feature: 'Product Catalog Storefront Edge Images', plan: PLAN, axe: 'off', lighthouse: 'off' },
  });

  test('every product image on the catalog resolves, placeholder or not', async ({ page, capture }) => {
    await capture.step('edge-13', 'Load the catalog and watch for failed image requests', null, async () => {
      const failed: string[] = [];
      page.on('requestfailed', (req) => {
        if (req.resourceType() === 'image') failed.push(req.url());
      });
      await page.goto('/products');
      await page.waitForLoadState('networkidle');
      // Most dev-DB products have no uploaded image and fall back to picsum.photos, which
      // next.config.ts allowlists — a broken placeholder would look identical to a broken
      // real image, so assert on the network rather than the pixels.
      expect(failed, `broken product images: ${JSON.stringify(failed)}`).toHaveLength(0);
    });
  });
});
