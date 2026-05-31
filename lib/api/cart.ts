import type { CartItem } from "@/types";
import { apiFetch } from "./client";
import { makeCartItemId } from "@/features/cart/cartItemId";

const BASE = "/cart";

// ─── Backend shape (camelCase per API spec) ───────────────────────────────────

interface BackendCartItem {
  productId: string;
  productSlug: string;
  productName: string;
  thumbnailUrl: string | null;   // stored on sync, returned on GET — preserves image across devices
  categoryName: string | null;
  categorySlug: string | null;
  sizeId: string;
  sizeLabel: string;
  paperId: string;
  paperLabel: string;
  finishId: string;
  finishLabel: string;
  sides: string;
  quantity: number;
  turnaroundId: string;
  turnaroundLabel: string;
  pricePerUnit: number;
  totalPrice: number;
  artworkFileKey: string | null;
  templateData: Record<string, string> | null;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapCartItem(b: BackendCartItem): CartItem {
  const cartItemId = makeCartItemId(
    b.productId, b.sizeId, b.paperId, b.finishId, b.sides, b.turnaroundId,
    b.artworkFileKey ?? undefined, b.templateData ?? undefined
  );
  return {
    cartItemId,
    product: {
      id: b.productId,
      slug: b.productSlug,
      name: b.productName,
      images: b.thumbnailUrl ? [b.thumbnailUrl] : [],
      categoryName: b.categoryName ?? "",
      categorySlug: b.categorySlug ?? "",
    },
    config: {
      sizeId: b.sizeId,
      sizeLabel: b.sizeLabel,
      paperId: b.paperId,
      paperLabel: b.paperLabel,
      finishId: b.finishId,
      finishLabel: b.finishLabel,
      sides: b.sides,
      quantity: b.quantity,
      turnaroundId: b.turnaroundId,
      turnaroundLabel: b.turnaroundLabel,
      artworkFileKey: b.artworkFileKey ?? undefined,
      templateData: b.templateData ?? undefined,
    },
    pricePerUnit: b.pricePerUnit,
    totalPrice: b.totalPrice,
    addedAt: new Date().toISOString(),
  };
}

function toSyncItem(item: CartItem): BackendCartItem {
  return {
    productId: item.product.id,
    productSlug: item.product.slug,
    productName: item.product.name,
    thumbnailUrl: item.product.images[0] ?? null,
    categoryName: item.product.categoryName || null,
    categorySlug: item.product.categorySlug || null,
    sizeId: item.config.sizeId,
    sizeLabel: item.config.sizeLabel,
    paperId: item.config.paperId,
    paperLabel: item.config.paperLabel,
    finishId: item.config.finishId,
    finishLabel: item.config.finishLabel,
    sides: item.config.sides,
    quantity: item.config.quantity,
    turnaroundId: item.config.turnaroundId,
    turnaroundLabel: item.config.turnaroundLabel,
    pricePerUnit: item.pricePerUnit,
    totalPrice: item.totalPrice,
    artworkFileKey: item.config.artworkFileKey ?? null,
    templateData: item.config.templateData ?? null,
  };
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function getCart(token: string): Promise<CartItem[]> {
  // REAL API: GET /api/v1/cart
  const data = await apiFetch<BackendCartItem[]>(BASE, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.map(mapCartItem);
}

export async function syncCart(items: CartItem[], token: string): Promise<void> {
  // REAL API: POST /api/v1/cart/sync — atomically replaces server cart
  await apiFetch<BackendCartItem[]>(`${BASE}/sync`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ items: items.map(toSyncItem) }),
  });
}
