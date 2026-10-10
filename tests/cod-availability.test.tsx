import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api/client";
import { mapCartItem } from "@/lib/api/cart";
import { mapPreview, isPriceChangedError, isCodUnavailableError } from "@/lib/api/orders";
import { cartItemOnSale, orderOnSale, previewRepriced } from "./fixtures/mrp-contract";
import { mapOrderDetail } from "@/lib/api/orders";
import { evaluateCod, resolveCod, codBlockApplies, type CodConfig } from "@/features/checkout/cod";
import { mapSiteStatusCod } from "@/lib/api/siteStatus";

const api = vi.hoisted(() => ({
  createOrder: vi.fn(),
  previewOrder: vi.fn(),
  verifyPayment: vi.fn(),
  getSiteStatus: vi.fn(),
}));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));

vi.mock("@/lib/api", () => ({ ...api, isPriceChangedError, isCodUnavailableError, isQuantityLimitError: () => false, getCart: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/features/site-status/trackConnectivity", () => ({ trackConnectivity: <T,>(p: Promise<T>) => p }));
vi.mock("@/features/checkout/AddressStep", () => ({
  AddressStep: ({ onNext }: { onNext: (a: unknown) => void }) => (
    <button onClick={() => onNext({ label: "Home", fullName: "A", phone: "1", line1: "x", city: "c", state: "s", postalCode: "1", country: "IN" })}>
      address-next
    </button>
  ),
}));

import { CheckoutPageClient } from "@/features/checkout/CheckoutPageClient";
import { useCartStore } from "@/features/cart/store";
import { useAuthStore } from "@/features/auth/store";

const cfg = (over: Partial<CodConfig> = {}): CodConfig => ({ enabled: true, min_order_amount: null, max_order_amount: null, ...over });
const status = (cod: CodConfig) => ({ orders_halted: false, message: null, cod });
const previewWith = (extra: { codAvailable?: boolean; codReason?: string | null }) =>
  mapPreview({ ...previewRepriced, pricing: { ...previewRepriced.pricing, totalAmount: "949.00" }, ...extra });

describe("evaluateCod fallback", () => {
  it("is unavailable when disabled", () => {
    expect(evaluateCod(cfg({ enabled: false }), 300)).toEqual({ available: false, reason: "Cash on Delivery is currently unavailable" });
  });
  it("rejects below min", () => {
    const r = evaluateCod(cfg({ min_order_amount: 200 }), 199.99);
    expect(r.available).toBe(false);
    expect(r.reason).toBe("Cash on Delivery is available for orders of ₹200 or more");
  });
  it("rejects above max", () => {
    const r = evaluateCod(cfg({ max_order_amount: 500 }), 500.01);
    expect(r.available).toBe(false);
    expect(r.reason).toBe("Cash on Delivery is available for orders up to ₹500");
  });
  it("uses the between wording with both bounds", () => {
    expect(evaluateCod(cfg({ min_order_amount: 200, max_order_amount: 500 }), 100).reason)
      .toBe("Cash on Delivery is available for orders between ₹200 and ₹500");
  });
  it("is inclusive at the bounds and in range", () => {
    const c = cfg({ min_order_amount: 200, max_order_amount: 500 });
    expect(evaluateCod(c, 200).available).toBe(true);
    expect(evaluateCod(c, 350).available).toBe(true);
    expect(evaluateCod(c, 500).available).toBe(true);
  });
  it("treats unset bounds as no limit", () => {
    expect(evaluateCod(cfg(), 1_000_000).available).toBe(true);
    expect(mapSiteStatusCod(undefined)).toEqual(cfg());
  });
});

describe("resolveCod", () => {
  it("lets the preview override the client fallback", () => {
    const c = cfg({ max_order_amount: 100 });
    expect(resolveCod(c, 949, null).available).toBe(false);
    const ok = resolveCod(c, 949, previewWith({ codAvailable: true, codReason: null }));
    expect(ok).toEqual({ available: true, reason: null });
    const no = resolveCod(cfg(), 100, previewWith({ codAvailable: false, codReason: "Server says no" }));
    expect(no).toEqual({ available: false, reason: "Server says no" });
  });
  it("falls back to the preview total when it carries no codAvailable", () => {
    expect(resolveCod(cfg({ max_order_amount: 500 }), 10, previewWith({})).available).toBe(false);
  });
});

async function toPayment() {
  const user = userEvent.setup();
  await user.click(screen.getByText("address-next"));
  return user;
}

describe("PaymentStep COD card in checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCartStore.setState({ items: [mapCartItem(cartItemOnSale)], appliedCoupon: null });
    useAuthStore.setState({ token: "tok" });
  });

  it("shows the COD card disabled with an associated reason, not hidden", async () => {
    render(<CheckoutPageClient siteStatus={status(cfg({ enabled: false }))} />);
    const user = await toPayment();
    const card = screen.getByRole("button", { name: /Cash on Delivery/ });
    expect(card).toHaveAttribute("aria-disabled", "true");
    const reasonId = card.getAttribute("aria-describedby");
    expect(reasonId).toBeTruthy();
    expect(document.getElementById(reasonId!)).toHaveTextContent("Cash on Delivery is currently unavailable");
    await user.click(card);
    expect(card).not.toHaveClass("ring-1");
  });

  it("leaves COD enabled when the total is within range", async () => {
    render(<CheckoutPageClient siteStatus={status(cfg({ min_order_amount: 100, max_order_amount: 5000 }))} />);
    await toPayment();
    const card = screen.getByRole("button", { name: /Cash on Delivery/ });
    expect(card).toHaveAttribute("aria-disabled", "false");
    expect(card).not.toHaveAttribute("aria-describedby");
  });

  it("disables COD below the minimum and above the maximum", async () => {
    const { unmount } = render(<CheckoutPageClient siteStatus={status(cfg({ min_order_amount: 50000 }))} />);
    await toPayment();
    expect(screen.getByRole("button", { name: /Cash on Delivery/ })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText(/orders of ₹50,000 or more/)).toBeInTheDocument();
    unmount();
    render(<CheckoutPageClient siteStatus={status(cfg({ max_order_amount: 10 }))} />);
    await toPayment();
    expect(screen.getByText(/orders up to ₹10/)).toBeInTheDocument();
  });

  it("auto-switches to online with a notice when the preview says COD is unavailable", async () => {
    api.previewOrder.mockResolvedValue(previewWith({ codAvailable: false, codReason: "Cash on Delivery is available for orders up to ₹500" }));
    api.createOrder.mockResolvedValue({ ...mapOrderDetail(orderOnSale), id: "10" });
    render(<CheckoutPageClient siteStatus={status(cfg())} />);
    const user = await toPayment();
    await user.click(screen.getByRole("button", { name: /Cash on Delivery/ }));
    await user.click(screen.getByRole("button", { name: /Review Order/ }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringContaining("switched you to online payment")));
    const place = await screen.findByRole("button", { name: /Pay .* securely/ });
    await waitFor(() => expect(place).toBeEnabled());
    await user.click(place);
    await waitFor(() => expect(api.createOrder).toHaveBeenCalled());
    expect(api.createOrder.mock.calls[0][0].paymentMethod).toBe("online");
  });

  it.each([
    ["cod_unavailable", "Cash on Delivery is currently unavailable"],
    ["cod_amount_out_of_range", "Cash on Delivery is available for orders up to ₹500"],
  ])("handles a 422 %s on create: online, message, refresh", async (code, message) => {
    api.previewOrder.mockResolvedValue(previewWith({ codAvailable: true, codReason: null }));
    api.getSiteStatus.mockResolvedValue(status(cfg()));
    api.createOrder
      .mockRejectedValueOnce(new ApiError(message, 422, code))
      .mockResolvedValueOnce({ ...mapOrderDetail(orderOnSale), id: "10" });
    render(<CheckoutPageClient siteStatus={status(cfg())} />);
    const user = await toPayment();
    await user.click(screen.getByRole("button", { name: /Cash on Delivery/ }));
    await user.click(screen.getByRole("button", { name: /Review Order/ }));
    const place = await screen.findByRole("button", { name: /Place Order/ });
    await waitFor(() => expect(place).toBeEnabled());
    await user.click(place);

    expect(api.createOrder.mock.calls[0][0].paymentMethod).toBe("cod");
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(message));
    await waitFor(() => expect(api.getSiteStatus).toHaveBeenCalled());
    await waitFor(() => expect(api.previewOrder).toHaveBeenCalledTimes(2));

    const again = await screen.findByRole("button", { name: /Pay .* securely/ });
    await waitFor(() => expect(again).toBeEnabled());
    await user.click(again);
    await waitFor(() => expect(api.createOrder).toHaveBeenCalledTimes(2));
    expect(api.createOrder.mock.calls[1][0].paymentMethod).toBe("online");
  });

  it("keeps COD selected when the estimate is out of range but the preview says available", async () => {
    // Cart estimate is 999 (in range) until the preview reprices the line to 1200 (estimate out of range).
    api.previewOrder.mockResolvedValue(
      mapPreview({ ...previewRepriced, pricing: { ...previewRepriced.pricing, totalAmount: "949.00" }, codAvailable: true, codReason: null })
    );
    api.createOrder.mockResolvedValue({ ...mapOrderDetail(orderOnSale), id: "10" });
    render(<CheckoutPageClient siteStatus={status(cfg({ max_order_amount: 1000 }))} />);
    const user = await toPayment();
    await user.click(screen.getByRole("button", { name: /Cash on Delivery/ }));
    await user.click(screen.getByRole("button", { name: /Review Order/ }));
    const place = await screen.findByRole("button", { name: /Place Order/ });
    await waitFor(() => expect(place).toBeEnabled());
    expect(useCartStore.getState().items[0].totalPrice).toBeGreaterThan(1000);
    expect(toast).not.toHaveBeenCalledWith(expect.stringContaining("switched you to online"));
    await user.click(place);
    await waitFor(() => expect(api.createOrder).toHaveBeenCalled());
    expect(api.createOrder.mock.calls[0][0].paymentMethod).toBe("cod");
  });

  it("does not strand a 422 block when the follow-up preview fails and the payment step is re-entered", async () => {
    api.previewOrder
      .mockResolvedValueOnce(previewWith({ codAvailable: true, codReason: null }))
      .mockRejectedValueOnce(new Error("preview down"));
    api.getSiteStatus.mockResolvedValue(status(cfg()));
    api.createOrder.mockRejectedValueOnce(new ApiError("Cash on Delivery is currently unavailable", 422, "cod_unavailable"));
    render(<CheckoutPageClient siteStatus={status(cfg())} />);
    const user = await toPayment();
    await user.click(screen.getByRole("button", { name: /Cash on Delivery/ }));
    await user.click(screen.getByRole("button", { name: /Review Order/ }));
    const place = await screen.findByRole("button", { name: /Place Order/ });
    await waitFor(() => expect(place).toBeEnabled());
    await user.click(place);
    await waitFor(() => expect(api.previewOrder).toHaveBeenCalledTimes(2));

    await user.click(await screen.findByRole("button", { name: /Back/ }));
    const card = await screen.findByRole("button", { name: /Cash on Delivery/ });
    expect(card).toHaveAttribute("aria-disabled", "false");
  });
});

describe("codBlockApplies", () => {
  const block = { reason: "no", config: cfg() };
  it("holds while the COD config is unchanged", () => {
    expect(codBlockApplies(block, cfg())).toBe(true);
  });
  it("is dropped once the refreshed COD config differs", () => {
    expect(codBlockApplies(block, cfg({ max_order_amount: 5000 }))).toBe(false);
    expect(codBlockApplies(block, cfg({ enabled: false }))).toBe(false);
    expect(codBlockApplies(null, cfg())).toBe(false);
  });
});
