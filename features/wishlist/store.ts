"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WishlistItem {
  productId: string;
  productSlug: string;
  productName: string;
  productImage: string;
  addedAt: string;
}

interface WishlistStore {
  items: WishlistItem[];

  addItem: (item: Omit<WishlistItem, "addedAt">) => void;
  removeItem: (productId: string) => void;
  toggleItem: (item: Omit<WishlistItem, "addedAt">) => void;
  isWishlisted: (productId: string) => boolean;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        if (get().isWishlisted(item.productId)) return;
        set((state) => ({
          items: [...state.items, { ...item, addedAt: new Date().toISOString() }],
        }));
      },

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),

      toggleItem: (item) => {
        if (get().isWishlisted(item.productId)) {
          get().removeItem(item.productId);
        } else {
          get().addItem(item);
        }
      },

      isWishlisted: (productId) =>
        get().items.some((i) => i.productId === productId),

      clearWishlist: () => set({ items: [] }),
    }),
    {
      name: "urgent-printers-wishlist",
    }
  )
);
