import type { Category } from "@/types";
import { mockCategories } from "@/lib/mock-data";
import { delay } from "./delay";

// ─── Real API: replace the body of each function with a fetch() call ─────────

export async function getCategories(): Promise<Category[]> {
  // REAL API: return fetch('/api/categories').then(r => r.json())
  await delay(300);
  return mockCategories;
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  // REAL API: return fetch(`/api/categories/${slug}`).then(r => r.json())
  await delay(200);
  return mockCategories.find((c) => c.slug === slug) ?? null;
}
