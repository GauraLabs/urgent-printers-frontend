import type { Product } from "@/types";
import { formatQty } from "@/lib/quantity";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://urgentprinters.com").replace(/\/$/, "");

/** Product title as the shopping feed spells it: "Name - 40 pcs" (ASCII hyphen), plain name without a listing offer. */
export function structuredProductName(product: Pick<Product, "name" | "unitLabel" | "listingOffer">): string {
  const quantity = product.listingOffer?.quantity;
  return quantity ? `${product.name} - ${formatQty(quantity, product.unitLabel)}` : product.name;
}

type JsonLdProduct = Pick<
  Product,
  | "name" | "description" | "images" | "slug" | "categorySlug" | "unitLabel"
  | "listingOffer" | "reviewCount" | "averageRating"
>;

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
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: structuredProductName(product),
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
    ...(offer && { offers: offer }),
  };
}
