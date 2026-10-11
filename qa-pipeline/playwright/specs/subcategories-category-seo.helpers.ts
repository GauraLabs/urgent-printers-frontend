// Shared grounding for the "Subcategories and category SEO" storefront specs.
// Hand-authored — see pipeline/README.md's "The hand-authoring fallback" and the Module 2
// note at the top of subcategories-category-seo.md for why the MCP-driven Generator agent
// isn't in use here. Every locator below is grounded in the component source the plan cites.
import { expect, type Locator, type Page } from '@playwright/test';

export const PLAN = 'qa-pipeline/artifacts/plans/subcategories-category-seo-plan.json';

/** The live dev catalog this run reads. Read-only: nothing here is created, moved or deleted. */
export const CAT = {
  parent: { slug: 'marketing-prints', name: 'Marketing Prints' },
  childFlyers: { slug: 'flyers-leaflets', name: 'Flyers & Leaflets' },
  childPosters: { slug: 'posters', name: 'Posters' },
  stickers: { slug: 'stickers-labels', name: 'Stickers & Labels' },
  childDiecut: { slug: 'die-cut-stickers', name: 'Die-cut Stickers' },
} as const;

/** The 6 top-level categories, in the backend's own order. */
export const ROOT_NAMES = [
  'Banners & Flex',
  'Business Cards',
  'Mugs & Promotional',
  'Stickers & Labels',
  'T-Shirts & Apparel',
  'Marketing Prints',
] as const;

export const ROOT_SLUGS = [
  'banners-flex',
  'business-cards',
  'mugs-promotional',
  'stickers-labels',
  't-shirts-apparel',
  'marketing-prints',
] as const;

export const CHILD_NAMES = ['Die-cut Stickers', 'Flyers & Leaflets', 'Posters'] as const;

export const MOVED_PRODUCT = {
  name: 'Custom Die-Cut Stickers',
  slug: 'custom-diecut-stickers',
  id: 16,
  oldPath: '/products/stickers-labels/custom-diecut-stickers',
  newPath: '/products/die-cut-stickers/custom-diecut-stickers',
} as const;

export const CONTACT_PHONE = '+91 95281 91807';

/** The FAQ whose answer carries bare '<' and '>' in prose — must survive tag stripping. */
export const FAQ_SIZES = {
  question: 'What sizes do you print?',
  answer: 'Sizes < 5 inch and > 3 inch are available as custom cuts, alongside standard A6 to A3.',
} as const;

export const FAQ_DELIVERY = {
  question: 'How fast is delivery?',
  answer: 'Most marketing prints ship within 2 to 3 working days of artwork approval.',
} as const;

/**
 * Canonical origin as the running app computes it (lib/seo/site.ts reads
 * NEXT_PUBLIC_SITE_URL, which is http://localhost:3000 in this dev environment). Derived from
 * the page rather than hardcoded, so a localhost run doesn't fail for the wrong reason and a
 * production run doesn't pass for the wrong one.
 */
export function siteOrigin(page: Page): string {
  return new URL(page.url()).origin;
}

/** All JSON-LD blocks on the page, parsed. Streamed blocks inside Suspense are included. */
export async function jsonLdBlocks(page: Page): Promise<Record<string, unknown>[]> {
  const raw = await page.locator('script[type="application/ld+json"]').allTextContents();
  return raw.map((text) => JSON.parse(text) as Record<string, unknown>);
}

/** The single JSON-LD block of a given @type. Fails loudly if absent or duplicated. */
export async function jsonLd(page: Page, type: string): Promise<Record<string, unknown>> {
  const matches = (await jsonLdBlocks(page)).filter((b) => b['@type'] === type);
  expect(matches, `expected exactly one ${type} JSON-LD block`).toHaveLength(1);
  return matches[0];
}

interface ListItem {
  name: string;
  item: string;
}

/** BreadcrumbList names in order, e.g. ['Home', 'All Products', 'Marketing Prints']. */
export async function breadcrumbJsonLdNames(page: Page): Promise<string[]> {
  const block = await jsonLd(page, 'BreadcrumbList');
  return (block.itemListElement as ListItem[]).map((i) => i.name);
}

export async function breadcrumbJsonLdItems(page: Page): Promise<string[]> {
  const block = await jsonLd(page, 'BreadcrumbList');
  return (block.itemListElement as ListItem[]).map((i) => i.item);
}

/**
 * The visible breadcrumb trail. components/common/Breadcrumb.tsx renders Home as an icon with
 * an sr-only "Home" label, then one <span> per item, so textContent (not innerText) is what
 * sees the whole trail.
 */
export async function visibleCrumbs(page: Page): Promise<string[]> {
  const nav = page.locator('nav[aria-label="Breadcrumb"]').first();
  await expect(nav).toBeAttached({ timeout: 30_000 });
  return nav.evaluate((el) =>
    Array.from(el.children)
      .map((child) => (child.textContent ?? '').replace(/\s+/g, ' ').trim())
      .filter(Boolean),
  );
}

export function robotsMeta(page: Page): Locator {
  return page.locator('head meta[name="robots"]');
}

export async function robotsContent(page: Page): Promise<string | null> {
  const meta = robotsMeta(page);
  return (await meta.count()) === 0 ? null : meta.first().getAttribute('content');
}

export async function canonicalHref(page: Page): Promise<string | null> {
  return page.locator('head link[rel="canonical"]').first().getAttribute('href');
}

export async function metaDescription(page: Page): Promise<string | null> {
  return page.locator('head meta[name="description"]').first().getAttribute('content');
}

/** The SubcategoryTiles block: a <nav> whose heading is "Shop <Parent> by type". */
export function subcategoryTiles(page: Page, parentName: string): Locator {
  // Located via the heading, not the aria-label: CategoryChipBar's row <nav> carries the
  // identical aria-label="<Parent> subcategories" on the same page (a real landmark-unique
  // finding, recorded in the plan's edge cases), so the aria-label alone is ambiguous.
  return page
    .locator('nav')
    .filter({ has: page.getByRole('heading', { name: `Shop ${parentName} by type` }) })
    .first();
}

export function relatedSubcategories(page: Page): Locator {
  return page.locator('nav[aria-label="Related categories"]');
}

/** One card per product: ProductCard's full-card stretched <Link> carries aria-label={name}. */
export function productCard(page: Page, name: string): Locator {
  return page.locator('article').filter({ has: page.locator(`a[aria-label="${name}"]`) }).first();
}

/** Hrefs of every product card on the current page, deduped by the stretched link. */
export async function productCardHrefs(page: Page): Promise<string[]> {
  return page.locator('article a[aria-label]').evaluateAll((els) =>
    els
      .map((el) => (el as HTMLAnchorElement).getAttribute('href') ?? '')
      .filter((href) => /^\/products\/[^/?#]+\/[^/?#]+/.test(href))
      .map((href) => href.split('?')[0]),
  );
}

/** Scroll into view so the capture screenshot shows what the step is asserting. */
export async function bringIntoView(locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded({ timeout: 15_000 }).catch(() => {});
}
