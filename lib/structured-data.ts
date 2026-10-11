import type { Product } from "@/types";
import { formatQty } from "@/lib/quantity";
import { stripHtml } from "@/lib/seo/metadata";
import { SITE_URL, SITE_NAME, absoluteUrl, CONTACT_PHONE_E164_DASHED } from "@/lib/seo/site";

export { SITE_URL };

/** Product title as the shopping feed spells it: "Name - 40 pcs" (ASCII hyphen), plain name without a listing offer. */
export function structuredProductName(product: Pick<Product, "name" | "unitLabel" | "listingOffer">): string {
  const quantity = product.listingOffer?.quantity;
  return quantity ? `${product.name} - ${formatQty(quantity, product.unitLabel)}` : product.name;
}

type JsonLdProduct = Pick<
  Product,
  | "name" | "description" | "images" | "slug" | "categorySlug" | "unitLabel"
  | "listingOffer" | "reviewCount" | "averageRating"
> & Partial<Pick<Product, "id" | "shortDescription" | "categoryName" | "categoryPath">>;

/**
 * A single Offer built from the server's listing_offer, so the advertised price
 * equals the feed price and the PDP landing price. Omitted when the server sent
 * none (a per-unit AggregateOffer would misstate the listing price).
 */
export function buildOffer(product: JsonLdProduct, siteUrl: string, now: Date = new Date()): Record<string, unknown> | null {
  const offer = product.listingOffer;
  if (!offer) return null;

  const saleStarted = offer.saleStartsAt ? new Date(offer.saleStartsAt).getTime() <= now.getTime() : true;
  const onSale = offer.salePrice !== null && saleStarted;
  const price = onSale ? offer.salePrice! : offer.price;
  const endsAt = onSale && offer.saleEndsAt ? offer.saleEndsAt.slice(0, 10) : null;
  const query = offer.query ? `?${offer.query}` : "";

  return {
    "@type": "Offer",
    url: `${siteUrl}/products/${product.categorySlug}/${product.slug}${query}`,
    priceCurrency: "INR",
    price: price.toFixed(2),
    ...(endsAt && { priceValidUntil: endsAt }),
    availability: offer.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@type": "Organization", name: "Urgent Printers" },
  };
}

export function buildProductJsonLd(product: JsonLdProduct, siteUrl: string, now: Date = new Date()): Record<string, unknown> {
  const offer = buildOffer(product, siteUrl, now);
  const description = (product.shortDescription?.trim() || stripHtml(product.description));
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: structuredProductName(product),
    ...(description && { description }),
    image: product.images,
    url: `${siteUrl}/products/${product.categorySlug}/${product.slug}`,
    ...(product.id && { sku: product.id }),
    ...((product.categoryPath || product.categoryName) && { category: product.categoryPath || product.categoryName }),
    brand: { "@type": "Brand", name: SITE_NAME },
    ...(product.reviewCount > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: product.averageRating,
        reviewCount: product.reviewCount,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    ...(offer && { offers: offer }),
  };
}

export interface Crumb {
  name: string;
  /** Path ("/products/x") or absolute URL. */
  path: string;
}

/** Ordered root-to-leaf crumbs; Home is prepended. Extend by passing ancestor crumbs. */
export function buildBreadcrumbJsonLd(crumbs: Crumb[], siteUrl: string = SITE_URL): Record<string, unknown> {
  const all: Crumb[] = [{ name: "Home", path: "/" }, ...crumbs];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path, siteUrl),
    })),
  };
}

/** Callers pass only FAQs that are also visible on the page. Null when there are none. */
export function buildFaqPageJsonLd(faqs: { question: string; answer: string }[]): Record<string, unknown> | null {
  if (faqs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function buildCollectionPageJsonLd(
  input: { name: string; description: string; path: string; products: Pick<Product, "name" | "slug" | "categorySlug" | "mediumUrl" | "images">[] },
  siteUrl: string = SITE_URL,
): Record<string, unknown> {
  const url = absoluteUrl(input.path, siteUrl);
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: input.products.length,
      itemListElement: input.products.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absoluteUrl(`/products/${p.categorySlug}/${p.slug}`, siteUrl),
        name: p.name,
      })),
    },
  };
}

/** Deliberately Organization only: no LocalBusiness markup. */
export function buildOrganizationJsonLd(siteUrl: string = SITE_URL): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl,
    logo: absoluteUrl("/logo.png", siteUrl),
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
      telephone: CONTACT_PHONE_E164_DASHED,
      contactType: "customer service",
      areaServed: "IN",
      availableLanguage: ["en", "hi"],
    },
    sameAs: [
      "https://www.instagram.com/urgent_printers_2026",
      "https://www.facebook.com/people/Urgent-Printers/61591832844842/",
    ],
  };
}
