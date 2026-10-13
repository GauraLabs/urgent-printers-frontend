import { describe, it, expect } from "vitest";
import { serializeJsonLd } from "@/lib/seo/jsonld";
import {
  canonicalProductPath, categoryCrumbs, cleanFaqs, crumbsToBreadcrumbItems, getSiblingCategories,
  getSubcategories, isCategoryIndexable, isThinCategory, parentRef, productCrumbs, toParagraphs,
} from "@/lib/seo/category";
import { buildCategoryMetadata } from "@/lib/seo/metadata";
import { buildSitemapEntries } from "@/lib/seo/sitemap";
import { buildLlmsTxt } from "@/lib/seo/llms";
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd, buildProductJsonLd } from "@/lib/structured-data";
import { mapCategory, type BackendCategory } from "@/lib/api/categories";
import { mapCard } from "@/lib/api/products";
import { buildCategoryTree } from "@/features/navigation/buildCategoryTree";
import { dedupeShelfProducts, selectShelfCategories, totalCatalogProducts, bucketShelves } from "@/features/home/shelfBuckets";
import type { Category, Product } from "@/types";
import { getRootCategories, nestCategories } from "@/lib/seo/category";

const SITE = "https://www.urgentprinters.com";
const WEDDING = { id: "1", name: "Wedding", slug: "wedding" };

const cat = (id: string, slug: string, over: Partial<Category> = {}): Category => ({
  id, slug, name: slug, description: "", imageUrl: "https://cdn/x.webp", productCount: 5, isActive: true,
  parentId: null, sortOrder: 0, ancestors: [], ...over,
});
const child = (id: string, slug: string, count: number, over: Partial<Category> = {}): Category =>
  cat(id, slug, { parentId: "1", ancestors: [WEDDING], productCount: count, name: slug, ...over });

const tree = (): Category[] => [
  cat("1", "wedding", { name: "Wedding", productCount: 37, directProductCount: 0 }),
  child("2", "wedding-tags", 18, { name: "Wedding Tags", sortOrder: 1 }),
  child("3", "wedding-essentials", 9, { name: "Wedding Essentials", sortOrder: 2 }),
  child("4", "shagun-envelope", 8, { name: "Shagun Envelope", sortOrder: 3 }),
  child("5", "welcome-board", 2, { name: "Welcome Board", sortOrder: 4 }),
  cat("6", "birthday-party", { name: "Birthday Party", productCount: 1 }),
  cat("7", "anniversary", { name: "Anniversary", productCount: 1 }),
];

const prod = (over: Partial<Product> = {}): Product => ({
  id: "7", slug: "haldi-tag", name: "Haldi Tag", categoryId: "2", categorySlug: "wedding-tags", categoryName: "Wedding Tags",
  categoryAncestors: [WEDDING], categoryPath: "Wedding > Wedding Tags",
  description: "", shortDescription: "", images: ["https://cdn/h.webp"], mediumUrl: "https://cdn/h.webp",
  reviewCount: 0, averageRating: 0, ...over,
} as Product);

describe("PDP redirect decision", () => {
  it("redirects a stale category segment to the product's own category", () => {
    expect(canonicalProductPath(prod(), "wedding")).toBe("/products/wedding-tags/haldi-tag");
  });
  it("renders (null) when the segment already matches, so it cannot loop", () => {
    expect(canonicalProductPath(prod(), "wedding-tags")).toBeNull();
    const target = canonicalProductPath(prod(), "wedding")!;
    const [, , seg] = target.split("/");
    expect(canonicalProductPath(prod(), seg)).toBeNull();
  });
  it("never redirects a product with no category", () => {
    expect(canonicalProductPath(prod({ categorySlug: "" }), "anything")).toBeNull();
  });
  it("can carry the query string", () => {
    expect(canonicalProductPath(prod(), "wedding", "?o=1&q=2")).toBe("/products/wedding-tags/haldi-tag?o=1&q=2");
  });
});

