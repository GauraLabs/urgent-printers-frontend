"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, CartItemConfig, Product } from "@/types";

interface CartStore {
  items: CartItem[];
  isOpen: boolean;

  // Actions
  addItem: (product: Pick<Product, "id" | "slug" | "name" | "images" | "categoryName">, config: CartItemConfig, pricePerUnit: number) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  // Derived helpers (computed on read, not stored)
  itemCount: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product, config, pricePerUnit) => {
        const cartItemId = `${product.id}-${config.sizeId}-${config.paperId}-${config.finishId}-${config.sides}-${config.turnaroundId}`;
        const totalPrice = parseFloat((pricePerUnit * config.quantity).toFixed(2));

        set((state) => {
          const existing = state.items.find((i) => i.cartItemId === cartItemId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.cartItemId === cartItemId
                  ? { ...i, config: { ...i.config, quantity: config.quantity }, totalPrice }
                  : i
              ),
              isOpen: true,
            };
          }
          return {
            items: [
              ...state.items,
              {
                cartItemId,
                product,
                config,
                pricePerUnit,
                totalPrice,
                addedAt: new Date().toISOString(),
              },
            ],
            isOpen: true,
          };
        });
      },

      removeItem: (cartItemId) =>
        set((state) => ({
          items: state.items.filter((i) => i.cartItemId !== cartItemId),
        })),

      updateQuantity: (cartItemId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.cartItemId === cartItemId
              ? {
                  ...i,
                  config: { ...i.config, quantity },
                  totalPrice: parseFloat((i.pricePerUnit * quantity).toFixed(2)),
                }
              : i
          ),
        })),

      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      itemCount: () => get().items.reduce((sum, i) => sum + i.config.quantity, 0),
      subtotal: () =>
        parseFloat(
          get()
            .items.reduce((sum, i) => sum + i.totalPrice, 0)
            .toFixed(2)
        ),
    }),
    {
      name: "urgent-printers-cart",
      // Persist only items, not UI state
      partialize: (state) => ({ items: state.items }),
    }
  )
);
