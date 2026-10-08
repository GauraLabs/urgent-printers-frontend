import type { Category } from "@/types";
import { getRealCategoryImage } from "./categoryImage";

/** Lean, serialisable shape passed from the server Header to client menus. */
export interface NavCategory {
  name: string;
  slug: string;
  imageUrl: string | null;
  productCount: number;
  children: NavCategory[];
}

/** Top level + 2 nested levels. Anything deeper is dropped. */
export const MAX_NAV_DEPTH = 3;

/**
 * Builds the menu tree from the flat categories list (parentId / sortOrder).
 * Inactive categories are skipped, orphans whose parent is missing or inactive
 * are promoted to top level, and empty leaves are pruned so the menu never
 * links to a category with nothing in it.
 */
export function buildCategoryTree(categories: Category[]): NavCategory[] {
  const active = categories.filter((c) => c.isActive !== false);
  const ids = new Set(active.map((c) => c.id));
  const byParent = new Map<string | null, Category[]>();

  for (const c of active) {
    const parentKey = c.parentId != null && ids.has(String(c.parentId)) ? String(c.parentId) : null;
    const list = byParent.get(parentKey) ?? [];
    list.push(c);
    byParent.set(parentKey, list);
  }

  const bySortOrder = (list: Category[]) => [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const emitted = new Set<string>();

  function toNode(c: Category, depth: number, seen: Set<string>): NavCategory | null {
    const children = build(c.id, depth + 1, new Set(seen).add(c.id));
    if (c.productCount <= 0 && children.length === 0) return null;
    emitted.add(c.id);
    return {
      name: c.name,
      slug: c.slug,
      imageUrl: getRealCategoryImage(c),
      productCount: c.productCount,
      children,
    };
  }

  function build(parentKey: string | null, depth: number, seen: Set<string>): NavCategory[] {
    if (depth > MAX_NAV_DEPTH) return [];
    const out: NavCategory[] = [];
    for (const c of bySortOrder(byParent.get(parentKey) ?? [])) {
      if (seen.has(c.id)) continue;
      const node = toNode(c, depth, seen);
      if (node) out.push(node);
    }
    return out;
  }

  const tree = build(null, 1, new Set());

  // Self-parented and cyclic categories are unreachable from any root; surface
  // them at top level rather than letting them vanish from the menu.
  for (const c of bySortOrder(active)) {
    if (emitted.has(c.id)) continue;
    const node = toNode(c, 1, new Set());
    if (node) tree.push(node);
  }
  return tree;
}