describe("breadcrumbs from ancestors", () => {
  it("category: Home > All Products > Wedding > Wedding Tags in JSON-LD", () => {
    const c = tree()[1];
    const ld = buildBreadcrumbJsonLd(categoryCrumbs(c), SITE) as { itemListElement: { name: string; item: string }[] };
    expect(ld.itemListElement.map((i) => i.name)).toEqual(["Home", "All Products", "Wedding", "Wedding Tags"]);
    expect(ld.itemListElement[2].item).toBe(`${SITE}/products/wedding`);
  });
  it("root category has no ancestors and a null ancestors field is tolerated", () => {
    expect(categoryCrumbs(tree()[0]).map((c) => c.name)).toEqual(["All Products", "Wedding"]);
    expect(categoryCrumbs({ name: "X", slug: "x", ancestors: null }).map((c) => c.name)).toEqual(["All Products", "X"]);
  });
  it("PDP crumbs include ancestors, category and product; last UI item has no href", () => {
    const crumbs = productCrumbs(prod());
    expect(crumbs.map((c) => c.name)).toEqual(["All Products", "Wedding", "Wedding Tags", "Haldi Tag"]);
    expect(crumbs[3].path).toBe("/products/wedding-tags/haldi-tag");
    const items = crumbsToBreadcrumbItems(crumbs);
    expect(items[3].href).toBeUndefined();
    expect(items[1].href).toBe("/products/wedding");
  });
  it("parentRef is the last ancestor", () => {
    expect(parentRef(tree()[1])).toEqual(WEDDING);
    expect(parentRef(tree()[0])).toBeNull();
  });
});

describe("subcategory navigation helpers", () => {
  it("lists a parent's visible children in sortOrder, and siblings without self", () => {
    const all = [...tree(), child("9", "empty", 0), child("10", "off", 5, { isActive: false })];
    expect(getSubcategories(all, all[0]).map((c) => c.slug)).toEqual(["wedding-tags", "wedding-essentials", "shagun-envelope", "welcome-board"]);
    expect(getSiblingCategories(all, all[2]).map((c) => c.slug)).toEqual(["wedding-tags", "shagun-envelope", "welcome-board"]);
    expect(getSiblingCategories(all, all[0])).toEqual([]);
  });
  it("mega-menu tree nests children and keeps the rolled-up parent count", () => {
    const nav = buildCategoryTree(tree());
    expect(nav.map((n) => n.slug)).toEqual(["wedding", "birthday-party", "anniversary"]);
    expect(nav[0].productCount).toBe(37);
    expect(nav[0].children.map((n) => n.slug)).toEqual(["wedding-tags", "wedding-essentials", "shagun-envelope", "welcome-board"]);
  });
  it("a parent with 0 direct products but active children stays in the menu", () => {
    const nav = buildCategoryTree([cat("1", "p", { productCount: 0 }), child("2", "k", 4)]);
    expect(nav[0].children).toHaveLength(1);
  });
});

describe("homepage shelf selection with a tree", () => {
  it("promotes second-level shelves when one parent holds most of the catalog, no parent+child overlap", () => {
    const picked = selectShelfCategories(tree(), 10).map((c) => c.slug);
    expect(picked).toEqual(["wedding-tags", "wedding-essentials", "shagun-envelope", "welcome-board", "birthday-party", "anniversary"]);
    expect(picked).not.toContain("wedding");
  });
  it("keeps a balanced parent as one rolled-up shelf and leaves its children out", () => {
    const balanced = [
      cat("1", "a", { productCount: 10 }), child("2", "a1", 5), child("3", "a2", 5),
      cat("4", "b", { productCount: 10 }), cat("5", "c", { productCount: 10 }),
    ];
    expect(selectShelfCategories(balanced, 10).map((c) => c.slug)).toEqual(["a", "b", "c"]);
  });
  it("does not split a dominant parent with fewer than two non-empty children", () => {
    const one = [cat("1", "a", { productCount: 20 }), child("2", "a1", 20), cat("3", "b", { productCount: 1 })];
    expect(selectShelfCategories(one, 10).map((c) => c.slug)).toEqual(["a", "b"]);
  });
  it("sums only roots for the catalog total (rolled-up counts must not double count)", () => {
    expect(totalCatalogProducts(tree())).toBe(39);
  });
  it("dedupes a product shown by an earlier shelf", () => {
    const p = (id: string) => ({ id, slug: id }) as Product;
    const out = dedupeShelfProducts([
      { category: tree()[0], products: [p("1"), p("2")] },
      { category: tree()[1], products: [p("2"), p("3")] },
    ]);
    expect(out[1].products.map((x) => x.id)).toEqual(["3"]);
  });
  it("buckets the promoted shelves like the production shape (rails, quad, merged singles)", () => {
    const shelves = selectShelfCategories(tree(), 10).map((category) => ({
      category,
      products: Array.from({ length: Math.min(category.productCount, 8) }, (_, i) => ({ id: `${category.slug}${i}`, slug: "s" }) as Product),
    }));
    const { rails, quads } = bucketShelves(dedupeShelfProducts(shelves));
    expect(rails.map((r) => r.category.slug)).toEqual(["wedding-tags", "wedding-essentials", "shagun-envelope"]);
    expect(quads.map((q) => q.kind)).toEqual(["category", "merged"]);
  });
});

