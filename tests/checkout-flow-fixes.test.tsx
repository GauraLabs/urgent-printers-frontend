import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import type { AppliedCoupon, CartItem } from "@/types";

const api = vi.hoisted(() => ({ getCart: vi.fn(), syncCart: vi.fn(), validateCoupon: vi.fn() }));
vi.mock("@/lib/api", () => ({ getCart: api.getCart, syncCart: api.syncCart }));
vi.mock("@/lib/api/coupons", () => ({ validateCoupon: api.validateCoupon }));
vi.mock("@/features/site-status/trackConnectivity", () => ({ trackConnectivity: <T,>(p: Promise<T>) => p }));
vi.mock("@/features/cart/rateResolver", () => ({ loadLineRates: vi.fn() }));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

import { ApiError } from "@/lib/api/client";
import { loginErrorMessage } from "@/lib/api/auth";
import { CartSyncProvider } from "@/features/cart/CartSyncProvider";
import { revalidateAppliedCoupon } from "@/features/cart/couponRevalidation";
import { useCartStore } from "@/features/cart/store";
import { useAuthStore } from "@/features/auth/store";

const line = (id: string, total = 1500): CartItem => ({
  cartItemId: id, product: { id, slug: id, name: id, images: [], categoryName: "", categorySlug: "" },
  config: { quantity: 50, turnaroundId: "std", turnaroundLabel: "S", turnaroundExtraCost: 0 },
  pricePerUnit: total / 50, totalPrice: total,
});
const coupon = (over: Partial<AppliedCoupon> = {}): AppliedCoupon => ({
  code: "FIRST10", discountType: "flat", discountValue: 445, discountAmount: 445, description: null, message: "ok", ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  api.syncCart.mockResolvedValue([]);
  useCartStore.setState({ items: [line("a"), line("b", 700)], appliedCoupon: coupon(), pendingRemovals: [] });
});

describe("applied coupon is re-validated against the cart", () => {
  it("removes it with the server's reason when the cart no longer qualifies", async () => {
    api.validateCoupon.mockRejectedValue(new Error("needs a ₹3,000.00 minimum order"));
    expect(await revalidateAppliedCoupon("t")).toBe(true);
    expect(useCartStore.getState().appliedCoupon).toBeNull();
    expect(toast.error).toHaveBeenCalledWith("Coupon FIRST10 removed — needs a ₹3,000.00 minimum order");
    expect(api.validateCoupon).toHaveBeenCalledWith("FIRST10", 2200, "t", 2200);
  });
  it("refreshes the discount when still valid but the amount changed", async () => {
    api.validateCoupon.mockResolvedValue(coupon({ discountAmount: 220 }));
    expect(await revalidateAppliedCoupon()).toBe(false);
    expect(useCartStore.getState().appliedCoupon?.discountAmount).toBe(220);
  });
  it("keeps the coupon on a network error", async () => {
    api.validateCoupon.mockRejectedValue(new ApiError("down", 503));
    expect(await revalidateAppliedCoupon()).toBe(false);
    expect(useCartStore.getState().appliedCoupon?.code).toBe("FIRST10");
    expect(toast.error).not.toHaveBeenCalled();
  });
  it("does nothing without a coupon", async () => {
    useCartStore.setState({ appliedCoupon: null });
    await revalidateAppliedCoupon();
    expect(api.validateCoupon).not.toHaveBeenCalled();
  });
  it("the provider re-checks after a quantity/removal change", async () => {
    vi.useFakeTimers();
    useAuthStore.setState({ _isHydrated: true, isAuthenticated: false, token: null });
    api.validateCoupon.mockRejectedValue(new Error("minimum order not met"));
    render(<CartSyncProvider>x</CartSyncProvider>);
    await act(async () => void vi.advanceTimersByTime(700));
    expect(useCartStore.getState().appliedCoupon).toBeNull();
    vi.useRealTimers();
  });
});

describe("a removal survives a reload inside the sync debounce", () => {
  it("records pending removals, which re-adding clears", () => {
    useCartStore.setState({ items: [] });
    useCartStore.getState().addItem(line("a").product, line("a").config, 30);
    const id = useCartStore.getState().items[0].cartItemId;
    useCartStore.getState().removeItem(id);
    expect(useCartStore.getState().pendingRemovals).toEqual([id]);
    useCartStore.getState().addItem(line("a").product, line("a").config, 30);
    expect(useCartStore.getState().pendingRemovals).toEqual([]);
  });
  it("pagehide flushes the unsent change with keepalive", () => {
    vi.useFakeTimers();
    useAuthStore.setState({ _isHydrated: true, isAuthenticated: true, token: "tok" });
    useCartStore.setState({ appliedCoupon: null });
    render(<CartSyncProvider>x</CartSyncProvider>);
    act(() => void vi.advanceTimersByTime(600)); // mount sync
    api.syncCart.mockClear();
    act(() => useCartStore.getState().removeItem("a"));
    expect(api.syncCart).not.toHaveBeenCalled();
    act(() => void window.dispatchEvent(new Event("pagehide")));
    expect(api.syncCart).toHaveBeenCalledTimes(1);
    expect(api.syncCart.mock.calls[0][2]).toEqual({ keepalive: true });
    expect(api.syncCart.mock.calls[0][0].map((i: CartItem) => i.cartItemId)).toEqual(["b"]);
    act(() => void vi.advanceTimersByTime(600));
    expect(api.syncCart).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

describe("login errors", () => {
  it("429 is rate limiting, not a wrong password", () => {
    expect(loginErrorMessage(new ApiError("slow down", 429))).toBe("Too many attempts — please wait a few minutes and try again.");
  });
  it("401 stays invalid credentials; other failures are neutral", () => {
    expect(loginErrorMessage(new ApiError("no", 401))).toContain("Invalid email or password");
    expect(loginErrorMessage(new ApiError("boom", 500))).not.toContain("Invalid");
    expect(loginErrorMessage(new TypeError("fetch failed"))).not.toContain("Invalid");
  });
});
