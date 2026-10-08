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
  MIN_BADGE_RAIL_PRODUCTS,
  pickCampaignCategory,
  selectShelfCategories,
  type CategoryShelf,
} from "@/features/home/shelfBuckets";
import { toCardProduct } from "@/features/products/cardProduct";
import { CategoryRail } from "@/features/home/CategoryRail";
import { FeaturedProducts } from "@/features/home/FeaturedProducts";
import { CampaignBanner } from "@/features/home/CampaignBanner";
import { RecommendedProducts } from "@/features/home/RecommendedProducts";
import { HowItWorks } from "@/features/home/HowItWorks";
import { PromoBanner } from "@/features/home/PromoBanner";
import { TrustBadges } from "@/features/home/TrustBadges";
import { TestimonialsSection } from "@/features/home/TestimonialsSection";
import { ROUTES } from "@/lib/constants/routes";

export const revalidate = 60;

const SHELF_SIZE = 8;
const MAX_SHELVES = 10;
const BADGE_RAIL_SIZE = 10;

export const metadata: Metadata = {
  title: "Urgent Printers — Wedding Cards, Invitations & Celebration Printing",
  description:
    "Wedding cards and invitations, shagun envelopes, wedding essentials, welcome boards, and birthday and anniversary printing. Premium quality, delivered across India.",
  openGraph: {
    title: "Urgent Printers — Wedding Cards, Invitations & Celebration Printing",
    description: "Premium wedding cards, shagun envelopes and celebration stationery, delivered across India.",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Urgent Printers",
  url: "https://urgentprinters.com",
  logo: "https://urgentprinters.com/logo.png",
  description:
    "Online printing for weddings and celebrations in India — wedding cards and invitations, shagun envelopes, wedding essentials, welcome boards, and birthday and anniversary printing.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Kotwali Rd, opposite Punjab National Bank, Tilak Dwar",
    addressLocality: "Mathura",
    addressRegion: "Uttar Pradesh",
    postalCode: "281001",
    addressCountry: "IN",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "1800-123-4567",
    contactType: "customer service",
    areaServed: "IN",
    availableLanguage: ["English", "Hindi"],
  },
  sameAs: [
    "https://www.instagram.com/urgent_printers_2026",
    "https://www.facebook.com/people/Urgent-Printers/61591832844842/",
    "https://twitter.com/urgentprinters",
  ],
};

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
  const shelfCategories = selectShelfCategories(categories, MAX_SHELVES);
  const shelfResults = await Promise.all(
    shelfCategories.map((c) => getProducts({ categorySlug: c.slug, pageSize: SHELF_SIZE, sort: "popular" })),
  );
  const shelves: CategoryShelf[] = shelfCategories.map((category, i) => ({
    category,
    products: shelfResults[i].data,
  }));
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

  const totalProducts = categories.reduce((sum, c) => sum + c.productCount, 0);
  const campaign = pickCampaignCategory(categories, new Set(rails.map((r) => r.category.slug)));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <HeroBannerSection banners={banners} />
      <TrustBadges totalProducts={totalProducts > 0 ? totalProducts : undefined} />
      <CategoryRail categories={categories} />
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
