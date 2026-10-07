import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { mapCard, mapDetail, mapSearchDoc } from "@/lib/api/products";
import { mapCartItem } from "@/lib/api/cart";
import { mapOrderDetail, mapPreview } from "@/lib/api/orders";
import { ProductPrice } from "@/components/common/ProductPrice";
import { correctionMessage } from "@/features/cart/corrections";
import { useCartStore } from "@/features/cart/store";
import { ProductConfigurator } from "@/features/products/configurator/ProductConfigurator";
import { StickyAddToCart } from "@/features/products/StickyAddToCart";
import { buildProductJsonLd } from "@/lib/structured-data";
import { codedErrorMessage } from "@/lib/api/validationErrors";
import {
  cardLegacy, detailOnSale, searchDocLegacy, cartItemLegacy, orderLegacy, previewRepriced,
} from "./fixtures/mrp-contract";
import type { BackendCartItem } from "@/lib/api/cart";
import type { CartItem, Product } from "@/types";

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));

describe("mappers: quantity fields", () => {
  it("card: maps listing figures and effective limits", () => {
    const p = mapCard({
      ...cardLegacy, unit_label: "pcs", listing_quantity: 40, min_order_quantity: 40, max_order_quantity: 5000,
      listing_price: 240, listing_mrp: 300, listing_discount_percent: 20,
    });
    expect([p.unitLabel, p.listingQuantity, p.minOrderQuantity, p.maxOrderQuantity, p.listingPrice, p.listingMrp, p.listingDiscountPercent])
      .toEqual(["pcs", 40, 40, 5000, 240, 300, 20]);
  });
  it("card: a null max means no limit; absent fields stay absent (old backend)", () => {
    expect(mapCard({ ...cardLegacy, max_order_quantity: null }).maxOrderQuantity).toBeNull();
    const old = mapCard(cardLegacy);
    expect([old.listingQuantity, old.minOrderQuantity, old.maxOrderQuantity, old.listingPrice]).toEqual([undefined, undefined, undefined, undefined]);
    expect(Object.keys(old)).not.toContain("packSize");
  });
  it("detail and search doc map the same fields", () => {
    const d = mapDetail({ ...detailOnSale, listing_quantity: 100, min_order_quantity: 50, max_order_quantity: null, listing_price: 400 });
    expect([d.listingQuantity, d.minOrderQuantity, d.maxOrderQuantity, d.listingPrice]).toEqual([100, 50, null, 400]);
    const s = mapSearchDoc({ ...searchDocLegacy, listing_quantity: 25, listing_price: 400, unit_label: "tags" }, new Map());
    expect([s.listingQuantity, s.listingPrice, s.unitLabel]).toEqual([25, 400, "tags"]);
  });
  it("detail: listing_offer carries no pack size", () => {
    const d = mapDetail({ ...detailOnSale, listing_offer: { quantity: 40, price: 240, query: "qty=40" } });
    expect(d.listingOffer).toEqual(expect.objectContaining({ quantity: 40, price: 240, query: "qty=40" }));
    expect(d.listingOffer).not.toHaveProperty("packSize");
  });
  it("cart: carries unit label and limits; a null max survives; legacy lines get none", () => {
    const line = mapCartItem({ ...cartItemLegacy, unitLabel: "pcs", minQuantity: 40, maxQuantity: null, quantityCorrected: true, originalQuantity: 10, quantity: 40 } as BackendCartItem);
    expect(line.config).toMatchObject({ unitLabel: "pcs", minQuantity: 40, maxQuantity: null, quantity: 40 });
    expect(line.originalQuantity).toBe(10);
    const plain = mapCartItem(cartItemLegacy);
    expect(plain.config.minQuantity).toBeUndefined();
    expect(plain.config.maxQuantity).toBeUndefined();
  });
  it("orders: new lines read plain, historical pack snapshots stay readable", () => {
    const fresh = mapOrderDetail({ ...orderLegacy, items: orderLegacy.items.map((i) => ({ ...i, packSize: 1, unitLabel: "pcs" })) });
    expect(fresh.items[0]).toMatchObject({ unitLabel: "pcs" });
    expect(fresh.items[0].packSize).toBeUndefined();
    const old = mapOrderDetail({ ...orderLegacy, items: orderLegacy.items.map((i) => ({ ...i, packSize: 50, unitLabel: "pcs" })) });
    expect(old.items[0]).toMatchObject({ packSize: 50, unitLabel: "pcs" });
    const pv = mapPreview({ ...previewRepriced, items: previewRepriced.items.map((i) => ({ ...i, unitLabel: "tags" })) });
    expect(pv.items[0].unitLabel).toBe("tags");
  });
});

