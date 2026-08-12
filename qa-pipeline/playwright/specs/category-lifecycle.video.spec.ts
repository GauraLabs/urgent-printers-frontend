// Produces the storefront half of the ONE combined admin->storefront demo video — see
// pipeline/README.md and this feature's shot list. Picks up the "Wedding Invitations & Save
// the Dates" category created and renamed by
// urgent-printers-admin-panel/qa-pipeline/playwright/specs/category-lifecycle.video.spec.ts.
import { test, expect } from '../capture.js';

test.use({
  captureOptions: {
    feature: 'Category Lifecycle Storefront',
    plan: 'qa-pipeline/artifacts/plans/category-storefront-visibility-plan.json',
    axe: 'off',
    lighthouse: 'off',
  },
});

const CATEGORY_NAME = 'Wedding Invitations & Save the Dates';

test.describe('Category Lifecycle — the new category shows up on the storefront', () => {
  test('the category admin just created and renamed is visible on the homepage and its own page', async ({ page, capture }) => {
    const tile = page
      .getByRole('heading', { name: CATEGORY_NAME, level: 3 })
      .locator('xpath=ancestor::a[1]');

    await capture.step('hp-01', 'Load the homepage', null, () => page.goto('/'));
    await expect(page.getByRole('heading', { name: 'Shop by Category' })).toBeVisible();
    await expect(tile).toBeVisible();
    await tile.scrollIntoViewIfNeeded();

    await capture.step('hp-02', 'Click the new category tile', tile, async (el) => {
      await el.click();
      await page.waitForURL('**/products/wedding-invitations');
    });

    await capture.step('hp-03', "Observe the category page — admin's name and description, live", null, async () => {
      await expect(page.getByRole('heading', { name: CATEGORY_NAME, level: 1 })).toBeVisible();
      await expect(page.getByText('Premium wedding invitations on luxe cardstock')).toBeVisible();
    });
  });
});
