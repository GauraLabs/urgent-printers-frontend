import type { Metadata } from "next";
import { getProducts, getCategories } from "@/lib/api";
import { Breadcrumb } from "@/components/common/Breadcrumb";
import { ProductsPageShell } from "@/features/products/ProductsPageShell";
import type { ProductFilters } from "@/types";

export const metadata: Metadata = {
  title: "All Products",
  description:
    "Browse our full range of printing products — business cards, flyers, banners, packaging, brochures, and custom merchandise. Fast delivery across India.",
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function getString(val: string | string[] | undefined): string {
  return Array.isArray(val) ? val[0] : val ?? "";
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const filters: ProductFilters = {
    categorySlug: getString(params.category) || undefined,
    sort: (getString(params.sort) as ProductFilters["sort"]) || undefined,
    minPrice: params.min ? Number(params.min) : undefined,
    maxPrice: params.max ? Number(params.max) : undefined,
    tags: getString(params.tags) ? getString(params.tags).split(",").filter(Boolean) : undefined,
    page: params.page ? Number(params.page) : 1,
    pageSize: 12,
  };

  const [{ data: products, total }, categories] = await Promise.all([
    getProducts(filters),
    getCategories(),
  ]);

  return (
    <section>
      {/* Page header */}
      <div className="border-b border-border bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Breadcrumb items={[{ label: "All Products" }]} className="mb-3" />
          <h1 className="font-heading font-bold text-2xl lg:text-3xl">All Products</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Premium printing for every business need — delivered fast across India
          </p>
        </div>
      </div>

      <ProductsPageShell
        products={products}
        total={total}
        categories={categories}
        showCategoryFilter
      />
    </section>
  );
}
