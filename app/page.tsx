import type { Metadata } from "next";
import { getHeroBanners, getTestimonials, getCategories, getFeaturedProducts } from "@/lib/api";
import { HeroBannerSection } from "@/features/home/HeroBannerSection";
import { CategoryGrid } from "@/features/home/CategoryGrid";
import { FeaturedProducts } from "@/features/home/FeaturedProducts";
import { HowItWorks } from "@/features/home/HowItWorks";
import { PromoBanner } from "@/features/home/PromoBanner";
import { TrustBadges } from "@/features/home/TrustBadges";
import { TestimonialsSection } from "@/features/home/TestimonialsSection";

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
  url: "https://urgentprinters.in",
  logo: "https://urgentprinters.in/logo.png",
  description:
    "India's fast online printing service — business cards, flyers, banners, packaging, brochures, and custom merchandise.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Mumbai",
    addressRegion: "Maharashtra",
    postalCode: "400050",
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
      <HowItWorks />
      <PromoBanner />
      <TestimonialsSection testimonials={testimonials} />
    </>
  );
}
