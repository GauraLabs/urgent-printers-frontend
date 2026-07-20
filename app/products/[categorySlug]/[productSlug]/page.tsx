import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getProductBySlug, getCategoryBySlug } from "@/lib/api";
import { Breadcrumb } from "@/components/common/Breadcrumb";
import { StarRating } from "@/components/common/StarRating";
import { ReviewSkeleton } from "@/components/common/ProductCardSkeleton";
import { ProductGallery } from "@/features/products/gallery/ProductGallery";
import { ProductDetailClient } from "@/features/products/ProductDetailClient";
import { ReviewsSection } from "@/features/products/ReviewsSection";
import { RelatedProducts } from "@/features/products/RelatedProducts";
import { ROUTES } from "@/lib/constants/routes";
import { formatPricePerUnit } from "@/lib/utils";

interface PageProps {
  params: Promise<{ categorySlug: string; productSlug: string }>;
}

// Without this, a product page that 404s before its data exists (e.g. crawled
// moments before the category/product went active) gets cached indefinitely —
// dynamicParams regeneration only ever re-runs on a revalidation window.
export const revalidate = 60;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { productSlug } = await params;
  const product = await getProductBySlug(productSlug);
  if (!product) return { title: "Product Not Found" };

  const lowestPrice = product.pricingTiers[0].pricePerUnit;

  return {
    title: product.name,
    description: product.shortDescription,
    openGraph: {
      title: `${product.name} | Urgent Printers`,
      description: product.shortDescription,
      images: product.images.map((url) => ({ url, width: 800, height: 600, alt: product.name })),
    },
  };
}

// Previously fetched every category then, per category, called getProducts
// with pageSize: 100 in a Promise.all — one products request per category,
// fired near-simultaneously. In `next dev`, generateStaticParams re-runs on
// every navigation to a route it covers, so with 180+ categories in the DB
// (including seed/test rows) this burst the backend and tripped its rate
// limiter (429s). No path needs to be known at build time here: the page
// already opts into on-demand ISR via `revalidate` above, so returning an
// empty array lets each product page render (and cache) on first visit.
export async function generateStaticParams() {
  return [];
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { categorySlug, productSlug } = await params;

  const [product, category] = await Promise.all([
    getProductBySlug(productSlug),
    getCategoryBySlug(categorySlug),
  ]);

  if (!product || !category) notFound();

  const lowestPrice = product.pricingTiers[0].pricePerUnit;
  const highestPrice = product.pricingTiers[product.pricingTiers.length - 1].pricePerUnit;

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images,
    brand: { "@type": "Brand", name: "Urgent Printers" },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.averageRating,
      reviewCount: product.reviewCount,
      bestRating: 5,
      worstRating: 1,
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: lowestPrice,
      highPrice: highestPrice,
      offerCount: product.pricingTiers.length,
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: "Urgent Printers" },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: "All Products", href: ROUTES.products },
            { label: category.name, href: ROUTES.category(categorySlug) },
            { label: product.name },
          ]}
          className="mb-6"
        />

        {/* Main product grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-16">
          {/* Left — Gallery */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <ProductGallery images={product.images} productName={product.name} />
          </div>

          {/* Right — Info + Configurator */}
          <div>
            {/* Product header */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {product.categoryName}
              </p>
              <h1 className="font-heading font-bold text-2xl lg:text-3xl leading-tight mb-3">
                {product.name}
              </h1>
              <div className="flex items-center gap-3 mb-4">
                <StarRating
                  rating={product.averageRating}
                  reviewCount={product.reviewCount}
                  showCount
                  size="sm"
                />
                <span className="text-xs text-muted-foreground">
                  From <span className="font-semibold text-foreground">{formatPricePerUnit(lowestPrice)}</span> / unit
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {product.shortDescription}
              </p>
            </div>

            {/* Configurator + Artwork upload + Sticky CTA */}
            <ProductDetailClient product={product} />
          </div>
        </div>

        {/* Full description */}
        <section aria-labelledby="description-heading" className="mt-14 pt-10 border-t border-border">
          <h2 id="description-heading" className="font-heading font-bold text-xl mb-4">
            Product Details
          </h2>
          <div
            className="prose prose-sm prose-neutral dark:prose-invert max-w-3xl text-muted-foreground [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-4">
            {product.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full text-xs bg-secondary text-secondary-foreground border border-border capitalize"
              >
                {tag.replace("-", " ")}
              </span>
            ))}
          </div>
        </section>

        {/* Reviews */}
        <section className="mt-14 pt-10 border-t border-border">
          <Suspense fallback={
            <div className="space-y-1 divide-y divide-border">
              {Array.from({ length: 3 }).map((_, i) => <ReviewSkeleton key={i} />)}
            </div>
          }>
            <ReviewsSection
              productSlug={product.slug}
              averageRating={product.averageRating}
              reviewCount={product.reviewCount}
            />
          </Suspense>
        </section>

        {/* Related products */}
        <Suspense fallback={null}>
          <RelatedProducts productId={product.id} categorySlug={product.categorySlug} />
        </Suspense>
      </div>
    </>
  );
}
