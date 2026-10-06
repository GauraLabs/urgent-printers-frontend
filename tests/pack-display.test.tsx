import { createRef } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ProductPrice } from "@/components/common/ProductPrice";
import { PricingTable } from "@/features/products/configurator/PricingTable";
import { StickyAddToCart } from "@/features/products/StickyAddToCart";
import { mapCard, mapDetail, mapSearchDoc, type BackendProductCard } from "@/lib/api/products";
import { mapCartItem, type BackendCartItem } from "@/lib/api/cart";
import { mapOrderDetail, mapPreview } from "@/lib/api/orders";
import { buildClientPricing } from "@/features/checkout/clientPricing";
import { cartLinePrice } from "@/features/cart/savings";
import { useCartStore } from "@/features/cart/store";
import { codedErrorMessage } from "@/lib/api/validationErrors";
import { cardOnSale, detailOnSale, searchDocOnSale, cartItemOnSale, orderOnSale, previewRepriced } from "./fixtures/mrp-contract";
import type { PricingTier } from "@/types";

describe("mappers: pack fields", () => {
  it("card: defaults to pack_size 1 / pcs when absent and adds no pack figures", () => {
    const p = mapCard(cardOnSale);
    expect([p.packSize, p.unitLabel, p.priceFromPack, p.mrpFromPack]).toEqual([1, "pcs", undefined, undefined]);
  });
  it("card: maps pack fields", () => {
    const p = mapCard({ ...cardOnSale, pack_size: 50, unit_label: "stickers", price_from_pack: 450, mrp_from_pack: 600 } as BackendProductCard);
    expect([p.packSize, p.unitLabel, p.priceFromPack, p.mrpFromPack]).toEqual([50, "stickers", 450, 600]);
  });
  it("card: derives pack price from per-unit when the server omits it", () => {
    const p = mapCard({ ...cardOnSale, pack_size: 50 } as BackendProductCard);
    expect(p.priceFromPack).toBe(450);
    expect(p.mrpFromPack).toBe(600);
  });
  it("search doc: reads pack_size from the index", () => {
    const p = mapSearchDoc({ ...searchDocOnSale, pack_size: 25, unit_label: "tags" }, new Map());
    expect([p.packSize, p.unitLabel]).toEqual([25, "tags"]);
    expect(p.priceFromPack).toBeCloseTo((p.priceFrom ?? 0) * 25, 2);
  });
  it("detail: maps listing_offer and drops it when absent", () => {
    expect(mapDetail(detailOnSale).listingOffer).toBeNull();
    const p = mapDetail({
      ...detailOnSale,
      pack_size: 50,
      listing_offer: { quantity: 50, pack_size: 50, price: "300.00", sale_price: 270, sale_ends_at: "2026-11-01T00:00:00+00:00", in_stock: true, query: "qty=50" },
    });
    expect(p.listingOffer).toMatchObject({ quantity: 50, packSize: 50, price: 300, salePrice: 270, inStock: true, query: "qty=50" });
  });
  it("cart: carries pack data and the snapped flag; non-pack lines get none", () => {
    const plain = mapCartItem(cartItemOnSale as BackendCartItem);
    expect(plain.config.packSize).toBeUndefined();
    expect(plain.quantityCorrected).toBeUndefined();
    const packed = mapCartItem({ ...cartItemOnSale, packSize: 50, unitLabel: "pcs", quantityCorrected: true, originalQuantity: 120, quantity: 100 } as BackendCartItem);
    expect(packed.config).toMatchObject({ packSize: 50, unitLabel: "pcs", quantity: 100 });
    expect([packed.quantityCorrected, packed.originalQuantity]).toEqual([true, 120]);
  });
  it("orders: snapshot only for pack lines", () => {
    const o = mapOrderDetail({ ...orderOnSale, items: orderOnSale.items.map((i) => ({ ...i, packSize: 50, unitLabel: "pcs" })) });
    expect(o.items[0]).toMatchObject({ packSize: 50, unitLabel: "pcs" });
    expect(mapOrderDetail(orderOnSale).items[0].packSize).toBeUndefined();
    const pv = mapPreview({ ...previewRepriced, items: previewRepriced.items.map((i) => ({ ...i, packSize: 25, unitLabel: "tags" })) });
    expect(pv.items[0]).toMatchObject({ packSize: 25, unitLabel: "tags" });
  });
  it("invalid_pack_multiple keeps the server message and has a fallback", () => {
    expect(codedErrorMessage("invalid_pack_multiple", "Quantity must be a multiple of 50 (nearest: 100)")).toBeUndefined();
    expect(codedErrorMessage("invalid_pack_multiple")).toMatch(/whole packs/);
  });
});

