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

/**
 * Categories that get a homepage shelf: active, top-level (the same roots the
 * menu uses, so sub-categories never repeat their parent), non-empty, in the
 * backend's order, capped.
 */
export function selectShelfCategories(categories: Category[], max: number): Category[] {
  const rootSlugs = new Set(buildCategoryTree(categories).map((c) => c.slug));
  return categories.filter((c) => rootSlugs.has(c.slug) && c.productCount > 0).slice(0, max);
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
