import { describe, it, expect } from "vitest";
import {
  buildCategoryMetadata, buildProductMetadata, categoryDescription, categoryTitle,
  clampDescription, hasFacetParams, listingSeo, productCanonical, productDescription,
} from "@/lib/seo/metadata";
import { absoluteUrl, resolveSiteUrl, DEFAULT_SITE_URL } from "@/lib/seo/site";
import { buildSitemapEntries, fallbackSitemapEntries, renderSitemapXml } from "@/lib/seo/sitemap";
import { buildRobots } from "@/lib/seo/robots";
import { buildLlmsTxt } from "@/lib/seo/llms";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd, buildOrganizationJsonLd, buildProductJsonLd } from "@/lib/structured-data";
import type { Category, Product } from "@/types";

const SITE = "https://www.urgentprinters.com";

const category = (over: Partial<Category> = {}): Category => ({
  id: "1", slug: "wedding", name: "Wedding", description: "", imageUrl: "https://cdn/w.webp",
  productCount: 3, isActive: true, ...over,
});

const product = (over: Partial<Product> = {}): Product => ({
  id: "7", slug: "haldi-tag", name: "Haldi Tag", categoryId: "1", categorySlug: "wedding", categoryName: "Wedding",
  description: "", shortDescription: "", images: ["https://cdn/h-lg.webp"], mediumUrl: "https://cdn/h-md.webp",
  reviewCount: 0, averageRating: 0, ...over,
} as Product);

describe("site url", () => {
  it("strips trailing slashes, rejects junk, defaults to the configured apex", () => {
    expect(resolveSiteUrl("https://www.urgentprinters.com/")).toBe(SITE);
    expect(resolveSiteUrl(undefined)).toBe(DEFAULT_SITE_URL);
    expect(resolveSiteUrl("urgentprinters.com")).toBe(DEFAULT_SITE_URL);
  });
  it("builds absolute urls", () => {
    expect(absoluteUrl("/", SITE)).toBe(SITE);
    expect(absoluteUrl("/faq", SITE)).toBe(`${SITE}/faq`);
    expect(absoluteUrl("https://x.com/a", SITE)).toBe("https://x.com/a");
  });
});

describe("listing canonical / noindex", () => {
  it("detects facet params", () => {
    expect(hasFacetParams({})).toBe(false);
    expect(hasFacetParams({ page: "2" })).toBe(false);
    for (const k of ["sort", "min", "max", "tags", "badge", "q"]) expect(hasFacetParams({ [k]: "x" })).toBe(true);
    expect(hasFacetParams({ sort: "" })).toBe(false);
  });
  it("self-canonicals the bare and paginated category", () => {
    expect(listingSeo("/products/wedding", {}, SITE)).toEqual({ canonical: `${SITE}/products/wedding`, noindex: false });
    expect(listingSeo("/products/wedding", { page: "3" }, SITE)).toEqual({ canonical: `${SITE}/products/wedding?page=3`, noindex: false });
    expect(listingSeo("/products/wedding", { page: "abc" }, SITE).canonical).toBe(`${SITE}/products/wedding`);
  });
  it("noindex,follow + base canonical for filtered, even when paginated", () => {
    expect(listingSeo("/products/wedding", { sort: "price-asc", page: "2" }, SITE)).toEqual({
      canonical: `${SITE}/products/wedding`, noindex: true,
    });
  });
  it("category metadata carries robots only when filtered", () => {
    expect(buildCategoryMetadata(category(), {}, SITE).robots).toBeUndefined();
    expect(buildCategoryMetadata(category(), { tags: "a" }, SITE).robots).toEqual({ index: false, follow: true });
  });
});