describe("ProductPrice", () => {
  const spec = { sizes: [], papers: [], finishes: [], sides: [], minDpi: 300, bleedMm: 3 };
  const base = { printSpec: spec, pricingTiers: [] as PricingTier[], priceFrom: 5.4, mrpFrom: 6, discountPercent: 10 };
  it("renders per-unit exactly as before for pack_size 1", () => {
    render(<ProductPrice variant="card" prefix="From" unitLabel="per unit" product={base} />);
    expect(screen.getByText("₹5.40")).toBeTruthy();
    expect(screen.getByText("per unit")).toBeTruthy();
  });
  it("renders From pack price, pack MRP and unchanged percent for packs", () => {
    render(<ProductPrice variant="card" prefix="From" unitLabel="per unit" product={{ ...base, packSize: 50, unitLabel: "pcs" }} />);
    expect(screen.getByText("₹270.00")).toBeTruthy();
    expect(screen.getByText("₹300.00")).toBeTruthy();
    expect(screen.getByText("10% off")).toBeTruthy();
    expect(screen.getByText("per 50 pcs")).toBeTruthy();
    expect(screen.queryByText("per unit")).toBeNull();
  });
  it("compact variant (search/recent) reads 'From ₹270.00 / 50 pcs'", () => {
    const { container } = render(<ProductPrice variant="compact" prefix="from" unitLabel="/unit" product={{ ...base, packSize: 50, unitLabel: "pcs" }} />);
    expect(container.textContent).toContain("from ₹270.00 / 50 pcs");
  });
});

describe("PricingTable", () => {
  const tiers: PricingTier[] = [
    { quantity: 50, pricePerUnit: 6, totalPrice: 300, mrpPerUnit: 8, discountPercent: 25 },
    { quantity: 100, pricePerUnit: 5.5, totalPrice: 550, isBestValue: true },
  ];
  it("renders '50 pcs · ₹300.00' with per-pc secondary and pack MRP", () => {
    render(<PricingTable tiers={tiers} selectedQuantity={50} onSelectQuantity={() => {}} packSize={50} unitLabel="pcs" />);
    expect(screen.getByText(/50 pcs · ₹300\.00/)).toBeTruthy();
    expect(screen.getByText(/₹6\.00\/pc/)).toBeTruthy();
    expect(screen.getByText("₹400.00")).toBeTruthy();
    expect(screen.getByText(/₹5\.50\/pc · 2 packs/)).toBeTruthy();
  });
  it("is the legacy table for pack_size 1", () => {
    render(<PricingTable tiers={tiers} selectedQuantity={50} onSelectQuantity={() => {}} />);
    expect(screen.getAllByText("/unit").length).toBe(2);
  });
});

describe("StickyAddToCart", () => {
  let trigger: (e: { isIntersecting: boolean }[]) => void = () => {};
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", class { constructor(cb: typeof trigger) { trigger = cb; } observe() {} disconnect() {} });
  });
  it("shows the pack quantity label only when given", () => {
    const ref = createRef<HTMLButtonElement>();
    const view = render(
      <>
        <button ref={ref}>t</button>
        <StickyAddToCart productName="Stickers" price="₹300.00" quantityLabel="1 pack (50 pcs)" observeRef={ref} onAddToCart={() => {}} />
      </>
    );
    act(() => trigger([{ isIntersecting: false }]));
    expect(screen.getByText("1 pack (50 pcs)")).toBeTruthy();
    view.unmount();
  });
});

describe("cart pricing helpers", () => {
  it("cartLinePrice is per-unit for non-pack and per-pack for packs", () => {
    const line = { pricePerUnit: 5.4, mrpPerUnit: 6, config: {} };
    expect(cartLinePrice(line)).toMatchObject({ price: 5.4, mrp: 6, unitLabel: "/unit" });
    expect(cartLinePrice({ ...line, config: { packSize: 50, unitLabel: "pcs" } })).toEqual({
      price: 270, mrp: 300, percent: 10, unitLabel: " / 50 pcs",
    });
  });
  it("clientPricing telemetry stays in pieces and per-unit prices for pack lines", () => {
    const item = { ...mapCartItem(cartItemOnSale as BackendCartItem), pricePerUnit: 6, totalPrice: 600 };
    item.config = { ...item.config, quantity: 100, packSize: 50, unitLabel: "pcs" };
    const pricing = buildClientPricing([item], null);
    expect(pricing?.lines[0]).toMatchObject({ quantity: 100, pricePerUnit: 6, totalPrice: 600 });
  });
});

describe("cart store corrections", () => {
  beforeEach(() => useCartStore.setState({ items: [] }));
  it("applies a server snap only to lines still at the original quantity", () => {
    const local = mapCartItem(cartItemOnSale as BackendCartItem);
    useCartStore.setState({ items: [{ ...local, config: { ...local.config, quantity: 120 } }] });
    const fix = { ...local, config: { ...local.config, quantity: 100, packSize: 50 }, totalPrice: 600, quantityCorrected: true, originalQuantity: 120 };
    expect(useCartStore.getState().applyQuantityCorrections([fix]).length).toBe(1);
    expect(useCartStore.getState().items[0].config.quantity).toBe(100);
    expect(useCartStore.getState().items[0].totalPrice).toBe(600);
    // The customer edited meanwhile: a stale correction is ignored.
    useCartStore.setState({ items: [{ ...local, config: { ...local.config, quantity: 150 } }] });
    expect(useCartStore.getState().applyQuantityCorrections([fix]).length).toBe(0);
    expect(useCartStore.getState().items[0].config.quantity).toBe(150);
  });
  it("setItems strips the one-shot correction flags", () => {
    const local = mapCartItem(cartItemOnSale as BackendCartItem);
    useCartStore.getState().setItems([{ ...local, quantityCorrected: true, originalQuantity: 3 }]);
    expect(useCartStore.getState().items[0].quantityCorrected).toBeUndefined();
  });
});
