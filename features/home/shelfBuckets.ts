import { buildCategoryTree } from "@/features/navigation/buildCategoryTree";
import { getRealCampaignImage } from "@/features/navigation/categoryImage";
import type { Category, Product } from "@/types";

/** A category needs at least this many fetched products to earn a full scrolling rail. */
export const MIN_RAIL_PRODUCTS = 6;
/** Badge rails (Bestsellers / New arrivals) are hidden below this many products. */
export const MIN_BADGE_RAIL_PRODUCTS = 4;
export const QUAD_SLOTS = 4;

export interface CategoryShelf {
  category: Category;
  products: Product[];
}

export interface MergedQuadCell {
  category: Category;
  product: Product;
}

export type QuadCard =
  | { kind: "category"; shelf: CategoryShelf }
  | { kind: "merged"; cells: MergedQuadCell[] };

export interface ShelfBuckets {
  rails: CategoryShelf[];
  quads: QuadCard[];
}

/**
 * Splits category shelves by how much they have to show: plenty becomes a
 * rail, a little becomes a quad card. When two or more categories hold a
 * single product each, they are merged into "More occasions" cards (four
 * categories per card) because several one-thumbnail cards read as empty.
 */
export function bucketShelves(shelves: CategoryShelf[]): ShelfBuckets {
  const rails: CategoryShelf[] = [];
  const quads: QuadCard[] = [];
  const singles: CategoryShelf[] = [];

  for (const shelf of shelves) {
    const n = shelf.products.length;
    if (n === 0) continue;
    if (n >= MIN_RAIL_PRODUCTS) rails.push(shelf);
    else if (n === 1) singles.push(shelf);
    else quads.push({ kind: "category", shelf });
  }

  if (singles.length === 1) {
    quads.push({ kind: "category", shelf: singles[0] });
  } else {
    for (let i = 0; i < singles.length; i += QUAD_SLOTS) {
      const cells = singles
        .slice(i, i + QUAD_SLOTS)
        .map((s) => ({ category: s.category, product: s.products[0] }));
      quads.push(cells.length === 1 ? { kind: "category", shelf: singles[i] } : { kind: "merged", cells });
    }
  }

  return { rails, quads };
}

/** A root holding at least this share of all products is "most of the catalog" and gets split into its children. */
export const DOMINANT_SHARE = 0.6;

/** Counts are rolled up, so only roots are summed: adding children would count every product twice. */
export function totalCatalogProducts(categories: Category[]): number {
  const rootSlugs = new Set(buildCategoryTree(categories).map((c) => c.slug));
  return categories.filter((c) => rootSlugs.has(c.slug)).reduce((sum, c) => sum + c.productCount, 0);
}

/**
 * Categories that get a homepage shelf: active, non-empty, in the backend's
 * order, capped. Each product belongs to exactly one shelf: a root's shelf is
 * rolled up (it already contains its descendants), so a root is either shown
 * itself or, when it holds most of the catalog and has 2+ non-empty children,
 * replaced by those children. A parent and its child are never both shelves.
 */
export function selectShelfCategories(categories: Category[], max: number): Category[] {
  return planShelfCategories(categories, max).shelves;
}

/**
 * Same selection as selectShelfCategories, plus the dominant roots that were
 * replaced by their children: products attached directly to such a root belong
 * to none of the child shelves and need their own shelf (see directRootShelves).
 */
export function planShelfCategories(
  categories: Category[],
  max: number,
): { shelves: Category[]; splitRoots: Category[] } {
  const tree = buildCategoryTree(categories);
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const total = tree.reduce((sum, n) => sum + n.productCount, 0);

  const out: Category[] = [];
  const splitRoots: Category[] = [];
  for (const node of tree) {
    const children = node.children.filter((child) => child.productCount > 0);
    const dominant = total > 0 && node.productCount / total >= DOMINANT_SHARE && children.length >= 2;
    const slugs = dominant ? children.map((child) => child.slug) : [node.slug];
    const root = bySlug.get(node.slug);
    if (dominant && root) splitRoots.push(root);
    for (const slug of slugs) {
      const category = bySlug.get(slug);
      if (category && category.productCount > 0) out.push(category);
    }
  }
  return { shelves: out.slice(0, max), splitRoots };
}

/**
 * A rolled-up root fetch also returns its descendants' products; keep only the
 * ones attached to the root itself. Shelves for these go after the child shelves,
 * and dedupeShelfProducts guarantees nothing repeats.
 */
export function directRootShelves(splitRoots: Category[], results: Product[][]): CategoryShelf[] {
  return splitRoots.map((category, i) => ({
    category,
    products: (results[i] ?? []).filter((p) => p.categorySlug === category.slug),
  }));
}

/** Defensive: drops a product already shown by an earlier shelf so no card repeats on the page. */
export function dedupeShelfProducts(shelves: CategoryShelf[]): CategoryShelf[] {
  const seen = new Set<string>();
  return shelves.map((shelf) => ({
    ...shelf,
    products: shelf.products.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    }),
  }));
}

/**
 * First top-level category without a full rail (so its banner isn't repeated
 * beside its own shelf) that has a genuinely uploaded image. Null means the
 * campaign banner should be omitted rather than show a stock placeholder.
 */
export function pickCampaignCategory(
  categories: Category[],
  railSlugs: ReadonlySet<string>
): { category: Category; imageUrl: string } | null {
  const rootSlugs = new Set(buildCategoryTree(categories).map((c) => c.slug));
  for (const category of categories) {
    if (!rootSlugs.has(category.slug) || railSlugs.has(category.slug)) continue;
    const imageUrl = getRealCampaignImage(category);
    if (imageUrl) return { category, imageUrl };
  }
  return null;
}
