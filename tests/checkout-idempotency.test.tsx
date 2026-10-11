import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api/client";
import { mapCartItem } from "@/lib/api/cart";
import { mapOrderDetail, mapPreview, isPriceChangedError } from "@/lib/api/orders";
import { cartItemOnSale, orderOnSale, previewRepriced } from "./fixtures/mrp-contract";

const api = vi.hoisted(() => ({
  createOrder: vi.fn(),
  previewOrder: vi.fn(),
  verifyPayment: vi.fn(),
}));
const replace = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));

vi.mock("@/lib/api", () => ({ ...api, isPriceChangedError, isQuantityLimitError: () => false, isCodUnavailableError: () => false, getCart: vi.fn(), getSiteStatus: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("sonner", () => ({ toast }));
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

import { CheckoutPageClient } from "@/features/checkout/CheckoutPageClient";
import { useCartStore } from "@/features/cart/store";
import { useAuthStore } from "@/features/auth/store";

const matching = mapPreview({
  ...previewRepriced,
  pricing: { ...previewRepriced.pricing, totalAmount: "949.00" },
  items: [{ ...previewRepriced.items[0], pricePerUnit: "9.00", totalPrice: "900.00", mrpPerUnit: "12.00" }],
});
const repriced = mapPreview({ ...previewRepriced, pricing: { ...previewRepriced.pricing, totalAmount: "1100.00" } });
const status = { orders_halted: false, message: null, cod: { enabled: true, min_order_amount: null, max_order_amount: null } };
const keyOf = (call: number): string | undefined => api.createOrder.mock.calls[call][2]?.idempotencyKey;

async function reachReview(user: ReturnType<typeof userEvent.setup>) {
  render(<CheckoutPageClient siteStatus={status} />);
  await user.click(screen.getByText("address-next"));
  await user.click(screen.getByText("payment-next"));
  const place = await screen.findByRole("button", { name: /Place Order/ });
  await waitFor(() => expect(place).toBeEnabled());
  return place;
}

describe("checkout Idempotency-Key", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCartStore.setState({ items: [mapCartItem(cartItemOnSale)], appliedCoupon: null });
    useAuthStore.setState({ token: "tok" });
  });

  it("reuses the key when retrying the same body after a lost connection", async () => {
    const user = userEvent.setup();
    api.previewOrder.mockResolvedValue(matching);
    api.createOrder
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({ ...mapOrderDetail(orderOnSale), id: "10" });

    const place = await reachReview(user);
    await user.click(place);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/Connection lost.*won't be charged twice/), expect.anything())
    );
    expect(replace).not.toHaveBeenCalled();

    await user.click(await screen.findByRole("button", { name: /Place Order/ }));
    await waitFor(() => expect(api.createOrder).toHaveBeenCalledTimes(2));
    expect(keyOf(0)).toMatch(/^[0-9a-f-]{36}$/);
    expect(keyOf(1)).toBe(keyOf(0));
    await waitFor(() => expect(replace).toHaveBeenCalled());
  });

  it("409 idempotency_request_in_progress: own message, button stays disabled for the cooldown, same key after", async () => {
    const user = userEvent.setup();
    api.previewOrder.mockResolvedValue(matching);
    api.createOrder
      .mockRejectedValueOnce(new ApiError("in progress", 409, "idempotency_request_in_progress"))
      .mockResolvedValueOnce({ ...mapOrderDetail(orderOnSale), id: "10" });

    await user.click(await reachReview(user));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/still being processed — please wait/), expect.anything())
    );
    expect(screen.getByRole("button", { name: /Place Order|Placing/ })).toBeDisabled();
    const again = await screen.findByRole("button", { name: /Place Order/ }, { timeout: 6000 });
    await waitFor(() => expect(again).toBeEnabled());
    await user.click(again);
    await waitFor(() => expect(api.createOrder).toHaveBeenCalledTimes(2));
    expect(keyOf(1)).toBe(keyOf(0));
    await waitFor(() => expect(replace).toHaveBeenCalled());
  }, 12000);

  it("keeps the key for 429 but resets it for 422", async () => {
    const user = userEvent.setup();
    api.previewOrder.mockResolvedValue(matching);
    api.createOrder
      .mockRejectedValueOnce(new ApiError("slow down", 429))
      .mockRejectedValueOnce(new ApiError("bad", 422))
      .mockResolvedValueOnce({ ...mapOrderDetail(orderOnSale), id: "10" });

    await user.click(await reachReview(user));
    await waitFor(() => expect(api.createOrder).toHaveBeenCalledTimes(1));
    await user.click(await screen.findByRole("button", { name: /Place Order/ }));
    await waitFor(() => expect(api.createOrder).toHaveBeenCalledTimes(2));
    expect(keyOf(1)).toBe(keyOf(0));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("bad"));
    await user.click(await screen.findByRole("button", { name: /Place Order/ }));
    await waitFor(() => expect(api.createOrder).toHaveBeenCalledTimes(3));
    expect(keyOf(2)).not.toBe(keyOf(1));
  });

  it("previous_payment_completed clears the cart and goes to that order", async () => {
    const user = userEvent.setup();
    api.previewOrder.mockResolvedValue(matching);
    api.createOrder.mockRejectedValueOnce(
      new ApiError("x", 409, "previous_payment_completed", { error: "previous_payment_completed", detail: { order_id: "77", order_number: "UP-77" } })
    );
    await user.click(await reachReview(user));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/account/orders/77"));
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("order #UP-77 went through"));
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("previous_payment_pending warns, keeps the cart and creates nothing new", async () => {
    const user = userEvent.setup();
    api.previewOrder.mockResolvedValue(matching);
    api.createOrder.mockRejectedValueOnce(
      new ApiError("x", 409, "previous_payment_pending", { error: "previous_payment_pending", order_id: 78, order_number: "UP-78" })
    );
    await user.click(await reachReview(user));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("order #UP-78 is still being processed by the bank"), expect.anything())
    );
    expect(replace).not.toHaveBeenCalled();
    expect(useCartStore.getState().items).toHaveLength(1);
    await waitFor(() => expect(screen.getByRole("button", { name: /Place Order/ })).toBeEnabled());
  });

  it("a double tap sends one create request", async () => {
    const user = userEvent.setup();
    api.previewOrder.mockResolvedValue(matching);
    api.createOrder.mockImplementation(() => new Promise(() => {}));
    const place = await reachReview(user);
    await user.dblClick(place);
    expect(api.createOrder).toHaveBeenCalledTimes(1);
  });

  it("keeps the key after a 5xx, whose outcome is unknown", async () => {
    const user = userEvent.setup();
    api.previewOrder.mockResolvedValue(matching);
    api.createOrder
      .mockRejectedValueOnce(new ApiError("Bad gateway", 502))
      .mockResolvedValueOnce({ ...mapOrderDetail(orderOnSale), id: "10" });

    await user.click(await reachReview(user));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Bad gateway"));
    await user.click(await screen.findByRole("button", { name: /Place Order/ }));
    await waitFor(() => expect(api.createOrder).toHaveBeenCalledTimes(2));
    expect(keyOf(1)).toBe(keyOf(0));
  });

  it("mints a new key after a definitive 4xx", async () => {
    const user = userEvent.setup();
    api.previewOrder.mockResolvedValue(matching);
    api.createOrder
      .mockRejectedValueOnce(new ApiError("nope", 400))
      .mockResolvedValueOnce({ ...mapOrderDetail(orderOnSale), id: "10" });

    await user.click(await reachReview(user));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("nope"));
    await user.click(await screen.findByRole("button", { name: /Place Order/ }));
    await waitFor(() => expect(api.createOrder).toHaveBeenCalledTimes(2));
    expect(keyOf(1)).not.toBe(keyOf(0));
  });

  it("mints a new key when the body changes after a price_changed re-preview", async () => {
    const user = userEvent.setup();
    api.previewOrder.mockResolvedValueOnce(matching).mockResolvedValueOnce(repriced);
    api.createOrder
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockRejectedValueOnce(new ApiError("Prices have changed", 409, "price_changed"))
      .mockResolvedValueOnce({ ...mapOrderDetail(orderOnSale), id: "10" });

    const place = await reachReview(user);
    await user.click(place);
    await waitFor(() => expect(api.createOrder).toHaveBeenCalledTimes(1));
    await user.click(await screen.findByRole("button", { name: /Place Order/ }));
    await waitFor(() => expect(api.createOrder).toHaveBeenCalledTimes(2));
    expect(keyOf(1)).toBe(keyOf(0));

    await waitFor(() => expect(api.previewOrder).toHaveBeenCalledTimes(2));
    const again = await screen.findByRole("button", { name: /Place Order/ });
    await waitFor(() => expect(again).toHaveTextContent("₹1,100.00"));
    await user.click(again);
    await waitFor(() => expect(api.createOrder).toHaveBeenCalledTimes(3));
    expect(api.createOrder.mock.calls[2][0].expectedTotal).toBe(1100);
    expect(keyOf(2)).not.toBe(keyOf(1));
  });
});
