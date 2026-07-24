"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/features/auth/store";
import { useWishlistStore, type WishlistItem } from "./store";
import { getSavedItems, syncSavedItems } from "@/lib/api";

// Local wins on conflict — guest's latest intent takes priority over an old server item
function mergeWishlistItems(local: WishlistItem[], server: WishlistItem[]): WishlistItem[] {
  const result = [...local];
  for (const serverItem of server) {
    if (!local.some((l) => l.productId === serverItem.productId)) {
      result.push(serverItem);
    }
  }
  return result;
}

export function WishlistSyncProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token           = useAuthStore((s) => s.token);
  const _isHydrated     = useAuthStore((s) => s._isHydrated);
  const items           = useWishlistStore((s) => s.items);
  const setItems        = useWishlistStore((s) => s.setItems);

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
        const serverItems = await getSavedItems(token);
        const localItems  = useWishlistStore.getState().items;

        if (serverItems.length === 0) {
          // Nothing on server — push local wishlist up (handles first login + page refresh)
          if (localItems.length > 0) await syncSavedItems(localItems, token);
          return;
        }

        if (localItems.length === 0) {
          // Nothing local — restore from server (e.g. different device)
          setItems(serverItems);
          return;
        }

        // Both have items — merge, then sync result back
        const merged = mergeWishlistItems(localItems, serverItems);
        setItems(merged);
        await syncSavedItems(merged, token);
      } catch {
        // Silent — wishlist sync is non-critical; user can still shop
      }
    })();
  }, [isAuthenticated, token, _isHydrated, setItems]);

  // ── Debounced sync after every wishlist mutation ──────────────────────────
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!_isHydrated) return;

    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      const t    = tokenRef.current;
      const auth = useAuthStore.getState().isAuthenticated;
      if (!auth || !t) return;
      void syncSavedItems(useWishlistStore.getState().items, t).catch(() => {});
    }, 500);

    return () => clearTimeout(syncTimerRef.current);
  // tokenRef is a ref — intentionally excluded so token changes don't re-trigger
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, _isHydrated]);

  return <>{children}</>;
}
