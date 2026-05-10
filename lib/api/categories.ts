import type { Category } from "@/types";
import { mockCategories } from "@/lib/mock-data";
import { delay } from "./delay";
import { apiFetch } from "./client";

// ─── Backend shape ────────────────────────────────────────────────────────────

interface BackendCategory {
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
  banner_url: string | null;
}

function mapCategory(c: BackendCategory): Category {
  return {
    id: String(c.id),
    slug: c.slug,
    name: c.name,
    description: c.description ?? "",
    // Fall back to a seeded picsum image when no thumbnail has been uploaded yet
    imageUrl: c.thumbnail_url ?? `https://picsum.photos/seed/${c.slug}/600/400`,
    productCount: c.product_count,
    thumbnailUrl: c.thumbnail_url,
    bannerUrl: c.banner_url,
    iconName: c.icon_name,
    metaTitle: c.meta_title,
    metaDescription: c.meta_description,
    isActive: c.is_active,
    parentId: c.parent_id,
    sortOrder: c.sort_order,
  };
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  // REAL API: GET /api/v1/categories
  if (!process.env.NEXT_PUBLIC_API_URL) {
    await delay(300);
    return mockCategories;
  }
  try {
    const data = await apiFetch<BackendCategory[]>("/api/v1/categories");
    return data.map(mapCategory);
  } catch {
    return mockCategories;
  }
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  // REAL API: GET /api/v1/categories/{slug}
  if (!process.env.NEXT_PUBLIC_API_URL) {
    await delay(200);
    return mockCategories.find((c) => c.slug === slug) ?? null;
  }
  try {
    const data = await apiFetch<BackendCategory>(`/api/v1/categories/${slug}`);
    return mapCategory(data);
  } catch {
    return null;
  }
}
