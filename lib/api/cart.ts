import type { CartItem } from "@/types";
import { apiFetch } from "./client";
import { makeCartItemId } from "@/features/cart/cartItemId";
import { normalizePack, isPack } from "@/lib/pack";

const BASE = "/cart";

// ─── Backend shape (camelCase per API spec) ───────────────────────────────────

export interface BackendCartItem {
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
  // Present on GET /cart responses once the backend supports MRP discounts;
  // the sync request never needs to send them (the server re-derives prices).
  mrpPerUnit?: number | null;
  discountPerUnit?: number | null;
  artworkFileKey: string | null;
  templateData: Record<string, string> | null;
  // Absent on a backend that predates pack selling. The server derives pack data;
  // these are never sent on sync.
  packSize?: number | null;
  unitLabel?: string | null;
  quantityCorrected?: boolean | null;
  originalQuantity?: number | null;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

export function mapCartItem(b: BackendCartItem): CartItem {
  const pack = normalizePack(b.packSize, b.unitLabel);
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
      thumbnailUrl: b.thumbnailUrl,
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
      // Backend doesn't send the flat surcharge separately — it's already baked
      // into totalPrice, so back it out here to keep client-side recompute
      // (e.g. updateQuantity) consistent with what the backend charged.
      turnaroundExtraCost: parseFloat((b.totalPrice - b.pricePerUnit * b.quantity).toFixed(2)),
      artworkFileKey: b.artworkFileKey ?? undefined,
      templateData: b.templateData ?? undefined,
      ...(isPack(pack.packSize) && { packSize: pack.packSize, unitLabel: pack.unitLabel }),
    },
    pricePerUnit: b.pricePerUnit,
    totalPrice: b.totalPrice,
    mrpPerUnit: b.mrpPerUnit ?? undefined,
    ...(b.quantityCorrected && { quantityCorrected: true, originalQuantity: b.originalQuantity ?? undefined }),
  };
}

function toSyncItem(item: CartItem): BackendCartItem {
  return {
    productId: item.product.id,
    productSlug: item.product.slug,
    productName: item.product.name,
    thumbnailUrl: item.product.thumbnailUrl ?? item.product.images[0] ?? null,
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

/** Resolves to the lines the server snapped to whole packs (empty when none). */
export async function syncCart(items: CartItem[], token: string): Promise<CartItem[]> {
  // REAL API: POST /api/v1/cart/sync — atomically replaces server cart
  const data = await apiFetch<BackendCartItem[] | null>(`${BASE}/sync`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ items: items.map(toSyncItem) }),
  });
  return Array.isArray(data) ? data.filter((b) => b.quantityCorrected).map(mapCartItem) : [];
}
