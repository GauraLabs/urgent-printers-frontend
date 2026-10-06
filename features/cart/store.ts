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
  addItem: (product: Pick<Product, "id" | "slug" | "name" | "images" | "thumbnailUrl" | "categoryName" | "categorySlug">, config: CartItemConfig, pricePerUnit: number, mrpPerUnit?: number) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  setItems: (items: CartItem[]) => void;
  // Applies server pack-snaps to matching local lines; returns the lines changed.
  applyQuantityCorrections: (corrected: CartItem[]) => CartItem[];
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  // Derived helpers (computed on read, not stored)
  itemCount: () => number;
  subtotal: () => number;
}

function withoutCorrectionFlags(item: CartItem): CartItem {
  const rest = { ...item };
  delete rest.quantityCorrected;
  delete rest.originalQuantity;
  return rest;
}

// A malformed persisted item must never fail rehydration (that would wipe the
// cart): recompute per item and keep it unchanged on any error.
export function migrateCartState(persisted: unknown): unknown {
  const state = persisted as { items?: unknown } | null | undefined;
  if (!state || !Array.isArray(state.items)) return persisted;
  return {
    ...state,
    items: state.items.map((raw: CartItem) => {
      try {
        return {
          ...raw,
          cartItemId: makeCartItemId(
            raw.product.id, raw.config.sizeId ?? "", raw.config.paperId ?? "", raw.config.finishId ?? "",
            raw.config.sides ?? "", raw.config.turnaroundId, raw.config.artworkFileKey, raw.config.templateData
          ),
        };
      } catch {
        return raw;
      }
    }),
  };
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      appliedCoupon: null,

      addItem: (product, config, pricePerUnit, mrpPerUnit) => {
        const cartItemId = makeCartItemId(
          product.id, config.sizeId ?? "", config.paperId ?? "", config.finishId ?? "",
          config.sides ?? "", config.turnaroundId, config.artworkFileKey, config.templateData
        );
        const totalPrice = parseFloat(
          (pricePerUnit * config.quantity + (config.turnaroundExtraCost ?? 0)).toFixed(2)
        );

        set((state) => {
          const existing = state.items.find((i) => i.cartItemId === cartItemId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.cartItemId === cartItemId
                  ? { ...i, config: { ...i.config, quantity: config.quantity }, pricePerUnit, mrpPerUnit, totalPrice }
                  : i
              ),
              isOpen: true,
            };
          }
          return {
            items: [
              ...state.items,
              { cartItemId, product, config, pricePerUnit, mrpPerUnit, totalPrice, addedAt: new Date().toISOString() },
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
              ? {
                  ...i,
                  config: { ...i.config, quantity },
                  totalPrice: parseFloat(
                    (i.pricePerUnit * quantity + (i.config.turnaroundExtraCost ?? 0)).toFixed(2)
                  ),
                }
              : i
          ),
        })),

      // Server sync/merge rebuilds items without addedAt; carry it over from the
      // matching local line (never invent one) so backend mismatch labelling works.
      setItems: (items) =>
        set((state) => {
          const known = new Map(state.items.map((i) => [i.cartItemId, i.addedAt]));
          return {
            items: items.map((raw) => {
              const i = withoutCorrectionFlags(raw);
              const addedAt = i.addedAt ?? known.get(i.cartItemId);
              return addedAt ? { ...i, addedAt } : i;
            }),
          };
        }),

      // Only lines still at the quantity the server corrected from are touched,
      // so an edit made while the sync was in flight is never overwritten.
      applyQuantityCorrections: (corrected) => {
        const applied: CartItem[] = [];
        set((state) => ({
          items: state.items.map((local) => {
            const fix = corrected.find((c) => c.cartItemId === local.cartItemId);
            if (!fix || fix.originalQuantity !== local.config.quantity) return local;
            applied.push(fix);
            return {
              ...local,
              config: { ...local.config, quantity: fix.config.quantity, packSize: fix.config.packSize, unitLabel: fix.config.unitLabel },
              pricePerUnit: fix.pricePerUnit,
              mrpPerUnit: fix.mrpPerUnit,
              totalPrice: fix.totalPrice,
            };
          }),
        }));
        return applied;
      },

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
      // v1: cartItemId normalises option ids; recompute ids persisted by v0.
      version: 1,
      migrate: (persisted) => migrateCartState(persisted) as never,
      partialize: (state) => ({ items: state.items, appliedCoupon: state.appliedCoupon }),
    }
  )
);
