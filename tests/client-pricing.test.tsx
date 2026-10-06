import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CartItem } from "@/types";
import { mapCartItem } from "@/lib/api/cart";
import { mapPreview, isPriceChangedError } from "@/lib/api/orders";
import { cartItemOnSale, previewRepriced } from "./fixtures/mrp-contract";

const api = vi.hoisted(() => ({
  createOrder: vi.fn(),
  previewOrder: vi.fn(),
  verifyPayment: vi.fn(),
}));
const built = vi.hoisted(() => ({ throws: false }));

vi.mock("@/lib/api", () => ({ ...api, isPriceChangedError, isInvalidPackMultipleError: () => false }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));
vi.mock("@/features/site-status/trackConnectivity", () => ({ trackConnectivity: <T,>(p: Promise<T>) => p }));
vi.mock("@/features/checkout/AddressStep", () => ({
  AddressStep: ({ onNext }: { onNext: (a: unknown) => void }) => (
    <button onClick={() => onNext({ label: "Home", fullName: "A", phone: "1", line1: "x", city: "c", state: "s", postalCode: "1", country: "IN" })}>
      address-next
    </button>
  ),
}));
vi.mock("@/features/checkout/PaymentStep", () => ({
  PaymentStep: ({ onNext }: { onNext: (m: "cod") => void }) => <button onClick={() => onNext("cod")}>payment-next</button>,
}));
vi.mock("@/features/checkout/clientPricing", async (orig) => {
  const mod = await orig<typeof import("@/features/checkout/clientPricing")>();
  return {
    buildClientPricing: (...args: Parameters<typeof mod.buildClientPricing>) => {
      if (built.throws) throw new Error("boom");
      return mod.buildClientPricing(...args);
    },
  };
});

import { CheckoutPageClient } from "@/features/checkout/CheckoutPageClient";
import { useCartStore } from "@/features/cart/store";
import { useAuthStore } from "@/features/auth/store";
import { buildClientPricing } from "@/features/checkout/clientPricing";

const preview = mapPreview(previewRepriced);

async function gotoReview() {
  const user = userEvent.setup();
  render(<CheckoutPageClient siteStatus={{ orders_halted: false, message: null }} />);
  await user.click(screen.getByText("address-next"));
  await user.click(screen.getByText("payment-next"));
  await waitFor(() => expect(api.previewOrder).toHaveBeenCalled());
}

describe("review-step client_pricing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    built.throws = false;
    api.previewOrder.mockResolvedValue(preview);
    useAuthStore.setState({ token: "tok" });
  });

  it("sends lines with index, prices and addedAt", async () => {
    const item = { ...mapCartItem(cartItemOnSale), addedAt: "2026-10-01T00:00:00.000Z" };
    useCartStore.setState({ items: [item], appliedCoupon: null });
    await gotoReview();
    const cp = api.previewOrder.mock.calls[0][0].clientPricing;
    expect(cp.source).toBe("review");
    expect(cp.lines).toEqual([{
      index: 0,
      productId: item.product.id,
      quantity: item.config.quantity,
      pricePerUnit: item.pricePerUnit,
      mrpPerUnit: item.mrpPerUnit ?? null,
      totalPrice: item.totalPrice,
      addedAt: "2026-10-01T00:00:00.000Z",
    }]);
    expect(cp.subtotal).toBe(item.totalPrice);
  });

  it("sends null addedAt for a legacy item", async () => {
    const item = { ...mapCartItem(cartItemOnSale) };
    delete item.addedAt;
    useCartStore.setState({ items: [item], appliedCoupon: null });
    await gotoReview();
    expect(api.previewOrder.mock.calls[0][0].clientPricing.lines[0].addedAt).toBeNull();
  });

  it("still previews without the field if building throws", async () => {
    built.throws = true;
    useCartStore.setState({ items: [mapCartItem(cartItemOnSale)], appliedCoupon: null });
    await gotoReview();
    expect(api.previewOrder.mock.calls[0][0].clientPricing).toBeUndefined();
  });

  it("buildClientPricing returns null instead of throwing", () => {
    expect(buildClientPricing(null as never, null)).toBeNull();
  });
});

describe("cart addedAt", () => {
  const product = { id: "p1", slug: "p", name: "P", images: [], thumbnailUrl: undefined, categoryName: "", categorySlug: "" };
  const config = { quantity: 100, turnaroundId: "t", turnaroundLabel: "T", turnaroundExtraCost: 0 };

  it("is set on first add and kept when quantity changes", () => {
    useCartStore.setState({ items: [], appliedCoupon: null });
    useCartStore.getState().addItem(product, config, 9);
    const { cartItemId, addedAt } = useCartStore.getState().items[0];
    expect(addedAt).toBeTruthy();
    useCartStore.getState().updateQuantity(cartItemId, 200);
    expect(useCartStore.getState().items[0].addedAt).toBe(addedAt);
    useCartStore.getState().addItem(product, { ...config, quantity: 300 }, 9);
    expect(useCartStore.getState().items[0].addedAt).toBe(addedAt);
  });
});

describe("setItems (server sync / merge)", () => {
  it("keeps addedAt for matching items, null for server-only, and survives quantity change", () => {
    const local: CartItem = { ...mapCartItem(cartItemOnSale), addedAt: "2026-10-01T00:00:00.000Z" };
    const serverOnly: CartItem = { ...local, cartItemId: "other-id" };
    delete serverOnly.addedAt;
    const fromServer: CartItem = { ...local };
    delete fromServer.addedAt;
    useCartStore.setState({ items: [local], appliedCoupon: null });

    useCartStore.getState().setItems([fromServer, serverOnly]);
    const [a, b] = useCartStore.getState().items;
    expect(a.addedAt).toBe("2026-10-01T00:00:00.000Z");
    expect(b.addedAt).toBeUndefined();
    expect(buildClientPricing([b], null)?.lines[0].addedAt).toBeNull();

    useCartStore.getState().updateQuantity(a.cartItemId, 500);
    expect(useCartStore.getState().items[0].addedAt).toBe("2026-10-01T00:00:00.000Z");
  });
});
