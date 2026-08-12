// Hand-authored — see ./product-catalog-storefront.md.
// One test.describe per alternate path in the plan; each declares its own
// captureOptions.feature so no two tests fight over one run log.
import { test, expect } from '../capture.js';

const PLAN = 'qa-pipeline/artifacts/plans/product-catalog-storefront-plan.json';

// Several of these scenarios chain a dozen real navigations plus a debounced search
// round-trip; Playwright's 30s default is a test-harness limit, not a product SLA.
test.describe.configure({ timeout: 180_000 });

/**
 * Bring a locator into the viewport when it lives inside the filter sidebar.
 *
 * The sidebar is `position: sticky` and slightly taller than a 720px viewport, so it moves
 * *with* the page as you scroll: a single scrollIntoViewIfNeeded() solves for the element's
 * pre-scroll position and lands short. Scrolling relative to the element's live position and
 * re-measuring converges in two or three passes. This matters beyond the assertion — capture.step
 * records the pre-action bounding box for the video renderer, and an off-viewport box is unusable.
 */
async function bringIntoView(
  page: import('@playwright/test').Page,
  locator: import('@playwright/test').Locator,
): Promise<void> {
  for (let i = 0; i < 6; i++) {
    const box = await locator.boundingBox();
    if (!box) return;
    if (box.y >= 40 && box.y + box.height <= 680) return;
    await page.evaluate((dy) => window.scrollBy(0, dy), box.y - 300);
    await page.waitForTimeout(150);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Product Catalog (Storefront) — category landing page', () => {
  test.use({
    captureOptions: { feature: 'Product Catalog Storefront Alt Category Route', plan: PLAN, axe: 'per-navigation', lighthouse: 'off' },
  });

  test('a category route renders its own hero, breadcrumb and scoped grid, and switching category navigates by path', async ({ page, capture }) => {
    await capture.step('alt-01', 'Navigate directly to a category route', null, async () => {
      await page.goto('/products/business-cards');
      await expect(page.getByRole('heading', { name: 'Business Cards', level: 1 })).toBeVisible();
      const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
      await expect(breadcrumb.getByRole('link', { name: 'All Products' })).toBeVisible();
      await expect(breadcrumb.getByText('Business Cards')).toHaveAttribute('aria-current', 'page');
      await expect(page.getByText(/^3 products$/)).toBeVisible();
    });

    const sidebar = page.locator('aside');
    const flyers = sidebar.getByLabel('Flyers & Leaflets');
    await capture.step('alt-02', 'Switch category from inside a path-scoped category page', flyers, async (el) => {
      await el.click();
      // useProductFilters.setCategory's pathCategorySlug branch navigates to the other
      // category's own path rather than layering ?category= on top of this one.
      await page.waitForURL('**/products/flyers-leaflets');
      await expect(page).toHaveURL(/\/products\/flyers-leaflets$/);
      await expect(page.getByRole('heading', { name: 'Flyers & Leaflets', level: 1 })).toBeVisible();
    });

    const allProducts = sidebar.getByLabel('All Products');
    await capture.step('alt-03', "Select the 'All Products' radio from a category page", allProducts, async (el) => {
      await el.click();
      await page.waitForURL((url) => url.pathname === '/products');
      await expect(page.getByRole('heading', { name: 'All Products', level: 1 })).toBeVisible();
      await expect(page).not.toHaveURL(/category=/);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Product Catalog (Storefront) — header instant search', () => {
  test.use({
    // The listbox opens and closes without navigating, so per-navigation axe would only
    // ever sample the initial page — per-step is the honest setting here.
    captureOptions: { feature: 'Product Catalog Storefront Alt Header Search', plan: PLAN, axe: 'per-step', lighthouse: 'off' },
  });

  test('the header instant search returns products, supports keyboard navigation and hands off to the search page', async ({ page, capture }) => {
    const searchInput = page.getByLabel('Search products');

    await capture.step('alt-04', 'Open the storefront and focus the header search', null, async () => {
      await page.goto('/products');
      await searchInput.click();
      await expect(searchInput).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByText('Popular Searches')).toBeVisible();
      // Per the ARIA combobox pattern the listbox only exists once it has options to own,
      // so the empty/popular-searches state renders the panel without one.
      await expect(page.getByRole('listbox')).toHaveCount(0);
    });

    await capture.type('alt-05', 'Type a query into the header search', searchInput, 'business');

    const listbox = page.getByRole('listbox', { name: 'Search results' });
    await capture.step('alt-06', 'Observe the instant-search results', listbox, async (el) => {
      // 320ms debounce, then a Typesense-backed /search call.
      await expect(el).toBeVisible({ timeout: 15_000 });
      await expect(el.getByRole('option', { name: /Standard Business Cards/ })).toBeVisible();
      await expect(el.getByText(/from ₹[\d,]+\.\d{2}\/unit/).first()).toBeVisible();
      await expect(searchInput).toHaveAttribute('aria-controls', /.+/);
    });

    // "See all results" is a button, not an option — it triggers a navigation rather than
    // selecting a value, so it deliberately sits outside the listbox.
    const seeAll = page.getByRole('button', { name: /^See all results for/ });
    await capture.step('alt-07', "Click 'See all results'", seeAll, async (el) => {
      await el.click();
      await page.waitForURL('**/search?q=business');
      await expect(page.getByRole('heading', { level: 1, name: /Results for/ })).toBeVisible();
      // submit() clears the input and closes the dropdown.
      await expect(page.getByLabel('Search products')).toHaveValue('');
    });

    await capture.type('alt-08', 'Type into the header search again to keyboard-navigate it', page.getByLabel('Search products'), 'business');
    await capture.step('alt-09', 'ArrowDown then Enter opens the highlighted product', page.getByLabel('Search products'), async (el) => {
      await expect(listbox.getByRole('option').first()).toBeVisible({ timeout: 15_000 });
      const firstOptionName = await listbox.getByRole('option').first().innerText();
      await el.press('ArrowDown');
      await expect(listbox.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
      // aria-activedescendant is what actually moves screen-reader focus here.
      await expect(el).toHaveAttribute('aria-activedescendant', /.+/);
      await el.press('Enter');
      await page.waitForURL(/\/products\/[^/]+\/[^/]+$/);
      const productName = firstOptionName.split('\n')[0].trim();
      await expect(page.getByRole('heading', { level: 1, name: productName })).toBeVisible();
    });

    await capture.step('alt-10', 'Escape closes the instant-search dropdown', page.getByLabel('Search products'), async (el) => {
      // The header persists across the client-side navigation above, so the input is still
      // focused — and the dropdown only reopens via onFocus. Clicking an already-focused
      // element fires no focus event, so blur it first.
      await el.blur();
      await el.click();
      await expect(el).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByText('Popular Searches')).toBeVisible();
      await el.press('Escape');
      await expect(el).toHaveAttribute('aria-expanded', 'false');
      await expect(page.getByText('Popular Searches')).toHaveCount(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Product Catalog (Storefront) — dedicated search page', () => {
  test.use({
    captureOptions: { feature: 'Product Catalog Storefront Alt Search Page', plan: PLAN, axe: 'per-navigation', lighthouse: 'off' },
  });

  test('the search page offers popular terms and category shortcuts, and its form runs a real search', async ({ page, capture }) => {
    await capture.step('alt-11', 'Open the search page with no query', null, async () => {
      await page.goto('/search');
      await expect(page.getByRole('heading', { name: 'Search', level: 1 })).toBeVisible();
      await expect(page.getByText('Find the perfect print product for your business')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Popular Searches' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Browse by Category' })).toBeVisible();
      // POPULAR_TERMS has 9 entries; the dev DB has 8 categories.
      await expect(page.getByRole('link', { name: 'Tri-Fold Brochures' })).toBeVisible();
      // The same href appears in the header nav and the footer, so scope to the
      // "Browse by Category" grid; its tiles carry an emoji inside the accessible name.
      await expect(page.getByRole('link', { name: '🪪 Business Cards' })).toBeVisible();
    });

    const input = page.locator('input[name="q"]');
    await capture.type('alt-12', 'Type a query into the search form', input, 'business');

    await capture.step('alt-13', 'Submit the search form', page.getByRole('button', { name: 'Search', exact: true }), async (el) => {
      await el.click();
      await page.waitForURL('**/search?q=business');
      await expect(page.getByRole('heading', { level: 1, name: /Results for/ })).toBeVisible();
      await expect(page.getByText(/^\d+ products? found$/)).toBeVisible();
      await expect(page.getByRole('region', { name: 'Search results' })).toBeVisible();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Product Catalog (Storefront) — in-catalog search', () => {
  test.use({
    captureOptions: { feature: 'Product Catalog Storefront Alt Catalog Search', plan: PLAN, axe: 'per-step', lighthouse: 'off' },
  });

  test("the catalog's own search field takes over the listing and disables the filters it cannot honour", async ({ page, capture }) => {
    await capture.step('alt-14', 'Open the catalog listing', null, async () => {
      await page.goto('/products');
      await expect(page.getByText(/^10 products$/)).toBeVisible();
    });

    await capture.type('alt-15', 'Type into the catalog search field', page.getByLabel('Search this catalog'), 'business');

    await capture.step('alt-16', 'Wait for the debounced search to take over the listing', null, async () => {
      // 400ms debounce, then a server round-trip.
      await page.waitForURL(/\/products\?q=business/, { timeout: 15_000 });
      await expect(page.getByRole('heading', { level: 1, name: 'Results for "business"' })).toBeVisible();
      await expect(page.getByText(/^\d+ products? found$/)).toBeVisible();
    });

    await capture.step('alt-17', 'Observe the filter controls while a search is active', page.locator('aside'), async (el) => {
      await expect(el.getByText('Filters unavailable')).toBeVisible();
      await expect(
        el.getByText('Category, price, and tag filters aren’t available while searching. Clear your search to use them.'),
      ).toBeVisible();
      // The same sentence is repeated above the grid, and the sort control is inert.
      await expect(
        page.getByText('Category, price, and tag filters aren’t available while searching. Clear your search to use them.'),
      ).toHaveCount(2);
      await expect(page.getByText('Relevance')).toBeVisible();
    });

    const removeSearchChip = page.getByRole('button', { name: 'Remove Search: "business" filter' });
    await capture.step('alt-18', 'Clear the search from its active-filter chip', removeSearchChip, async (el) => {
      await el.click();
      await page.waitForURL((url) => url.pathname === '/products' && !url.searchParams.has('q'));
      await expect(page.getByText(/^10 products$/)).toBeVisible();
      await expect(page.locator('aside').getByText('Filters unavailable')).toHaveCount(0);
    });

    await capture.type('alt-19', 'Search again, then clear it from the input', page.getByLabel('Search this catalog'), 'business');
    await capture.step('alt-20', "Clear the search with the input's own clear button", page.getByRole('button', { name: 'Clear search' }).last(), async (el) => {
      await page.waitForURL(/\/products\?q=business/, { timeout: 15_000 });
      await el.click();
      await page.waitForURL((url) => url.pathname === '/products' && !url.searchParams.has('q'), { timeout: 15_000 });
      await expect(page.getByText(/^10 products$/)).toBeVisible();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Product Catalog (Storefront) — highlight, tag and price filters', () => {
  test.use({
    captureOptions: { feature: 'Product Catalog Storefront Alt Filters', plan: PLAN, axe: 'per-navigation', lighthouse: 'off' },
  });

  test('badge, tag and price filters narrow the catalog and compose correctly', async ({ page, capture }) => {
    await capture.step('alt-21', 'Open the catalog listing', null, async () => {
      await page.goto('/products');
      await expect(page.getByText(/^10 products$/)).toBeVisible();
    });

    const sidebar = page.locator('aside');

    await bringIntoView(page, sidebar.getByLabel('Bestseller'));
    await expect(sidebar.getByLabel('Bestseller')).toBeInViewport();
    await capture.step('alt-22', "Tick the 'Bestseller' highlight", sidebar.getByLabel('Bestseller'), async (el) => {
      await el.click();
      await page.waitForURL(/badge=bestseller/);
      // Exactly one bestseller-badged product exists in the dev DB — note the singular.
      await expect(page.getByText(/^1 product$/)).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Matte Finish Business Cards' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Remove bestseller filter' })).toBeVisible();
    });

    await capture.step('alt-23', 'Untick the same highlight', sidebar.getByLabel('Bestseller'), async (el) => {
      await el.click();
      await page.waitForURL((url) => !url.searchParams.has('badge'));
      await expect(page.getByText(/^10 products$/)).toBeVisible();
    });

    await bringIntoView(page, sidebar.getByLabel('Events'));
    await expect(sidebar.getByLabel('Events')).toBeInViewport();
    await capture.step('alt-24', "Tick the 'Events' tag", sidebar.getByLabel('Events'), async (el) => {
      await el.click();
      await page.waitForURL(/tags=events/);
      await expect(page.getByText(/^2 products$/)).toBeVisible();
      await expect(page.getByRole('heading', { name: 'A2 Posters' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'A5 Flyers' })).toBeVisible();
    });

    await capture.step('alt-25', 'Add a second tag on top of the first', sidebar.getByLabel('Corporate'), async (el) => {
      await el.click();
      await page.waitForURL(/tags=events%2Ccorporate|tags=events,corporate/);
      // The backend ANDs tags (Product.tags contains every selected tag) — not an OR union.
      await expect(page.getByText(/^0 products$/)).toBeVisible();
      await expect(page.getByRole('heading', { name: 'No products found' })).toBeVisible();
    });

    const clearTags = page.locator('aside').getByRole('button', { name: /^Clear all \(\d+\)$/ });
    await bringIntoView(page, clearTags);
    await expect(clearTags).toBeInViewport();
    await capture.step('alt-26', 'Clear the tag filters', clearTags, async (el) => {
      await el.click();
      await page.waitForURL((url) => url.pathname === '/products' && url.search === '');
      await expect(page.getByText(/^10 products$/)).toBeVisible();
    });

    // Price range — committed with Enter.
    await capture.type('alt-27', 'Enter a minimum price per unit', sidebar.getByPlaceholder('Min'), '200');
    await capture.step('alt-28', 'Commit the price range with Enter', sidebar.getByPlaceholder('Min'), async (el) => {
      await el.press('Enter');
      await page.waitForURL(/min=200/);
      await expect(page.getByRole('button', { name: 'Remove ₹200 – ₹∞ filter' })).toBeVisible();
      // Only products with a tier at or above ₹200/unit survive.
      await expect(page.getByRole('heading', { name: 'A5 Flyers' })).toHaveCount(0);
    });

    // Price range — committed by blurring instead of pressing Enter.
    await capture.type('alt-29', 'Enter a maximum price per unit', sidebar.getByPlaceholder('Max'), '400');
    await capture.step('alt-30', 'Commit the maximum by blurring the field', sidebar.getByPlaceholder('Max'), async (el) => {
      await el.blur();
      await page.waitForURL(/max=400/);
      await expect(page.getByRole('button', { name: 'Remove ₹200 – ₹400 filter' })).toBeVisible();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Product Catalog (Storefront) — product detail supporting sections', () => {
  test.use({
    captureOptions: { feature: 'Product Catalog Storefront Alt Detail Sections', plan: PLAN, axe: 'per-navigation', lighthouse: 'off' },
  });

  test('a product detail page renders its gallery, rich description, tags and related products', async ({ page, capture }) => {
    await capture.step('alt-31', 'Open a product that has an uploaded image', null, async () => {
      await page.goto('/products/business-cards/matte-finish-business-cards');
      await expect(page.getByRole('heading', { name: 'Matte Finish Business Cards', level: 1 })).toBeVisible();
      // ProductGallery renders two Swipers — a touch one (block md:hidden) and a
      // thumbnail-controlled one (hidden md:block). At this 1280px viewport the first is
      // hidden, so the desktop slide is the last match.
      await expect(page.getByAltText('Matte Finish Business Cards — view 1').last()).toBeVisible();
    });

    await capture.step('alt-32', 'Read the full product description and tag chips', null, async () => {
      await expect(page.getByRole('heading', { name: 'Product Details' })).toBeVisible();
      // Tag chips render `tag.replace("-", " ")` — only the FIRST hyphen is replaced — and
      // are capitalised in CSS only, so the text content stays lowercase.
      await expect(page.getByText('professional', { exact: true })).toBeVisible();
      await expect(page.getByText('business cards', { exact: true })).toBeVisible();
    });

    await capture.step('alt-33', 'Scroll to related products', null, async () => {
      const related = page.getByRole('region', { name: 'You Might Also Like' });
      await related.scrollIntoViewIfNeeded();
      await expect(related).toBeVisible();
      // Siblings from the same category, excluding the product being viewed.
      await expect(related.getByRole('heading', { name: 'Standard Business Cards' })).toBeVisible();
      await expect(related.getByRole('heading', { name: 'Matte Finish Business Cards' })).toHaveCount(0);
    });
  });
});
