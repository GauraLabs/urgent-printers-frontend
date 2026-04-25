"use client";

import { Suspense } from "react";
import { ProductCard } from "./ProductCard";
import { SortDropdown } from "./SortDropdown";
import { FiltersDrawer } from "./FiltersDrawer";
import { ActiveFilters } from "./ActiveFilters";
import { FilterControls } from "./FilterControls";
import { EmptyState } from "@/components/common/EmptyState";
import { ProductGridSkeleton } from "@/components/common/ProductCardSkeleton";
import { PackageSearch } from "lucide-react";
import type { Product, Category } from "@/types";

interface ProductsPageShellProps {
  products: Product[];
  total: number;
  categories: Category[];
  showCategoryFilter?: boolean;
  categoryName?: string;
}

function ShellInner({ products, total, categories, showCategoryFilter, categoryName }: ProductsPageShellProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-sm text-muted-foreground shrink-0">
          <span className="font-semibold text-foreground">{total}</span> product{total !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2 ml-auto">
          <FiltersDrawer categories={categories} showCategoryFilter={showCategoryFilter} />
          <SortDropdown />
        </div>
      </div>

      {/* Active filter badges */}
      <div className="mb-5">
        <ActiveFilters categoryName={categoryName} />
      </div>

      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-20">
            <FilterControls categories={categories} showCategoryFilter={showCategoryFilter} />
          </div>
        </aside>

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          {products.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title="No products found"
              description="Try adjusting your filters or search for something else."
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-5">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
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
