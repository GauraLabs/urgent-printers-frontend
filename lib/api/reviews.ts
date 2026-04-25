import type { Review } from "@/types";
import { mockReviews } from "@/lib/mock-data";
import { delay } from "./delay";

// ─── Real API: replace the body of each function with a fetch() call ─────────

export async function getReviewsByProduct(productId: string): Promise<Review[]> {
  // REAL API: return fetch(`/api/products/${productId}/reviews`).then(r => r.json())
  await delay(400);
  return mockReviews.filter((r) => r.productId === productId);
}
