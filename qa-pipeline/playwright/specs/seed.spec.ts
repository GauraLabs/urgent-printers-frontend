import { test, expect } from '@playwright/test';

// Playwright's generator/planner/healer agents use this as their starting point via
// generator_setup_page — it must be a single bare test(), not wrapped in test.describe(),
// or the MCP tool's seed-execution driver fails with "did not expect test.describe() to be
// called here" before any browser interaction happens. It just needs to prove the dev server
// (booted by ../playwright.config.js's dev_command, or already running) actually answers
// before a scenario navigates further.
test('app is reachable', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/.+/);
});