describe("card / search price line", () => {
  const base = { pricingTiers: [], printSpec: { sizes: [], papers: [], finishes: [], sides: [], minDpi: 300, bleedMm: 3 } } as unknown as Pick<Product, "pricingTiers" | "printSpec">;

  it("renders '40 pcs for ₹240.00'", () => {
    const html = renderToStaticMarkup(<ProductPrice variant="card" prefix="From" unitLabel="per unit" product={{ ...base, priceFrom: 6, unitLabel: "pcs", listingQuantity: 40, listingPrice: 240 }} />);
    expect(html).toContain("40 pcs for");
    expect(html).toContain("₹240.00");
    expect(html).not.toContain("From");
    expect(html).not.toContain("per unit");
  });
  it("renders '1 pc for ₹1,100.00' and the struck MRP with percent", () => {
    const html = renderToStaticMarkup(<ProductPrice variant="card" product={{ ...base, listingQuantity: 1, listingPrice: 1100 }} />);
    expect(html).toContain("1 pc for");
    expect(html).toContain("₹1,100.00");
    const sale = renderToStaticMarkup(<ProductPrice variant="card" product={{ ...base, unitLabel: "pcs", listingQuantity: 40, listingPrice: 240, listingMrp: 300, listingDiscountPercent: 20 }} />);
    expect(sale).toContain("₹300.00");
    expect(sale).toContain("20% off");
  });
  it("compact variant (search/recent) uses the same line", () => {
    const html = renderToStaticMarkup(<ProductPrice variant="compact" prefix="from" unitLabel="/unit" product={{ ...base, listingQuantity: 25, listingPrice: 400, unitLabel: "tags" }} />);
    expect(html).toContain("25 tags for");
    expect(html).toContain("₹400.00");
    expect(html).not.toContain("/unit");
  });
  it("falls back to the per-unit From price when listing fields are absent", () => {
    const html = renderToStaticMarkup(<ProductPrice variant="card" prefix="From" unitLabel="per unit" product={{ ...base, priceFrom: 6 }} />);
    expect(html).toContain("From");
    expect(html).toContain("₹6.00");
    expect(html).toContain("per unit");
  });
});

describe("cart corrections", () => {
  const line = (over: Partial<CartItem["config"]> = {}): CartItem => ({
    cartItemId: "p1", product: { id: "1", slug: "s", name: "Matte Stickers", images: [], categoryName: "", categorySlug: "" },
    config: { quantity: 40, turnaroundId: "std", turnaroundLabel: "Standard", turnaroundExtraCost: 0, unitLabel: "pcs", minQuantity: 40, maxQuantity: 5000, ...over },
    pricePerUnit: 6, totalPrice: 240,
  });

  it("single line names the item, the new quantity and the allowed range", () => {
    expect(correctionMessage([line()])).toBe("Matte Stickers: quantity adjusted to 40 pcs (allowed 40 to 5,000)");
    expect(correctionMessage([line({ maxQuantity: null })])).toBe("Matte Stickers: quantity adjusted to 40 pcs (minimum 40)");
  });
  it("several lines get one summary; none gets nothing", () => {
    expect(correctionMessage([line(), line()])).toBe("Quantity updated to fit the allowed range for 2 items");
    expect(correctionMessage([])).toBeNull();
  });

  beforeEach(() => useCartStore.setState({ items: [line({ quantity: 10 })] }));
  it("applies a server correction (quantity and new limits) only to a line still at the original quantity", () => {
    const fixed = { ...line(), originalQuantity: 10, quantityCorrected: true };
    const applied = useCartStore.getState().applyQuantityCorrections([fixed]);
    expect(applied).toHaveLength(1);
    expect(useCartStore.getState().items[0].config).toMatchObject({ quantity: 40, minQuantity: 40, maxQuantity: 5000 });
    expect(useCartStore.getState().applyQuantityCorrections([{ ...fixed, originalQuantity: 99 }])).toHaveLength(0);
  });
  it("updateQuantity clamps into the line's allowed range", () => {
    useCartStore.getState().updateQuantity("p1", 3);
    expect(useCartStore.getState().items[0].config.quantity).toBe(40);
    useCartStore.getState().updateQuantity("p1", 90000);
    expect(useCartStore.getState().items[0].config.quantity).toBe(5000);
    expect(useCartStore.getState().items[0].pricePending).toBe(true);
  });
  it("limit errors keep the server's own message and have no pack wording", () => {
    expect(codedErrorMessage("quantity_below_minimum", "Matte Stickers: minimum order is 40 pcs")).toBeUndefined();
    expect(codedErrorMessage("quantity_above_maximum")).toContain("maximum");
    expect(codedErrorMessage("invalid_pack_multiple")).toBeUndefined();
  });
});

