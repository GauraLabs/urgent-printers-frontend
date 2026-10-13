import type { Category, CategoryRef } from "@/types";
import { mockCategories } from "@/lib/mock-data";
import { delay } from "./delay";
import { apiFetch } from "./client";
import { logApiError } from "./logApiError";

// ─── Backend shape ────────────────────────────────────────────────────────────

export interface BackendCategoryRef {
  id: number;
  name: string;
  slug: string;
}

export interface BackendCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon_name: string | null;
  meta_title: string | null;
  meta_description: string | null;
  is_active: boolean;
  parent_id: number | null;
  sort_order: number;
  product_count: number;
  thumbnail_url: string | null;
  medium_url: string | null;
  banner_url: string | null;
  video_url: string | null;
  video_thumbnail_url: string | null;
  // Added with subcategories/SEO; absent on an older backend or stale cache.
  ancestors?: BackendCategoryRef[] | null;
  path?: string | null;
  direct_product_count?: number | null;
  seo_intro?: string | null;
  seo_body?: string | null;
  faqs?: { question: string; answer: string }[] | null;
  google_product_category?: string | number | null;
  noindex?: boolean;
}

export function mapCategoryRefs(refs: BackendCategoryRef[] | null | undefined): CategoryRef[] | null {
  return refs ? refs.map((r) => ({ id: String(r.id), name: r.name, slug: r.slug })) : null;
}

function textOrNull(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

function mapFaqs(raw: unknown): { question: string; answer: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((f: unknown) => {
    if (!f || typeof f !== "object") return [];
    const { question, answer } = f as { question?: unknown; answer?: unknown };
    return [{ question: textOrNull(question) ?? "", answer: textOrNull(answer) ?? "" }];
  });
}

export function mapCategory(c: BackendCategory): Category {
  return {
    id: String(c.id),
    slug: c.slug,
    name: c.name,
    description: c.description ?? "",
    // null (never a stock photo) when nothing was uploaded; consumers render a letter tile.
    imageUrl: c.thumbnail_url ?? null,
    productCount: c.product_count,
    thumbnailUrl: c.thumbnail_url,
    // 800px, aspect-preserving — sized for the home category grid tiles (thumbnail_url is a
    // 300x300 hard crop that blurs when stretched to fill ~475px+ tiles)
    mediumUrl: c.medium_url ?? c.banner_url ?? null,
    bannerUrl: c.banner_url,
    // Optional on the backend response (absent from stale cached Redis dicts) — coalesce defensively
    videoUrl: c.video_url ?? null,
    videoThumbnailUrl: c.video_thumbnail_url ?? null,
    iconName: c.icon_name,
    metaTitle: c.meta_title,
    metaDescription: c.meta_description,
    isActive: c.is_active,
    parentId: c.parent_id == null ? null : String(c.parent_id),
    sortOrder: c.sort_order,
    ancestors: mapCategoryRefs(c.ancestors),
    path: c.path ?? null,
    directProductCount: c.direct_product_count ?? null,
    seoIntro: textOrNull(c.seo_intro),
    seoBody: textOrNull(c.seo_body),
    faqs: mapFaqs(c.faqs),
    googleProductCategory: textOrNull(c.google_product_category),
    noindex: c.noindex ?? false,
  };
}

export interface BackendCategoryWithChildren extends BackendCategory {
  children?: BackendCategory[] | null;
}

/** GET /categories returns top-level rows only; subcategories arrive nested under `children` (backend max depth is 2). */
export function flattenCategoryTree(rows: BackendCategoryWithChildren[]): BackendCategory[] {
  const out: BackendCategory[] = [];
  const seen = new Set<number>();
  for (const { children, ...top } of rows) {
    if (!seen.has(top.id)) {
      seen.add(top.id);
      out.push(top);
    }
    for (const child of children ?? []) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      out.push(child);
    }
  }
  return out;
}

export const CATEGORIES_CACHE_TAG = "categories";

// ─── API functions ────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  // REAL API: GET /api/v1/categories
  if (!process.env.NEXT_PUBLIC_API_URL) {
    await delay(300);
    return mockCategories;
  }
  try {
    // The root-layout Header calls this on every page, so it must be cached; the tag
    // lets /api/revalidate/products bust it when a catalog change moves product counts.
    const data = await apiFetch<BackendCategoryWithChildren[]>("/categories?include_children=true", {
      next: { revalidate: 300, tags: [CATEGORIES_CACHE_TAG] },
    });
    return flattenCategoryTree(data).map(mapCategory);
  } catch (err) {
    logApiError("getCategories", err);
    return [];
  }
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  // REAL API: GET /api/v1/categories/{slug}
  if (!process.env.NEXT_PUBLIC_API_URL) {
    await delay(200);
    return mockCategories.find((c) => c.slug === slug) ?? null;
  }
  try {
    const data = await apiFetch<BackendCategory>(`/categories/${slug}`);
    return mapCategory(data);
  } catch (err) {
    logApiError(`getCategoryBySlug(${slug})`, err);
    return null;
  }
}
