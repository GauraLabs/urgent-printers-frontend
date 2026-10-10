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

// Cart shows 100 x 9.00 (sale); preview 1 total 949. After the sale ends the
// server prices the line at 12.00 and the total is 1100.
const matching = mapPreview({
  ...previewRepriced,
  pricing: { ...previewRepriced.pricing, totalAmount: "949.00" },
  items: [{ ...previewRepriced.items[0], pricePerUnit: "9.00", totalPrice: "900.00", mrpPerUnit: "12.00" }],
});
const repriced = mapPreview({ ...previewRepriced, pricing: { ...previewRepriced.pricing, totalAmount: "1100.00" } });

describe("CheckoutPageClient price_changed flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCartStore.setState({ items: [mapCartItem(cartItemOnSale)], appliedCoupon: null });
    useAuthStore.setState({ token: "tok" });
  });

  it("sends expectedTotal, re-previews on 409 and asks the customer to confirm again", async () => {
    const user = userEvent.setup();
    api.previewOrder.mockResolvedValueOnce(matching).mockResolvedValueOnce(repriced);
    api.createOrder
      .mockRejectedValueOnce(new ApiError("Prices have changed", 409, "price_changed"))
      .mockResolvedValueOnce({ ...mapOrderDetail(orderOnSale), id: "10" });

    render(<CheckoutPageClient siteStatus={{ orders_halted: false, message: null, cod: { enabled: true, min_order_amount: null, max_order_amount: null } }} />);
    await user.click(screen.getByText("address-next"));
    await user.click(screen.getByText("payment-next"));

    const place = await screen.findByRole("button", { name: /Place Order/ });
    await waitFor(() => expect(place).toBeEnabled());
    expect(place).toHaveTextContent("₹949.00");
    expect(screen.queryByText("Prices have been updated")).toBeNull();

    await user.click(place);

    // 409: no navigation, preview re-run, banner + new total shown
    await waitFor(() => expect(api.previewOrder).toHaveBeenCalledTimes(2));
    expect(api.createOrder.mock.calls[0][0].expectedTotal).toBe(949);
    expect(await screen.findByText("Prices have been updated")).toBeInTheDocument();
    expect(screen.getByText(/Please review the new total and confirm again/)).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    const again = screen.getByRole("button", { name: /Place Order/ });
    await waitFor(() => expect(again).toBeEnabled());
    expect(again).toHaveTextContent("₹1,100.00");
    expect(useCartStore.getState().items[0].pricePerUnit).toBe(12);

    // Customer confirms again with the refreshed total
    await user.click(again);
    await waitFor(() => expect(api.createOrder).toHaveBeenCalledTimes(2));
    expect(api.createOrder.mock.calls[1][0].expectedTotal).toBe(1100);
    await waitFor(() => expect(replace).toHaveBeenCalled());
  });

  it("other order errors do not trigger a re-preview", async () => {
    const user = userEvent.setup();
    api.previewOrder.mockResolvedValue(matching);
    api.createOrder.mockRejectedValue(new ApiError("boom", 500));

    render(<CheckoutPageClient siteStatus={{ orders_halted: false, message: null, cod: { enabled: true, min_order_amount: null, max_order_amount: null } }} />);
    await user.click(screen.getByText("address-next"));
    await user.click(screen.getByText("payment-next"));
    const place = await screen.findByRole("button", { name: /Place Order/ });
    await waitFor(() => expect(place).toBeEnabled());
    await user.click(place);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("boom"));
    expect(api.previewOrder).toHaveBeenCalledTimes(1);
  });
});
