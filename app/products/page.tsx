import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductListingSkeleton } from "@/components/common/ProductListingSkeleton";
import { getProducts, getCategories, searchProductsPaged } from "@/lib/api";
import { parseBadgeParam, parseSortParam } from "@/lib/api/products";
import { Breadcrumb } from "@/components/common/Breadcrumb";
import { CategoryHero } from "@/features/categories/CategoryHero";
import { CategoryChipBar } from "@/features/products/CategoryChipBar";
import { toChipCategories } from "@/features/products/categoryChips";
import { buildCategoryTree } from "@/features/navigation/buildCategoryTree";
import { ProductsPageShell } from "@/features/products/ProductsPageShell";
import { ROUTES } from "@/lib/constants/routes";
import { listingSeo } from "@/lib/seo/metadata";
import type { ProductFilters } from "@/types";

const PAGE_SIZE = 12;

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function getString(val: string | string[] | undefined): string {
  return Array.isArray(val) ? val[0] : val ?? "";
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = getString(params.q).trim();
  const { canonical, noindex } = listingSeo(ROUTES.products, params);
  const robots = noindex ? { index: false, follow: true } : undefined;
  if (!query) {
    return {
      alternates: { canonical },
      robots,
      title: "All Products",
      description:
        "Browse wedding cards and invitations, shagun envelopes, wedding essentials, welcome boards, and birthday and anniversary printing. Delivered across India.",
    };
  }
  return {
    alternates: { canonical },
    robots,
    title: `Results for "${query}"`,
    description: `Find wedding and celebration products matching "${query}" — cards, envelopes, welcome boards, and more.`,
  };
}

// No notFound()/redirect() here, so the whole listing can sit behind Suspense without affecting the status code.
export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <Suspense fallback={<ProductListingSkeleton />}>
      <ProductsContent params={params} />
    </Suspense>
  );
}

async function ProductsContent({ params }: { params: Awaited<PageProps["searchParams"]> }) {
  const query = getString(params.q).trim();
  const isSearching = query.length >= 2;

  const filters: ProductFilters = {
    categorySlug: getString(params.category) || undefined,
    sort: parseSortParam(getString(params.sort)),
    minPrice: params.min ? Number(params.min) : undefined,
    maxPrice: params.max ? Number(params.max) : undefined,
    tags: getString(params.tags) ? getString(params.tags).split(",").filter(Boolean) : undefined,
    badge: parseBadgeParam(getString(params.badge)),
    page: params.page ? Number(params.page) : 1,
    pageSize: PAGE_SIZE,
  };

  // The backend /search endpoint (Typesense) only accepts q/page/page_size —
  // it doesn't support category/price/tag/sort params like /products does —
  // so an active search bypasses getProducts entirely rather than silently
  // dropping filters it can't apply.
  const [{ data: products, total }, categories] = await Promise.all([
    isSearching ? searchProductsPaged(query, filters.page ?? 1, PAGE_SIZE) : getProducts(filters),
    getCategories(),
  ]);

  // The sidebar category filter selects via `?category=` on this same route
  // (rather than navigating to /products/[categorySlug]) — surface the same
  // banner the path-scoped category landing page shows, sourced from the
  // categories list already fetched above so no extra request is needed.
  const activeCategory =
    !isSearching && filters.categorySlug
      ? categories.find((c) => c.slug === filters.categorySlug)
      : undefined;

  return (
    <section>
      {activeCategory && <CategoryHero category={activeCategory} />}
      {/* Page header */}
      <div className="border-b border-border bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-6">
          <Breadcrumb items={[{ label: isSearching ? `Results for "${query}"` : "All Products" }]} className="mb-1 md:mb-3" />
          <h1 className="font-heading font-bold text-xl md:text-2xl lg:text-3xl">
            {isSearching ? `Results for "${query}"` : "All Products"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1 max-md:hidden">
            {isSearching
              ? `${total} product${total !== 1 ? "s" : ""} found`
              : "Wedding cards, envelopes and celebration essentials — delivered across India"}
          </p>
        </div>
      </div>

      <CategoryChipBar categories={toChipCategories(buildCategoryTree(categories))} />
      <ProductsPageShell
        products={products}
        total={total}
        categories={categories}
        categoryName={activeCategory?.name}
        showCategoryFilter
        pageSize={PAGE_SIZE}
      />
    </section>
  );
}
