import { useCartStore } from "@/features/cart/store";
import { useWishlistStore } from "@/features/wishlist/store";
import { useRecentlyViewedStore } from "@/features/products/recentlyViewed/store";
import { useRecentSearchesStore } from "@/features/search/recentSearches";
import { useAuthStore } from "./store";

// Resets the personal, per-customer persisted stores and drops their localStorage entries.
// Cookie consent and colour mode are device preferences and are deliberately left alone.
// Must run AFTER the auth store is cleared: the sync providers only push while authenticated,
// so clearing first would upload the emptied cart/wishlist over the customer's saved server copy.
export function clearDeviceUserData(): void {
  useCartStore.setState({
    items: [],
    appliedCoupon: null,
    pendingRemovals: [],
    unavailableIds: [],
    rateErrorIds: [],
    isOpen: false,
  });
  useWishlistStore.setState({ items: [] });
  useRecentlyViewedStore.setState({ items: [] });
  useRecentSearchesStore.setState({ terms: [] });

  useCartStore.persist.clearStorage();
  useWishlistStore.persist.clearStorage();
  useRecentlyViewedStore.persist.clearStorage();
  useRecentSearchesStore.persist.clearStorage();
}

// Single local sign-out used by every logout path (button, cross-tab broadcast, dead session).
export function endLocalSession(): void {
  useAuthStore.getState().clearUser();
  clearDeviceUserData();
}
