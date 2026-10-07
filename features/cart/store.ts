"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, CartItemConfig, Product, AppliedCoupon } from "@/types";
import { makeCartItemId } from "./cartItemId";
import { clampQuantity, priceForQuantity } from "@/lib/quantity";
import type { ResolvedRates } from "./rateResolver";

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  appliedCoupon: AppliedCoupon | null;

  // Actions
  addItem: (product: Pick<Product, "id" | "slug" | "name" | "images" | "thumbnailUrl" | "categoryName" | "categorySlug">, config: CartItemConfig, pricePerUnit: number, mrpPerUnit?: number) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  setItems: (items: CartItem[]) => void;
  // Applies server range corrections to matching local lines; returns the lines changed.
  applyQuantityCorrections: (corrected: CartItem[]) => CartItem[];
  // Writes server prices and limits onto every matching line still at the quantity the server saw.
  applyServerLines: (lines: CartItem[]) => void;
  // Not persisted: lines whose product or options could not be resolved this session.
  unavailableIds: string[];
  applyResolvedRates: (cartItemId: string, rates: ResolvedRates) => void;
  markUnavailable: (cartItemId: string) => void;
  // Lookup failed (network/5xx): the line keeps its last known price and offers a retry.
  rateErrorIds: string[];
  setRateError: (cartItemId: string, failed: boolean) => void;
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
      unavailableIds: [],
      rateErrorIds: [],

      setRateError: (cartItemId, failed) =>
        set((state) => {
          const has = state.rateErrorIds.includes(cartItemId);
          if (failed === has) return state;
          return { rateErrorIds: failed ? [...state.rateErrorIds, cartItemId] : state.rateErrorIds.filter((id) => id !== cartItemId) };
        }),

      applyResolvedRates: (cartItemId, rates) =>
        set((state) => ({
          items: state.items.map((i) => {
            if (i.cartItemId !== cartItemId) return i;
            const config = {
              ...i.config,
              rateTiers: rates.rateTiers,
              optionMultiplier: rates.optionMultiplier,
              minQuantity: i.config.minQuantity ?? rates.minQuantity,
              maxQuantity: i.config.maxQuantity !== undefined ? i.config.maxQuantity : rates.maxQuantity,
              unitLabel: i.config.unitLabel ?? rates.unitLabel,
            };
            // Only a line left pending is repriced; an untouched line keeps its server price.
            if (!i.pricePending) return { ...i, config };
            const priced = priceForQuantity(rates.rateTiers, config.quantity, rates.optionMultiplier, config.turnaroundExtraCost ?? 0);
            if (!priced) return { ...i, config };
            return { ...i, config, pricePerUnit: priced.pricePerUnit, mrpPerUnit: priced.mrpPerUnit, totalPrice: priced.total, pricePending: undefined };
          }),
        })),

      markUnavailable: (cartItemId) =>
        set((state) => (state.unavailableIds.includes(cartItemId) ? state : { unavailableIds: [...state.unavailableIds, cartItemId] })),

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

      updateQuantity: (cartItemId, requested) =>
        set((state) => ({
          items: state.items.map((i) => {
            if (i.cartItemId !== cartItemId) return i;
            const quantity = clampQuantity(requested, i.config.minQuantity ?? 1, i.config.maxQuantity ?? null);
            const extra = i.config.turnaroundExtraCost ?? 0;
            const priced = i.config.rateTiers?.length
              ? priceForQuantity(i.config.rateTiers, quantity, i.config.optionMultiplier ?? 1, extra)
              : null;
            if (priced) {
              return {
                ...i,
                config: { ...i.config, quantity },
                pricePerUnit: priced.pricePerUnit,
                mrpPerUnit: priced.mrpPerUnit,
                totalPrice: priced.total,
                pricePending: undefined,
              };
            }
            // No rate card on this line (restored from the server or an older cart): never
            // show a total built from the old tier's rate; the next sync supplies the real one.
            return { ...i, config: { ...i.config, quantity }, pricePending: true };
          }),
        })),

      // Server sync/merge rebuilds items without addedAt; carry it over from the
      // matching local line (never invent one) so backend mismatch labelling works.
      setItems: (items) =>
        set((state) => {
          const known = new Map(state.items.map((i) => [i.cartItemId, i.addedAt]));
          const byId = new Map(state.items.map((i) => [i.cartItemId, i]));
          return {
            items: items.map((raw) => {
              const i = withoutCorrectionFlags(raw);
              const addedAt = i.addedAt ?? known.get(i.cartItemId);
              const local = byId.get(i.cartItemId);
              const withRates =
                local?.config.rateTiers && !i.config.rateTiers
                  ? { ...i, config: { ...i.config, rateTiers: local.config.rateTiers, optionMultiplier: local.config.optionMultiplier } }
                  : i;
              return addedAt ? { ...withRates, addedAt } : withRates;
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
              config: {
                ...local.config,
                quantity: fix.config.quantity,
                unitLabel: fix.config.unitLabel ?? local.config.unitLabel,
                minQuantity: fix.config.minQuantity ?? local.config.minQuantity,
                maxQuantity: fix.config.maxQuantity !== undefined ? fix.config.maxQuantity : local.config.maxQuantity,
              },
              pricePerUnit: fix.pricePerUnit,
              mrpPerUnit: fix.mrpPerUnit,
              totalPrice: fix.totalPrice,
            };
          }),
        }));
        return applied;
      },

      // Returns the same state object when nothing differs, so the sync effect
      // watching `items` does not re-trigger itself.
      applyServerLines: (lines) =>
        set((state) => {
          let changed = false;
          const items = state.items.map((local) => {
            const server = lines.find((l) => l.cartItemId === local.cartItemId);
            if (!server || server.config.quantity !== local.config.quantity) return local;
            const unitLabel = server.config.unitLabel ?? local.config.unitLabel;
            const minQuantity = server.config.minQuantity ?? local.config.minQuantity;
            const maxQuantity = server.config.maxQuantity !== undefined ? server.config.maxQuantity : local.config.maxQuantity;
            if (
              !local.pricePending &&
              local.pricePerUnit === server.pricePerUnit &&
              local.mrpPerUnit === server.mrpPerUnit &&
              local.totalPrice === server.totalPrice &&
              local.config.unitLabel === unitLabel &&
              local.config.minQuantity === minQuantity &&
              local.config.maxQuantity === maxQuantity
            ) {
              return local;
            }
            changed = true;
            return {
              ...local,
              config: { ...local.config, unitLabel, minQuantity, maxQuantity },
              pricePerUnit: server.pricePerUnit,
              mrpPerUnit: server.mrpPerUnit,
              totalPrice: server.totalPrice,
              pricePending: undefined,
            };
          });
          return changed ? { items } : state;
        }),

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
