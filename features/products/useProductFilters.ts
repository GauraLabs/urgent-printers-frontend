"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { ROUTES } from "@/lib/constants/routes";
import type { ProductBadgeFilter } from "@/types";

export type SortOption = "popular" | "rating" | "price-asc" | "price-desc" | "newest";

export interface ActiveFilters {
  sort: SortOption;
  category: string;
  minPrice: string;
  maxPrice: string;
  tags: string[];
  badge: ProductBadgeFilter | "";
  page: number;
  search: string;
}

// Matches the path-scoped category listing route (`/products/[categorySlug]`)
// but not the generic `/products` listing or the nested product detail route
// (`/products/[categorySlug]/[slug]`), so callers on that route can treat the
// category as coming from the path instead of a `?category=` query param.
const CATEGORY_PATH_RE = /^\/products\/([^/]+)$/;

export function useProductFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pathCategorySlug = pathname.match(CATEGORY_PATH_RE)?.[1];

  const current: ActiveFilters = {
    sort: (searchParams.get("sort") as SortOption) || "popular",
    category: pathCategorySlug ?? (searchParams.get("category") || ""),
    minPrice: searchParams.get("min") || "",
    maxPrice: searchParams.get("max") || "",
    tags: searchParams.get("tags") ? searchParams.get("tags")!.split(",").filter(Boolean) : [],
    badge: (searchParams.get("badge") as ProductBadgeFilter) || "",
    page: Number(searchParams.get("page") || "1"),
    search: searchParams.get("q") || "",
  };

  const isSearching = current.search.trim().length >= 2;

  const setParam = useCallback(
    (updates: Partial<Record<"sort" | "category" | "min" | "max" | "tags" | "badge" | "page" | "q", string | null>>) => {
      const params = new URLSearchParams(searchParams.toString());
      // On a path-scoped category route, `category` is never a query param —
      // strip any stray one (e.g. from an old bookmarked/shared URL) so it
      // can't linger alongside the path segment.
      if (pathCategorySlug !== undefined) params.delete("category");
      for (const [key, val] of Object.entries(updates)) {
        if (val === null || val === "") {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      }
      // Reset to page 1 whenever a filter changes (unless page is explicitly set)
      if (!("page" in updates)) params.delete("page");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams, pathCategorySlug]
  );

  const setSort = (sort: SortOption) => setParam({ sort: sort === "popular" ? null : sort });
  // On `/products/[categorySlug]`, switching category means navigating to
  // that category's own path-based route (or back to the generic `/products`
  // listing for "All Products") rather than layering a `?category=` query
  // param on top of the current category's path — mirrors how homepage
  // category cards and breadcrumbs link into categories. Other active
  // filters carry over; `page` resets since the result set is changing.
  const setCategory = (slug: string) => {
    if (pathCategorySlug !== undefined) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("category");
      params.delete("page");
      const query = params.toString();
      const target = slug ? ROUTES.category(slug) : ROUTES.products;
      router.push(`${target}${query ? `?${query}` : ""}`, { scroll: false });
      return;
    }
    setParam({ category: slug || null });
  };
  const setPriceRange = (min: string, max: string) => setParam({ min: min || null, max: max || null });
  const toggleTag = (tag: string) => {
    const next = current.tags.includes(tag)
      ? current.tags.filter((t) => t !== tag)
      : [...current.tags, tag];
    setParam({ tags: next.length ? next.join(",") : null });
  };
  const setBadge = (badge: ProductBadgeFilter | "") => setParam({ badge: current.badge === badge ? null : badge || null });
  // Backend search (Typesense /search) doesn't support category/price/tags/sort
  // params — search and catalog filters are mutually exclusive server-side, so
  // starting a search clears the other filters rather than silently ignoring them.
  const setSearch = (q: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    router.push(`${pathname}${params.toString() ? `?${params}` : ""}`, { scroll: false });
  };
  const clearAll = () => router.push(pathname, { scroll: false });

  const activeCount =
    (current.sort !== "popular" ? 1 : 0) +
    (current.category ? 1 : 0) +
    (current.minPrice || current.maxPrice ? 1 : 0) +
    (current.badge ? 1 : 0) +
    current.tags.length;

  return {
    current,
    setSort,
    setCategory,
    setPriceRange,
    toggleTag,
    setBadge,
    setSearch,
    clearAll,
    activeCount,
    isSearching,
  };
}
