import type { Metadata } from "next";
import {
  getHeroBanners,
  getTestimonials,
  getCategories,
  getFeaturedProducts,
  getRecommendedProducts,
  getProducts,
} from "@/lib/api";
import { HeroBannerSection } from "@/features/home/HeroBannerSection";
import { ProductRailSection } from "@/features/home/ProductRailSection";
import { CategoryQuadCards } from "@/features/home/CategoryQuadCards";
import { RecentlyViewedRail } from "@/features/home/RecentlyViewedRail";
import {
  bucketShelves,
  dedupeShelfProducts,
  totalCatalogProducts,
  MIN_BADGE_RAIL_PRODUCTS,
  pickCampaignCategory,
  planShelfCategories,
  directRootShelves,
  type CategoryShelf,
} from "@/features/home/shelfBuckets";
import { toCardProduct } from "@/features/products/cardProduct";
import { getRootCategories } from "@/lib/seo/category";
import { CategoryRail } from "@/features/home/CategoryRail";
import { FeaturedProducts } from "@/features/home/FeaturedProducts";
import { CampaignBanner } from "@/features/home/CampaignBanner";
import { RecommendedProducts } from "@/features/home/RecommendedProducts";
import { HowItWorks } from "@/features/home/HowItWorks";
import { PromoBanner } from "@/features/home/PromoBanner";
import { TrustBadges } from "@/features/home/TrustBadges";
import { TestimonialsSection } from "@/features/home/TestimonialsSection";
import { ROUTES } from "@/lib/constants/routes";
import { JsonLd } from "@/components/common/JsonLd";
import { buildOrganizationJsonLd } from "@/lib/structured-data";

export const revalidate = 60;

const SHELF_SIZE = 8;
const MAX_SHELVES = 10;
const BADGE_RAIL_SIZE = 10;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title: "Urgent Printers — Wedding Cards, Invitations & Celebration Printing",
  description:
    "Wedding cards and invitations, shagun envelopes, wedding essentials, welcome boards, and birthday and anniversary printing. Premium quality, delivered across India.",
  openGraph: {
    title: "Urgent Printers — Wedding Cards, Invitations & Celebration Printing",
    description: "Premium wedding cards, shagun envelopes and celebration stationery, delivered across India.",
  },
};

const organizationJsonLd = buildOrganizationJsonLd();

const RECOMMENDED_LIMIT = 10;

export default async function HomePage() {
  // Everything that doesn't depend on the category list goes in the first batch,
  // recommended included (over-fetched, then filtered against what is already on the page).
  const [banners, categories, featured, testimonials, bestsellerResult, newResult, recommendedPool] =
    await Promise.all([
      getHeroBanners(),
      getCategories(),
      getFeaturedProducts(),
      getTestimonials(),
      getProducts({ badge: "bestseller", pageSize: BADGE_RAIL_SIZE, sort: "popular" }),
      getProducts({ badge: "new", pageSize: BADGE_RAIL_SIZE, sort: "newest" }),
      getRecommendedProducts([], RECOMMENDED_LIMIT * 2),
    ]);

  // One request per shelf, all in parallel; the category slugs are the only dependency.
  const { shelves: shelfCategories, splitRoots } = planShelfCategories(categories, MAX_SHELVES);
  const [shelfResults, rootResults] = await Promise.all([
    Promise.all(
      shelfCategories.map((c) => getProducts({ categorySlug: c.slug, pageSize: SHELF_SIZE, sort: "popular" })),
    ),
    // Wider page: the rolled-up root listing is mostly its children's products, which are filtered out.
    Promise.all(
      splitRoots.map((c) => getProducts({ categorySlug: c.slug, pageSize: SHELF_SIZE * 4, sort: "popular" })),
    ),
  ]);
  const shelves: CategoryShelf[] = dedupeShelfProducts([
    ...shelfCategories.map((category, i) => ({ category, products: shelfResults[i].data })),
    ...directRootShelves(
      splitRoots,
      rootResults.map((r) => r.data),
    ),
  ]);
  const { rails, quads } = bucketShelves(shelves);

  const bestsellers = bestsellerResult.data;
  const newArrivals = newResult.data;

  // The data helpers swallow API errors and return empty results. With the API
  // configured, an empty catalog means the backend was unreachable; throwing makes
  // ISR keep serving the last good page and retry on the next request, instead of
  // caching a near-empty homepage for the revalidate window. (Skipped during
  // `next build` so building without a backend still works.)
  if (
    process.env.NEXT_PUBLIC_API_URL &&
    process.env.NEXT_PHASE !== "phase-production-build" &&
    (categories.length === 0 || (rails.length + quads.length === 0 && bestsellers.length === 0 && newArrivals.length === 0))
  ) {
    throw new Error("Homepage data unavailable: catalog fetches returned nothing");
  }

  const showBestsellers = bestsellers.length >= MIN_BADGE_RAIL_PRODUCTS;
  const showNew = newArrivals.length >= MIN_BADGE_RAIL_PRODUCTS;

  const shownIds = new Set([...featured, ...bestsellers].map((p) => p.id));
  const recommended = recommendedPool.filter((p) => !shownIds.has(p.id)).slice(0, RECOMMENDED_LIMIT);

  const totalProducts = totalCatalogProducts(categories);
  const campaign = pickCampaignCategory(categories, new Set(rails.map((r) => r.category.slug)));

  return (
    <>
      <JsonLd data={organizationJsonLd} />
      <HeroBannerSection banners={banners} />
      <TrustBadges totalProducts={totalProducts > 0 ? totalProducts : undefined} />
      <CategoryRail categories={getRootCategories(categories)} />
      {showBestsellers ? (
        <ProductRailSection
          id="bestsellers"
          title="Bestsellers"
          description="What customers order most"
          seeAllHref={`${ROUTES.products}?badge=bestseller`}
          seeAllLabel="See all bestsellers"
          products={bestsellers}
        />
      ) : (
        <FeaturedProducts products={featured.map(toCardProduct)} />
      )}
      {rails.map(({ category, products }, i) => (
        <ProductRailSection
          key={category.id}
          id={`shelf-${category.slug}`}
          title={category.name}
          description={category.description}
          seeAllHref={ROUTES.category(category.slug)}
          seeAllLabel={`See all (${category.productCount})`}
          products={products}
          tinted={i % 2 === 1}
        />
      ))}
      {campaign && (
        <CampaignBanner
          imageUrl={campaign.imageUrl}
          headline={`Explore ${campaign.category.name}`}
          subheading={campaign.category.description || undefined}
          ctaText={`Shop ${campaign.category.name}`}
          ctaHref={ROUTES.category(campaign.category.slug)}
        />
      )}
      <CategoryQuadCards cards={quads} />
      {showNew && (
        <ProductRailSection
          id="new-arrivals"
          title="New arrivals"
          description="Fresh designs, just added"
          seeAllHref={`${ROUTES.products}?badge=new`}
          seeAllLabel="See all new"
          products={newArrivals}
          tinted
        />
      )}
      <PromoBanner />
      <RecentlyViewedRail />
      <RecommendedProducts products={recommended.map(toCardProduct)} />
      <TestimonialsSection testimonials={testimonials} />
      <HowItWorks />
    </>
  );
}