describe("thin / noindex rule", () => {
  it("a subcategory under 3 products is thin; a small root is not", () => {
    expect(isThinCategory(child("2", "k", 2))).toBe(true);
    expect(isThinCategory(child("2", "k", 3))).toBe(false);
    expect(isThinCategory(cat("6", "birthday", { productCount: 1 }))).toBe(false);
  });
  it("detects subcategory from ancestors alone (parentId absent)", () => {
    expect(isThinCategory({ parentId: undefined, ancestors: [WEDDING], productCount: 1 })).toBe(true);
  });
  it("indexable excludes noindex, inactive, empty and thin", () => {
    expect(isCategoryIndexable(child("2", "k", 5))).toBe(true);
    expect(isCategoryIndexable(child("2", "k", 5, { noindex: true }))).toBe(false);
    expect(isCategoryIndexable(child("2", "k", 5, { isActive: false }))).toBe(false);
    expect(isCategoryIndexable(child("2", "k", 2))).toBe(false);
    expect(isCategoryIndexable(cat("9", "empty", { productCount: 0 }))).toBe(false);
  });
  it("metadata is noindex,follow for thin and admin-noindex categories, index otherwise", () => {
    expect(buildCategoryMetadata(child("2", "k", 2), {}, SITE).robots).toEqual({ index: false, follow: true });
    expect(buildCategoryMetadata(child("2", "k", 9, { noindex: true }), {}, SITE).robots).toEqual({ index: false, follow: true });
    expect(buildCategoryMetadata(child("2", "k", 9), {}, SITE).robots).toBeUndefined();
    expect(buildCategoryMetadata(child("2", "k", 9), { sort: "price-asc" }, SITE).robots).toEqual({ index: false, follow: true });
  });
});

describe("sitemap with nested categories", () => {
  const all = [...tree(), child("8", "thin-kid", 2), child("9", "hidden-kid", 9, { noindex: true }), child("10", "off-kid", 9, { isActive: false })];
  const entries = buildSitemapEntries(all, [prod(), prod({ id: "8", slug: "t", categorySlug: "thin-kid" }), prod({ id: "9", slug: "o", categorySlug: "off-kid" })], SITE);
  const urls = entries.map((e) => e.url);
  it("includes every indexable level", () => {
    for (const s of ["wedding", "wedding-tags", "wedding-essentials", "shagun-envelope"]) expect(urls).toContain(`${SITE}/products/${s}`);
  });
  it("excludes thin, noindex and inactive categories", () => {
    for (const s of ["thin-kid", "hidden-kid", "off-kid", "welcome-board"]) expect(urls).not.toContain(`${SITE}/products/${s}`);
  });
  it("still lists products of a thin category, but not of an inactive one", () => {
    expect(urls).toContain(`${SITE}/products/thin-kid/t`);
    expect(urls).toContain(`${SITE}/products/wedding-tags/haldi-tag`);
    expect(urls).not.toContain(`${SITE}/products/off-kid/o`);
  });
});

describe("llms.txt hierarchy", () => {
  it("indents children under their parent and omits thin/inactive ones", () => {
    const txt = buildLlmsTxt(tree(), SITE);
    const lines = txt.split("\n");
    const wi = lines.findIndex((l) => l.startsWith("- [Wedding]("));
    expect(wi).toBeGreaterThan(-1);
    expect(lines[wi + 1]).toMatch(/^ {2}- \[Wedding Tags\]/);
    expect(lines[wi + 2]).toMatch(/^ {2}- \[Wedding Essentials\]/);
    expect(lines[wi + 3]).toMatch(/^ {2}- \[Shagun Envelope\]/);
    expect(txt).not.toContain("[Welcome Board]");
    expect(lines.some((l) => l.startsWith("- [Birthday Party]("))).toBe(true);
  });
});

