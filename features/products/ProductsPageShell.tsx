"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { SortDropdown } from "./SortDropdown";
import { FiltersDrawer } from "./FiltersDrawer";
import { ActiveFilters } from "./ActiveFilters";
import { FilterControls } from "./FilterControls";
import { useProductFilters } from "./useProductFilters";
import { useDebounce } from "@/hooks/useDebounce";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { EmptyState } from "@/components/common/EmptyState";
import { ProductGridSkeleton } from "@/components/common/ProductCardSkeleton";
import { getProducts, searchProductsPaged } from "@/lib/api";
import { PackageSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product, Category } from "@/types";

interface ProductsPageShellProps {
  products: Product[];
  total: number;
  categories: Category[];
  showCategoryFilter?: boolean;
  categoryName?: string;
  /** Fixed category context for /products/[categorySlug]; unset on the general listing. */
  baseCategorySlug?: string;
  pageSize?: number;
}

function ShellInner({
  products,
  total,
  categories,
  showCategoryFilter,
  categoryName,
  baseCategorySlug,
  pageSize = 12,
}: ProductsPageShellProps) {
  const { current, setSearch, isSearching } = useProductFilters();

  // Local input state so typing feels instant; the URL (and therefore the
  // server fetch) only updates after the debounce settles.
  const [searchInput, setSearchInput] = useState(current.search);
  const debouncedSearch = useDebounce(searchInput, 400);

  // Render-phase state adjustment (React-recommended over an effect here) —
  // resyncs the local input when the URL's `q` changes from elsewhere (e.g.
  // clearing the search chip in ActiveFilters) without an extra render pass.
  const [prevUrlSearch, setPrevUrlSearch] = useState(current.search);
  if (current.search !== prevUrlSearch) {
    setPrevUrlSearch(current.search);
    setSearchInput(current.search);
  }

  useEffect(() => {
    if (debouncedSearch.trim() === current.search.trim()) return;
    setSearch(debouncedSearch.trim());
    // Only fire when the debounced value changes — including `current.search`
    // would re-run this on every URL change and fight the sync above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // ─── Infinite scroll ────────────────────────────────────────────────────
  // Re-derived from server props whenever the server re-fetches page 1 (i.e.
  // whenever any filter/sort/search/category changes the URL). Render-phase
  // adjustment instead of an effect so the stale page 1 never paints.
  const [prevProducts, setPrevProducts] = useState(products);
  const [items, setItems] = useState(products);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(products.length < total);
  const [loadingMore, setLoadingMore] = useState(false);

  // Bumped every time the server sends a fresh page 1 (i.e. any filter/sort/
  // search/category change). A scroll-triggered loadMore() in flight when
  // that happens captures the generation at fetch time; if it resolves after
  // the generation has moved on, its (now-stale) page is discarded instead of
  // being appended on top of the newly filtered — possibly empty — list.
  // Written from an effect (not render) since refs must not be mutated during render.
  const generationRef = useRef(0);
  useEffect(() => {
    generationRef.current += 1;
  }, [products, total]);

  if (products !== prevProducts) {
    setPrevProducts(products);
    setItems(products);
    setPage(1);
    setHasMore(products.length < total);
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    const generation = generationRef.current;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const result = isSearching
        ? await searchProductsPaged(current.search.trim(), nextPage, pageSize)
        : await getProducts({
            categorySlug: baseCategorySlug ?? current.category ?? undefined,
            sort: current.sort === "popular" ? undefined : current.sort,
            minPrice: current.minPrice ? Number(current.minPrice) : undefined,
            maxPrice: current.maxPrice ? Number(current.maxPrice) : undefined,
            tags: current.tags.length ? current.tags : undefined,
            badge: current.badge || undefined,
            page: nextPage,
            pageSize,
          });
      if (generationRef.current !== generation) return;
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...result.data.filter((p) => !seen.has(p.id))];
      });
      setPage(nextPage);
      setHasMore(nextPage < result.totalPages);
    } catch {
      if (generationRef.current === generation) setHasMore(false);
    } finally {
      if (generationRef.current === generation) setLoadingMore(false);
    }
  }

  const sentinelRef = useIntersectionObserver<HTMLDivElement>(loadMore, { rootMargin: "600px" });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search */}
      <div className="relative mb-5 max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search this catalog…"
          autoComplete="off"
          aria-label="Search this catalog"
          className={cn(
            "w-full h-10 rounded-full border border-border bg-card pl-10 pr-9 text-sm",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
          )}
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => setSearchInput("")}
            aria-label="Clear search"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-sm text-muted-foreground shrink-0">
          <span className="font-semibold text-foreground">{total}</span> product{total !== 1 ? "s" : ""}
          {isSearching && <> for &ldquo;{current.search}&rdquo;</>}
        </p>
        <div className="flex items-center gap-2 ml-auto">
          <FiltersDrawer categories={categories} showCategoryFilter={showCategoryFilter} disabled={isSearching} />
          <SortDropdown disabled={isSearching} />
        </div>
      </div>

      {/* Active filter badges */}
      <div className="mb-5">
        <ActiveFilters categoryName={categoryName} />
      </div>

      {isSearching && (
        <p className="text-xs text-muted-foreground mb-5 -mt-3">
          Category, price, and tag filters aren&rsquo;t available while searching. Clear your search to use them.
        </p>
      )}

      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-20">
            <FilterControls categories={categories} showCategoryFilter={showCategoryFilter} disabled={isSearching} />
          </div>
        </aside>

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          {items.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title="No products found"
              description={
                isSearching
                  ? `No results for "${current.search}". Try a different search term.`
                  : "Try adjusting your filters or search for something else."
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-5">
                {items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {hasMore && (
                <div ref={sentinelRef} className="flex items-center justify-center py-10">
                  {loadingMore && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 size={16} className="animate-spin" />
                      Loading more…
                    </div>
                  )}
                </div>
              )}

              {!hasMore && items.length > 0 && (
                <p className="text-center text-xs text-muted-foreground py-10">
                  You&rsquo;ve seen all {items.length} product{items.length !== 1 ? "s" : ""}.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProductsPageShell(props: ProductsPageShellProps) {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProductGridSkeleton count={12} />
      </div>
    }>
      <ShellInner {...props} />
    </Suspense>
  );
}
