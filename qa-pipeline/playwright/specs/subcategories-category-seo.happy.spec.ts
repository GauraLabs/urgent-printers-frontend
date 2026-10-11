// Hand-authored — see pipeline/README.md's "The hand-authoring fallback" and the Module 2
// note in subcategories-category-seo.md. Read-only against the dev catalog: this spec creates,
// moves and deletes nothing.
import { test, expect } from '../capture.js';
import {
  PLAN, CAT, FAQ_SIZES, FAQ_DELIVERY, bringIntoView, breadcrumbJsonLdItems,
  breadcrumbJsonLdNames, canonicalHref, jsonLd, metaDescription, productCard,
  relatedSubcategories, robotsMeta, siteOrigin, subcategoryTiles, visibleCrumbs,
} from './subcategories-category-seo.helpers';

test.use({
  captureOptions: {
    feature: 'Subcategories Category SEO Happy Path',
    plan: PLAN,
    axe: 'per-navigation',
    lighthouse: 'on',
  },
});

test.describe('Subcategories and category SEO (Storefront) — happy path', () => {
  test.describe.configure({ timeout: 420_000 });

  test('parent category page: tiles, rollup, intro, FAQ and structured data', async ({ page, capture }) => {
    // ── hp-01: a parent with zero DIRECT products still renders a full page ──
    await capture.step('hp-01', 'Open the parent category page /products/marketing-prints', null, async () => {
      const res = await page.goto(`/products/${CAT.parent.slug}`, { waitUntil: 'domcontentloaded' });
      expect(res?.status(), 'parent category page must be a real 200').toBe(200);
      await expect(page.getByRole('heading', { level: 1, name: CAT.parent.name })).toBeVisible({ timeout: 60_000 });
    });

    await capture.lighthouseCheckpoint('initial_load');

    // ── hp-02: metadata comes from the admin meta_title/meta_description, with a self-canonical ──
    await capture.step('hp-02', 'Read the title, meta description and canonical link', null, async () => {
      await expect(page).toHaveTitle('Marketing Prints – Flyers, Posters & More | Urgent Printers');
      expect(await metaDescription(page)).toBe(
        'Order custom flyers, leaflets, posters and more marketing prints online. Fast turnaround, sharp colour and bulk pricing for every business.',
      );
      expect(await canonicalHref(page)).toBe(`${siteOrigin(page)}/products/${CAT.parent.slug}`);
      // A root category with products is indexable, so Next emits no robots meta at all.
      await expect(robotsMeta(page)).toHaveCount(0);
    });

    // ── hp-03: seo_intro renders above the grid, not the bare category description ──
    const intro = page.getByText('Marketing prints are printed promotional materials', { exact: false }).first();
    await capture.step('hp-03', 'Read the answer-first intro paragraph under the h1', intro, async (el) => {
      await expect(el).toBeVisible({ timeout: 30_000 });
      await expect(el).toContainText('Urgent Printers delivers them fast, in any quantity, with sharp colour.');
      // The fallback branch (plain `description`) must not also render.
      await expect(page.getByText('Printed marketing collateral for promoting your business.')).toHaveCount(0);
    });

    // ── hp-04: visible breadcrumb ──
    const crumbNav = page.locator('nav[aria-label="Breadcrumb"]').first();
    await capture.step('hp-04', 'Check the visible breadcrumb trail', crumbNav, async () => {
      expect(await visibleCrumbs(page)).toEqual(['Home', 'All Products', 'Marketing Prints']);
      await expect(crumbNav.getByRole('link', { name: 'All Products' })).toBeVisible();
      // The current page is text, not a link.
      await expect(crumbNav.locator('[aria-current="page"]')).toHaveText(CAT.parent.name);
    });

    // ── hp-05: BreadcrumbList JSON-LD matches the visible trail exactly ──
    await capture.step('hp-05', 'Read the BreadcrumbList JSON-LD', null, async () => {
      expect(await breadcrumbJsonLdNames(page)).toEqual(['Home', 'All Products', 'Marketing Prints']);
      const origin = siteOrigin(page);
      expect(await breadcrumbJsonLdItems(page)).toEqual([
        origin,
        `${origin}/products`,
        `${origin}/products/${CAT.parent.slug}`,
      ]);
    });

    // ── hp-06: subcategory tiles with rolled-up counts ──
    const tiles = subcategoryTiles(page, CAT.parent.name);
    await bringIntoView(tiles);
    await capture.step('hp-06', 'Check the subcategory tiles above the product grid', tiles, async (el) => {
      await expect(el).toBeVisible({ timeout: 30_000 });
      await expect(el.locator('li')).toHaveCount(2);
      const flyers = el.getByRole('link', { name: new RegExp(CAT.childFlyers.name.replace('&', '&')) }).first();
      await expect(flyers).toHaveAttribute('href', `/products/${CAT.childFlyers.slug}`);
      await expect(el.getByRole('link', { name: /Posters/ }).first()).toHaveAttribute('href', `/products/${CAT.childPosters.slug}`);
      // One product each -> singular wording, from the rolled-up count.
      await expect(el.getByText('1 product', { exact: true })).toHaveCount(2);
      await expect(el.getByText('1 products')).toHaveCount(0);
    });

    // ── hp-07: the listing rolls descendants up into a parent that owns nothing directly ──
    const flyersCard = productCard(page, 'A5 Flyers');
    await bringIntoView(flyersCard);
    await capture.step('hp-07', 'Check the product grid rolls both descendants up into the parent', flyersCard, async (el) => {
      await expect(el).toBeVisible({ timeout: 30_000 });
      await expect(productCard(page, 'A2 Posters')).toBeVisible();
      // Each card links to the product's own child-category path, not the parent's.
      await expect(el.locator('a[aria-label="A5 Flyers"]')).toHaveAttribute(
        'href', new RegExp(`^/products/${CAT.childFlyers.slug}/a5-flyers`),
      );
      await expect(page.getByText('No products found')).toHaveCount(0);
    });

    // ── hp-08: CollectionPage/ItemList points at the products' canonical child paths ──
    await capture.step('hp-08', 'Read the CollectionPage/ItemList JSON-LD', null, async () => {
      const block = await jsonLd(page, 'CollectionPage');
      expect(block.name).toBe(CAT.parent.name);
      expect(block.url).toBe(`${siteOrigin(page)}/products/${CAT.parent.slug}`);
      const list = block.mainEntity as { numberOfItems: number; itemListElement: { url: string; name: string }[] };
      expect(list.numberOfItems).toBe(2);
      expect(list.itemListElement.map((i) => i.name).sort()).toEqual(['A2 Posters', 'A5 Flyers']);
      expect(list.itemListElement.map((i) => i.url).sort()).toEqual([
        `${siteOrigin(page)}/products/${CAT.childFlyers.slug}/a5-flyers`,
        `${siteOrigin(page)}/products/${CAT.childPosters.slug}/a2-posters`,
      ]);
    });

    // ── hp-09: FAQ accordion below the grid; '<' and '>' survive as prose ──
    const faqSummary = page.locator('summary').filter({ hasText: FAQ_SIZES.question }).first();
    await bringIntoView(faqSummary);
    await capture.step('hp-09', 'Expand the first category FAQ', faqSummary, async (el) => {
      await expect(page.getByRole('heading', { name: `${CAT.parent.name} FAQs` })).toBeVisible({ timeout: 30_000 });
      await expect(page.locator('details')).toHaveCount(2);
      await el.click();
      const answer = page.locator('details').filter({ hasText: FAQ_SIZES.question }).first().locator('p');
      await expect(answer).toBeVisible();
      // The bare comparison operators are the point: toPlainText must not treat them as tags.
      await expect(answer).toHaveText(FAQ_SIZES.answer);
    });

    // ── hp-10: FAQPage markup equals the visible accordion (no markup-only FAQ) ──
    await capture.step('hp-10', 'Read the FAQPage JSON-LD and compare to the visible accordion', null, async () => {
      const block = await jsonLd(page, 'FAQPage');
      const entities = block.mainEntity as { name: string; acceptedAnswer: { text: string } }[];
      expect(entities).toHaveLength(2);
      expect(entities.map((q) => q.name)).toEqual([FAQ_SIZES.question, FAQ_DELIVERY.question]);
      expect(entities.map((q) => q.acceptedAnswer.text)).toEqual([FAQ_SIZES.answer, FAQ_DELIVERY.answer]);
      // Every marked-up answer must also be on the page.
      for (const q of entities) {
        await expect(page.locator('details').filter({ hasText: q.name }).first()).toContainText(q.acceptedAnswer.text);
      }
    });

    // ── hp-11: drill into a child via its tile ──
    const postersTile = subcategoryTiles(page, CAT.parent.name).getByRole('link', { name: /Posters/ }).first();
    await bringIntoView(postersTile);
    await capture.step('hp-11', 'Click the Posters subcategory tile', postersTile, async (el) => {
      await el.click();
      await page.waitForURL(`**/products/${CAT.childPosters.slug}`, { timeout: 60_000 });
      await expect(page.getByRole('heading', { level: 1, name: CAT.childPosters.name })).toBeVisible({ timeout: 60_000 });
    });

    // ── hp-12: the child's breadcrumb carries the parent, and the sibling row renders ──
    const related = relatedSubcategories(page);
    await bringIntoView(related);
    await capture.step('hp-12', 'Check the child breadcrumb and the sibling row', related, async (el) => {
      expect(await visibleCrumbs(page)).toEqual(['Home', 'All Products', 'Marketing Prints', 'Posters']);
      await expect(el).toBeVisible({ timeout: 30_000 });
      await expect(el.getByRole('heading', { name: `More from ${CAT.parent.name}` })).toBeVisible();
      await expect(el.getByRole('link', { name: `Shop all ${CAT.parent.name}` })).toHaveAttribute(
        'href', `/products/${CAT.parent.slug}`,
      );
      await expect(el.getByRole('link', { name: CAT.childFlyers.name })).toHaveAttribute(
        'href', `/products/${CAT.childFlyers.slug}`,
      );
      // The page's own category is not listed as its own sibling.
      await expect(el.getByRole('link', { name: CAT.childPosters.name, exact: true })).toHaveCount(0);
    });

    await capture.lighthouseCheckpoint('final_state');
  });
});
