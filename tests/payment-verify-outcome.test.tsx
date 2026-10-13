import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api/client";
import { mapCartItem } from "@/lib/api/cart";
import { mapOrderDetail, mapPreview, isPriceChangedError } from "@/lib/api/orders";
import { classifyVerifyError, pollUntilPaid } from "@/features/checkout/verifyOutcome";
import { cancelSuccessMessage } from "@/features/account/cancelMessage";
import { cartItemOnSale, orderOnSale, previewRepriced } from "./fixtures/mrp-contract";

const api = vi.hoisted(() => ({
  createOrder: vi.fn(),
  previewOrder: vi.fn(),
  verifyPayment: vi.fn(),
  getOrderById: vi.fn(),
}));
const replace = vi.hoisted(() => vi.fn());
const loadRazorpay = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));

vi.mock("@/lib/api", () => ({ ...api, isPriceChangedError, isQuantityLimitError: () => false, isCodUnavailableError: () => false, getCart: vi.fn(), getSiteStatus: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/lib/razorpay", () => ({ loadRazorpay }));
vi.mock("@/features/site-status/trackConnectivity", () => ({ trackConnectivity: <T,>(p: Promise<T>) => p }));
vi.mock("@/features/checkout/verifyOutcome", async (orig) => {
  const mod = await orig<typeof import("@/features/checkout/verifyOutcome")>();
  return { ...mod, pollUntilPaid: (f: () => Promise<string | null>) => mod.pollUntilPaid(f, 2, 0) };
});
vi.mock("@/features/checkout/AddressStep", () => ({
  AddressStep: ({ onNext }: { onNext: (a: unknown) => void }) => (
    <button onClick={() => onNext({ label: "Home", fullName: "A", phone: "1", line1: "x", city: "c", state: "s", postalCode: "1", country: "IN" })}>address-next</button>
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

async function payAndVerifyFails(err: unknown) {
  api.verifyPayment.mockRejectedValue(err);
  api.createOrder.mockResolvedValue(onlineOrder());
  loadRazorpay.mockResolvedValue(true);
  window.Razorpay = class {
    private opts: { handler: (r: Record<string, string>) => void };
    constructor(opts: { handler: (r: Record<string, string>) => void }) {
      this.opts = opts;
    }
    on() {}
    open() {
      void this.opts.handler({ razorpay_order_id: "o", razorpay_payment_id: "p", razorpay_signature: "s" });
    }
  } as unknown as typeof window.Razorpay;
  const user = userEvent.setup();
  render(<CheckoutPageClient siteStatus={status} />);
  await user.click(screen.getByText("address-next"));
  await user.click(screen.getByText("payment-next"));
  const btn = await screen.findByRole("button", { name: /Place Order|Pay/ });
  await waitFor(() => expect(btn).toBeEnabled());
  await user.click(btn);
}

describe("classifyVerifyError", () => {
  it("separates benign, mismatch and unknown failures", () => {
    expect(classifyVerifyError(new ApiError("x", 409, "payment_not_captured"))).toBe("confirming");
    expect(classifyVerifyError(new ApiError("x", 503, "payment_verification_unavailable"))).toBe("confirming");
    expect(classifyVerifyError(new ApiError("x", 409, "payment_amount_mismatch"))).toBe("amount_mismatch");
    expect(classifyVerifyError(new ApiError("x", 400, "invalid_signature"))).toBe("failed");
    expect(classifyVerifyError(new Error("boom"))).toBe("failed");
  });
});

describe("pollUntilPaid", () => {
  it("stops once paid and is capped otherwise (test wrapper caps at 2 attempts, 0ms)", async () => {
    const paidSecond = vi.fn().mockResolvedValueOnce("pending").mockResolvedValueOnce("paid");
    expect(await pollUntilPaid(paidSecond)).toBe(true);
    expect(paidSecond).toHaveBeenCalledTimes(2);
    const never = vi.fn().mockRejectedValue(new Error("net"));
    expect(await pollUntilPaid(never)).toBe(false);
    expect(never).toHaveBeenCalledTimes(2);
  });
});

describe("cancelSuccessMessage", () => {
  it("explains the refund only for refund_pending", () => {
    expect(cancelSuccessMessage("refund_pending")).toBe("Your order is cancelled. If you paid online, your refund will be processed shortly.");
    expect(cancelSuccessMessage("pending")).toBe("Order cancelled.");
    expect(cancelSuccessMessage(undefined)).toBe("Order cancelled.");
  });
});

describe("checkout verify failure handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete window.Razorpay;
    useCartStore.setState({ items: [mapCartItem(cartItemOnSale)], appliedCoupon: null });
    useAuthStore.setState({ token: "tok" });
    api.previewOrder.mockResolvedValue(matching);
    api.getOrderById.mockResolvedValue({ paymentStatus: "pending" });
  });
  afterEach(() => delete window.Razorpay);

  it("payment_not_captured shows a friendly non-error message and routes to the order", async () => {
    await payAndVerifyFails(new ApiError("not captured", 409, "payment_not_captured"));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/account/orders/10"));
    expect(toast).toHaveBeenCalledWith(expect.stringContaining("we're confirming your order"), expect.anything());
    expect(toast.error).not.toHaveBeenCalled();
    expect(api.getOrderById).toHaveBeenCalled();
  });

  it("payment_verification_unavailable gets the same treatment", async () => {
    await payAndVerifyFails(new ApiError("down", 503, "payment_verification_unavailable"));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/account/orders/10"));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("goes to the confirmation page when polling sees the order paid", async () => {
    api.getOrderById.mockResolvedValue({ paymentStatus: "paid" });
    await payAndVerifyFails(new ApiError("not captured", 409, "payment_not_captured"));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/checkout/confirmation/10"));
    expect(toast.success).toHaveBeenCalled();
  });

  it("payment_amount_mismatch is a real error naming the order", async () => {
    await payAndVerifyFails(new ApiError("mismatch", 409, "payment_amount_mismatch"));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "There was a problem confirming your payment amount. Please contact support with order #UP-10.",
        expect.anything()
      )
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("unknown failures keep the contact-support message", async () => {
    await payAndVerifyFails(new ApiError("bad", 400, "invalid_signature"));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Payment received but confirmation failed. Contact support with order #UP-10.",
        expect.anything()
      )
    );
  });
});
