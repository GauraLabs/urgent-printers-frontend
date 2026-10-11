import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getProductBySlug, getCategories } from "@/lib/api";
import { Breadcrumb } from "@/components/common/Breadcrumb";
import { StarRating } from "@/components/common/StarRating";
import { ReviewSkeleton } from "@/components/common/ProductCardSkeleton";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { ProductGallery } from "@/features/products/gallery/ProductGallery";
import { ProductDetailClient } from "@/features/products/ProductDetailClient";
import { ProductSpecs, buildSpecRows } from "@/features/products/ProductSpecs";
import { PdpStateProvider, MobilePriceLine } from "@/features/products/PdpStateContext";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ProductDetailTabs } from "@/features/products/ProductDetailTabs";
import { ReviewsSection } from "@/features/products/ReviewsSection";
import { RelatedProducts } from "@/features/products/RelatedProducts";
import { RecentlyViewedCarousel } from "@/features/products/recentlyViewed/RecentlyViewedCarousel";
import { ROUTES } from "@/lib/constants/routes";
import { formatPricePerUnit, getDisplayPricePerUnit, getListingPrice, formatPrice } from "@/lib/utils";
import { formatQty } from "@/lib/quantity";
import { buildProductJsonLd, buildBreadcrumbJsonLd, SITE_URL } from "@/lib/structured-data";
import { buildProductMetadata } from "@/lib/seo/metadata";
import { canonicalProductPath, isKnownCategorySlug, crumbsToBreadcrumbItems, productCrumbs } from "@/lib/seo/category";
import { JsonLd } from "@/components/common/JsonLd";

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
  if (!product || !product.categorySlug) return { title: "Product Not Found" };
  return buildProductMetadata(product);
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

  const product = await getProductBySlug(productSlug);
  if (!product || !product.categorySlug) notFound();

  // Slugs are globally unique, so a stale category segment (product moved to a
  // subcategory, old shared/cached/feed link) is redirected rather than 404'd.
  // The page stays statically cacheable, so the query string is not forwarded.
  // Only known category slugs redirect, so junk segments 404 instead of each caching a redirect entry.
  // 308 is deliberate (SEO equity; moves are rare). Browsers cache it hard: moving a product A->B and
  // later B->A can loop for visitors who cached A->B, so prefer not to move products back.
  const canonicalPath = canonicalProductPath(product, categorySlug);
  if (canonicalPath) {
    const categories = await getCategories();
    // getCategories() swallows backend errors as []; a 404 here would be ISR-cached for the revalidate window.
    if (categories.length === 0) throw new Error("Categories unavailable; cannot validate stale category slug");
    if (!isKnownCategorySlug(categories, categorySlug)) notFound();
    permanentRedirect(canonicalPath);
  }

  const category = { name: product.categoryName || product.categorySlug };

  const displayPrice = getDisplayPricePerUnit(product);
  const listing = getListingPrice(product);

  const jsonLd = buildProductJsonLd(product, SITE_URL);
  const crumbs = productCrumbs(product);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(crumbs);

  return (
    <>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 max-md:py-3">
        {/* Mobile: a single-line back link; the full breadcrumb stays for md+ (structured data is separate). */}
        <Link
          href={ROUTES.category(product.categorySlug)}
          className="md:hidden mb-2 -ml-1 inline-flex min-h-11 items-center gap-0.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={18} aria-hidden="true" />
          {category.name}
        </Link>

        {/* Breadcrumb */}
        <Breadcrumb
          items={crumbsToBreadcrumbItems(crumbs)}
          className="mb-6 max-md:hidden"
        />

        {/* Main product grid */}
        <PdpStateProvider initialTotal={product.pricingTiers[0]?.totalPrice ?? product.priceFrom ?? 0}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-md:gap-4 xl:gap-16">
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
            <div className="mb-6 max-md:mb-3">
              <p className="max-md:hidden text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {product.categoryName}
              </p>
              <h1 className="font-heading font-bold text-2xl lg:text-3xl leading-tight mb-3 max-md:mb-1.5 max-md:text-xl">
                {product.name}
              </h1>
              <MobilePriceLine />
              <div className={`flex items-center gap-3 mb-4 max-md:mb-2${product.reviewCount === 0 ? " max-md:hidden" : ""}`}>
                {product.reviewCount > 0 ? (
                  <StarRating
                    rating={product.averageRating}
                    reviewCount={product.reviewCount}
                    showCount
                    size="sm"
                  />
                ) : (
                  <span className="text-xs font-medium text-muted-foreground max-md:hidden">
                    No reviews yet — be the first to try this product
                  </span>
                )}
                <span className="text-xs text-muted-foreground max-md:hidden">
                  {listing ? (
                    <>{formatQty(listing.quantity, product.unitLabel)} for <span className="font-semibold text-foreground">{formatPrice(listing.price)}</span> · Options may change the price</>
                  ) : (
                    <>From <span className="font-semibold text-foreground">{formatPricePerUnit(displayPrice)}</span> / unit</>
                  )}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-md:line-clamp-2">
                {product.shortDescription}
              </p>
            </div>

            {/* Configurator + Artwork upload + Sticky CTA */}
            <ProductDetailClient product={product} />
          </div>
        </div>
        </PdpStateProvider>

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
          specs={buildSpecRows(product).length > 0 ? <ProductSpecs rows={buildSpecRows(product)} /> : null}
          description={
            <section aria-labelledby="description-heading">
              <h2 id="description-heading" className="font-heading font-bold text-xl mb-4 max-md:hidden">
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
