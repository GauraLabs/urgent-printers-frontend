// Hand-authored — see ./product-catalog-storefront.md.
// axe is 'off' throughout this file: these scenarios exist to prove exact error copy, and a
// clean pass/fail signal on the message is worth more here than an a11y sample of an error
// state the happy/alt specs already cover on the same routes.
import { test, expect } from '../capture.js';

const PLAN = 'qa-pipeline/artifacts/plans/product-catalog-storefront-plan.json';

// Several of these scenarios chain a dozen real navigations plus a debounced search
// round-trip; Playwright's 30s default is a test-harness limit, not a product SLA.
test.describe.configure({ timeout: 180_000 });

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Product Catalog (Storefront) — unknown routes', () => {
  test.use({
    captureOptions: { feature: 'Product Catalog Storefront Err Unknown Routes', plan: PLAN, axe: 'off', lighthouse: 'off' },
  });

  test('an unknown category slug and an unknown product slug both render the real 404 page', async ({ page, capture }) => {
    await capture.step('err-01', 'Navigate to a category slug that does not exist', null, async () => {
      await page.goto('/products/totally-bogus-category-slug-xyz');
      await expect(page.getByRole('heading', { name: 'Page Not Found', level: 1 })).toBeVisible();
      await expect(
        page.getByText('Looks like this page has been taken to the printers and never came back.'),
      ).toBeVisible();
      await expect(page.getByRole('link', { name: 'Go Home' })).toBeVisible();
      await expect(page.getByRole('link', { name: /Browse Products/ })).toBeVisible();
      await expect(page).toHaveTitle('Category Not Found | Urgent Printers');
    });

    await capture.step('err-02', 'Navigate to a product slug that does not exist inside a real category', null, async () => {
      await page.goto('/products/business-cards/totally-bogus-product-slug-xyz');
      await expect(page.getByRole('heading', { name: 'Page Not Found', level: 1 })).toBeVisible();
      await expect(page).toHaveTitle('Product Not Found | Urgent Printers');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Product Catalog (Storefront) — empty result states', () => {
  test.use({
    captureOptions: { feature: 'Product Catalog Storefront Err Empty Results', plan: PLAN, axe: 'off', lighthouse: 'off' },
  });

  test('every no-results state shows its own exact copy', async ({ page, capture }) => {
    await capture.step('err-03', 'Search the catalog for a term that matches nothing', null, async () => {
      await page.goto('/products?q=zzzznomatchxyz');
      await expect(page.getByRole('heading', { name: 'No products found' })).toBeVisible();
      await expect(
        page.getByText('No results for "zzzznomatchxyz". Try a different search term.'),
      ).toBeVisible();
      await expect(page.getByText('0 products for “zzzznomatchxyz”')).toBeVisible();
    });

    await capture.step('err-04', 'Apply a filter that matches nothing (the Eco Friendly tag)', null, async () => {
      await page.goto('/products');
      await page.locator('aside').getByLabel('Eco Friendly').click();
      await page.waitForURL(/tags=eco/);
      await expect(page.getByRole('heading', { name: 'No products found' })).toBeVisible();
      // The non-search description, distinct from err-03's.
      await expect(page.getByText('Try adjusting your filters or search for something else.')).toBeVisible();
      await expect(page.getByText(/^0 products$/)).toBeVisible();
    });

    await capture.step('err-05', 'Open the search page with a term that matches nothing', null, async () => {
      await page.goto('/search?q=zzzznomatchxyz');
      await expect(page.getByRole('heading', { name: 'No results for "zzzznomatchxyz"' })).toBeVisible();
      await expect(
        page.getByText('Try a different search term, or browse by category below.'),
      ).toBeVisible();
      await expect(page.getByText('0 products found')).toBeVisible();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Product Catalog (Storefront) — header search with no matches', () => {
  test.use({
    captureOptions: { feature: 'Product Catalog Storefront Err Header Search Empty', plan: PLAN, axe: 'off', lighthouse: 'off' },
  });

  test('the instant-search dropdown offers fallback suggestions when nothing matches', async ({ page, capture }) => {
    const searchInput = page.getByLabel('Search products');

    await capture.step('err-06', 'Open the catalog and focus the header search', null, async () => {
      await page.goto('/products');
      await searchInput.click();
      await expect(searchInput).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByText('Popular Searches')).toBeVisible();
    });

    await capture.type('err-07', 'Type a term that matches nothing', searchInput, 'zzzznomatchxyz');

    await capture.step('err-08', 'Observe the no-results suggestions', searchInput, async () => {
      // No matches means no options, so no role="listbox" is rendered — the panel holds the
      // suggestion copy directly (ARIA combobox pattern).
      await expect(page.getByText('No results for “zzzznomatchxyz”')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText('Try one of these instead:')).toBeVisible();
      await expect(page.getByRole('listbox')).toHaveCount(0);
      // POPULAR has 6 entries; the dropdown shows at most 5. The header nav's own
      // "Business Cards" is a link, so the button role disambiguates.
      await expect(page.getByRole('button', { name: 'Business Cards', exact: true })).toBeVisible();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Product Catalog (Storefront) — delivery check validation', () => {
  test.use({
    captureOptions: { feature: 'Product Catalog Storefront Err Delivery Check', plan: PLAN, axe: 'off', lighthouse: 'off' },
  });

  test('the pincode field sanitises input, gates submission, and surfaces both failure messages', async ({ page, capture }) => {
    const pincode = page.getByLabel('Pincode');
    const check = page.getByRole('button', { name: 'Check', exact: true });

    await capture.step('err-09', 'Open a product detail page', null, async () => {
      await page.goto('/products/business-cards/standard-business-cards');
      await expect(page.getByText('Check Delivery Date')).toBeVisible();
      await expect(pincode).toHaveAttribute('placeholder', 'Enter 6-digit pincode');
      await expect(check).toBeDisabled();
    });

    await capture.type('err-10', 'Type fewer than six digits', pincode, '1100');
    await capture.step('err-11', 'Confirm the Check button stays disabled below six digits', check, async (el) => {
      await expect(pincode).toHaveValue('1100');
      // PINCODE_RE = /^\d{6}$/ — the disabled button is the entire validation affordance;
      // there is deliberately no inline error message for this state.
      await expect(el).toBeDisabled();
    });

    await capture.type('err-12', 'Type letters and punctuation into the pincode field', pincode, 'ab12cd34ef');
    await capture.step('err-13', 'Confirm non-digits are stripped', pincode, async (el) => {
      // Two rules compose, in this order: the input's own maxLength={6} truncates the typed
      // string to 'ab12cd' before React sees it, then handlePincodeChange applies
      // value.replace(/\D/g, '').slice(0, 6) — leaving '12'.
      await expect(el).toHaveValue('12');
      await expect(check).toBeDisabled();
    });

    await capture.type('err-14', 'Type more than six digits', pincode, '1234567890');
    await capture.step('err-15', 'Confirm the value is truncated to six digits', pincode, async (el) => {
      await expect(el).toHaveValue('123456');
      await expect(check).toBeEnabled();
    });

    await capture.type('err-16', 'Enter a pincode the courier does not serve', pincode, '999999');
    await capture.step('err-17', 'Submit the non-serviceable pincode', check, async (el) => {
      await el.click();
      await expect(page.getByText('Not deliverable to this pincode')).toBeVisible({ timeout: 15_000 });
    });

    await capture.step('err-18', 'Force the serviceability request to fail', null, async () => {
      await page.route('**/shipping/serviceability**', (route) => route.abort('failed'));
      await pincode.fill('');
      await pincode.fill('560001');
      await check.click();
      // DeliveryCheck writes this with &apos; (U+0027), unlike the &rsquo; used elsewhere
      // in the app — the two are not interchangeable in a text matcher.
      await expect(
        page.getByText("Couldn't check delivery right now. Please try again in a bit."),
      ).toBeVisible({ timeout: 15_000 });
      await page.unroute('**/shipping/serviceability**');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Product Catalog (Storefront) — personalisation field validation', () => {
  test.use({
    captureOptions: { feature: 'Product Catalog Storefront Err Template Fields', plan: PLAN, axe: 'off', lighthouse: 'off' },
  });

  test('a required personalisation field blocks Add to Cart and names itself in both the inline error and the toast', async ({ page, capture }) => {
    // The only product in the dev DB with customization_mode 'both' and a required
    // template field. Its single field's label is literally "test", so the inline error
    // reads "test is required" (TemplateForm: `${field.label} is required`).
    const field = page.locator('textarea').first();

    await capture.step('err-19', 'Open a product that requires personalisation details', null, async () => {
      await page.goto('/products/stickers-labels/test');
      await expect(page.getByText('Personalise Your Print')).toBeVisible();
      await expect(field).toBeVisible();
    });

    await field.scrollIntoViewIfNeeded();
    await capture.step('err-20', 'Focus and blur the required field without filling it', field, async (el) => {
      await el.click();
      await el.blur();
      await expect(page.getByText('test is required')).toBeVisible();
    });

    const addToCart = page.getByRole('button', { name: /^Add to Cart · / });
    await addToCart.scrollIntoViewIfNeeded();
    await capture.step('err-21', 'Press Add to Cart with the required field still blank', addToCart, async (el) => {
      await el.click();
      await expect(page.getByText('Please fill in your print details')).toBeVisible({ timeout: 15_000 });
      // onBlockedByTemplate force-shows every required-field error and scrolls the section
      // into view. (The toast's own description is the comma-joined list of missing labels.)
      await expect(page.getByText('test is required')).toBeVisible();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Product Catalog (Storefront) — malformed catalog URLs', () => {
  test.use({
    captureOptions: { feature: 'Product Catalog Storefront Err Malformed Urls', plan: PLAN, axe: 'off', lighthouse: 'off' },
  });

  test('a non-numeric price bound and an unknown badge both degrade to an empty catalog rather than an error screen', async ({ page, capture }) => {
    await capture.step('err-22', 'Request the catalog with a non-numeric price bound', null, async () => {
      await page.goto('/products?min=abc');
      // Number('abc') is NaN -> the backend rejects min_price with 422 -> getProducts'
      // catch returns an empty page. The user sees an empty catalog, not an error.
      await expect(page.getByRole('heading', { name: 'No products found' })).toBeVisible();
      await expect(page.getByText('Try adjusting your filters or search for something else.')).toBeVisible();
      await expect(page.getByText(/^0 products$/)).toBeVisible();
    });

    await capture.step('err-23', 'Request the catalog with an unknown badge value', null, async () => {
      await page.goto('/products?badge=bogus');
      // ProductBadge is a backend enum -> 422 -> the same silent empty catalog.
      await expect(page.getByRole('heading', { name: 'No products found' })).toBeVisible();
      await expect(page.getByText(/^0 products$/)).toBeVisible();
    });
  });
});
