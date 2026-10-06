"use client";

import { Suspense, useEffect, useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { SortDropdown } from "./SortDropdown";
import { FiltersDrawer } from "./FiltersDrawer";
import { ActiveFilters } from "./ActiveFilters";
import { FilterControls } from "./FilterControls";
import { useProductFilters } from "./useProductFilters";
import { useDebounce } from "@/hooks/useDebounce";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { SearchField } from "@/components/common/SearchField";
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

  // Local input state is the source of truth while typing; the URL (and the
  // server fetch) only updates after the debounce settles.
  const [searchInput, setSearchInput] = useState(current.search);
  const debouncedSearch = useDebounce(searchInput, 400);
  const [isPending, startTransition] = useTransition();

  // Values this input pushed to the URL that haven't been seen coming back yet.
  // The URL echoing one of them is our own update and must not overwrite what
  // the user has typed since (e.g. "car" landing after "cards" was typed).
  const pushedRef = useRef<string[]>([]);

  useEffect(() => {
    const idx = pushedRef.current.indexOf(current.search);
    if (idx >= 0) {
      pushedRef.current.splice(0, idx + 1);
      return;
    }
    // External change (back/forward, ActiveFilters chip, link click).
    pushedRef.current = [];
    setSearchInput(current.search);
  }, [current.search]);

  function pushSearch(q: string) {
    const trimmed = q.trim();
    if (trimmed === current.search.trim() && pushedRef.current.length === 0) return;
    pushedRef.current.push(trimmed);
    startTransition(() => setSearch(trimmed, { replace: true }));
  }

  useEffect(() => {
    pushSearch(debouncedSearch);
    // Only fire when the debounced value changes.
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
      <SearchField
        value={searchInput}
        onChange={setSearchInput}
        onClear={() => {
          setSearchInput("");
          pushSearch("");
        }}
        loading={isPending}
        placeholder="Search this catalog…"
        ariaLabel="Search this catalog"
        className="mb-5 max-w-md"
        iconSize={16}
        iconClassName="left-3.5"
        endClassName="right-3.5"
        inputClassName={cn(
          "w-full h-10 rounded-full border border-border bg-card pl-10 pr-14 text-sm",
          "placeholder:text-muted-foreground",
          "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
        )}
      />

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
        <div className="flex-1 min-w-0" aria-busy={isPending}>
          {isPending ? (
            <ProductGridSkeleton count={9} gridClassName="lg:grid-cols-3" />
          ) : items.length === 0 ? (
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
                  <ProductCard
                    key={product.id}
                    product={product}
                    sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 306px"
                  />
                ))}
              </div>

              {hasMore && (
                <div ref={sentinelRef} className="flex items-center justify-center py-10">
                  {loadingMore && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 size={16} className="animate-spin motion-reduce:animate-none" />
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
        <ProductGridSkeleton count={12} gridClassName="lg:grid-cols-3" />
      </div>
    }>
      <ShellInner {...props} />
    </Suspense>
  );
}
