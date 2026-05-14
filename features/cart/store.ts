"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, CartItemConfig, Product, AppliedCoupon } from "@/types";
import { makeCartItemId } from "./cartItemId";

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  appliedCoupon: AppliedCoupon | null;

  // Actions
  addItem: (product: Pick<Product, "id" | "slug" | "name" | "images" | "categoryName" | "categorySlug">, config: CartItemConfig, pricePerUnit: number) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  setItems: (items: CartItem[]) => void;
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
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
      appliedCoupon: null,

      addItem: (product, config, pricePerUnit) => {
        const cartItemId = makeCartItemId(
          product.id, config.sizeId, config.paperId, config.finishId,
          config.sides, config.turnaroundId, config.artworkFileKey, config.templateData
        );
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
              { cartItemId, product, config, pricePerUnit, totalPrice, addedAt: new Date().toISOString() },
            ],
            isOpen: true,
          };
        });
      },

      removeItem: (cartItemId) =>
        set((state) => ({ items: state.items.filter((i) => i.cartItemId !== cartItemId) })),

      updateQuantity: (cartItemId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.cartItemId === cartItemId
              ? { ...i, config: { ...i.config, quantity }, totalPrice: parseFloat((i.pricePerUnit * quantity).toFixed(2)) }
              : i
          ),
        })),

      setItems: (items) => set({ items }),

      // Coupon is cleared when items change significantly (backend will revalidate anyway)
      setAppliedCoupon: (coupon) => set({ appliedCoupon: coupon }),

      clearCart: () => set({ items: [], appliedCoupon: null }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      itemCount: () => get().items.length,
      subtotal: () => parseFloat(get().items.reduce((sum, i) => sum + i.totalPrice, 0).toFixed(2)),
    }),
    {
      name: "urgent-printers-cart",
      partialize: (state) => ({ items: state.items, appliedCoupon: state.appliedCoupon }),
    }
  )
);
