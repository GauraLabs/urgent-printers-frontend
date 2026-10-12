import type { MetadataRoute } from "next";
import type { Category, Product } from "@/types";
import { ROUTES } from "@/lib/constants/routes";
import { absoluteUrl, SITE_URL } from "./site";
import { isCategoryIndexable } from "./category";

export const STATIC_SITEMAP_PATHS: readonly string[] = [
  "/",
  ROUTES.products,
  "/faq",
  "/contact",
  "/policies/shipping",
  "/policies/returns",
  "/policies/privacy",
  "/policies/terms",
  "/policies/artwork-guidelines",
  "/policies/cookies",
];

function validDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function isHttp(url: string | null | undefined): url is string {
  // picsum.photos is the product mapper/mock placeholder when no image was uploaded; never advertise it.
  return !!url && /^https?:\/\//i.test(url) && !url.includes("picsum.photos");
}

/** lastmod is omitted when the backend gives no timestamp: a fabricated "now" teaches crawlers to ignore it. */
export function buildSitemapEntries(
  categories: Category[],
  products: Product[],
  siteUrl: string = SITE_URL,
): MetadataRoute.Sitemap {
  const activeCategories = categories.filter((c) => c.isActive !== false);
  const activeSlugs = new Set(activeCategories.map((c) => c.slug));

  const entries: MetadataRoute.Sitemap = STATIC_SITEMAP_PATHS.map((path) => ({
    url: absoluteUrl(path, siteUrl),
    changeFrequency: path === "/" || path === ROUTES.products ? "daily" : "monthly",
    priority: path === "/" ? 1 : path === ROUTES.products ? 0.9 : 0.4,
  }));

  // Products of a thin/noindex category are still indexable, so they key off activeSlugs, not this list.
  for (const c of activeCategories.filter(isCategoryIndexable)) {
    const image = [c.bannerUrl, c.imageUrl].find(isHttp);
    entries.push({
      url: absoluteUrl(ROUTES.category(c.slug), siteUrl),
      changeFrequency: "weekly",
      priority: 0.8,
      ...(image && { images: [image] }),
    });
  }

  const seen = new Set<string>();
  for (const p of products) {
    if (!p.categorySlug || !activeSlugs.has(p.categorySlug)) continue;
    const url = absoluteUrl(ROUTES.product(p.categorySlug, p.slug), siteUrl);
    if (seen.has(url)) continue;
    seen.add(url);
    const lastModified = validDate(p.updatedAt);
    const images = [p.mediumUrl, ...p.images].filter(isHttp);
    entries.push({
      url,
      ...(lastModified && { lastModified }),
      changeFrequency: "weekly",
      priority: 0.7,
      ...(images.length > 0 && { images: Array.from(new Set(images)).slice(0, 10) }),
    });
  }

  return entries;
}

/** Without a catalog the site is still crawlable from its static pages; never throw into the sitemap route. */
export function fallbackSitemapEntries(siteUrl: string = SITE_URL): MetadataRoute.Sitemap {
  return buildSitemapEntries([], [], siteUrl);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Same document shape as Next's metadata-route serializer, but XML-escaped (Next's is not). */
export function renderSitemapXml(entries: MetadataRoute.Sitemap, generatedAt?: Date): string {
  const hasImages = entries.some((e) => (e.images?.length ?? 0) > 0);
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
  xml += hasImages ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' : ">\n";
  // A frozen timestamp is the tell that regeneration is failing and a stale copy is being served.
  if (generatedAt) xml += `<!-- generated ${generatedAt.toISOString()} entries ${entries.length} -->\n`;
  for (const e of entries) {
    xml += `<url>\n<loc>${escapeXml(e.url)}</loc>\n`;
    for (const image of e.images ?? []) {
      xml += `<image:image>\n<image:loc>${escapeXml(image)}</image:loc>\n</image:image>\n`;
    }
    if (e.lastModified) {
      const lastmod = e.lastModified instanceof Date ? e.lastModified.toISOString() : e.lastModified;
      xml += `<lastmod>${escapeXml(lastmod)}</lastmod>\n`;
    }
    if (e.changeFrequency) xml += `<changefreq>${e.changeFrequency}</changefreq>\n`;
    if (typeof e.priority === "number") xml += `<priority>${e.priority}</priority>\n`;
    xml += "</url>\n";
  }
  return `${xml}</urlset>\n`;
}
