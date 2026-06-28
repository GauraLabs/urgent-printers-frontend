import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProducts, getCategories, getCategoryBySlug } from "@/lib/api";
import { Breadcrumb } from "@/components/common/Breadcrumb";
import { ProductsPageShell } from "@/features/products/ProductsPageShell";
import { ROUTES } from "@/lib/constants/routes";
import type { ProductFilters } from "@/types";

interface PageProps {
  params: Promise<{ categorySlug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function getString(val: string | string[] | undefined): string {
  return Array.isArray(val) ? val[0] : val ?? "";
}

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { categorySlug } = await params;
  const category = await getCategoryBySlug(categorySlug);
  if (!category) return { title: "Category Not Found" };

  return {
    title: category.name,
    description: `${category.description} Fast delivery across India. Order from 25 units.`,
    openGraph: {
      title: `${category.name} | Urgent Printers`,
      description: category.description,
      images: [{ url: category.imageUrl, width: 600, height: 400, alt: category.name }],
    },
  };
}

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((c) => ({ categorySlug: c.slug }));
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { categorySlug } = await params;
  const sp = await searchParams;

  const [category, categories] = await Promise.all([
    getCategoryBySlug(categorySlug),
    getCategories(),
  ]);

  if (!category) notFound();

  const filters: ProductFilters = {
    categorySlug,
    sort: (getString(sp.sort) as ProductFilters["sort"]) || undefined,
    minPrice: sp.min ? Number(sp.min) : undefined,
    maxPrice: sp.max ? Number(sp.max) : undefined,
    tags: getString(sp.tags) ? getString(sp.tags).split(",").filter(Boolean) : undefined,
    page: sp.page ? Number(sp.page) : 1,
    pageSize: 12,
  };

  const { data: products, total } = await getProducts(filters);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home",         item: "https://urgentprinters.in" },
      { "@type": "ListItem", position: 2, name: "All Products", item: "https://urgentprinters.in/products" },
      { "@type": "ListItem", position: 3, name: category.name,  item: `https://urgentprinters.in/products/${categorySlug}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <section>
        <div className="border-b border-border bg-secondary/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Breadcrumb
              items={[
                { label: "All Products", href: ROUTES.products },
                { label: category.name },
              ]}
              className="mb-3"
            />
            <h1 className="font-heading font-bold text-2xl lg:text-3xl">{category.name}</h1>
            <p className="text-muted-foreground text-sm mt-1">{category.description}</p>
          </div>
        </div>

        <ProductsPageShell
          products={products}
          total={total}
          categories={categories}
          categoryName={category.name}
        />
      </section>
    </>
  );
}
