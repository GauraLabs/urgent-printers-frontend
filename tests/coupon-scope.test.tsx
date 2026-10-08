import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const api = vi.hoisted(() => ({ validateCoupon: vi.fn() }));
vi.mock("@/lib/api/coupons", async (orig) => ({ ...(await orig<typeof import("@/lib/api/coupons")>()), validateCoupon: api.validateCoupon }));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

import { mapCoupon, buildCouponBody, CouponRejectedError, type BackendCouponResponse } from "@/lib/api/coupons";
import { mapPreview, type BackendPreview } from "@/lib/api/orders";
import { ApiError } from "@/lib/api/client";
import { codedErrorMessage } from "@/lib/api/validationErrors";
import { isLineEligible } from "@/features/cart/savings";
import { CouponMinNote, CouponScopeNote } from "@/features/cart/CouponScopeNote";
import { revalidateAppliedCoupon } from "@/features/cart/couponRevalidation";
import { useCartStore } from "@/features/cart/store";
import type { CartItem, AppliedCoupon } from "@/types";

const line = (id: string, name: string, total: number): CartItem => ({
  cartItemId: `c${id}`, product: { id, slug: name, name, images: [], categoryName: "", categorySlug: "" },
  config: { quantity: 10, turnaroundId: "t", turnaroundLabel: "T", turnaroundExtraCost: 0 }, pricePerUnit: total / 10, totalPrice: total,
});
const items = [line("1", "Cards", 1000), line("2", "Flyers", 500), line("3", "Mugs", 300)];
const base: BackendCouponResponse = {
  code: "CARDS10", is_valid: true, discount_type: "percentage", discount_value: 10, discount_amount: 100, description: null,
  min_order_amount: null, max_discount_amount: null, message: "ok",
};

describe("coupon scope mapping", () => {
  it("maps eligible ids and scope from the snake_case validate payload", () => {
    const c = mapCoupon({ ...base, eligible_item_ids: [1, "2"], eligible_line_indexes: [0, 1], coupon_scope: { product_names: ["Cards"], category_names: ["Flyers"], all_items: false } });
    expect(c.eligibleItemIds).toEqual(["1", "2"]);
    expect(c.eligibleLineIndexes).toEqual([0, 1]);
    expect(c.scope).toEqual({ productNames: ["Cards"], categoryNames: ["Flyers"], allItems: false });
  });
  it("an old backend yields no scope (every line eligible)", () => {
    const c = mapCoupon(base);
    expect(c.eligibleItemIds).toBeUndefined();
    expect(c.scope).toBeUndefined();
  });
  it("maps the camelCase preview payload", () => {
    const p = mapPreview({
      pricing: {
        subtotal: 1, discountAmount: 0, shippingCost: 0, gstRate: 18, gstAmount: 0, totalAmount: 1,
        eligibleItemIds: ["1"], eligibleLineIndexes: [0, 2], couponScope: { productNames: ["Cards"], categoryNames: [], allItems: false },
      },
      items: [],
    } as unknown as BackendPreview);
    expect(p.eligibleItemIds).toEqual(["1"]);
    expect(p.eligibleLineIndexes).toEqual([0, 2]);
    expect(p.couponScope).toEqual({ productNames: ["Cards"], categoryNames: [], allItems: false });
  });
  it("validate sends the cart lines so the server can scope, flagging MRP-discounted lines", () => {
    const withMrp = [{ ...items[0], mrpPerUnit: 120 }, items[1], items[2]];
    expect(buildCouponBody("a", 1800, 1800, withMrp).items).toEqual([
      { product_id: "1", total_price: 1000, discounted: true }, { product_id: "2", total_price: 500 }, { product_id: "3", total_price: 300 },
    ]);
    expect(buildCouponBody("a", 1800)).not.toHaveProperty("items");
  });
  it("coupon_not_applicable shows the server's message, with a fallback", () => {
    expect(codedErrorMessage("coupon_not_applicable", "Only for Cards")).toBeUndefined();
    expect(codedErrorMessage("coupon_not_applicable")).toContain("doesn't apply");
  });
});

