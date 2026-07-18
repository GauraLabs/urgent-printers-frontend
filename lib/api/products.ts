import type {
  Product,
  PaginatedResponse,
  ProductFilters,
  PrintSpec,
  SizeOption,
  SidesOption,
  CustomizationMode,
  TemplateField,
} from "@/types";
import { mockProducts } from "@/lib/mock-data";
import { slugify } from "@/lib/utils";
import { delay } from "./delay";
import { apiFetch, apiFetchPage } from "./client";
import { getCategories } from "./categories";

// ─── Backend shapes ───────────────────────────────────────────────────────────

interface BackendProductCard {
  id: number;
  name: string;
  slug: string;
  short_description: string | null;
  category_id: number | null;
  category_slug: string | null;
  category_name: string | null;
  badge: string;
  is_featured: boolean;
  tags: string[];
  thumbnail_url: string | null;
  price_from: number | null;
  rating: number;
  review_count: number;
}

interface BackendProductDetail extends BackendProductCard {
  description: string | null;
  images: { thumb: string; md: string; lg: string; original: string }[];
  video_url: string | null;
  video_thumbnail_url: string | null;
  sizes: { label: string; width: number; height: number; unit: string; is_active: boolean; price_multiplier: number; is_default: boolean }[];
  paper_types: { label: string; gsm: number | null; is_active: boolean; price_multiplier: number; is_default: boolean }[];
  finishes: { label: string; is_active: boolean; price_multiplier: number; is_default: boolean }[];
  sides_options: { label: string; price_multiplier: number; is_default: boolean }[];
  quantity_steps: number[];
  pricing_tiers: { quantity: number; price_per_unit: number; is_best_value: boolean }[];
  turnaround_options: { type: string; days: number; extra_cost: number; is_active: boolean }[];
  seo: { title: string | null; description: string | null; canonical_url: string | null };
  customization_mode: string;
  template_fields: {
    id: string;
    label: string;
    type: string;
    placeholder?: string;
    required: boolean;
    max_length?: number;
  }[];
  created_at: string | null;
}

// The dedicated /search endpoint is Typesense-backed and returns raw indexed
// documents, not the enriched ProductListResponse shape /products returns —
// no thumbnail_url, price_from, category_slug, or category_name. See
// mapSearchDoc() below for how that gap is bridged on the frontend.
interface BackendSearchDoc {
  id: string;
  name: string;
  description: string;
  short_description: string;
  category_id: number;
  slug: string;
  badge: string;
  is_featured: boolean;
  is_active: boolean;
  rating: number;
  review_count: number;
  tags: string[];
}

// ─── Default print spec (used for card-shape products that lack full specs) ───

const EMPTY_PRINT_SPEC: PrintSpec = {
  sizes: [],
  papers: [],
  finishes: [],
  sides: [],
  minDpi: 300,
  bleedMm: 3,
};

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapCard(c: BackendProductCard): Product {
  const imageUrl = c.thumbnail_url ?? `https://picsum.photos/seed/${c.slug}/600/400`;
  return {
    id: String(c.id),
    slug: c.slug,
    name: c.name,
    categoryId: String(c.category_id ?? ""),
    categorySlug: c.category_slug ?? "",
    categoryName: c.category_name ?? "",
    description: "",
    shortDescription: c.short_description ?? "",
    images: [imageUrl],
    printSpec: EMPTY_PRINT_SPEC,
    pricingTiers: [],
    turnaroundOptions: [],
    averageRating: c.rating,
    reviewCount: c.review_count,
    isFeatured: c.is_featured,
    tags: c.tags,
    badge: c.badge,
    priceFrom: c.price_from ?? undefined,
    customizationMode: "none" as CustomizationMode,
    templateFields: [],
  };
}

