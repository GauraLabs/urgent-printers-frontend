import { describe, it, expect } from "vitest";
import { buildMerchantReturnPolicy, buildOrganizationJsonLd, buildProductJsonLd, buildShippingDetails, structuredProductName } from "@/lib/structured-data";
import type { ListingOffer } from "@/types";

const offer: ListingOffer = {
  quantity: 50, price: 300, salePrice: 270,
  saleStartsAt: "2026-10-01T00:00:00+00:00", saleEndsAt: "2026-11-01T00:00:00+00:00",
  inStock: true, query: "qty=50&size=2x2-in&paper=vinyl&finish=matte",
};

const base = {
  id: "7", categoryName: "Stickers", shortDescription: "", name: "Matte Vinyl Stickers", description: "d", images: ["https://cdn/x.webp"], slug: "matte-vinyl-stickers",
  categorySlug: "stickers", unitLabel: "pcs", reviewCount: 0, averageRating: 0, listingOffer: offer,
};
const now = new Date("2026-10-07T00:00:00Z");

describe("buildProductJsonLd", () => {
  it("emits a single Offer with the sale price, URL query and priceValidUntil", () => {
    const ld = buildProductJsonLd(base, "https://urgentprinters.com", now);
    expect(ld.offers).toMatchObject({
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
  it("names the listing quantity in the title, like the feed", () => {
    const ld = buildProductJsonLd({ ...base, listingOffer: { ...offer, quantity: 100 } }, "https://x.test", now);
    expect(ld.name).toBe("Matte Vinyl Stickers - 100 pcs");
  });
  it("uses the singular for one piece and leaves the name alone without an offer", () => {
    expect(structuredProductName({ ...base, listingOffer: { ...offer, quantity: 1 } })).toBe("Matte Vinyl Stickers - 1 pc");
    expect(structuredProductName({ name: "Cards", unitLabel: "pcs" })).toBe("Cards");
    expect(structuredProductName({ name: "Cards" })).toBe("Cards");
  });
  it("offer price equals the listing offer price and name carries the same quantity", () => {
    const ld = buildProductJsonLd({ ...base, listingOffer: { ...offer, salePrice: null, saleEndsAt: null } }, "https://x.test", now);
    expect(ld.offers).toMatchObject({ price: "300.00" });
    expect(ld.name).toBe("Matte Vinyl Stickers - 50 pcs");
  });
});

type Offer = {
  price: string;
  shippingDetails: {
    "@type": string;
    shippingRate: { value: number; currency: string };
    shippingDestination: { addressCountry: string };
    deliveryTime: { handlingTime: Record<string, unknown>; transitTime: Record<string, unknown> };
  };
  hasMerchantReturnPolicy: Record<string, unknown>;
};
const offerOf = (p: Parameters<typeof buildProductJsonLd>[0]): Offer =>
  buildProductJsonLd(p, "https://x.test", now).offers as Offer;

describe("merchant listing fields", () => {
  it("charges the 99 INR flat rate below the free-shipping threshold, judged on the offer price", () => {
    const o = offerOf({ ...base, listingOffer: { ...offer, price: 500, salePrice: null, saleEndsAt: null } });
    expect(o.shippingDetails.shippingRate).toEqual({ "@type": "MonetaryAmount", value: 99, currency: "INR" });
  });
  it("is free at exactly the threshold and uses the sale price, not the list price, for the decision", () => {
    const at = offerOf({ ...base, listingOffer: { ...offer, price: 999, salePrice: null, saleEndsAt: null } });
    expect(at.shippingDetails.shippingRate.value).toBe(0);
    const saleBelow = offerOf({ ...base, listingOffer: { ...offer, price: 1200, salePrice: 900 } });
    expect(saleBelow.price).toBe("900.00");
    expect(saleBelow.shippingDetails.shippingRate.value).toBe(99);
  });
  it("ships to India with the policy's 5-7 day transit and 2-3 day default handling", () => {
    const d = offerOf(base).shippingDetails;
    expect(d["@type"]).toBe("OfferShippingDetails");
    expect(d.shippingDestination).toEqual({ "@type": "DefinedRegion", addressCountry: "IN" });
    expect(d.deliveryTime.transitTime).toEqual({ "@type": "QuantitativeValue", minValue: 5, maxValue: 7, unitCode: "DAY" });
    expect(d.deliveryTime.handlingTime).toMatchObject({ minValue: 2, maxValue: 3, unitCode: "DAY" });
  });
  it("derives handling from the cheapest turnaround option, ignoring paid rush options", () => {
    const turnaroundOptions = [
      { id: "rush", label: "Rush", businessDays: 1, extraCost: 200 },
      { id: "std", label: "Standard", businessDays: 4, extraCost: 0 },
    ];
    expect(offerOf({ ...base, turnaroundOptions }).shippingDetails.deliveryTime.handlingTime).toMatchObject({ minValue: 4, maxValue: 4 });
    expect(buildShippingDetails(100, [])).toMatchObject({ deliveryTime: { handlingTime: { minValue: 2, maxValue: 3 } } });
  });
  it("return policy is a 7-day finite window with free full refunds, linked to the policy page", () => {
    const r = offerOf(base).hasMerchantReturnPolicy;
    expect(r).toEqual(buildMerchantReturnPolicy("https://x.test"));
    expect(r).toMatchObject({
      "@type": "MerchantReturnPolicy",
      applicableCountry: "IN",
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 7,
      returnFees: "https://schema.org/FreeReturn",
      refundType: "https://schema.org/FullRefund",
      merchantReturnLink: "https://x.test/policies/returns",
    });
  });
  it("organization carries the same return policy and no offer-level shipping", () => {
    const org = buildOrganizationJsonLd("https://x.test");
    expect(org.hasMerchantReturnPolicy).toEqual(buildMerchantReturnPolicy("https://x.test"));
  });
  it("offers still omit shipping/returns when there is no listing offer", () => {
    expect(JSON.stringify(buildProductJsonLd({ ...base, listingOffer: null }, "https://x.test", now))).not.toContain("shippingDetails");
  });
});