describe("FAQ JSON-LD", () => {
  it("is null when there are no FAQs, and reflects exactly the visible FAQs otherwise", () => {
    expect(buildFaqPageJsonLd([])).toBeNull();
    expect(buildFaqPageJsonLd(cleanFaqs(undefined))).toBeNull();
    const faqs = cleanFaqs([{ question: "Q1?", answer: "<p>A1</p>" }, { question: " ", answer: "dropped" }]);
    expect(faqs).toEqual([{ question: "Q1?", answer: "A1" }]);
    const ld = buildFaqPageJsonLd(faqs) as { "@type": string; mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
    expect(ld["@type"]).toBe("FAQPage");
    expect(ld.mainEntity).toHaveLength(1);
    expect(ld.mainEntity[0].acceptedAnswer.text).toBe("A1");
  });
});

describe("seo copy sanitising", () => {
  it("strips markup into plain paragraphs", () => {
    expect(toParagraphs("<p>One</p><p>Two <b>bold</b><script>x()</script></p>")).toEqual(["One", "Two boldx()"]);
    expect(toParagraphs("A\n\nB")).toEqual(["A", "B"]);
    expect(toParagraphs(null)).toEqual([]);
  });
});

describe("serializeJsonLd", () => {
  it("cannot be broken out of a script tag", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>", a: "a&b", g: "x>y" });
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(out).not.toContain("&");
    expect(out).toContain("\\u003c/script\\u003e");
  });
  it("escapes U+2028 and U+2029 and stays round-trippable", () => {
    const data = { s: `a${String.fromCharCode(0x2028)}b${String.fromCharCode(0x2029)}c</x>` };
    const out = serializeJsonLd(data);
    expect(out).not.toContain(String.fromCharCode(0x2028));
    expect(out).not.toContain(String.fromCharCode(0x2029));
    expect(JSON.parse(out)).toEqual(data);
  });
  it("is identical to JSON.stringify for safe data", () => {
    expect(serializeJsonLd({ a: [1, "b", null] })).toBe(JSON.stringify({ a: [1, "b", null] }));
  });
});

describe("API mapping of hierarchy fields", () => {
  const backend = (over: Partial<BackendCategory> = {}): BackendCategory => ({
    id: 2, name: "Wedding Tags", slug: "wedding-tags", description: null, icon_name: null, meta_title: null, meta_description: null,
    is_active: true, parent_id: 1, sort_order: 1, product_count: 18, thumbnail_url: null, medium_url: null, banner_url: null,
    video_url: null, video_thumbnail_url: null, ...over,
  });
  it("stringifies parentId and maps the new fields", () => {
    const c = mapCategory(backend({
      ancestors: [{ id: 1, name: "Wedding", slug: "wedding" }], path: "Wedding > Wedding Tags", direct_product_count: 18,
      seo_intro: "i", seo_body: "b", faqs: [{ question: "q", answer: "a" }], noindex: true,
    }));
    expect(c.parentId).toBe("1");
    expect(c.ancestors).toEqual([WEDDING]);
    expect(c.path).toBe("Wedding > Wedding Tags");
    expect(c.directProductCount).toBe(18);
    expect(c.faqs).toEqual([{ question: "q", answer: "a" }]);
    expect(c.noindex).toBe(true);
  });
  it("tolerates an older backend without the new fields", () => {
    const c = mapCategory(backend({ parent_id: null }));
    expect(c.parentId).toBeNull();
    expect(c.ancestors).toBeNull();
    expect(c.faqs).toEqual([]);
    expect(c.noindex).toBe(false);
  });
  it("maps product category ancestors/path, and the product JSON-LD category is the path", () => {
    const p = mapCard({
      id: 1, name: "n", slug: "s", short_description: null, category_id: 2, category_slug: "wedding-tags", category_name: "Wedding Tags",
      category_ancestors: [{ id: 1, name: "Wedding", slug: "wedding" }], category_path: "Wedding > Wedding Tags",
      badge: "", is_featured: false, tags: [], thumbnail_url: null, medium_url: null, price_from: null, rating: 0, review_count: 0,
    });
    expect(p.categoryAncestors).toEqual([WEDDING]);
    expect(p.categoryPath).toBe("Wedding > Wedding Tags");
    expect(buildProductJsonLd(p, SITE).category).toBe("Wedding > Wedding Tags");
    expect(buildProductJsonLd({ ...p, categoryPath: null }, SITE).category).toBe("Wedding Tags");
  });
});