describe("ProductConfigurator", () => {
  const spec = {
    sizes: [{ id: "s", label: "2x2 in", width: 2, height: 2, unit: "in", priceMultiplier: 1, isDefault: true }],
    papers: [], finishes: [], sides: [], minDpi: 300, bleedMm: 3,
  };
  const product = {
    id: "1", slug: "stickers", name: "Matte Stickers", categoryId: "1", categorySlug: "stickers", categoryName: "Stickers",
    description: "", shortDescription: "", images: [], printSpec: spec, averageRating: 0, reviewCount: 0, isFeatured: false, tags: [],
    customizationMode: "none", templateFields: [], unitLabel: "pcs", listingQuantity: 40, minOrderQuantity: 40, maxOrderQuantity: 5000,
    pricingTiers: [
      { quantity: 40, pricePerUnit: 6, totalPrice: 240 },
      { quantity: 100, pricePerUnit: 4, totalPrice: 400, isBestValue: true },
      { quantity: 200, pricePerUnit: 3, totalPrice: 600 },
    ],
    turnaroundOptions: [{ id: "std", label: "Standard", businessDays: 5, extraCost: 0 }],
  } as unknown as Product;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: true, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
    }));
    useCartStore.setState({ items: [], isOpen: false });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const field = () => screen.getByLabelText("Quantity") as HTMLInputElement;

  it("opens at the listing quantity with the range hint, price and tier guide", () => {
    render(<ProductConfigurator product={product} />);
    expect(field().value).toBe("40");
    expect(screen.getByText(/Min 40 pcs/).textContent).toBe("Min 40 pcs · Max 5,000 pcs");
    expect(screen.getAllByText("₹240.00").length).toBeGreaterThan(0);
    const current = screen.getAllByRole("button").filter((b) => b.getAttribute("aria-current") === "true");
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toContain("40+");
  });

  it("typing below the minimum prices at the minimum and never errors; blur snaps", () => {
    render(<ProductConfigurator product={product} />);
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "10" } });
    expect(screen.getByText("Minimum order is 40 pcs")).toBeTruthy();
    act(() => void vi.advanceTimersByTime(150));
    expect(screen.getAllByText("₹240.00").length).toBeGreaterThan(0);
    fireEvent.blur(field());
    expect(field().value).toBe("40");
  });

  it("follows the tier live and the nudge taps up to the next tier", () => {
    render(<ProductConfigurator product={product} />);
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "99" } });
    act(() => void vi.advanceTimersByTime(150));
    expect(screen.getAllByText("₹594.00").length).toBeGreaterThan(0);
    expect(screen.getByText(/Add 1 more pc and pay ₹4.00\/pc: ₹400.00 total \(you save ₹194.00\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add 1 more" }));
    expect(field().value).toBe("100");
    expect(screen.getAllByText("₹400.00").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Add 1 more" })).toBeNull();
  });

  it("a tier chip jumps to that tier's start", () => {
    render(<ProductConfigurator product={product} />);
    fireEvent.click(screen.getByRole("button", { name: /200\+/ }));
    expect(field().value).toBe("200");
  });

  it("Add to cart is gated only by an empty field; out-of-range typing is clamped and added", () => {
    render(<ProductConfigurator product={product} />);
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "" } });
    const cta = screen.getByRole("button", { name: "Enter a quantity" }) as HTMLButtonElement;
    expect(cta.disabled).toBe(true);
    fireEvent.change(field(), { target: { value: "9" } });
    fireEvent.blur(field());
    fireEvent.click(screen.getByRole("button", { name: /Add to Cart/ }));
    expect(useCartStore.getState().items[0].config).toMatchObject({ quantity: 40, unitLabel: "pcs", minQuantity: 40, maxQuantity: 5000 });
  });

  it("hides the guide and nudge for a single-tier product without limits", () => {
    const single = { ...product, minOrderQuantity: undefined, maxOrderQuantity: undefined, listingQuantity: undefined, pricingTiers: [product.pricingTiers[0]] } as Product;
    render(<ProductConfigurator product={single} />);
    expect(field().value).toBe("40");
    expect(screen.queryByText("Rate by quantity")).toBeNull();
    expect(screen.getByText("Min 40 pcs")).toBeTruthy();
  });
});

