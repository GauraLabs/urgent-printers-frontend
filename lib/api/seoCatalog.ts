import type { Category, Product } from "@/types";
import { mockCategories, mockProducts } from "@/lib/mock-data";
import { API_URL, ApiError, type BackendPage } from "./client";
import {
  flattenCategoryTree,
  mapCategory,
  type BackendCategoryWithChildren,
} from "./categories";
import { mapCard, type BackendProductCard } from "./products";

// Strict (non-swallowing) catalog reads for routes that are ISR-cached for a long time
// (sitemap.xml, llms.txt). Any failure throws so Next keeps serving the previous good
// version instead of caching a degraded one. getCategories/getProducts stay swallowing.

export class CatalogUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "CatalogUnavailableError";
  }
}

export const SEO_PRODUCTS_PAGE_SIZE = 100;
export const SEO_PRODUCTS_MAX_PAGES = 50;
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 500;
export const DEFAULT_RETRY_BUDGET_MS = 4000;

// The sitemap/llms routes are ISR-cached (revalidate = 300). Their catalog reads also went
// through the Next data cache with the same 300s lifetime, and in production the sitemap
// regenerated every ~5 min while still serving a catalog from before the
// wedding-petal-cones category existed: a regeneration landing on a just-expired data-cache
// entry is handed that stale entry (stale-while-revalidate) and nothing guarantees the
// background refresh lands. `cache: "no-store"` is not an option: it turns the routes
// dynamic and, at `next build`, throws into the degraded fallback. So each regeneration
// reads under a fresh cache key instead (see freshnessParam): a guaranteed miss, still static.
export const SEO_FETCH_INIT: RequestInit = { next: { revalidate: 300 } };
export const FRESHNESS_BUCKET_MS = 300_000;

/** Distinct for every ISR regeneration (they are >= 300s apart); the backend ignores the parameter. */
export function freshnessParam(now: number = Date.now()): string {
  return `_r=${Math.floor(now / FRESHNESS_BUCKET_MS)}`;
}

export interface RetryBudget {
  remainingMs: number;
  sleep: (ms: number) => Promise<void>;
}

export function createRetryBudget(
  totalMs: number = DEFAULT_RETRY_BUDGET_MS,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): RetryBudget {
  return { remainingMs: totalMs, sleep };
}

/** Retry-After is either delta-seconds or an HTTP-date (RFC 9110 §10.2.3). */
export function parseRetryAfterMs(header: string | null, now: number = Date.now()): number | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;
  const at = Date.parse(trimmed);
  return Number.isNaN(at) ? null : Math.max(0, at - now);
}

async function fetchJsonStrict<T>(path: string, init: RequestInit, budget: RetryBudget): Promise<T> {
  const url = `${API_URL}${path}`;
  for (let attempt = 1; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { ...init, headers: { Accept: "application/json", ...init.headers } });
    } catch (err) {
      throw new CatalogUnavailableError(`network error: GET ${path}`, { cause: err });
    }
    if (res.ok) {
      try {
        return (await res.json()) as T;
      } catch (err) {
        throw new CatalogUnavailableError(`invalid JSON: GET ${path}`, { cause: err });
      }
    }
    if (res.status === 429 && attempt < MAX_ATTEMPTS) {
      const wait = parseRetryAfterMs(res.headers.get("Retry-After")) ?? BASE_BACKOFF_MS * 2 ** (attempt - 1);
      if (wait <= budget.remainingMs) {
        budget.remainingMs -= wait;
        await budget.sleep(wait);
        continue;
      }
    }
    throw new CatalogUnavailableError(`GET ${path} returned ${res.status}`, {
      cause: new ApiError(`API ${res.status}: ${path}`, res.status),
    });
  }
}

export async function getCategoriesStrict(budget: RetryBudget = createRetryBudget()): Promise<Category[]> {
  // REAL API: GET /api/v1/categories
  if (!process.env.NEXT_PUBLIC_API_URL) return mockCategories;
  const body = await fetchJsonStrict<{ data?: BackendCategoryWithChildren[] }>(
    `/categories?include_children=true&${freshnessParam()}`,
    SEO_FETCH_INIT,
    budget,
  );
  if (!Array.isArray(body.data)) throw new CatalogUnavailableError("categories response has no data array");
  return flattenCategoryTree(body.data).map(mapCategory);
}

export async function getAllProductsStrict(budget: RetryBudget = createRetryBudget()): Promise<Product[]> {
  // REAL API: GET /api/v1/products (paged)
  if (!process.env.NEXT_PUBLIC_API_URL) return mockProducts;
  const all: Product[] = [];
  for (let page = 1; page <= SEO_PRODUCTS_MAX_PAGES; page++) {
    const body = await fetchJsonStrict<Partial<BackendPage<BackendProductCard>>>(
      `/products?page=${page}&page_size=${SEO_PRODUCTS_PAGE_SIZE}&${freshnessParam()}`,
      SEO_FETCH_INIT,
      budget,
    );
    if (!Array.isArray(body.data) || !body.meta) {
      throw new CatalogUnavailableError(`products page ${page} response is malformed`);
    }
    all.push(...body.data.map(mapCard));
    if (page >= body.meta.total_pages) break;
  }
  return all;
}

/** Categories are the only cross-check available: they report how many products exist. */
export function assertCatalogConsistent(categories: Category[], products: Product[] | null): void {
  if (categories.length === 0) throw new CatalogUnavailableError("categories list is empty");
  if (!products) return;
  if (products.length === 0 && categories.some((c) => c.productCount > 0)) {
    throw new CatalogUnavailableError("product listing is empty while categories report products");
  }
  // A category that reports products but has none in the listing means the two reads came
  // from different snapshots (the stale-sitemap failure mode): refuse to publish that.
  const listed = new Set(products.map((p) => p.categorySlug));
  const parents = new Set(categories.map((c) => c.parentId).filter((id): id is string => id != null));
  const missing = categories.filter((c) => {
    if (c.isActive === false || listed.has(c.slug)) return false;
    // Parents may hold products only through children, so without the direct count they are skipped.
    if (c.directProductCount != null) return c.directProductCount > 0;
    return !parents.has(c.id) && c.productCount > 0;
  });
  if (missing.length > 0) {
    throw new CatalogUnavailableError(
      `categories report products but the listing has none for: ${missing.map((c) => c.slug).join(", ")}`,
    );
  }
}

export async function getSeoCatalog(
  budget: RetryBudget = createRetryBudget(),
): Promise<{ categories: Category[]; products: Product[] }> {
  // Sequential, not parallel: the backend rate-limits per IP and the sitemap already fans out.
  const categories = await getCategoriesStrict(budget);
  const products = await getAllProductsStrict(budget);
  assertCatalogConsistent(categories, products);
  return { categories, products };
}
