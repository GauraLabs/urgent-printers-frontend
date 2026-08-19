import { apiFetch } from "./client";
import { logApiError } from "./logApiError";

// ─── API functions ────────────────────────────────────────────────────────────

export async function getPopularSearches(): Promise<string[]> {
  // REAL API: GET /api/v1/search/popular — Redis-cached, precomputed by a beat task
  if (!process.env.NEXT_PUBLIC_API_URL) {
    return [];
  }
  try {
    return await apiFetch<string[]>("/search/popular", {
      next: { revalidate: 300, tags: ["popular-searches"] },
    });
  } catch (err) {
    logApiError("getPopularSearches", err);
    return [];
  }
}
