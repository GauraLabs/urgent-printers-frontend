import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getProductBySlug, getCategoryBySlug } from "@/lib/api";
import { Breadcrumb } from "@/components/common/Breadcrumb";
import { StarRating } from "@/components/common/StarRating";
import { ReviewSkeleton } from "@/components/common/ProductCardSkeleton";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { ProductGallery } from "@/features/products/gallery/ProductGallery";
import { ProductDetailClient } from "@/features/products/ProductDetailClient";
import { ProductDetailTabs } from "@/features/products/ProductDetailTabs";
import { ReviewsSection } from "@/features/products/ReviewsSection";
import { RelatedProducts } from "@/features/products/RelatedProducts";
import { RecentlyViewedCarousel } from "@/features/products/recentlyViewed/RecentlyViewedCarousel";
import { ROUTES } from "@/lib/constants/routes";
import { formatPricePerUnit, getDisplayPricePerUnit } from "@/lib/utils";

interface PageProps {
  params: Promise<{ categorySlug: string; productSlug: string }>;
}

// Without this, a product page that 404s before its data exists (e.g. crawled
// moments before the category/product went active) gets cached indefinitely —
// dynamicParams regeneration only ever re-runs on a revalidation window.
export const revalidate = 60;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { categorySlug, productSlug } = await params;
  const product = await getProductBySlug(productSlug);
  if (!product || !product.categorySlug || product.categorySlug !== categorySlug) {
    return { title: "Product Not Found" };
  }

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
  // A product resolves independently of the category segment in the URL —
  // without this check, e.g. /products/business-cards/photo-mugs (a
  // mugs-promotional product) would 200 with a breadcrumb pointing at a
  // category the product isn't in. An empty categorySlug (no category)
  // must never be treated as matching every segment.
  if (!product.categorySlug || product.categorySlug !== categorySlug) notFound();

  // Tiers are ordered by ascending quantity, not ascending price — per-unit
  // price falls as quantity rises, so index 0 is the *most* expensive tier
  // and the last index the cheapest. Derive lowest/highest explicitly rather
  // than relying on array position.
  const tierPrices = product.pricingTiers.map((t) => t.pricePerUnit);
  const lowestPrice = Math.min(...tierPrices);
  const highestPrice = Math.max(...tierPrices);

  // The customer-facing "From" price merchandises the best-value tier, not
  // the mathematically cheapest per-unit price (usually the highest-quantity
  // tier) — falls back to the true lowest price, then priceFrom, if no tier
  // is flagged. JSON-LD below intentionally keeps using true
  // lowestPrice/highestPrice: schema.org AggregateOffer.lowPrice/highPrice
  // describe the actual price range across all offers for search engines,
  // independent of merchandising.
  const displayPrice = getDisplayPricePerUnit(product);

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images,
    brand: { "@type": "Brand", name: "Urgent Printers" },
    ...(product.reviewCount > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: product.averageRating,
        reviewCount: product.reviewCount,
        bestRating: 5,
        worstRating: 1,
      },
    }),
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
            <ProductGallery
              images={product.images}
              imageThumbnails={product.imageThumbnails}
              productName={product.name}
              videoUrl={product.videoUrl}
              videoThumbnailUrl={product.videoThumbnailUrl}
            />
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
                {product.reviewCount > 0 ? (
                  <StarRating
                    rating={product.averageRating}
                    reviewCount={product.reviewCount}
                    showCount
                    size="sm"
                  />
                ) : (
                  <span className="text-xs font-medium text-muted-foreground">
                    No reviews yet — be the first to try this product
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  From <span className="font-semibold text-foreground">{formatPricePerUnit(displayPrice)}</span> / unit
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

        {/* Description + Reviews — combined into one tabbed unit (Phase 3).
            Both panels render with `keepMounted`, so Reviews' Suspense
            boundary is present and streaming from first paint regardless of
            which tab is active — only visibility (via the `hidden`
            attribute) is client-driven, and the active tab itself defaults
            server-side via `defaultValue`, so there's no pre-hydration
            flash. Renders immediately (no ScrollReveal) — this is the
            page's primary, SEO-relevant product content, previously a
            plain always-visible section; a scroll-reveal wrapper would
            leave it at opacity:0 in the raw SSR HTML until JS hydrates and
            an IntersectionObserver entry fires. */}
        <ProductDetailTabs
          reviewCount={product.reviewCount}
          description={
            <section aria-labelledby="description-heading">
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
          }
          reviews={
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
          }
        />

        {/* Related products — same wrap-the-boundary reasoning as Reviews. */}
        <ScrollReveal>
          <Suspense fallback={null}>
            <RelatedProducts productId={product.id} categorySlug={product.categorySlug} />
          </Suspense>
        </ScrollReveal>

        {/* Recently viewed — client-only, hydrated from localStorage. Renders
            null until mounted/populated; ScrollReveal's wrapper persists
            across that null-to-content swap, so no remount/double-reveal. */}
        <ScrollReveal>
          <RecentlyViewedCarousel currentProductId={product.id} />
        </ScrollReveal>
      </div>
    </>
  );
}
