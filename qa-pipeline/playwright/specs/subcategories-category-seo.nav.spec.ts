// Hand-authored (see the Module 2 note in subcategories-category-seo.md).
// Navigation + discovery surfaces. axe runs per-step here: the mega-menu and the mobile
// drawer change page state substantially without navigating, which is exactly the case the
// per-navigation default would miss.
import { test, expect } from '../capture.js';
import {
  PLAN, CAT, CHILD_NAMES, ROOT_NAMES, ROOT_SLUGS, bringIntoView, productCardHrefs,
} from './subcategories-category-seo.helpers';

test.use({
  captureOptions: {
    feature: 'Subcategories Category SEO Navigation Surfaces',
    plan: PLAN,
    axe: 'per-step',
    lighthouse: 'off',
  },
});

test.describe('Subcategories and category SEO (Storefront) — navigation and discovery', () => {
  test.describe.configure({ timeout: 420_000 });

  test('mega-menu, mobile drawer, top-level-only surfaces and shelf dedupe', async ({ page, capture }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('nav[aria-label="Main navigation"]')).toBeVisible({ timeout: 90_000 });

    // ── alt-10: the desktop mega-menu nests children under their parents ──
    const shopTrigger = page.locator('nav[aria-label="Main navigation"]').getByRole('button', { name: 'Shop' });
    await capture.step('alt-10', 'Open the header Shop mega-menu panel', shopTrigger, async (el) => {
      await el.click();
      await expect(el).toHaveAttribute('aria-expanded', 'true');
      const panel = page.locator(`#${(await el.getAttribute('aria-controls'))!}`);
      await expect(panel.getByRole('heading', { name: 'Shop by occasion' })).toBeVisible({ timeout: 30_000 });

      // Marketing Prints is a top-level <li> whose own sub-list holds both children.
      const parentItem = panel.locator('li').filter({
        has: page.locator(`a[href="/products/${CAT.parent.slug}"]`),
      }).first();
      await expect(parentItem.locator(`a[href="/products/${CAT.childFlyers.slug}"]`)).toBeVisible();
      await expect(parentItem.locator(`a[href="/products/${CAT.childPosters.slug}"]`)).toBeVisible();

      // Same for the other parent in the tree.
      const stickersItem = panel.locator('li').filter({
        has: page.locator(`a[href="/products/${CAT.stickers.slug}"]`),
      }).first();
      await expect(stickersItem.locator(`a[href="/products/${CAT.childDiecut.slug}"]`)).toBeVisible();

      // A child must never be promoted to a top-level tile of its own.
      await expect(panel.locator('ul').first().locator(':scope > li')).toHaveCount(ROOT_NAMES.length);
    });

    // ── alt-11: the mobile drawer at 375px, with its disclosure button ──
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const openMenu = page.getByRole('button', { name: 'Open menu' });
    await expect(openMenu).toBeVisible({ timeout: 90_000 });
    await openMenu.click();
    // Located by aria-controls, not by accessible name: the name itself flips from
    // "Show …" to "Hide …" on click, so a name-based locator stops matching mid-step.
    const showSubs = page.locator(`button[aria-controls="mobile-cat-${CAT.parent.slug}"]`);
    await expect(showSubs).toBeVisible({ timeout: 30_000 });
    await capture.step('alt-11', 'Expand the Marketing Prints row in the mobile drawer', showSubs, async (el) => {
      // Children are hidden until the row is expanded.
      await expect(page.locator(`#mobile-cat-${CAT.parent.slug}`)).toBeHidden();
      await expect(el).toHaveAttribute('aria-label', `Show ${CAT.parent.name} subcategories`);
      await el.click();
      await expect(el).toHaveAttribute('aria-expanded', 'true');
      // The accessible name flips, so a screen reader hears the new action, not the old one.
      await expect(el).toHaveAttribute('aria-label', `Hide ${CAT.parent.name} subcategories`);
      await expect(page.getByRole('button', { name: `Hide ${CAT.parent.name} subcategories` })).toBeVisible();
      const panel = page.locator(`#mobile-cat-${CAT.parent.slug}`);
      await expect(panel).toBeVisible();
      await expect(panel.locator(`a[href="/products/${CAT.childFlyers.slug}"]`)).toBeVisible();
      await expect(panel.locator(`a[href="/products/${CAT.childPosters.slug}"]`)).toBeVisible();
      // Indented via an inline paddingLeft of 12 + depth*16 px.
      await expect(panel.locator(`a[href="/products/${CAT.childPosters.slug}"]`)).toHaveAttribute(
        'style', /padding-left:\s*28px/,
      );
    });
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 1280, height: 720 });

    // ── alt-12: the homepage "All Categories" rail stays top-level only ──
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const rail = page.locator('section[aria-labelledby="category-rail-heading"]');
    await expect(rail).toBeAttached({ timeout: 90_000 });
    await bringIntoView(rail);
    await capture.step('alt-12', 'Inspect the homepage All Categories rail', rail, async (el) => {
      await expect(el.getByRole('heading', { name: 'All Categories' })).toBeVisible({ timeout: 30_000 });
      for (const slug of ROOT_SLUGS) {
        await expect(el.locator(`a[href="/products/${slug}"]`).first()).toBeAttached();
      }
      // No child category earns a rail tile of its own.
      for (const slug of [CAT.childFlyers.slug, CAT.childPosters.slug, CAT.childDiecut.slug]) {
        await expect(el.locator(`a[href="/products/${slug}"]`)).toHaveCount(0);
      }
    });

    // ── alt-15: a rolled-up parent shelf and a child shelf must not repeat a product ──
    await capture.step('alt-15', 'Scan every homepage product card for repeats', null, async () => {
      // Shelves render lazily on scroll; walk the page so every card is mounted first.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
        window.scrollTo(0, 0);
      });
      const hrefs = await productCardHrefs(page);
      expect(hrefs.length, 'expected product cards on the homepage').toBeGreaterThan(0);
      expect(new Set(hrefs).size, `duplicate product cards: ${hrefs.join(', ')}`).toBe(hrefs.length);
    });

    // ── alt-13: /search's "Browse by Category" grid stays top-level only ──
    await page.goto('/search', { waitUntil: 'domcontentloaded' });
    const browseHeading = page.getByRole('heading', { name: 'Browse by Category' });
    await expect(browseHeading).toBeVisible({ timeout: 90_000 });
    const browseGrid = page.locator('section').filter({ has: browseHeading }).first();
    await bringIntoView(browseGrid);
    await capture.step('alt-13', 'Inspect the search page Browse by Category grid', browseGrid, async (el) => {
      await expect(el.locator('a[href^="/products/"]')).toHaveCount(ROOT_NAMES.length);
      for (const name of ROOT_NAMES) {
        await expect(el.getByRole('link', { name })).toBeVisible();
      }
      for (const name of CHILD_NAMES) {
        await expect(el.getByRole('link', { name })).toHaveCount(0);
      }
    });

    // ── alt-14: the listing sidebar filter shows children indented under their parent ──
    await page.goto('/products', { waitUntil: 'domcontentloaded' });
    const sidebar = page.locator('aside').first();
    await expect(sidebar.getByText('Filters')).toBeVisible({ timeout: 90_000 });
    // nestCategories yields 9 rows against a visible limit of 6, so the children of the last
    // roots sit behind the disclosure.
    const showAll = sidebar.getByRole('button', { name: /Show all 9 categories/ });
    await expect(showAll).toBeVisible({ timeout: 30_000 });
    await capture.step('alt-14', 'Expand the sidebar Category filter and check child indentation', showAll, async (el) => {
      await el.click();
      const labels = sidebar.locator('label:has(input[name="category"])');
      // "All Products" + 6 roots + 3 children.
      await expect(labels).toHaveCount(10);
      const rows = await labels.evaluateAll((els) =>
        els.map((row) => ({
          name: (row.textContent ?? '').trim(),
          indented: row.className.includes('pl-5'),
        })),
      );
      // Each child sits immediately after its parent and is the indented one.
      expectAdjacentIndented(rows, CAT.parent.name, CAT.childFlyers.name);
      expectAdjacentIndented(rows, CAT.childFlyers.name, CAT.childPosters.name);
      expectAdjacentIndented(rows, CAT.stickers.name, CAT.childDiecut.name);
      // Roots themselves are never indented.
      for (const name of ROOT_NAMES) {
        expect(rows.find((r) => r.name === name)?.indented, `${name} must not be indented`).toBe(false);
      }
    });
  });
});

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function expectAdjacentIndented(
  rows: { name: string; indented: boolean }[],
  before: string,
  child: string,
): void {
  const i = rows.findIndex((r) => r.name === before);
  expect(i, `${before} missing from the category filter`).toBeGreaterThanOrEqual(0);
  expect(rows[i + 1]?.name, `${child} must follow ${before}`).toBe(child);
  expect(rows[i + 1]?.indented, `${child} must be indented`).toBe(true);
}
