import type { Product, PaginatedResponse, ProductFilters } from "@/types";
import { mockProducts } from "@/lib/mock-data";
import { delay } from "./delay";

// ─── Real API: replace the body of each function with a fetch() call ─────────

export async function getProducts(
  filters: ProductFilters = {}
): Promise<PaginatedResponse<Product>> {
  // REAL API: return fetch(`/api/products?${new URLSearchParams(filters as Record<string, string>)}`).then(r => r.json())
  await delay(500);

  let results = [...mockProducts];

  if (filters.categorySlug) {
    results = results.filter((p) => p.categorySlug === filters.categorySlug);
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  if (filters.tags && filters.tags.length > 0) {
    results = results.filter((p) =>
      filters.tags!.some((t) => p.tags.includes(t))
    );
  }

  if (filters.minPrice !== undefined) {
    results = results.filter(
      (p) => p.pricingTiers[0].pricePerUnit >= filters.minPrice!
    );
  }

  if (filters.maxPrice !== undefined) {
    results = results.filter(
      (p) => p.pricingTiers[0].pricePerUnit <= filters.maxPrice!
    );
  }

  switch (filters.sort) {
    case "price-asc":
      results.sort(
        (a, b) => a.pricingTiers[0].pricePerUnit - b.pricingTiers[0].pricePerUnit
      );
      break;
    case "price-desc":
      results.sort(
        (a, b) => b.pricingTiers[0].pricePerUnit - a.pricingTiers[0].pricePerUnit
      );
      break;
    case "rating":
      results.sort((a, b) => b.averageRating - a.averageRating);
      break;
    case "popular":
      results.sort((a, b) => b.reviewCount - a.reviewCount);
      break;
    default:
      break;
  }

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 12;
  const total = results.length;
  const totalPages = Math.ceil(total / pageSize);
  const data = results.slice((page - 1) * pageSize, page * pageSize);

  return { data, total, page, pageSize, totalPages };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  // REAL API: return fetch(`/api/products/${slug}`).then(r => r.json())
  await delay(400);
  return mockProducts.find((p) => p.slug === slug) ?? null;
}

export async function getFeaturedProducts(): Promise<Product[]> {
  // REAL API: return fetch('/api/products?featured=true').then(r => r.json())
  await delay(400);
  return mockProducts.filter((p) => p.isFeatured);
}

export async function getRelatedProducts(
  productId: string,
  categorySlug: string,
  limit = 4
): Promise<Product[]> {
  // REAL API: return fetch(`/api/products/${productId}/related`).then(r => r.json())
  await delay(300);
  return mockProducts
    .filter((p) => p.categorySlug === categorySlug && p.id !== productId)
    .slice(0, limit);
}

export async function searchProducts(query: string): Promise<Product[]> {
  // REAL API: return fetch(`/api/products/search?q=${encodeURIComponent(query)}`).then(r => r.json())
  await delay(300);
  const q = query.toLowerCase();
  return mockProducts
    .filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    )
    .slice(0, 8);
}
