import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const api = vi.hoisted(() => ({ lookupProductBySlug: vi.fn() }));
vi.mock("@/lib/api/products", () => api);

import { fetchProductOnce, loadLineRates, resolveRates } from "@/features/cart/rateResolver";
import { useCartStore } from "@/features/cart/store";
import type { CartItem, Product } from "@/types";

const product = {
  unitLabel: "pcs", minOrderQuantity: 50, maxOrderQuantity: null,
  pricingTiers: [{ quantity: 50, pricePerUnit: 6, totalPrice: 300 }, { quantity: 100, pricePerUnit: 4, totalPrice: 400 }],
  printSpec: {
    sizes: [
      { id: "2x2-in", label: "2x2 in", priceMultiplier: 1, isDefault: true },
      { id: "3x3-in", label: "3x3 in", priceMultiplier: 1.5, isDefault: false },
    ],
    papers: [{ id: "vinyl", label: "Vinyl", priceMultiplier: 1.1, isDefault: true }],
    finishes: [], sides: [{ label: "Single Side", priceMultiplier: 1, isDefault: true }],
  },
} as unknown as Product;

const cfg = (c: Partial<CartItem["config"]> = {}): CartItem["config"] => ({
  quantity: 50, turnaroundId: "std", turnaroundLabel: "Standard", turnaroundExtraCost: 0, ...c,
});

describe("resolveRates", () => {
  it("multiplies the selected options and reads limits from the product", () => {
    const r = resolveRates(product, cfg({ sizeId: "3x3-in", paperId: "vinyl", sides: "Single Side" }));
    expect(r?.optionMultiplier).toBeCloseTo(1.65);
    expect(r).toMatchObject({ minQuantity: 50, maxQuantity: null, unitLabel: "pcs" });
    expect(r?.rateTiers).toHaveLength(2);
  });
  it("matches by label when the id is stale, and uses defaults when a category was never chosen", () => {
    expect(resolveRates(product, cfg({ sizeId: "old-id", sizeLabel: "3x3 in" }))?.optionMultiplier).toBeCloseTo(1.65);
    expect(resolveRates(product, cfg())?.optionMultiplier).toBeCloseTo(1.1);
  });
  it("returns null when a chosen option no longer exists or the product has no rates", () => {
    expect(resolveRates(product, cfg({ sizeId: "9x9-in" }))).toBeNull();
    expect(resolveRates({ ...product, pricingTiers: [] } as Product, cfg())).toBeNull();
  });
});

describe("loadLineRates", () => {
  let n = 0;
  let slug = "s0";
  const line = (): CartItem => ({
    cartItemId: "p1", product: { id: "1", slug, name: "S", images: [], categoryName: "", categorySlug: "" },
    config: cfg({ quantity: 100 }), pricePerUnit: 6, totalPrice: 600, pricePending: true,
  });
  const state = () => useCartStore.getState();
  beforeEach(() => {
    vi.useFakeTimers();
    api.lookupProductBySlug.mockReset();
    slug = `s${++n}`;
    useCartStore.setState({ items: [line()], unavailableIds: [], rateErrorIds: [] });
  });
  afterEach(() => vi.useRealTimers());

  it("a 404 is unavailable, without retrying", async () => {
    api.lookupProductBySlug.mockResolvedValue({ status: "gone" });
    await loadLineRates("p1");
    expect(state().unavailableIds).toEqual(["p1"]);
    expect(api.lookupProductBySlug).toHaveBeenCalledTimes(1);
  });
  it("a network failure retries with backoff, then shows retry (never unavailable) and keeps the price", async () => {
    api.lookupProductBySlug.mockResolvedValue({ status: "error" });
    const done = loadLineRates("p1");
    await vi.advanceTimersByTimeAsync(2500);
    await done;
    expect(api.lookupProductBySlug).toHaveBeenCalledTimes(3);
    expect(state().unavailableIds).toEqual([]);
    expect(state().rateErrorIds).toEqual(["p1"]);
    expect(state().items[0].totalPrice).toBe(600);
  });
  it("Retry after a failure recovers and reprices", async () => {
    api.lookupProductBySlug.mockResolvedValue({ status: "error" });
    const first = loadLineRates("p1");
    await vi.advanceTimersByTimeAsync(2500);
    await first;
    api.lookupProductBySlug.mockResolvedValue({ status: "ok", product });
    await loadLineRates("p1");
    expect(state().rateErrorIds).toEqual([]);
    expect(state().items[0]).toMatchObject({ totalPrice: 440 });
  });
  it("an unresolvable option is unavailable", async () => {
    api.lookupProductBySlug.mockResolvedValue({ status: "ok", product });
    useCartStore.setState({ items: [{ ...line(), cartItemId: "p2", product: { ...line().product, slug: "other" }, config: cfg({ sizeId: "9x9" }) }] });
    await loadLineRates("p2");
    expect(state().unavailableIds).toEqual(["p2"]);
  });
  it("shares one lookup between lines of the same product", async () => {
    api.lookupProductBySlug.mockResolvedValue({ status: "ok", product });
    await Promise.all([fetchProductOnce("same"), fetchProductOnce("same")]);
    expect(api.lookupProductBySlug).toHaveBeenCalledTimes(1);
  });
});

describe("store: resolved rates", () => {
  const line = (pending: boolean): CartItem => ({
    cartItemId: "p1", product: { id: "1", slug: "s", name: "S", images: [], categoryName: "", categorySlug: "" },
    config: cfg({ quantity: 100 }), pricePerUnit: 6, totalPrice: 300, pricePending: pending || undefined,
  });
  beforeEach(() => useCartStore.setState({ items: [line(true)], unavailableIds: [], rateErrorIds: [] }));

  it("reprices a pending guest line from the product instead of leaving it updating", () => {
    const rates = resolveRates(product, cfg())!;
    useCartStore.getState().applyResolvedRates("p1", rates);
    const i = useCartStore.getState().items[0];
    expect(i.pricePending).toBeUndefined();
    expect(i).toMatchObject({ pricePerUnit: 4.4, totalPrice: 440 });
    expect(i.config).toMatchObject({ minQuantity: 50, maxQuantity: null });
  });
  it("keeps an untouched line's price but learns its rate card", () => {
    useCartStore.setState({ items: [line(false)] });
    useCartStore.getState().applyResolvedRates("p1", resolveRates(product, cfg())!);
    expect(useCartStore.getState().items[0]).toMatchObject({ pricePerUnit: 6, totalPrice: 300 });
    expect(useCartStore.getState().items[0].config.rateTiers).toHaveLength(2);
  });
  it("marks a gone product unavailable once", () => {
    useCartStore.getState().markUnavailable("p1");
    useCartStore.getState().markUnavailable("p1");
    expect(useCartStore.getState().unavailableIds).toEqual(["p1"]);
  });
});
