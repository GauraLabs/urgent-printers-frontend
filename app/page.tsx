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
    "https://www.instagram.com/urgentprinters",
    "https://www.facebook.com/urgentprinters",
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
      <CategoryGrid categories={categories} />
      <FeaturedProducts products={featured} />
      <RecommendedProducts products={recommended} />
      <HowItWorks />
      <PromoBanner />
      <TestimonialsSection testimonials={testimonials} />
    </>
  );
}
