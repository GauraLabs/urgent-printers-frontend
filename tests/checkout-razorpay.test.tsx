import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mapCartItem } from "@/lib/api/cart";
import { mapOrderDetail, mapPreview, isPriceChangedError } from "@/lib/api/orders";
import { cartItemOnSale, orderOnSale, previewRepriced } from "./fixtures/mrp-contract";

const api = vi.hoisted(() => ({
  createOrder: vi.fn(),
  previewOrder: vi.fn(),
  verifyPayment: vi.fn(),
}));
const replace = vi.hoisted(() => vi.fn());
const loadRazorpay = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));

vi.mock("@/lib/api", () => ({ ...api, isPriceChangedError, isQuantityLimitError: () => false, isCodUnavailableError: () => false, getCart: vi.fn(), getSiteStatus: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/lib/razorpay", () => ({ loadRazorpay }));
vi.mock("@/features/site-status/trackConnectivity", () => ({ trackConnectivity: <T,>(p: Promise<T>) => p }));
vi.mock("@/features/checkout/AddressStep", () => ({
  AddressStep: ({ onNext }: { onNext: (a: unknown) => void }) => (
    <button onClick={() => onNext({ label: "Home", fullName: "A", phone: "1", line1: "x", city: "c", state: "s", postalCode: "1", country: "IN" })}>
      address-next
    </button>
  ),
}));
vi.mock("@/features/checkout/PaymentStep", () => ({
  PaymentStep: ({ onNext }: { onNext: (m: "online") => void }) => <button onClick={() => onNext("online")}>payment-next</button>,
}));

import { CheckoutPageClient } from "@/features/checkout/CheckoutPageClient";
import { useCartStore } from "@/features/cart/store";
import { useAuthStore } from "@/features/auth/store";

const matching = mapPreview({
  ...previewRepriced,
  pricing: { ...previewRepriced.pricing, totalAmount: "949.00" },
  items: [{ ...previewRepriced.items[0], pricePerUnit: "9.00", totalPrice: "900.00", mrpPerUnit: "12.00" }],
});
const status = { orders_halted: false, message: null, cod: { enabled: true, min_order_amount: null, max_order_amount: null } };

function onlineOrder() {
  const base = mapOrderDetail(orderOnSale);
  return { ...base, id: "10", orderNumber: "UP-10", payment: { ...(base.payment ?? {}), razorpayOrderId: "order_x", razorpayKeyId: "rzp_test", amount: 949 } };
}

async function place(user: ReturnType<typeof userEvent.setup>) {
  render(<CheckoutPageClient siteStatus={status} />);
  await user.click(screen.getByText("address-next"));
  await user.click(screen.getByText("payment-next"));
  const btn = await screen.findByRole("button", { name: /Place Order|Pay/ });
  await waitFor(() => expect(btn).toBeEnabled());
  await user.click(btn);
}

describe("online checkout gateway ordering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete window.Razorpay;
    useCartStore.setState({ items: [mapCartItem(cartItemOnSale)], appliedCoupon: null });
    useAuthStore.setState({ token: "tok" });
    api.previewOrder.mockResolvedValue(matching);
  });

  it("creates no order when the gateway script fails to load", async () => {
    loadRazorpay.mockResolvedValue(false);
    await place(userEvent.setup());
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/Payment gateway failed to load/)));
    expect(api.createOrder).not.toHaveBeenCalled();
  });

  it("says the order is saved when the Razorpay window cannot be constructed", async () => {
    loadRazorpay.mockResolvedValue(true);
    window.Razorpay = class {
      constructor() {
        throw new Error("boom");
      }
    } as unknown as typeof window.Razorpay;
    api.createOrder.mockResolvedValue(onlineOrder());
    await place(userEvent.setup());
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Order #UP-10 is saved — retry payment from My Orders"), expect.anything())
    );
    expect(toast.error).not.toHaveBeenCalledWith(expect.stringMatching(/Failed to place order/));
  });
});
