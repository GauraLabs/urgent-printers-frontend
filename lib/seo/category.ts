import type { Category, CategoryFaq, CategoryRef, Product } from "@/types";
import { ROUTES } from "@/lib/constants/routes";
import type { Crumb } from "@/lib/structured-data";

/** A subcategory below this many (rolled-up) products is thin: noindex and out of the sitemap. */
export const MIN_INDEXABLE_SUBCATEGORY_PRODUCTS = 3;

export function isSubcategory(category: Pick<Category, "parentId" | "ancestors">): boolean {
  return category.parentId != null || (category.ancestors?.length ?? 0) > 0;
}

export function isThinCategory(category: Pick<Category, "parentId" | "ancestors" | "productCount">): boolean {
  return isSubcategory(category) && category.productCount < MIN_INDEXABLE_SUBCATEGORY_PRODUCTS;
}

/** Roots are never "thin"; an empty one is still excluded because there is nothing to index. */
export function isCategoryIndexable(
  category: Pick<Category, "parentId" | "ancestors" | "productCount" | "isActive" | "noindex">,
): boolean {
  if (category.isActive === false || category.noindex === true) return false;
  if (category.productCount <= 0) return false;
  return !isThinCategory(category);
}

function refCrumbs(ancestors: CategoryRef[] | null | undefined): Crumb[] {
  return (ancestors ?? []).map((a) => ({ name: a.name, path: ROUTES.category(a.slug) }));
}

/** All Products > ...ancestors > category (root-first). Home is added by the renderers. */
export function categoryCrumbs(category: Pick<Category, "name" | "slug" | "ancestors">): Crumb[] {
  return [
    { name: "All Products", path: ROUTES.products },
    ...refCrumbs(category.ancestors),
    { name: category.name, path: ROUTES.category(category.slug) },
  ];
}

/** All Products > ...category ancestors > category > product. */
export function productCrumbs(
  product: Pick<Product, "name" | "slug" | "categorySlug" | "categoryName" | "categoryAncestors">,
): Crumb[] {
  return [
    { name: "All Products", path: ROUTES.products },
    ...refCrumbs(product.categoryAncestors),
    ...(product.categorySlug
      ? [{ name: product.categoryName, path: ROUTES.category(product.categorySlug) }]
      : []),
    { name: product.name, path: ROUTES.product(product.categorySlug, product.slug) },
  ];
}

/** Last crumb has no href so the UI renders it as the current page. */
export function crumbsToBreadcrumbItems(crumbs: Crumb[]): { label: string; href?: string }[] {
  return crumbs.map((c, i) => (i === crumbs.length - 1 ? { label: c.name } : { label: c.name, href: c.path }));
}

/**
 * Whether a PDP URL's category segment may redirect: it must be a known
 * category slug (any level). Otherwise junk segments would each mint a cached
 * redirect ISR entry for a valid product.
 */
export function isKnownCategorySlug(categories: Pick<Category, "slug">[], slug: string): boolean {
  return categories.some((c) => c.slug === slug);
}

/**
 * Where a PDP request must go, or null to render. A product resolves by its
 * (globally unique) slug; a wrong category segment is redirected to the
 * product's own category. Returns null when the segment already matches or the
 * product has no category, so the redirect can never loop.
 */
export function canonicalProductPath(
  product: Pick<Product, "slug" | "categorySlug">,
  requestedCategorySlug: string,
  query: string = "",
): string | null {
  if (!product.categorySlug || product.categorySlug === requestedCategorySlug) return null;
  const qs = query.replace(/^\?/, "");
  return `${ROUTES.product(product.categorySlug, product.slug)}${qs ? `?${qs}` : ""}`;
}

function byOrder(a: Category, b: Category): number {
  return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
}

function visible(c: Category): boolean {
  return c.isActive !== false && c.productCount > 0;
}

/** Top-level categories only; a child whose parent is absent from the list counts as a root so it never vanishes. */
export function getRootCategories(all: Category[]): Category[] {
  const ids = new Set(all.map((c) => c.id));
  return all.filter((c) => c.parentId == null || !ids.has(c.parentId));
}

/** Roots followed by their direct children (depth 1), for a flat list that still shows the hierarchy. */
export function nestCategories(all: Category[]): { category: Category; depth: number }[] {
  const roots = getRootCategories(all);
  const rootIds = new Set(roots.map((r) => r.id));
  const out: { category: Category; depth: number }[] = [];
  for (const root of roots) {
    out.push({ category: root, depth: 0 });
    for (const child of all.filter((c) => c.parentId === root.id)) out.push({ category: child, depth: 1 });
  }
  // Deeper descendants (grandchildren) attach flat after their roots' groups rather than being dropped.
  const seen = new Set(out.map((o) => o.category.id));
  for (const c of all) if (!seen.has(c.id) && c.parentId != null && !rootIds.has(c.id)) out.push({ category: c, depth: 1 });
  return out;
}

export function getSubcategories(all: Category[], parent: Pick<Category, "id">): Category[] {
  return all.filter((c) => c.parentId === parent.id && visible(c)).sort(byOrder);
}

export function getSiblingCategories(all: Category[], category: Pick<Category, "id" | "parentId">): Category[] {
  if (category.parentId == null) return [];
  return all.filter((c) => c.parentId === category.parentId && c.id !== category.id && visible(c)).sort(byOrder);
}

/** Direct parent is the last ancestor. */
export function parentRef(category: Pick<Category, "ancestors">): CategoryRef | null {
  const a = category.ancestors;
  return a && a.length > 0 ? a[a.length - 1] : null;
}

// Only real-looking tags (<b>, </p>, <a href=..>); bare "<" / ">" in prose ("< 5 inch") stay.
const TAG = /<\/?[a-zA-Z][^>]*>/g;
const BLOCK_BREAK = /<\s*(?:br\s*\/?|\/p|\/div|\/li)\s*>/gi;

/**
 * seo_intro/seo_body/FAQ answers are admin-typed plain text. If markup was
 * pasted in, strip it instead of rendering it: output is only ever rendered as
 * React text nodes and is the same string used in JSON-LD.
 */
export function toPlainText(raw: unknown): string {
  if (typeof raw === "number" && Number.isFinite(raw)) raw = String(raw);
  if (typeof raw !== "string" || !raw) return "";
  return raw
    .replace(BLOCK_BREAK, "\n")
    .replace(TAG, "")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function toParagraphs(raw: unknown): string[] {
  return toPlainText(raw)
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function cleanFaqs(faqs: unknown): CategoryFaq[] {
  if (!Array.isArray(faqs)) return [];
  return faqs
    .map((f: unknown) => {
      const item = (f ?? {}) as { question?: unknown; answer?: unknown };
      return { question: toPlainText(item.question), answer: toPlainText(item.answer) };
    })
    .filter((f) => f.question && f.answer);
}