function mapDetail(d: BackendProductDetail): Product {
  const lgImages = d.images.map((i) => i.lg);
  const images =
    lgImages.length > 0
      ? lgImages
      : [`https://picsum.photos/seed/${d.slug}/800/600`];

  const sizes: SizeOption[] = d.sizes
    .filter((s) => s.is_active)
    .map((s) => ({
      id: slugify(s.label),
      label: s.label,
      width: s.width,
      height: s.height,
      unit: s.unit as SizeOption["unit"],
      priceMultiplier: s.price_multiplier,
      isDefault: s.is_default,
    }));

  const papers = d.paper_types
    .filter((p) => p.is_active)
    .map((p) => ({
      id: slugify(p.label),
      label: p.label,
      weight: p.gsm ? `${p.gsm}gsm` : "",
      description: p.label,
      priceMultiplier: p.price_multiplier,
      isDefault: p.is_default,
    }));

  const finishes = d.finishes
    .filter((f) => f.is_active)
    .map((f) => ({
      id: slugify(f.label),
      label: f.label,
      description: f.label,
      priceMultiplier: f.price_multiplier,
      isDefault: f.is_default,
    }));

  const sides: SidesOption[] = d.sides_options.map((s) => ({
    label: s.label,
    priceMultiplier: s.price_multiplier,
    isDefault: s.is_default,
  }));

  const printSpec: PrintSpec = { sizes, papers, finishes, sides, minDpi: 300, bleedMm: 3 };

  const pricingTiers = d.pricing_tiers.map((t) => ({
    quantity: t.quantity,
    pricePerUnit: t.price_per_unit,
    totalPrice: parseFloat((t.quantity * t.price_per_unit).toFixed(2)),
    isBestValue: t.is_best_value,
  }));

  const turnaroundOptions = d.turnaround_options
    .filter((t) => t.is_active)
    .map((t) => ({
      id: t.type,
      label: t.type.charAt(0).toUpperCase() + t.type.slice(1),
      businessDays: t.days,
      extraCost: t.extra_cost,
    }));

  return {
    id: String(d.id),
    slug: d.slug,
    name: d.name,
    categoryId: String(d.category_id ?? ""),
    categorySlug: d.category_slug ?? "",
    categoryName: d.category_name ?? "",
    description: d.description ?? "",
    shortDescription: d.short_description ?? "",
    images,
    printSpec,
    pricingTiers,
    turnaroundOptions,
    averageRating: d.rating,
    reviewCount: d.review_count,
    isFeatured: d.is_featured,
    tags: d.tags,
    badge: d.badge,
    priceFrom: d.price_from ?? undefined,
    customizationMode: (d.customization_mode ?? "none") as CustomizationMode,
    templateFields: (d.template_fields ?? []).map((f) => ({
      id: f.id,
      label: f.label,
      type: f.type as TemplateField["type"],
      placeholder: f.placeholder,
      required: f.required,
      maxLength: f.max_length,
    })),
  };
}

// Search results have no thumbnail/price from Typesense — fall back to a seeded
// placeholder image (matching the pattern used for categories with no thumbnail)
// and leave priceFrom undefined rather than fabricate a number.
function mapSearchDoc(
  d: BackendSearchDoc,
  categoryMap: Map<number, { slug: string; name: string }>
): Product {
  const category = categoryMap.get(d.category_id);
  return {
    id: d.id,
    slug: d.slug,
    name: d.name,
    categoryId: String(d.category_id ?? ""),
    categorySlug: category?.slug ?? "",
    categoryName: category?.name ?? "",
    description: d.description ?? "",
    shortDescription: d.short_description ?? "",
    images: [`https://picsum.photos/seed/${d.slug}/600/400`],
    printSpec: EMPTY_PRINT_SPEC,
    pricingTiers: [],
    turnaroundOptions: [],
    averageRating: d.rating,
    reviewCount: d.review_count,
    isFeatured: d.is_featured,
    tags: d.tags ?? [],
    badge: d.badge,
    priceFrom: undefined,
    customizationMode: "none" as CustomizationMode,
    templateFields: [],
  };
}

// ─── Sort map ─────────────────────────────────────────────────────────────────

