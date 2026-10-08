import { ROUTES } from "@/lib/constants/routes";

// Filters that still make sense after switching category. `q` is dropped
// (search can't be scoped by category), `category` is replaced by the path,
// and `page` restarts at 1.
const PRESERVED_PARAMS = ["sort", "min", "max", "tags", "badge"] as const;

export function buildCategoryChipHref(slug: string | null, current: URLSearchParams): string {
  const next = new URLSearchParams();
  for (const key of PRESERVED_PARAMS) {
    const value = current.get(key);
    if (value) next.set(key, value);
  }
  const base = slug ? ROUTES.category(slug) : ROUTES.products;
  const qs = next.toString();
  return qs ? `${base}?${qs}` : base;
}

export interface ChipCategory {
  slug: string;
  name: string;
  children: ChipCategory[];
}

/** Root-to-node chain for a slug, or [] when it isn't in the tree. */
export function findCategoryPath(tree: ChipCategory[], slug: string | null): ChipCategory[] {
  if (!slug) return [];
  for (const node of tree) {
    if (node.slug === slug) return [node];
    const below = findCategoryPath(node.children, slug);
    if (below.length > 0) return [node, ...below];
  }
  return [];
}

/** Keeps only what the chips render, so the server doesn't ship full category objects. */
export function toChipCategories(tree: { slug: string; name: string; children: ChipCategory[] }[]): ChipCategory[] {
  return tree.map((n) => ({ slug: n.slug, name: n.name, children: toChipCategories(n.children) }));
}

