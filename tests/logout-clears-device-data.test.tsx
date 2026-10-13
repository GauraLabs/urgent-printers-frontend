import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import type { CartItem } from "@/types";

const api = vi.hoisted(() => ({
  getCart: vi.fn(),
  syncCart: vi.fn(),
  getSavedItems: vi.fn(),
  syncSavedItems: vi.fn(),
  refreshTokens: vi.fn(),
  getMe: vi.fn(),
}));

vi.mock("@/lib/api", async (orig) => ({ ...(await orig<Record<string, unknown>>()), ...api }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import { useAuthStore } from "@/features/auth/store";
import { useCartStore } from "@/features/cart/store";
import { useWishlistStore } from "@/features/wishlist/store";
import { useRecentlyViewedStore } from "@/features/products/recentlyViewed/store";
import { useRecentSearchesStore } from "@/features/search/recentSearches";
import { clearDeviceUserData, endLocalSession } from "@/features/auth/clearDeviceUserData";
import { CartSyncProvider } from "@/features/cart/CartSyncProvider";
import { WishlistSyncProvider } from "@/features/wishlist/WishlistSyncProvider";
import { TokenRefreshProvider } from "@/features/auth/TokenRefreshProvider";
import { COOKIE_CONSENT_STORAGE_KEY } from "@/lib/consent";
import { COLOR_MODE_STORAGE_KEY } from "@/lib/themes";

const KEYS = [
  "urgent-printers-cart",
  "urgent-printers-wishlist",
  "urgent-printers-recently-viewed",
  "urgent-printers-recent-searches",
];

function line(id: string, name = "Asha & Rahul"): CartItem {
  return {
    cartItemId: id,
    product: { id, slug: `p${id}`, name: "Card", images: [], thumbnailUrl: "", categoryName: "C", categorySlug: "c" },
    config: { quantity: 100, turnaroundId: "t", turnaroundLabel: "T", turnaroundExtraCost: 0, templateData: { names: name } } as CartItem["config"],
    pricePerUnit: 1,
    totalPrice: 100,
  };
}

function fillStores(): void {
  useCartStore.getState().setItems([line("1")]);
  useCartStore.setState({
    appliedCoupon: { code: "SAVE" } as never,
    pendingRemovals: ["gone"],
  });
  useWishlistStore.getState().addItem({ productId: "9", productSlug: "s", productName: "n", productImage: "i" });
  useRecentlyViewedStore.getState().recordView({ productId: "9", productSlug: "s", categorySlug: "c" });
  useRecentSearchesStore.getState().record("wedding cards");
}

function login(token = "tok"): void {
  useAuthStore.setState({ isAuthenticated: true, token, _isHydrated: true });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false, _isHydrated: true });
  clearDeviceUserData();
  api.getCart.mockResolvedValue([]);
  api.syncCart.mockResolvedValue([]);
  api.getSavedItems.mockResolvedValue([]);
  api.syncSavedItems.mockResolvedValue(undefined);
});

afterEach(() => vi.unstubAllGlobals());

describe("clearDeviceUserData", () => {
  it("empties all four stores and removes their localStorage keys", () => {
    fillStores();
    for (const k of KEYS) expect(localStorage.getItem(k), k).not.toBeNull();

    clearDeviceUserData();

    const cart = useCartStore.getState();
    expect(cart.items).toEqual([]);
    expect(cart.appliedCoupon).toBeNull();
    expect(cart.pendingRemovals).toEqual([]);
    expect(useWishlistStore.getState().items).toEqual([]);
    expect(useRecentlyViewedStore.getState().items).toEqual([]);
    expect(useRecentSearchesStore.getState().terms).toEqual([]);
    for (const k of KEYS) expect(localStorage.getItem(k), k).toBeNull();
  });

  it("keeps cookie consent and colour mode", () => {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, "accepted");
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, "dark");
    fillStores();
    clearDeviceUserData();
    expect(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBe("accepted");
    expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe("dark");
  });

  it("endLocalSession signs out and wipes", () => {
    login();
    fillStores();
    endLocalSession();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();
    expect(useCartStore.getState().items).toEqual([]);
  });
});

