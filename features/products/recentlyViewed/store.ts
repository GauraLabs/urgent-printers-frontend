"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Only the identifiers needed to route to + re-fetch the product are
// persisted — never a snapshot of name/image/price. Those are always looked
// up live (see RecentlyViewedCarousel) so a renamed, re-priced, or deleted
// product is reflected immediately instead of showing stale data.
export interface RecentlyViewedItem {
  productId: string;
  productSlug: string;
  categorySlug: string;
  viewedAt: string;
}

const MAX_RECENTLY_VIEWED = 12;

interface RecentlyViewedStore {
  items: RecentlyViewedItem[];

  recordView: (item: Omit<RecentlyViewedItem, "viewedAt">) => void;
  /** Drops items whose live lookup came back empty (e.g. deleted products) so the carousel stops retrying them. */
  pruneMissing: (missingProductIds: string[]) => void;
  clearRecentlyViewed: () => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedStore>()(
  persist(
    (set) => ({
      items: [],

      recordView: (item) =>
        set((state) => ({
          // Re-viewing a product moves it to the front instead of duplicating it.
          items: [
            { ...item, viewedAt: new Date().toISOString() },
            ...state.items.filter((i) => i.productId !== item.productId),
          ].slice(0, MAX_RECENTLY_VIEWED),
        })),

      pruneMissing: (missingProductIds) =>
        set((state) => ({
          items: state.items.filter((i) => !missingProductIds.includes(i.productId)),
        })),

      clearRecentlyViewed: () => set({ items: [] }),
    }),
    {
      name: "urgent-printers-recently-viewed",
    }
  )
);
