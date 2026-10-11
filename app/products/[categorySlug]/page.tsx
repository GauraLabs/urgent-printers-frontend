import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductListingBodySkeleton } from "@/components/common/ProductListingSkeleton";
import { getProducts, getCategories, getCategoryBySlug } from "@/lib/api";
import { parseBadgeParam, parseSortParam } from "@/lib/api/products";
import { Breadcrumb } from "@/components/common/Breadcrumb";
import { CategoryHero } from "@/features/categories/CategoryHero";
import { CategoryChipBar } from "@/features/products/CategoryChipBar";
import { toChipCategories } from "@/features/products/categoryChips";
import { buildCategoryTree } from "@/features/navigation/buildCategoryTree";
import { ProductsPageShell } from "@/features/products/ProductsPageShell";
import { ROUTES } from "@/lib/constants/routes";
import { buildCategoryMetadata, parsePageParam } from "@/lib/seo/metadata";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd, buildFaqPageJsonLd } from "@/lib/structured-data";
import { categoryDescription } from "@/lib/seo/metadata";
import {
  categoryCrumbs,
  cleanFaqs,
  crumbsToBreadcrumbItems,
  getSiblingCategories,
  getSubcategories,
  parentRef,
  toParagraphs,
} from "@/lib/seo/category";
import { JsonLd } from "@/components/common/JsonLd";
import { SubcategoryTiles } from "@/features/categories/SubcategoryTiles";
import { RelatedSubcategories } from "@/features/categories/RelatedSubcategories";
import { CategoryIntro, CategorySeoBody } from "@/features/categories/CategorySeoContent";
import type { Category, ProductFilters } from "@/types";

interface PageProps {
  params: Promise<{ categorySlug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function getString(val: string | string[] | undefined): string {
  return Array.isArray(val) ? val[0] : val ?? "";
}

export const revalidate = 60;

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const [{ categorySlug }, sp] = await Promise.all([params, searchParams]);
  const category = await getCategoryBySlug(categorySlug);
  if (!category) return { title: "Category Not Found" };
  return buildCategoryMetadata(category, sp);
}

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((c) => ({ categorySlug: c.slug }));
}

const PAGE_SIZE = 12;

interface CategoryListingProps {
  category: Category;
  categories: Category[];
  categorySlug: string;
  sp: Awaited<PageProps["searchParams"]>;
}

// Everything that can notFound()/redirect() runs in CategoryPage before this Suspense boundary, so the status stays correct.
async function CategoryListing({ category, categories, categorySlug, sp }: CategoryListingProps) {
  const filters: ProductFilters = {
    categorySlug,
    sort: parseSortParam(getString(sp.sort)),
    minPrice: sp.min ? Number(sp.min) : undefined,
    maxPrice: sp.max ? Number(sp.max) : undefined,
    tags: getString(sp.tags) ? getString(sp.tags).split(",").filter(Boolean) : undefined,
    badge: parseBadgeParam(getString(sp.badge)),
    page: parsePageParam(sp),
    pageSize: PAGE_SIZE,
  };
  const { data: products, total } = await getProducts(filters);


  const collectionJsonLd = buildCollectionPageJsonLd({
    name: category.name,
    description: categoryDescription(category),
    path: ROUTES.category(categorySlug),
    products,
  });

  const subcategories = getSubcategories(categories, category);

  return (
    <>
      <JsonLd data={collectionJsonLd} />
      <SubcategoryTiles parent={category} subcategories={subcategories} />
      <ProductsPageShell
        products={products}
        total={total}
        categories={categories}
        categoryName={category.name}
        baseCategorySlug={categorySlug}
        pageSize={PAGE_SIZE}
      />
    </>
  );
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { categorySlug } = await params;
  const sp = await searchParams;

  // The Typesense /search endpoint can't be scoped to a category, so a search
  // started from a category page hands off to the unscoped /products search
  // view rather than silently ignoring the category or returning wrong results.
  const query = getString(sp.q).trim();
  if (query) redirect(`/products?q=${encodeURIComponent(query)}`);

  const [category, categories] = await Promise.all([
    getCategoryBySlug(categorySlug),
    getCategories(),
  ]);

  if (!category || category.isActive === false) notFound();

  const crumbs = categoryCrumbs(category);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(crumbs);
  const siblings = getSiblingCategories(categories, category);
  // Long-form copy and FAQs belong to the category itself, not to every paginated page of it.
  const isFirstPage = parsePageParam(sp) <= 1;
  const introParagraphs = toParagraphs(category.seoIntro);
  const bodyParagraphs = isFirstPage ? toParagraphs(category.seoBody) : [];
  const faqs = isFirstPage ? cleanFaqs(category.faqs) : [];
  const faqJsonLd = buildFaqPageJsonLd(faqs);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      {faqJsonLd && <JsonLd data={faqJsonLd} />}
      <section>
        <CategoryHero category={category} />
        <div className="border-b border-border bg-secondary/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-6">
            <Breadcrumb
              items={crumbsToBreadcrumbItems(crumbs)}
              className="mb-1 md:mb-3"
            />
            <h1 className="font-heading font-bold text-xl md:text-2xl lg:text-3xl">{category.name}</h1>
            {introParagraphs.length > 0 ? (
              <CategoryIntro paragraphs={introParagraphs} />
            ) : (
              <p className="text-muted-foreground text-sm mt-1 max-md:hidden">{category.description}</p>
            )}
          </div>
        </div>

        <CategoryChipBar categories={toChipCategories(buildCategoryTree(categories))} />
        <Suspense fallback={<ProductListingBodySkeleton />}>
          <CategoryListing category={category} categories={categories} categorySlug={categorySlug} sp={sp} />
        </Suspense>
        <CategorySeoBody name={category.name} paragraphs={bodyParagraphs} faqs={faqs} />
        <RelatedSubcategories parent={parentRef(category)} siblings={siblings} />
      </section>
    </>
  );
}
