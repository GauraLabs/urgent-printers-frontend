import { describe, it, expect } from "vitest";
import { buildProductJsonLd, structuredProductName } from "@/lib/structured-data";
import type { ListingOffer } from "@/types";

const offer: ListingOffer = {
  quantity: 50, packSize: 50, price: 300, salePrice: 270,
  saleStartsAt: "2026-10-01T00:00:00+00:00", saleEndsAt: "2026-11-01T00:00:00+00:00",
  inStock: true, query: "qty=50&size=2x2-in&paper=vinyl&finish=matte",
};

const base = {
  name: "Matte Vinyl Stickers", description: "d", images: ["https://cdn/x.webp"], slug: "matte-vinyl-stickers",
  categorySlug: "stickers", packSize: 50, unitLabel: "pcs", reviewCount: 0, averageRating: 0, listingOffer: offer,
};
const now = new Date("2026-10-07T00:00:00Z");

describe("buildProductJsonLd", () => {
  it("emits a single Offer with the sale price, URL query and priceValidUntil", () => {
    const ld = buildProductJsonLd(base, "https://urgentprinters.com", now);
    expect(ld.offers).toEqual({
      "@type": "Offer",
      url: "https://urgentprinters.com/products/stickers/matte-vinyl-stickers?qty=50&size=2x2-in&paper=vinyl&finish=matte",
      priceCurrency: "INR",
      price: "270.00",
      priceValidUntil: "2026-11-01",
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "Urgent Printers" },
    });
    expect(JSON.stringify(ld)).not.toContain("AggregateOffer");
  });
  it("uses the regular price (no priceValidUntil) before a scheduled sale starts", () => {
    const ld = buildProductJsonLd({ ...base, listingOffer: { ...offer, saleStartsAt: "2026-10-10T00:00:00+00:00" } }, "https://x.test", now);
    expect(ld.offers).toMatchObject({ price: "300.00" });
    expect(ld.offers).not.toHaveProperty("priceValidUntil");
  });
  it("uses price when there is no sale and flags out of stock", () => {
    const ld = buildProductJsonLd({ ...base, listingOffer: { ...offer, salePrice: null, saleEndsAt: null, inStock: false } }, "https://x.test", now);
    expect(ld.offers).toMatchObject({ price: "300.00", availability: "https://schema.org/OutOfStock" });
  });
  it("omits offers when the server sent no listing offer", () => {
    expect(buildProductJsonLd({ ...base, listingOffer: null }, "https://x.test", now)).not.toHaveProperty("offers");
    expect(buildProductJsonLd({ ...base, listingOffer: undefined }, "https://x.test", now)).not.toHaveProperty("offers");
  });
  it("names the priced quantity when the lowest tier is several packs", () => {
    const ld = buildProductJsonLd({ ...base, listingOffer: { ...offer, quantity: 100 } }, "https://x.test", now);
    expect(ld.name).toBe("Matte Vinyl Stickers - 100 pcs (2 packs of 50)");
  });
  it("titles pack products like the feed and leaves non-pack names alone", () => {
    expect(structuredProductName(base)).toBe("Matte Vinyl Stickers - Pack of 50 pcs");
    expect(structuredProductName({ name: "Cards", packSize: 1, unitLabel: "pcs" })).toBe("Cards");
    expect(structuredProductName({ name: "Cards" })).toBe("Cards");
  });
});
