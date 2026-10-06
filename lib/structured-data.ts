import type { Product } from "@/types";
import { normalizePack } from "@/lib/pack";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://urgentprinters.com").replace(/\/$/, "");

/** Product title as the shopping feed spells it: "Name - Pack of 50 pcs" for packs. */
export function structuredProductName(
  product: Pick<Product, "name" | "packSize" | "unitLabel" | "listingOffer">
): string {
  const { packSize, unitLabel } = normalizePack(product.packSize, product.unitLabel);
  if (packSize <= 1) return product.name;
  // The priced quantity (lowest tier) can be several packs, e.g. 100 pcs of a 50-pack.
  const quantity = product.listingOffer?.quantity ?? packSize;
  const packs = Math.floor(quantity / packSize);
  return packs > 1
    ? `${product.name} - ${quantity} ${unitLabel} (${packs} packs of ${packSize})`
    : `${product.name} - Pack of ${packSize} ${unitLabel}`;
}

type JsonLdProduct = Pick<
  Product,
  | "name" | "description" | "images" | "slug" | "categorySlug" | "packSize" | "unitLabel"
  | "listingOffer" | "reviewCount" | "averageRating"
>;

/**
 * A single Offer built from the server's listing_offer, so the advertised price
 * equals the feed price and the PDP landing price. Omitted when the server sent
 * none (the old per-unit AggregateOffer misstated pack prices).
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
