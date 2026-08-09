import { test, expect } from '@playwright/test';

test.describe('seed', () => {
  test('app is reachable', async ({ page }) => {
    // Playwright's generator/planner/healer agents use this as their starting point —
    // it just needs to prove the dev server (booted by ../playwright.config.js's
    // dev_command, or already running) actually answers before a scenario navigates further.
    await page.goto('/');
    await expect(page).toHaveURL(/.+/);
  });
});