describe("cross-tab logout broadcast", () => {
  class FakeChannel {
    static all: FakeChannel[] = [];
    onmessage: ((ev: MessageEvent) => void) | null = null;
    constructor(public name: string) { FakeChannel.all.push(this); }
    postMessage(data: unknown): void {
      for (const c of FakeChannel.all) if (c !== this) c.onmessage?.({ data } as MessageEvent);
    }
  }

  it("clears session and device data when another tab logs out", async () => {
    FakeChannel.all = [];
    vi.stubGlobal("BroadcastChannel", FakeChannel);
    vi.resetModules();
    const { broadcastLogout } = await import("@/lib/api/refreshSession");
    const auth = await import("@/features/auth/store");
    const cart = await import("@/features/cart/store");
    const wish = await import("@/features/wishlist/store");
    broadcastLogout(); // creates this tab's channel + receiver

    auth.useAuthStore.setState({ isAuthenticated: true, token: "t" });
    cart.useCartStore.getState().setItems([line("1")]);
    wish.useWishlistStore.getState().addItem({ productId: "9", productSlug: "s", productName: "n", productImage: "i" });

    const otherTab = new FakeChannel("up-auth-refresh");
    otherTab.postMessage({ type: "logout" });

    await waitFor(() => expect(auth.useAuthStore.getState().isAuthenticated).toBe(false));
    await waitFor(() => expect(cart.useCartStore.getState().items).toEqual([]));
    expect(wish.useWishlistStore.getState().items).toEqual([]);
    for (const k of KEYS) expect(localStorage.getItem(k), k).toBeNull();
  });
});

describe("TokenRefreshProvider", () => {
  function mountRestoring(): void {
    useAuthStore.setState({ isAuthenticated: true, token: null, _isHydrated: true });
    fillStores();
    render(<TokenRefreshProvider><div /></TokenRefreshProvider>);
  }

  it("wipes device data when the refresh says the session is gone", async () => {
    api.refreshTokens.mockResolvedValue(null);
    mountRestoring();
    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(false));
    expect(useCartStore.getState().items).toEqual([]);
    expect(useWishlistStore.getState().items).toEqual([]);
    expect(useRecentSearchesStore.getState().terms).toEqual([]);
  });

  it("keeps everything on a transient refresh failure", async () => {
    api.refreshTokens.mockRejectedValue(new Error("network"));
    mountRestoring();
    await act(() => wait(50));
    expect(api.refreshTokens).toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useWishlistStore.getState().items).toHaveLength(1);
    expect(localStorage.getItem("urgent-printers-cart")).not.toBeNull();
  });
});

describe("sync providers around logout", () => {
  function mount(): void {
    render(
      <CartSyncProvider><WishlistSyncProvider><div /></WishlistSyncProvider></CartSyncProvider>,
    );
  }

  it("never pushes or deletes server data when a logged-in customer logs out", async () => {
    login();
    fillStores();
    api.getCart.mockResolvedValue([line("1")]);
    api.getSavedItems.mockResolvedValue([]);
    mount();
    await act(() => wait(800));
    api.syncCart.mockClear();
    api.syncSavedItems.mockClear();

    act(() => endLocalSession());
    await act(() => wait(900));

    expect(api.syncCart).not.toHaveBeenCalled();
    expect(api.syncSavedItems).not.toHaveBeenCalled();
  });

  it("a pending debounced edit does not fire after logout", async () => {
    login();
    mount();
    await act(() => wait(100));
    api.syncCart.mockClear();
    act(() => useCartStore.getState().setItems([line("2")]));
    act(() => endLocalSession());
    await act(() => wait(900));
    expect(api.syncCart).not.toHaveBeenCalled();
    expect(api.syncSavedItems).not.toHaveBeenCalled();
  });

  it("a login merge still loading when logout happens cannot repopulate the cart", async () => {
    let release: (v: CartItem[]) => void = () => {};
    api.getCart.mockReturnValue(new Promise<CartItem[]>((r) => { release = r; }));
    login();
    useCartStore.getState().setItems([line("1")]);
    mount();
    await act(() => wait(20));

    act(() => endLocalSession());
    await act(async () => { release([line("old-server")]); await wait(50); });

    expect(useCartStore.getState().items).toEqual([]);
    expect(api.syncCart).not.toHaveBeenCalled();
  });

  it("a guest cart still merges into the account on login", async () => {
    useCartStore.getState().setItems([line("guest")]);
    api.getCart.mockResolvedValue([line("server")]);
    mount();
    await act(() => wait(50));
    expect(api.getCart).not.toHaveBeenCalled();

    act(() => login());
    await waitFor(() => expect(api.syncCart).toHaveBeenCalled());
    const pushed = api.syncCart.mock.calls[0][0] as CartItem[];
    expect(pushed.map((i) => i.cartItemId).sort()).toEqual(["guest", "server"]);
    expect(useCartStore.getState().items.map((i) => i.cartItemId)).toContain("guest");
  });
});
