"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

export type SortOption = "popular" | "rating" | "price-asc" | "price-desc" | "newest";

export interface ActiveFilters {
  sort: SortOption;
  category: string;
  minPrice: string;
  maxPrice: string;
  tags: string[];
  page: number;
}

export function useProductFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current: ActiveFilters = {
    sort: (searchParams.get("sort") as SortOption) || "popular",
    category: searchParams.get("category") || "",
    minPrice: searchParams.get("min") || "",
    maxPrice: searchParams.get("max") || "",
    tags: searchParams.get("tags") ? searchParams.get("tags")!.split(",").filter(Boolean) : [],
    page: Number(searchParams.get("page") || "1"),
  };

  const setParam = useCallback(
    (updates: Partial<Record<"sort" | "category" | "min" | "max" | "tags" | "page", string | null>>) => {
      const params = new URLSearchParams(searchParams.toString());
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
    [router, pathname, searchParams]
  );

  const setSort = (sort: SortOption) => setParam({ sort: sort === "popular" ? null : sort });
  const setCategory = (slug: string) => setParam({ category: slug || null });
  const setPriceRange = (min: string, max: string) => setParam({ min: min || null, max: max || null });
  const toggleTag = (tag: string) => {
    const next = current.tags.includes(tag)
      ? current.tags.filter((t) => t !== tag)
      : [...current.tags, tag];
    setParam({ tags: next.length ? next.join(",") : null });
  };
  const clearAll = () => router.push(pathname, { scroll: false });

  const activeCount =
    (current.sort !== "popular" ? 1 : 0) +
    (current.category ? 1 : 0) +
    (current.minPrice || current.maxPrice ? 1 : 0) +
    current.tags.length;

  return { current, setSort, setCategory, setPriceRange, toggleTag, clearAll, activeCount };
}