describe("flattenCategoryTree", () => {
  it("flattens nested children after their parent and drops duplicates", async () => {
    const { flattenCategoryTree } = await import("@/lib/api/categories");
    const base = { name: "", description: null, icon_name: null, meta_title: null, meta_description: null, is_active: true, sort_order: 0, product_count: 0, thumbnail_url: null, medium_url: null, banner_url: null, video_url: null, video_thumbnail_url: null };
    const rows = [
      { ...base, id: 1, slug: "a", parent_id: null, children: [{ ...base, id: 2, slug: "a-child", parent_id: 1 }, { ...base, id: 2, slug: "a-child", parent_id: 1 }] },
      { ...base, id: 3, slug: "b", parent_id: null },
    ];
    const flat = flattenCategoryTree(rows);
    expect(flat.map((c) => c.slug)).toEqual(["a", "a-child", "b"]);
    expect("children" in flat[0]).toBe(false);
  });
});

describe("product routes keep real HTTP status codes", () => {
  it("has no loading.tsx under app/products (its Suspense shell flushes a 200 before notFound()/permanentRedirect() run)", async () => {
    const { readdirSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const found: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (/^loading\.(t|j)sx?$/.test(name)) found.push(full);
      }
    };
    walk(join(process.cwd(), "app", "products"));
    expect(found).toEqual([]);
  });
});

describe("root-only category tiles and nested filter list", () => {
  const mk = (id: string, parentId: string | null): Category =>
    ({ id, slug: id, name: id, parentId, productCount: 5, isActive: true }) as unknown as Category;
  const all = [mk("a", null), mk("a1", "a"), mk("b", null), mk("a2", "a"), mk("orphan", "gone")];

  it("getRootCategories drops children but keeps orphans", () => {
    expect(getRootCategories(all).map((c) => c.id)).toEqual(["a", "b", "orphan"]);
  });

  it("nestCategories groups children under their parent", () => {
    expect(nestCategories(all).map((n) => `${n.depth}:${n.category.id}`)).toEqual(["0:a", "1:a1", "1:a2", "0:b", "0:orphan"]);
  });
});

describe("category page data hardening", () => {
  const live: BackendCategory = {
    id: 9, name: "Wedding Petal Cones", slug: "wedding-petal-cones", description: "d", icon_name: null,
    meta_title: "t", meta_description: "m", is_active: true, parent_id: 2, sort_order: 6, product_count: 15,
    thumbnail_url: null, medium_url: null, banner_url: null, video_url: null, video_thumbnail_url: null,
    seo_intro: "Intro line.", seo_body: "Para one.\n\nPara two.", google_product_category: "5455",
    faqs: [{ question: "Size?", answer: "A5." }],
  };

  it("maps google_product_category and populated SEO copy, and builds every page JSON-LD", () => {
    const c = mapCategory(live);
    expect(c.googleProductCategory).toBe("5455");
    expect(toParagraphs(c.seoBody)).toEqual(["Para one.", "Para two."]);
    const faqs = cleanFaqs(c.faqs);
    expect(buildFaqPageJsonLd(faqs)).not.toBeNull();
    expect(() => buildCategoryMetadata(c, {})).not.toThrow();
    expect(() => serializeJsonLd(buildBreadcrumbJsonLd(categoryCrumbs(c)))).not.toThrow();
  });

  it("never throws on odd field types (numbers, objects, nulls, junk faqs)", () => {
    const odd = {
      ...live,
      google_product_category: 5709,
      seo_intro: 42,
      seo_body: { x: 1 },
      meta_title: null,
      faqs: [null, "x", { question: 7, answer: null }, { question: "Q", answer: "A" }],
    } as unknown as BackendCategory;
    const c = mapCategory(odd);
    expect(c.googleProductCategory).toBe("5709");
    expect(toParagraphs(c.seoIntro)).toEqual(["42"]);
    expect(toParagraphs(c.seoBody)).toEqual([]);
    expect(cleanFaqs(c.faqs)).toEqual([{ question: "Q", answer: "A" }]);
    expect(cleanFaqs({ not: "array" })).toEqual([]);
    expect(cleanFaqs(null)).toEqual([]);
    expect(() => buildCategoryMetadata(c, {})).not.toThrow();
    expect(mapCategory({ ...live, faqs: "oops" } as unknown as BackendCategory).faqs).toEqual([]);
  });
});
