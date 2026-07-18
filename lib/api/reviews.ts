import type { Review, ReviewStatus } from "@/types";
import { apiFetch, apiFetchPage } from "./client";

// ─── Backend shape (snake_case — reviews are not alias_generator=to_camel) ────

interface BackendReview {
  id: number;
  product_id: number;
  rating: number;
  title: string | null;
  body: string | null;
  images: unknown[] | null;
  is_verified_purchase: boolean;
  helpful_count: number;
  status: string;
  reviewer_name: string;
  admin_reply: string | null;
  admin_reply_at: string | null;
  created_at: string | null;
}

function mapReview(b: BackendReview): Review {
  return {
    id: String(b.id),
    productId: String(b.product_id),
    reviewerName: b.reviewer_name,
    rating: b.rating,
    title: b.title ?? "",
    body: b.body ?? "",
    isVerifiedPurchase: b.is_verified_purchase,
    helpfulCount: b.helpful_count,
    status: b.status as ReviewStatus,
    createdAt: b.created_at ?? "",
  };
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function getReviewsByProduct(productSlug: string): Promise<Review[]> {
  // REAL API: GET /api/v1/products/{slug}/reviews
  // Server-filtered to approved-only — pending/rejected reviews never appear here.
  try {
    const res = await apiFetchPage<BackendReview>(`/products/${productSlug}/reviews`);
    return res.data.map(mapReview);
  } catch (err) {
    console.error(`Failed to fetch reviews for product "${productSlug}"`, err);
    return [];
  }
}

export interface SubmitReviewPayload {
  orderId: string;
  rating: number;
  title: string;
  body: string;
}

export async function submitReview(
  productSlug: string,
  payload: SubmitReviewPayload,
  token: string
): Promise<Review> {
  // REAL API: POST /api/v1/products/{slug}/reviews
  // Throws ApiError (see ./client) — callers branch on .status:
  //   404 order not found / doesn't contain this product
  //   403 order not owned by caller
  //   409 order not yet delivered, OR customer already reviewed this product
  //   422 validation
  const res = await apiFetch<BackendReview>(`/products/${productSlug}/reviews`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      order_id: Number(payload.orderId),
      rating: payload.rating,
      title: payload.title,
      body: payload.body,
    }),
  });
  return mapReview(res);
}
