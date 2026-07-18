import type { Metadata } from "next";
import { getProducts, getCategories, searchProductsPaged } from "@/lib/api";
import { Breadcrumb } from "@/components/common/Breadcrumb";
import { ProductsPageShell } from "@/features/products/ProductsPageShell";
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
  if (!query) {
    return {
      title: "All Products",
      description:
        "Browse our full range of printing products — business cards, flyers, banners, packaging, brochures, and custom merchandise. Fast delivery across India.",
    };
  }
  return {
    title: `Results for "${query}"`,
    description: `Find print products matching "${query}" — business cards, flyers, banners, and more.`,
  };
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = getString(params.q).trim();
  const isSearching = query.length >= 2;

  const filters: ProductFilters = {
    categorySlug: getString(params.category) || undefined,
    sort: (getString(params.sort) as ProductFilters["sort"]) || undefined,
    minPrice: params.min ? Number(params.min) : undefined,
    maxPrice: params.max ? Number(params.max) : undefined,
    tags: getString(params.tags) ? getString(params.tags).split(",").filter(Boolean) : undefined,
    badge: (getString(params.badge) as ProductFilters["badge"]) || undefined,
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

  return (
    <section>
      {/* Page header */}
      <div className="border-b border-border bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Breadcrumb items={[{ label: isSearching ? `Results for "${query}"` : "All Products" }]} className="mb-3" />
          <h1 className="font-heading font-bold text-2xl lg:text-3xl">
            {isSearching ? `Results for "${query}"` : "All Products"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isSearching
              ? `${total} product${total !== 1 ? "s" : ""} found`
              : "Premium printing for every business need — delivered fast across India"}
          </p>
        </div>
      </div>

      <ProductsPageShell
        products={products}
        total={total}
        categories={categories}
        showCategoryFilter
        pageSize={PAGE_SIZE}
      />
    </section>
  );
}
