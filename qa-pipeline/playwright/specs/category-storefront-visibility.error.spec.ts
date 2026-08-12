// Hand-authored — see ../../../pipeline/README.md's "Known infra findings".
import { test, expect } from '../capture.js';

test.describe('Category Storefront Visibility — err-01 unmatched slug', () => {
  test.use({
    captureOptions: {
      feature: 'Category Storefront Err01 Unmatched Slug',
      plan: 'qa-pipeline/artifacts/plans/category-storefront-visibility-plan.json',
      axe: 'off',
      lighthouse: 'off',
    },
  });

  test('a category route with a slug that does not exist renders the real 404 page', async ({ page, capture }) => {
    await capture.step('err-01', 'Navigate to a category slug that does not exist', null, async () => {
      await page.goto('/products/totally-bogus-category-slug-xyz');
      await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible();
      await expect(page.getByText(/taken to the printers/i)).toBeVisible();
    });
  });
});

test.describe('Category Storefront Visibility — edge-03 search-query redirect ordering', () => {
  test.use({
    captureOptions: {
      feature: 'Category Storefront Edge Search Redirect Ordering',
      plan: 'qa-pipeline/artifacts/plans/category-storefront-visibility-plan.json',
      axe: 'off',
      lighthouse: 'off',
    },
  });

  test('a bogus category slug with a search query redirects to search instead of 404ing', async ({ page, capture }) => {
    await capture.step('edg-01', 'Navigate to a bogus category slug with a ?q= search param present', null, async () => {
      await page.goto('/products/totally-bogus-category-slug-xyz?q=business');
      // Per the plan's edge-03: the redirect-to-search happens BEFORE the category lookup,
      // so this must NOT show the 404 page even though the category genuinely doesn't exist.
      await page.waitForURL('**/products?q=business');
      await expect(page.getByRole('heading', { name: 'Page Not Found' })).toHaveCount(0);
    });
  });
});

test.describe('Category Storefront Visibility — edge-04 category with no uploaded thumbnail', () => {
  test.use({
    captureOptions: {
      feature: 'Category Storefront Edge Placeholder Image',
      plan: 'qa-pipeline/artifacts/plans/category-storefront-visibility-plan.json',
      axe: 'off',
      lighthouse: 'off',
    },
  });

  test('every homepage category tile image actually resolves (no broken img / no silent placeholder masking a real gap)', async ({ page, capture }) => {
    await capture.step('edg-01', 'Load the homepage and check every category tile image request', null, async () => {
      const failedImages = [];
      page.on('requestfailed', (req) => {
        if (req.resourceType() === 'image') failedImages.push(req.url());
      });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      expect(failedImages, `broken category tile images: ${JSON.stringify(failedImages)}`).toHaveLength(0);
    });
  });
});
