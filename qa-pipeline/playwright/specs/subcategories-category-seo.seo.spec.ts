// Hand-authored (see the Module 2 note in subcategories-category-seo.md).
// Machine-readable SEO surfaces: sitemap, robots, llms.txt, the shared phone constant, and
// the deliberate absence of loading.tsx under app/products/.
import { readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '../capture.js';
import { PLAN, CAT, CONTACT_PHONE, bringIntoView, siteOrigin } from './subcategories-category-seo.helpers';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

test.use({
  captureOptions: {
    feature: 'Subcategories Category SEO Machine Surfaces',
    plan: PLAN,
    axe: 'per-navigation',
    lighthouse: 'off',
  },
});

test.describe('Subcategories and category SEO (Storefront) — machine-readable surfaces', () => {
  test.describe.configure({ timeout: 420_000 });

  test('sitemap, robots, llms.txt, phone parity and the no-loading.tsx guard', async ({ page, capture }) => {
    // A page visit first, so siteOrigin() and the capture screenshots have something real.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('footer')).toBeAttached({ timeout: 90_000 });
    const origin = siteOrigin(page);

    // ── alt-16: thin subcategories out, their products in, the parent in ──
    await capture.step('alt-16', 'Fetch /sitemap.xml and inspect the <loc> set', null, async () => {
      const res = await page.request.get('/sitemap.xml');
      expect(res.status()).toBe(200);
      const xml = await res.text();
      const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

      // The indexable parent is listed.
      expect(locs).toContain(`${origin}/products/${CAT.parent.slug}`);
      // The thin subcategories (1 rolled-up product each, below the threshold of 3) are not.
      for (const slug of [CAT.childFlyers.slug, CAT.childPosters.slug, CAT.childDiecut.slug]) {
        expect(locs, `${slug} is thin and must be excluded`).not.toContain(`${origin}/products/${slug}`);
      }
      // Their PRODUCTS are still indexable and keyed off the active-slug set, not that filter.
      expect(locs).toContain(`${origin}/products/${CAT.childFlyers.slug}/a5-flyers`);
      expect(locs).toContain(`${origin}/products/${CAT.childPosters.slug}/a2-posters`);
      expect(locs).toContain(`${origin}/products/${CAT.childDiecut.slug}/custom-diecut-stickers`);
      // The moved product's OLD path must not be advertised.
      expect(locs).not.toContain(`${origin}/products/${CAT.stickers.slug}/custom-diecut-stickers`);
      // The static pages are still there, and a real catalog was fetched (not the fallback).
      expect(locs).toContain(origin);
      expect(locs).toContain(`${origin}/products`);
      expect(locs.filter((l) => /\/products\/[^/]+\/[^/]+$/.test(l)).length).toBeGreaterThanOrEqual(10);
      // next-sitemap's old junk asset URLs are gone with the static build step.
      expect(locs.some((l) => /\.(png|webmanifest)$/.test(l))).toBe(false);
    });

    // ── alt-17: robots.ts replaced the static next-sitemap output ──
    await capture.step('alt-17', 'Fetch /robots.txt', null, async () => {
      const res = await page.request.get('/robots.txt');
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toContain('text/plain');
      const body = await res.text();
      expect(body).toContain('User-Agent: *');
      expect(body).toContain('Allow: /');
      for (const path of ['/cart', '/checkout', '/account', '/auth', '/api/', '/proof-approval/']) {
        expect(body, `${path} must be disallowed`).toContain(`Disallow: ${path}`);
      }
      for (const bot of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']) {
        expect(body, `${bot} must have an explicit rule`).toContain(bot);
      }
      expect(body).toContain(`Sitemap: ${origin}/sitemap.xml`);
      // The deprecated next-sitemap "Host:" directive must be gone.
      expect(body).not.toContain('Host:');
    });

    // ── alt-18: llms.txt mirrors the indexable tree and the real phone number ──
    await capture.step('alt-18', 'Fetch /llms.txt', null, async () => {
      const res = await page.request.get('/llms.txt');
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toContain('text/plain');
      const body = await res.text();
      expect(body.startsWith('# Urgent Printers')).toBe(true);
      expect(body).toContain('## Shop');
      expect(body).toContain(`- [All products](${origin}/products): the full catalogue`);
      expect(body).toContain(
        `- [${CAT.parent.name}](${origin}/products/${CAT.parent.slug}): Printed marketing collateral for promoting your business.`,
      );
      // Same indexability rule as the sitemap: thin children are omitted.
      for (const slug of [CAT.childFlyers.slug, CAT.childPosters.slug, CAT.childDiecut.slug]) {
        expect(body, `${slug} is thin and must be omitted`).not.toContain(`${origin}/products/${slug})`);
      }
      expect(body).toContain('## Policies and help');
      expect(body).toContain(`- Phone: ${CONTACT_PHONE}`);
      expect(body.trimEnd().endsWith(`Sitemap: ${origin}/sitemap.xml`)).toBe(true);
    });

    // ── alt-19: one phone constant behind the footer, /contact, llms.txt and Organization JSON-LD ──
    const footerPhone = page.locator('footer a[href="tel:+919528191807"]');
    await bringIntoView(footerPhone);
    await capture.step('alt-19', 'Check the footer and /contact phone against the SEO constant', footerPhone, async (el) => {
      await expect(el).toHaveText(CONTACT_PHONE);
      // The homepage Organization markup advertises the same number in E.164-dashed form.
      const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
      const org = blocks.map((b) => JSON.parse(b)).find((b) => b['@type'] === 'Organization');
      expect(org, 'homepage must carry Organization JSON-LD').toBeTruthy();
      expect(org.contactPoint.telephone).toBe('+91-95281-91807');

      await page.goto('/contact', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(CONTACT_PHONE).first()).toBeVisible({ timeout: 90_000 });
      // The old placeholder must be gone everywhere.
      await expect(page.getByText('1800-123-4567')).toHaveCount(0);
    });

    // ── alt-20: no loading.tsx under app/products/ — this is what keeps 308/404 real ──
    await capture.step('alt-20', 'Confirm no loading.tsx exists anywhere under app/products/', null, async () => {
      const found = findFiles(join(REPO_ROOT, 'app/products'), 'loading.tsx');
      expect(
        found,
        'a route-level loading.tsx under app/products/ flushes HTTP 200 before notFound()/permanentRedirect() can set the status',
      ).toEqual([]);
      // The replacement is the page's own Suspense fallback, which must still exist.
      const skeletons = findFiles(join(REPO_ROOT, 'components/common'), 'ProductListingSkeleton.tsx');
      expect(skeletons.length).toBe(1);
      // And it must actually render: the category page's Suspense fallback is the listing skeleton.
      await page.goto(`/products/${CAT.parent.slug}`, { waitUntil: 'commit' });
      await expect(page.getByRole('heading', { level: 1, name: CAT.parent.name })).toBeVisible({ timeout: 90_000 });
    });
  });
});

function findFiles(dir: string, name: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...findFiles(full, name));
    else if (entry === name) out.push(full);
  }
  return out;
}
