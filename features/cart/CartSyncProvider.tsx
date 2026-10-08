"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/store";
import { useCartStore } from "./store";
import { getCart, syncCart } from "@/lib/api";
import { trackConnectivity } from "@/features/site-status/trackConnectivity";
import { correctionMessage } from "./corrections";
import { loadLineRates } from "./rateResolver";
import { cartSignature, revalidateAppliedCoupon } from "./couponRevalidation";
import type { CartItem } from "@/types";

// Local wins on conflict — guest's latest intent takes priority over an old server item
function mergeCartItems(local: CartItem[], server: CartItem[], removed: string[] = []): CartItem[] {
  const result = [...local];
  for (const serverItem of server) {
    if (removed.includes(serverItem.cartItemId)) continue;
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

const COUPON_DEBOUNCE_MS = 600;
const COUPON_RETRY_DELAYS_MS = [3000, 10000, 30000];

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
        const merged = mergeCartItems(localItems, serverItems, useCartStore.getState().pendingRemovals);
        const addedFromServer = merged.length > localItems.length;
        setItems(merged);
        const localIds = new Set(localItems.map((l) => l.cartItemId));
        toastCorrected(serverItems.filter((i) => i.quantityCorrected && !localIds.has(i.cartItemId)));
        announceCorrections(await trackConnectivity(syncCart(merged, token)));
        useCartStore.getState().clearPendingRemovals();

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
  const dirtyRef = useRef(false);

  const pushNow = useCallback((keepalive: boolean) => {
    const t    = tokenRef.current;
    const auth = useAuthStore.getState().isAuthenticated;
    dirtyRef.current = false;
    if (!auth || !t) return;
    void trackConnectivity(syncCart(useCartStore.getState().items, t, { keepalive }))
      .then((lines) => {
        useCartStore.getState().clearPendingRemovals();
        announceCorrections(lines);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!_isHydrated) return;

    dirtyRef.current = true;
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => pushNow(false), 500);

    return () => clearTimeout(syncTimerRef.current);
  }, [items, _isHydrated, pushNow]);

  // Leaving the page inside the debounce window must not lose the last edit
  // (a removed line would otherwise come back from the old server cart).
  useEffect(() => {
    function flush() {
      if (!dirtyRef.current) return;
      clearTimeout(syncTimerRef.current);
      pushNow(true);
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") flush();
    }
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pushNow]);

  // ── An applied coupon must keep matching the cart ─────────────────────────
  // Keyed on a signature of what the coupon depends on, so identity-only store updates neither re-arm
  // nor cancel the check; the last real change always gets exactly one run after it settles, and a run
  // that could not reach the server is retried with backoff.
  const signature = useCartStore(() => cartSignature());
  const hasCoupon = useCartStore((s) => Boolean(s.appliedCoupon));
  useEffect(() => {
    if (!_isHydrated || !hasCoupon) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = (attempt: number) => {
      timer = setTimeout(async () => {
        const result = await revalidateAppliedCoupon(tokenRef.current ?? undefined);
        if (!cancelled && result === "kept" && attempt < COUPON_RETRY_DELAYS_MS.length) run(attempt + 1);
      }, attempt === 0 ? COUPON_DEBOUNCE_MS : COUPON_RETRY_DELAYS_MS[attempt - 1]);
    };
    run(0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [signature, hasCoupon, _isHydrated]);

  return <>{children}</>;
}
