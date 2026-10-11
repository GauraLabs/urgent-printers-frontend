import type { Category, Product } from "@/types";
import { mockCategories, mockProducts } from "@/lib/mock-data";
import { API_URL, ApiError, type BackendPage } from "./client";
import {
  CATEGORIES_CACHE_TAG,
  flattenCategoryTree,
  mapCategory,
  type BackendCategoryWithChildren,
} from "./categories";
import { mapCard, PRODUCTS_CACHE_TAG, type BackendProductCard } from "./products";

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

// Explicit, so the entry is purgeable by tag; without it the fetch silently inherited the
// route's revalidate and could only be busted via the route's implicit path tags.
// Only 200s enter the data cache, so a failed page is never cached.
export const SEO_PRODUCTS_FETCH_INIT: RequestInit = {
  next: { revalidate: 300, tags: [PRODUCTS_CACHE_TAG] },
};

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
  // Same URL + cache options as getCategories so both share one data-cache entry.
  const body = await fetchJsonStrict<{ data?: BackendCategoryWithChildren[] }>(
    "/categories?include_children=true",
    { next: { revalidate: 300, tags: [CATEGORIES_CACHE_TAG] } },
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
      `/products?page=${page}&page_size=${SEO_PRODUCTS_PAGE_SIZE}`,
      SEO_PRODUCTS_FETCH_INIT,
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
  if (products && products.length === 0 && categories.some((c) => c.productCount > 0)) {
    throw new CatalogUnavailableError("product listing is empty while categories report products");
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
