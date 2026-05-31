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
    return mockProducts.filter((p) => p.isFeatured);
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

export async function searchProducts(query: string): Promise<Product[]> {
  // REAL API: GET /products?search=query
  if (!process.env.NEXT_PUBLIC_API_URL) {
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
  try {
    const params = new URLSearchParams({ search: query, page_size: "8" });
    const res = await apiFetchPage<BackendProductCard>(`/products?${params}`);
    return res.data.map(mapCard);
  } catch {
    return [];
  }
}
