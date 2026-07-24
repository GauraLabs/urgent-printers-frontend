import type { Metadata } from "next";
import {
  getHeroBanners,
  getTestimonials,
  getCategories,
  getFeaturedProducts,
  getRecommendedProducts,
} from "@/lib/api";
import { HeroBannerSection } from "@/features/home/HeroBannerSection";
import { CategoryGrid } from "@/features/home/CategoryGrid";
import { FeaturedProducts } from "@/features/home/FeaturedProducts";
import { RecommendedProducts } from "@/features/home/RecommendedProducts";
import { HowItWorks } from "@/features/home/HowItWorks";
import { PromoBanner } from "@/features/home/PromoBanner";
import { TrustBadges } from "@/features/home/TrustBadges";
import { TestimonialsSection } from "@/features/home/TestimonialsSection";

export const revalidate = 60;

// CategoryGrid is 2 cols (mobile) / 3 cols (desktop, first tile spans 2x2).
// 12 is a multiple of both, so rows fill evenly with no dangling partial row.
const HOMEPAGE_CATEGORY_LIMIT = 12;

export const metadata: Metadata = {
  title: "Urgent Printers — Premium Print Solutions, Fast",
  description:
    "Business cards, flyers, banners, packaging, brochures, and custom merch. Premium quality printing delivered fast across India. Order from 25 units.",
  openGraph: {
    title: "Urgent Printers — Premium Print Solutions, Fast",
    description: "Premium quality printing delivered fast across India. Order from 25 units.",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Urgent Printers",
  url: "https://urgentprinters.com",
  logo: "https://urgentprinters.com/logo.png",
  description:
    "India's fast online printing service — business cards, flyers, banners, packaging, brochures, and custom merchandise.",
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

export default async function HomePage() {
  const [banners, categories, featured, testimonials] = await Promise.all([
    getHeroBanners(),
    getCategories(),
    getFeaturedProducts(),
    getTestimonials(),
  ]);
  const recommended = await getRecommendedProducts(featured.map((p) => p.id), 10);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <HeroBannerSection banners={banners} />
      <TrustBadges />
      <CategoryGrid categories={categories.slice(0, HOMEPAGE_CATEGORY_LIMIT)} />
      <FeaturedProducts products={featured} />
      <RecommendedProducts products={recommended} />
      <HowItWorks />
      <PromoBanner />
      <TestimonialsSection testimonials={testimonials} />
    </>
  );
}
