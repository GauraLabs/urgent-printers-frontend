"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RecentlyViewedItem {
  productId: string;
  productSlug: string;
  categorySlug: string;
  productName: string;
  productImage: string;
  pricePerUnit: number;
  viewedAt: string;
}

const MAX_RECENTLY_VIEWED = 12;

interface RecentlyViewedStore {
  items: RecentlyViewedItem[];

  recordView: (item: Omit<RecentlyViewedItem, "viewedAt">) => void;
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

      clearRecentlyViewed: () => set({ items: [] }),
    }),
    {
      name: "urgent-printers-recently-viewed",
    }
  )
);
