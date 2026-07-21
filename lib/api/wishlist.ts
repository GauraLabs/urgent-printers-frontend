import type { WishlistItem } from "@/features/wishlist/store";
import { apiFetch } from "./client";

const BASE = "/saved-items";

// ─── Backend shape (camelCase per API spec) ───────────────────────────────────

interface BackendWishlistItem {
  productId: string;
  productSlug: string;
  productName: string;
  productImage: string | null;
  addedAt: string;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapWishlistItem(b: BackendWishlistItem): WishlistItem {
  return {
    productId: b.productId,
    productSlug: b.productSlug,
    productName: b.productName,
    productImage: b.productImage ?? "",
    addedAt: b.addedAt,
  };
}

interface SyncSavedItem {
  productId: number;
}

function toSyncItem(item: WishlistItem): SyncSavedItem {
  return {
    productId: Number(item.productId),
  };
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function getSavedItems(token: string): Promise<WishlistItem[]> {
  // REAL API: GET /api/v1/saved-items
  const data = await apiFetch<BackendWishlistItem[]>(BASE, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.map(mapWishlistItem);
}

export async function syncSavedItems(items: WishlistItem[], token: string): Promise<void> {
  // REAL API: POST /api/v1/saved-items/sync — atomically replaces server wishlist.
  // Backend derives productSlug/productName/productImage live; only productId is sent.
  await apiFetch<BackendWishlistItem[]>(`${BASE}/sync`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ items: items.map(toSyncItem) }),
  });
}
