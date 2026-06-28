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
  // Null means the product has no options in that category — not an error.
  sizeId: string | null;
  sizeLabel: string | null;
  paperId: string | null;
  paperLabel: string | null;
  finishId: string | null;
  finishLabel: string | null;
  sides: string | null;
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
    b.productId, b.sizeId ?? "", b.paperId ?? "", b.finishId ?? "", b.sides ?? "", b.turnaroundId,
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
      sizeId: b.sizeId ?? undefined,
      sizeLabel: b.sizeLabel ?? undefined,
      paperId: b.paperId ?? undefined,
      paperLabel: b.paperLabel ?? undefined,
      finishId: b.finishId ?? undefined,
      finishLabel: b.finishLabel ?? undefined,
      sides: b.sides ?? undefined,
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
    sizeId: item.config.sizeId ?? null,
    sizeLabel: item.config.sizeLabel ?? null,
    paperId: item.config.paperId ?? null,
    paperLabel: item.config.paperLabel ?? null,
    finishId: item.config.finishId ?? null,
    finishLabel: item.config.finishLabel ?? null,
    sides: item.config.sides ?? null,
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