describe("repricing after a quantity edit", () => {
  const rateTiers = [{ quantity: 50, pricePerUnit: 6 }, { quantity: 100, pricePerUnit: 4 }];
  const line = (config: Partial<CartItem["config"]> = {}): CartItem => ({
    cartItemId: "p1", product: { id: "1", slug: "s", name: "Stickers", images: [], categoryName: "", categorySlug: "" },
    config: { quantity: 50, turnaroundId: "std", turnaroundLabel: "Standard", turnaroundExtraCost: 0, minQuantity: 50, maxQuantity: null, ...config },
    pricePerUnit: 6, totalPrice: 300,
  });

  it("50 -> 100 reprices to the new tier locally (no stale 600)", () => {
    useCartStore.setState({ items: [line({ rateTiers, optionMultiplier: 1 })] });
    useCartStore.getState().updateQuantity("p1", 100);
    expect(useCartStore.getState().items[0]).toMatchObject({ pricePerUnit: 4, totalPrice: 400 });
    expect(useCartStore.getState().items[0].pricePending).toBeUndefined();
  });
  it("a line without a rate card goes pending, then takes the server price from sync", () => {
    useCartStore.setState({ items: [line()] });
    useCartStore.getState().updateQuantity("p1", 100);
    expect(useCartStore.getState().items[0].pricePending).toBe(true);
    const server = { ...line({ quantity: 100, minQuantity: 50, maxQuantity: 900 }), pricePerUnit: 4, totalPrice: 400 };
    useCartStore.getState().applyServerLines([server]);
    expect(useCartStore.getState().items[0]).toMatchObject({ pricePerUnit: 4, totalPrice: 400 });
    expect(useCartStore.getState().items[0].pricePending).toBeUndefined();
    expect(useCartStore.getState().items[0].config).toMatchObject({ minQuantity: 50, maxQuantity: 900 });
  });
  it("applyServerLines ignores a server line for a different quantity and is a no-op when nothing differs", () => {
    useCartStore.setState({ items: [line()] });
    const before = useCartStore.getState().items;
    useCartStore.getState().applyServerLines([{ ...line({ quantity: 70 }), pricePerUnit: 9, totalPrice: 630 }]);
    expect(useCartStore.getState().items).toBe(before);
    useCartStore.getState().applyServerLines([line()]);
    expect(useCartStore.getState().items).toBe(before);
  });
  it("setItems keeps the local rate card", () => {
    useCartStore.setState({ items: [line({ rateTiers, optionMultiplier: 1 })] });
    useCartStore.getState().setItems([line()]);
    expect(useCartStore.getState().items[0].config.rateTiers).toEqual(rateTiers);
  });
  it("caps at 1,000,000 when there is no maximum", () => {
    useCartStore.setState({ items: [line({ rateTiers, optionMultiplier: 1 })] });
    useCartStore.getState().updateQuantity("p1", 9_999_999);
    expect(useCartStore.getState().items[0].config.quantity).toBe(1_000_000);
  });
});

describe("Indian grouping and sticky gate", () => {
  it("JSON-LD name uses en-IN grouping like the feed", () => {
    const base = { description: "", images: [], slug: "s", categorySlug: "c", reviewCount: 0, averageRating: 0, unitLabel: "pcs" };
    const offer = { quantity: 100000, price: 1, salePrice: null, saleStartsAt: null, saleEndsAt: null, inStock: true, query: "" };
    expect(buildProductJsonLd({ ...base, name: "X", listingOffer: offer }, "https://x.test").name).toBe("X - 1,00,000 pcs");
    expect(buildProductJsonLd({ ...base, name: "X", listingOffer: { ...offer, quantity: 1000 } }, "https://x.test").name).toBe("X - 1,000 pcs");
  });
  it("sticky bar disables with the same empty-quantity gate", () => {
    vi.stubGlobal("IntersectionObserver", class { constructor(cb: (e: { isIntersecting: boolean }[]) => void) { cb([{ isIntersecting: false }]); } observe() {} disconnect() {} });
    render(<StickyAddToCart productName="X" price="₹1" disabled observeRef={{ current: document.createElement("button") }} onAddToCart={() => {}} />);
    expect((screen.getByRole("button", { name: "Enter a quantity" }) as HTMLButtonElement).disabled).toBe(true);
    vi.unstubAllGlobals();
  });
});
