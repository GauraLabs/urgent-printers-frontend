"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/store";
import { useCartStore } from "./store";
import { getCart, syncCart } from "@/lib/api";
import { trackConnectivity } from "@/features/site-status/trackConnectivity";
import { correctionMessage } from "./corrections";
import { loadLineRates } from "./rateResolver";
import type { CartItem } from "@/types";

// Local wins on conflict — guest's latest intent takes priority over an old server item
function mergeCartItems(local: CartItem[], server: CartItem[]): CartItem[] {
  const result = [...local];
  for (const serverItem of server) {
    if (!local.some((l) => l.cartItemId === serverItem.cartItemId)) {
      result.push(serverItem);
    }
  }
  return result;
}

function toastCorrected(lines: CartItem[]): void {
  const message = correctionMessage(lines);
  if (message) toast(message);
}

// Server sync clamped these lines into their allowed range; mirror that locally
// and tell the customer once.
function announceCorrections(serverLines: CartItem[]): void {
  const store = useCartStore.getState();
  toastCorrected(store.applyQuantityCorrections(serverLines.filter((l) => l.quantityCorrected)));
  store.applyServerLines(serverLines);
}

export function CartSyncProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token           = useAuthStore((s) => s.token);
  const _isHydrated     = useAuthStore((s) => s._isHydrated);
  const items           = useCartStore((s) => s.items);
  const setItems        = useCartStore((s) => s.setItems);

  // Ref to always have the latest token without including it in item-sync deps
  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  // Track whether we've done the login merge this session (reset on logout)
  const mergedRef = useRef(false);

  // ── Login merge: fires once per session when both isAuthenticated + token are ready ──
  useEffect(() => {
    if (!_isHydrated) return;

    if (!isAuthenticated || !token) {
      mergedRef.current = false; // reset on logout so next login re-merges
      return;
    }

    if (mergedRef.current) return; // already ran this session
    mergedRef.current = true;

    void (async () => {
      try {
        const serverItems = await trackConnectivity(getCart(token));
        const localItems  = useCartStore.getState().items;

        if (serverItems.length === 0) {
          // Nothing on server — push local cart up (handles first login + page refresh)
          if (localItems.length > 0) announceCorrections(await trackConnectivity(syncCart(localItems, token)));
          return;
        }

        if (localItems.length === 0) {
          // Nothing local — restore from server (e.g. different device)
          setItems(serverItems);
          toastCorrected(serverItems.filter((i) => i.quantityCorrected));
          return;
        }

        // Both have items — merge, then sync result back
        const merged = mergeCartItems(localItems, serverItems);
        const addedFromServer = merged.length > localItems.length;
        setItems(merged);
        const localIds = new Set(localItems.map((l) => l.cartItemId));
        toastCorrected(serverItems.filter((i) => i.quantityCorrected && !localIds.has(i.cartItemId)));
        announceCorrections(await trackConnectivity(syncCart(merged, token)));

        if (addedFromServer) {
          toast.success("Cart updated", {
            description: "We added your saved items from another session.",
          });
        }
      } catch {
        // Silent — cart sync is non-critical; user can still shop
      }
    })();
  }, [isAuthenticated, token, _isHydrated, setItems]);

  // ── Lines without a rate card (older carts, restored from the server): learn it from the product ──
  const attemptedRef = useRef(new Set<string>());
  useEffect(() => {
    if (!_isHydrated) return;
    for (const line of items) {
      if (line.config.rateTiers?.length || attemptedRef.current.has(line.cartItemId)) continue;
      attemptedRef.current.add(line.cartItemId);
      void loadLineRates(line.cartItemId);
    }
  }, [items, _isHydrated]);

  // ── Debounced sync after every cart mutation ──────────────────────────────
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!_isHydrated) return;

    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      const t    = tokenRef.current;
      const auth = useAuthStore.getState().isAuthenticated;
      if (!auth || !t) return;
      void trackConnectivity(syncCart(useCartStore.getState().items, t)).then(announceCorrections).catch(() => {});
    }, 500);

    return () => clearTimeout(syncTimerRef.current);
  // tokenRef is a ref — intentionally excluded so token changes don't re-trigger
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, _isHydrated]);

  return <>{children}</>;
}