describe("category title and description", () => {
  it("never produces a blank title or the old broken strings", () => {
    expect(categoryTitle(category({ metaTitle: "  " }))).toBe("Wedding");
    expect(categoryTitle(category({ metaTitle: "Wedding Cards Online" }))).toBe("Wedding Cards Online");
    const d = categoryDescription(category());
    expect(d.startsWith(" ")).toBe(false);
    expect(d).toContain("Wedding");
  });
  it("prefers meta description, else description + delivery suffix", () => {
    expect(categoryDescription(category({ metaDescription: "Custom." }))).toBe("Custom.");
    expect(categoryDescription(category({ description: "Gift Envelope" }))).toBe("Gift Envelope. Delivered across India.");
    expect(categoryDescription(category({ description: "Lovely cards." }))).toBe("Lovely cards. Delivered across India.");
  });
  it("clamps long text on a word boundary", () => {
    const out = clampDescription("word ".repeat(80));
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("product metadata", () => {
  it("honours seo overrides and falls back safely", () => {
    const p = product({ seo: { title: "Custom", description: "Seo desc", canonicalUrl: null } });
    const m = buildProductMetadata(p, SITE);
    expect(m.title).toBe("Custom");
    expect(m.description).toBe("Seo desc");
    expect(m.alternates?.canonical).toBe(`${SITE}/products/wedding/haldi-tag`);
    expect(productDescription(product())).toContain("Haldi Tag");
    expect(productDescription(product({ description: "<p>Rich <b>text</b></p>" }))).toBe("Rich text");
  });
  it("only trusts absolute seo canonical urls", () => {
    expect(productCanonical(product({ seo: { title: null, description: null, canonicalUrl: "https://a.com/x" } }), SITE)).toBe("https://a.com/x");
    expect(productCanonical(product({ seo: { title: null, description: null, canonicalUrl: "/x" } }), SITE)).toBe(`${SITE}/products/wedding/haldi-tag`);
  });
});

describe("json-ld builders", () => {
  it("breadcrumb prepends Home and uses the site url", () => {
    const ld = buildBreadcrumbJsonLd([{ name: "All Products", path: "/products" }, { name: "Wedding", path: "/products/wedding" }], SITE) as {
      itemListElement: { position: number; name: string; item: string }[];
    };
    expect(ld.itemListElement.map((i) => [i.position, i.name, i.item])).toEqual([
      [1, "Home", SITE], [2, "All Products", `${SITE}/products`], [3, "Wedding", `${SITE}/products/wedding`],
    ]);
  });
  it("collection page wraps an ItemList of product urls", () => {
    const ld = buildCollectionPageJsonLd({ name: "Wedding", description: "d", path: "/products/wedding", products: [product()] }, SITE) as {
      "@type": string; url: string; mainEntity: { "@type": string; numberOfItems: number; itemListElement: { url: string }[] };
    };
    expect(ld["@type"]).toBe("CollectionPage");
    expect(ld.mainEntity["@type"]).toBe("ItemList");
    expect(ld.mainEntity.itemListElement[0].url).toBe(`${SITE}/products/wedding/haldi-tag`);
  });
  it("product jsonld adds sku, category, url and omits an empty description", () => {
    const ld = buildProductJsonLd(product(), SITE);
    expect(ld.sku).toBe("7");
    expect(ld.category).toBe("Wedding");
    expect(ld.url).toBe(`${SITE}/products/wedding/haldi-tag`);
    expect("description" in ld).toBe(false);
  });
  it("organization has a contactPoint and no LocalBusiness", () => {
    const ld = buildOrganizationJsonLd(SITE);
    expect(ld.contactPoint).toEqual({
      "@type": "ContactPoint",
      telephone: "+91-95281-91807",
      contactType: "customer service",
      areaServed: "IN",
      availableLanguage: ["en", "hi"],
    });
    const json = JSON.stringify(ld);
    expect(json).not.toContain("LocalBusiness");
    expect(json).toContain(`${SITE}/logo.png`);
  });
});

describe("sitemap", () => {
  const cats = [category(), category({ id: "2", slug: "old", isActive: false })];
  it("lists active categories and their products, excludes inactive ones, omits fake lastmod", () => {
    const entries = buildSitemapEntries(
      cats,
      [product(), product({ id: "9", slug: "x", categorySlug: "old" }), product({ id: "10", slug: "u", updatedAt: "2026-09-01T00:00:00Z" })],
      SITE,
    );
    const urls = entries.map((e) => e.url);
    expect(urls).toContain(SITE);
    expect(urls).toContain(`${SITE}/products/wedding`);
    expect(urls).not.toContain(`${SITE}/products/old`);
    expect(urls).toContain(`${SITE}/products/wedding/haldi-tag`);
    expect(urls.some((u) => u.includes("/old/"))).toBe(false);
    const plain = entries.find((e) => e.url.endsWith("/haldi-tag"))!;
    expect(plain.lastModified).toBeUndefined();
    expect(plain.images).toEqual(["https://cdn/h-md.webp", "https://cdn/h-lg.webp"]);
    expect(entries.find((e) => e.url.endsWith("/u"))!.lastModified).toEqual(new Date("2026-09-01T00:00:00Z"));
  });
  it("falls back to static pages and dedupes", () => {
    expect(fallbackSitemapEntries(SITE).length).toBeGreaterThan(5);
    const e = buildSitemapEntries(cats, [product(), product()], SITE);
    expect(e.filter((x) => x.url.endsWith("/haldi-tag"))).toHaveLength(1);
  });
  it("renders Next's sitemap XML shape, XML-escaped, image namespace only when needed", () => {
    const xml = renderSitemapXml([
      { url: `${SITE}/a`, lastModified: new Date("2026-09-01T00:00:00Z"), changeFrequency: "weekly", priority: 0.7, images: ["https://cdn/x.webp?w=1&h=2"] },
    ]);
    expect(xml).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
      `<url>\n<loc>${SITE}/a</loc>\n<image:image>\n<image:loc>https://cdn/x.webp?w=1&amp;h=2</image:loc>\n</image:image>\n` +
      "<lastmod>2026-09-01T00:00:00.000Z</lastmod>\n<changefreq>weekly</changefreq>\n<priority>0.7</priority>\n</url>\n</urlset>\n",
    );
    expect(renderSitemapXml(fallbackSitemapEntries(SITE))).not.toContain("xmlns:image");
  });
});

describe("robots and llms.txt", () => {
  it("allows catalog, blocks private areas, names AI crawlers, points at the sitemap", () => {
    const r = buildRobots(SITE);
    const rules = r.rules as { userAgent: string | string[]; allow: string; disallow: string[] }[];
    expect(rules[0].disallow).toEqual(expect.arrayContaining(["/cart", "/checkout", "/account", "/api/"]));
    expect(rules[1].userAgent).toEqual(["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]);
    expect(r.sitemap).toBe(`${SITE}/sitemap.xml`);
  });
  it("llms.txt lists active categories and policies with absolute links", () => {
    const txt = buildLlmsTxt(cats(), SITE);
    expect(txt).toContain(`[Wedding](${SITE}/products/wedding)`);
    expect(txt).not.toContain("/products/old");
    expect(txt).toContain(`${SITE}/policies/shipping`);
    expect(txt).toContain("Phone: +91 95281 91807");
  });
});

function cats(): Category[] {
  return [category({ description: "Wedding tags" }), category({ id: "2", slug: "old", name: "Old", isActive: false })];
}