describe("per-line eligibility", () => {
  it("line indexes beat product ids: the same product can be eligible on one line only", () => {
    expect(isLineEligible(0, "1", { eligibleItemIds: ["1"], eligibleLineIndexes: [1] })).toBe(false);
    expect(isLineEligible(1, "1", { eligibleItemIds: ["1"], eligibleLineIndexes: [1] })).toBe(true);
  });
  it("falls back to product ids, then to everything eligible", () => {
    expect(isLineEligible(0, "2", { eligibleItemIds: ["1"] })).toBe(false);
    expect(isLineEligible(0, "1", { eligibleItemIds: ["1"] })).toBe(true);
    expect(isLineEligible(0, "9", {})).toBe(true);
    expect(isLineEligible(0, "9", null)).toBe(true);
  });
});

describe("CouponScopeNote by line", () => {
  it("counts lines, not products, when line indexes are given", () => {
    const twice = [line("1", "Cards", 1000), line("1", "Cards", 400), line("2", "Flyers", 500)];
    render(<CouponScopeNote items={twice} eligibleItemIds={["1"]} eligibleLineIndexes={[1]} />);
    expect(screen.getByText(/Applied to 1 of 3 items/)).toBeTruthy();
  });
});

describe("CouponScopeNote", () => {
  it("renders nothing when every line is eligible or scope is unknown", () => {
    const { container, rerender } = render(<CouponScopeNote items={items} eligibleItemIds={["1", "2", "3"]} />);
    expect(container.textContent).toBe("");
    rerender(<CouponScopeNote items={items} />);
    expect(container.textContent).toBe("");
  });
  it("shows 'Applied to 2 of 3 items' and lists them on demand", () => {
    render(<CouponScopeNote items={items} eligibleItemIds={["1", "3"]} scope={{ productNames: ["Cards", "Mugs"], categoryNames: [], allItems: false }} />);
    expect(screen.getByText(/Applied to 2 of 3 items/)).toBeTruthy();
    expect(screen.queryByText("Flyers")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Which items?" }));
    expect(screen.getByText("Cards")).toBeTruthy();
    expect(screen.getByText("Mugs")).toBeTruthy();
    expect(screen.queryByText("Flyers")).toBeNull();
    expect(screen.getByText(/applies to: Cards, Mugs/)).toBeTruthy();
  });
});

describe("revalidation with scoped coupons", () => {
  const coupon: AppliedCoupon = { code: "CARDS10", discountType: "percentage", discountValue: 10, discountAmount: 100, description: null, message: "", eligibleItemIds: ["1"] };
  beforeEach(() => {
    vi.clearAllMocks();
    useCartStore.setState({ items: [line("2", "Flyers", 500)], appliedCoupon: coupon });
  });
  it("removes the coupon with the server's message when no eligible lines remain", async () => {
    api.validateCoupon.mockRejectedValue(new ApiError("This coupon applies to Cards only", 422, "coupon_not_applicable"));
    expect(await revalidateAppliedCoupon()).toBe("removed");
    expect(useCartStore.getState().appliedCoupon).toBeNull();
    expect(toast.error).toHaveBeenCalledWith("Coupon CARDS10 removed — This coupon applies to Cards only");
  });
  it("sends the scoped eligible basis and adopts a changed scope", async () => {
    api.validateCoupon.mockResolvedValue({ ...coupon, eligibleItemIds: ["2"], discountAmount: 50 });
    await revalidateAppliedCoupon();
    expect(api.validateCoupon.mock.calls[0][3]).toBe(500);
    expect(useCartStore.getState().appliedCoupon).toMatchObject({ eligibleItemIds: ["2"], discountAmount: 50 });
  });
});

describe("revalidation failure handling", () => {
  const coupon: AppliedCoupon = { code: "CARDS10", discountType: "percentage", discountValue: 10, discountAmount: 100, description: null, message: "" };
  beforeEach(() => {
    vi.clearAllMocks();
    useCartStore.setState({ items: [line("1", "Cards", 1000)], appliedCoupon: coupon });
  });

  it.each([
    ["a server verdict in a 200 body", new CouponRejectedError("Coupon expired", "coupon_expired")],
    ["a 422 coupon_not_applicable", new ApiError("Only for Mugs", 422, "coupon_not_applicable")],
    ["a 400 invalid_coupon", new ApiError("Invalid coupon", 400, "invalid_coupon")],
    ["a 404", new ApiError("Not found", 404)],
  ])("removes the coupon with the server's message on %s", async (_n, err) => {
    api.validateCoupon.mockRejectedValue(err);
    expect(await revalidateAppliedCoupon()).toBe("removed");
    expect(useCartStore.getState().appliedCoupon).toBeNull();
    expect(toast.error).toHaveBeenCalledWith(`Coupon CARDS10 removed — ${(err as Error).message}`);
  });

  it.each([
    ["a network failure", new TypeError("Failed to fetch")],
    ["a 429", new ApiError("Too many requests", 429)],
    ["a 503", new ApiError("down", 503)],
    ["a 500", new ApiError("boom", 500)],
    ["a 401", new ApiError("expired session", 401)],
  ])("keeps a valid coupon on %s", async (_n, err) => {
    api.validateCoupon.mockRejectedValue(err);
    expect(await revalidateAppliedCoupon()).toBe("kept");
    expect(useCartStore.getState().appliedCoupon?.code).toBe("CARDS10");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("a superseded in-flight check is aborted and cannot remove the coupon", async () => {
    let rejectFirst: (e: unknown) => void = () => {};
    api.validateCoupon.mockImplementationOnce(() => new Promise((_, rej) => { rejectFirst = rej; }));
    api.validateCoupon.mockResolvedValueOnce({ ...coupon });
    const first = revalidateAppliedCoupon();
    const signal = api.validateCoupon.mock.calls[0][5] as AbortSignal;
    const second = revalidateAppliedCoupon();
    expect(signal.aborted).toBe(true);
    rejectFirst(new CouponRejectedError("stale verdict"));
    expect(await first).toBe("kept");
    expect(await second).toBe("valid");
    expect(useCartStore.getState().appliedCoupon?.code).toBe("CARDS10");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("checks even while a line is repricing when forced (before review)", async () => {
    useCartStore.setState({ items: [{ ...line("1", "Cards", 1000), pricePending: true }] });
    api.validateCoupon.mockResolvedValue({ ...coupon });
    expect(await revalidateAppliedCoupon()).toBe("skipped");
    expect(await revalidateAppliedCoupon(undefined, { force: true })).toBe("valid");
  });
});

describe("revalidation timing in the provider", () => {
  const coupon: AppliedCoupon = { code: "CARDS10", discountType: "percentage", discountValue: 10, discountAmount: 100, description: null, message: "" };
  const wait = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    const { useAuthStore } = await import("@/features/auth/store");
    useAuthStore.setState({ _isHydrated: true, isAuthenticated: false, token: null });
    useCartStore.setState({ items: [line("1", "Cards", 1000), line("2", "Flyers", 500)], appliedCoupon: coupon });
    api.validateCoupon.mockResolvedValue({ ...coupon });
  });
  afterEach(() => vi.useRealTimers());

  it("runs exactly once, after the last of several quick edits settles", async () => {
    const { CartSyncProvider } = await import("@/features/cart/CartSyncProvider");
    render(<CartSyncProvider>x</CartSyncProvider>);
    await wait(700);
    api.validateCoupon.mockClear();
    for (const total of [900, 800, 700]) {
      act(() => useCartStore.setState({ items: [line("1", "Cards", total), line("2", "Flyers", 500)] }));
      await wait(300);
    }
    expect(api.validateCoupon).not.toHaveBeenCalled();
    await wait(400);
    expect(api.validateCoupon).toHaveBeenCalledTimes(1);
    expect(api.validateCoupon.mock.calls[0][1]).toBe(1200);
  });

  it("identity-only store updates neither cancel nor re-arm the pending check", async () => {
    const { CartSyncProvider } = await import("@/features/cart/CartSyncProvider");
    render(<CartSyncProvider>x</CartSyncProvider>);
    await wait(700);
    api.validateCoupon.mockClear();
    act(() => useCartStore.setState({ items: [line("1", "Cards", 900), line("2", "Flyers", 500)] }));
    await wait(400);
    for (let i = 0; i < 4; i++) {
      act(() => useCartStore.setState({ items: useCartStore.getState().items.map((x) => ({ ...x })) }));
      await wait(50);
    }
    await wait(300);
    expect(api.validateCoupon).toHaveBeenCalledTimes(1);
  });

  it("retries with backoff after a network failure and keeps the coupon meanwhile", async () => {
    const { CartSyncProvider } = await import("@/features/cart/CartSyncProvider");
    render(<CartSyncProvider>x</CartSyncProvider>);
    await wait(700);
    api.validateCoupon.mockClear();
    api.validateCoupon.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    act(() => useCartStore.setState({ items: [line("1", "Cards", 900), line("2", "Flyers", 500)] }));
    await wait(700);
    expect(api.validateCoupon).toHaveBeenCalledTimes(1);
    expect(useCartStore.getState().appliedCoupon?.code).toBe("CARDS10");
    await wait(3100);
    expect(api.validateCoupon).toHaveBeenCalledTimes(2);
  });

  it("a line finishing its repricing triggers the check that was skipped while pending", async () => {
    const { CartSyncProvider } = await import("@/features/cart/CartSyncProvider");
    render(<CartSyncProvider>x</CartSyncProvider>);
    await wait(700);
    api.validateCoupon.mockClear();
    act(() => useCartStore.setState({ items: [{ ...line("1", "Cards", 900), pricePending: true }, line("2", "Flyers", 500)] }));
    await wait(700);
    expect(api.validateCoupon).not.toHaveBeenCalled();
    act(() => useCartStore.setState({ items: [line("1", "Cards", 900), line("2", "Flyers", 500)] }));
    await wait(700);
    expect(api.validateCoupon).toHaveBeenCalledTimes(1);
  });
});

describe("eligible lines are shown for unscoped coupons too", () => {
  it("an exclude-discounted coupon without product scope still marks the excluded line", () => {
    const two = [line("1", "Cards", 1000), line("2", "Flyers", 500)];
    render(<CouponScopeNote items={two} eligibleItemIds={["1", "2"]} eligibleLineIndexes={[1]} scope={{ productNames: [], categoryNames: [], allItems: true }} />);
    expect(screen.getByText(/Applied to 1 of 2 items/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Which items?" }));
    expect(screen.getByText("Flyers")).toBeTruthy();
    expect(screen.queryByText("Cards")).toBeNull();
  });
  it("derives from line indexes alone", () => {
    const two = [line("1", "Cards", 1000), line("2", "Flyers", 500)];
    render(<CouponScopeNote items={two} eligibleLineIndexes={[0]} />);
    expect(screen.getByText(/Applied to 1 of 2 items/)).toBeTruthy();
  });
});

describe("minimum order disclosure", () => {
  const c = (over: Partial<AppliedCoupon>) => ({ minOrderAmount: 3000, appliesToDiscountedItems: true, scope: undefined, ...over });
  it("is shown for scoped and exclude-discounted coupons with a minimum", () => {
    const { container, rerender } = render(<CouponMinNote coupon={c({ scope: { productNames: ["Cards"], categoryNames: [], allItems: false } })} />);
    expect(container.textContent).toBe("Minimum order ₹3,000.00 applies to your whole cart");
    rerender(<CouponMinNote coupon={c({ appliesToDiscountedItems: false })} />);
    expect(container.textContent).toContain("Minimum order ₹3,000.00");
  });
  it("is hidden for plain coupons or without a minimum", () => {
    const { container, rerender } = render(<CouponMinNote coupon={c({})} />);
    expect(container.textContent).toBe("");
    rerender(<CouponMinNote coupon={c({ appliesToDiscountedItems: false, minOrderAmount: undefined })} />);
    expect(container.textContent).toBe("");
  });
  it("is mapped from the validate payload", () => {
    expect(mapCoupon({ ...base, min_order_amount: 3000 }).minOrderAmount).toBe(3000);
    expect(mapCoupon({ ...base, min_order_amount: null }).minOrderAmount).toBeUndefined();
  });
});