const SORT_MAP: Record<NonNullable<ProductFilters["sort"]>, string> = {
  "price-asc": "price_asc",
  "price-desc": "price_desc",
  rating: "rating",
  newest: "newest",
  popular: "featured",
};

// ─── API functions ────────────────────────────────────────────────────────────

export async function getProducts(
  filters: ProductFilters = {}
): Promise<PaginatedResponse<Product>> {
  // REAL API: GET /products
  if (!process.env.NEXT_PUBLIC_API_URL) {
    await delay(500);
    let results = [...mockProducts];
    if (filters.categorySlug)
      results = results.filter((p) => p.categorySlug === filters.categorySlug);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    // Mirrors product_repository.py: a product matches if ANY tier clears the
    // min bound and (independently) ANY tier clears the max bound.
    if (filters.minPrice !== undefined) {
      const min = filters.minPrice;
      results = results.filter((p) => p.pricingTiers.some((t) => t.pricePerUnit >= min));
    }
    if (filters.maxPrice !== undefined) {
      const max = filters.maxPrice;
      results = results.filter((p) => p.pricingTiers.some((t) => t.pricePerUnit <= max));
    }
    // Mirrors product_repository.py: every selected tag must be present (AND, not OR).
    if (filters.tags?.length) {
      results = results.filter((p) => filters.tags!.every((tag) => p.tags.includes(tag)));
    }
    if (filters.badge) {
      results = results.filter((p) => p.badge === filters.badge);
    }
    switch (filters.sort) {
      case "rating":
        results.sort((a, b) => b.averageRating - a.averageRating);
        break;
      case "price-asc":
        results.sort((a, b) => (a.pricingTiers[0]?.pricePerUnit ?? a.priceFrom ?? 0) - (b.pricingTiers[0]?.pricePerUnit ?? b.priceFrom ?? 0));
        break;
      case "price-desc":
        results.sort((a, b) => (b.pricingTiers[0]?.pricePerUnit ?? b.priceFrom ?? 0) - (a.pricingTiers[0]?.pricePerUnit ?? a.priceFrom ?? 0));
        break;
      case "newest":
        // Mock data has no created_at; approximate "newest first" by reversing
        // catalog order (products are authored oldest-to-newest below).
        results.reverse();
        break;
      case "popular":
      case undefined:
        results.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
        break;
    }
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 12;
    return {
      data: results.slice((page - 1) * pageSize, page * pageSize),
      total: results.length,
      page,
      pageSize,
      totalPages: Math.ceil(results.length / pageSize),
    };
  }

  try {
    const params = new URLSearchParams();
    if (filters.categorySlug) params.set("category_slug", filters.categorySlug);
    if (filters.minPrice !== undefined) params.set("min_price", String(filters.minPrice));
    if (filters.maxPrice !== undefined) params.set("max_price", String(filters.maxPrice));
    if (filters.tags?.length) params.set("tags", filters.tags.join(","));
    if (filters.badge) params.set("badge", filters.badge);
    if (filters.sort) params.set("sort_by", SORT_MAP[filters.sort]);
    params.set("page", String(filters.page ?? 1));
    params.set("page_size", String(filters.pageSize ?? 12));

    const res = await apiFetchPage<BackendProductCard>(`/products?${params}`);
    return {
      data: res.data.map(mapCard),
      total: res.meta.total,
      page: res.meta.page,
      pageSize: res.meta.page_size,
      totalPages: res.meta.total_pages,
    };
  } catch {
    return { data: [], total: 0, page: 1, pageSize: 12, totalPages: 0 };
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  // REAL API: GET /products/{slug}
  if (!process.env.NEXT_PUBLIC_API_URL) {
    await delay(400);
    return mockProducts.find((p) => p.slug === slug) ?? null;
  }
  try {
    const data = await apiFetch<BackendProductDetail>(`/products/${slug}`);
    return mapDetail(data);
  } catch {
    return null;
  }
}

export async function getFeaturedProducts(): Promise<Product[]> {
  // REAL API: GET /products/featured
  if (!process.env.NEXT_PUBLIC_API_URL) {
    await delay(400);
    return mockProducts.filter((p) => p.isFeatured);
  }
  try {
    const data = await apiFetch<BackendProductCard[]>("/products/featured?limit=8");
    return data.map(mapCard);
  } catch {
    return [];
  }
}

export async function getRelatedProducts(
  productId: string,
  categorySlug: string,
  limit = 4
): Promise<Product[]> {
  // REAL API: GET /products?category_slug=X&page_size=5 then exclude current
  if (!process.env.NEXT_PUBLIC_API_URL) {
    await delay(300);
    return mockProducts
      .filter((p) => p.categorySlug === categorySlug && p.id !== productId)
      .slice(0, limit);
  }
  try {
    const params = new URLSearchParams({ category_slug: categorySlug, page_size: "8" });
    const res = await apiFetchPage<BackendProductCard>(`/products?${params}`);
    return res.data
      .map(mapCard)
      .filter((p) => p.id !== productId)
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function getRecommendedProducts(
  excludeIds: string[] = [],
  limit = 10
): Promise<Product[]> {
  // REAL API: GET /products/recommended?limit=X
  if (!process.env.NEXT_PUBLIC_API_URL) {
    await delay(300);
    return mockProducts.filter((p) => !excludeIds.includes(p.id)).slice(0, limit);
  }
  try {
    const data = await apiFetch<BackendProductCard[]>(`/products/recommended?limit=${limit}`);
    return data.map(mapCard).filter((p) => !excludeIds.includes(p.id));
  } catch {
    return [];
  }
}

// /products has no search/query param — the real search endpoint is the
// dedicated Typesense-backed /search route (see
// urgent-printers-backend/app/api/v1/routes/search.py). Its category map is
// cached briefly since instant-search fires one call per debounced keystroke.
let categoryMapCache: { map: Map<number, { slug: string; name: string }>; expiresAt: number } | null = null;
const CATEGORY_MAP_TTL_MS = 5 * 60 * 1000;

async function getCategoryMap(): Promise<Map<number, { slug: string; name: string }>> {
  if (categoryMapCache && categoryMapCache.expiresAt > Date.now()) {
    return categoryMapCache.map;
  }
  const categories = await getCategories();
  const map = new Map(categories.map((c) => [Number(c.id), { slug: c.slug, name: c.name }]));
  categoryMapCache = { map, expiresAt: Date.now() + CATEGORY_MAP_TTL_MS };
  return map;
}

async function runSearch(
  query: string,
  page: number,
  pageSize: number
): Promise<PaginatedResponse<Product>> {
  if (!process.env.NEXT_PUBLIC_API_URL) {
    await delay(300);
    const q = query.toLowerCase();
    const matches = mockProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
    return {
      data: matches.slice((page - 1) * pageSize, page * pageSize),
      total: matches.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(matches.length / pageSize)),
    };
  }

  try {
    const params = new URLSearchParams({
      q: query,
      page: String(page),
      page_size: String(pageSize),
    });
    const [res, categoryMap] = await Promise.all([
      apiFetchPage<BackendSearchDoc>(`/search?${params}`),
      getCategoryMap(),
    ]);
    return {
      data: res.data.map((d) => mapSearchDoc(d, categoryMap)),
      total: res.meta.total,
      page: res.meta.page,
      pageSize: res.meta.page_size,
      totalPages: res.meta.total_pages,
    };
  } catch {
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }
}

export async function searchProducts(query: string, limit = 8): Promise<Product[]> {
  // REAL API: GET /search?q=query&page_size=limit
  const { data } = await runSearch(query, 1, limit);
  return data;
}

export async function searchProductsPaged(
  query: string,
  page = 1,
  pageSize = 24
): Promise<PaginatedResponse<Product>> {
  // REAL API: GET /search?q=query&page=page&page_size=pageSize
  return runSearch(query, page, pageSize);
}
