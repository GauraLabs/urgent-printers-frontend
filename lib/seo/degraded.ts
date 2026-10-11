import { unstable_cache } from "next/cache";
import { logApiError } from "@/lib/api/logApiError";

export const DEGRADED_REVALIDATE_SECONDS = 60;

/**
 * Throwing from an ISR route during background revalidation keeps the previous good
 * version cached. Only when there is no previous version (next build) or in dev do we
 * render the fallback, and then with a short revalidate so it is replaced quickly.
 */
function canRenderFallback(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build" || process.env.NODE_ENV !== "production";
}

// Segment `revalidate` is static, but unstable_cache lowers the current render's
// revalidate to its own when shorter (prerender-legacy work unit), which is the only
// way to shorten a single render's lifetime without cacheComponents.
async function shortenRouteRevalidate(seconds: number): Promise<void> {
  try {
    await unstable_cache(async () => true, ["seo-degraded-fallback"], { revalidate: seconds })();
  } catch (err) {
    logApiError("shortenRouteRevalidate", err);
  }
}

export async function withDegradedFallback<T>(
  context: string,
  build: () => Promise<T>,
  fallback: () => T,
): Promise<T> {
  try {
    return await build();
  } catch (err) {
    logApiError(context, err);
    if (!canRenderFallback()) throw err;
    await shortenRouteRevalidate(DEGRADED_REVALIDATE_SECONDS);
    return fallback();
  }
}
