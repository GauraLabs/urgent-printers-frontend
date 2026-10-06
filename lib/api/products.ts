import type {
  Product,
  PaginatedResponse,
  ProductFilters,
  PrintSpec,
  SizeOption,
  SidesOption,
  CustomizationMode,
  TemplateField,
  ListingOffer,
} from "@/types";
import { normalizePack, packPrice } from "@/lib/pack";
import { mockProducts } from "@/lib/mock-data";
import { getDisplayPricePerUnit, minOptionMultiplier, round2, slugify } from "@/lib/utils";
import { delay } from "./delay";
import { apiFetch, apiFetchPage } from "./client";
import { getCategories } from "./categories";
import { logApiError } from "./logApiError";

// ─── Backend shapes ───────────────────────────────────────────────────────────

export interface BackendProductCard {
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
  medium_url: string | null;
  price_from: number | null;
  // Discount fields are absent from a backend that predates the MRP feature
  // and null while no discount is active.
  mrp_from?: number | null;
  discount_percent?: number | null;
  discount_amount?: number | null;
  on_sale?: boolean;
  // Pack fields are absent from a backend that predates pack selling.
  pack_size?: number | null;
  unit_label?: string | null;
  price_from_pack?: number | null;
  mrp_from_pack?: number | null;
  rating: number;
  review_count: number;
}

export interface BackendListingOffer {
  quantity: number;
  pack_size?: number | null;
  price: number | string;
  sale_price?: number | string | null;
  sale_starts_at?: string | null;
  sale_ends_at?: string | null;
  in_stock?: boolean;
  query?: string | null;
}

export interface BackendProductDetail extends BackendProductCard {
  description: string | null;
  images: { thumb: string; md: string; lg: string; original: string }[];
  video_url: string | null;
  video_thumbnail_url: string | null;
  sizes: { id?: string | null; label: string; width: number; height: number; unit: string; is_active: boolean; price_multiplier: number; is_default: boolean }[];
  paper_types: { id?: string | null; label: string; gsm: number | null; is_active: boolean; price_multiplier: number; is_default: boolean }[];
  finishes: { id?: string | null; label: string; is_active: boolean; price_multiplier: number; is_default: boolean }[];
  // is_active is absent on backends that predate it; absent means active.
  sides_options: { label: string; price_multiplier: number; is_default: boolean; is_active?: boolean }[];
  quantity_steps: number[];
  pricing_tiers: {
    quantity: number;
    price_per_unit: number;
    is_best_value: boolean;
    mrp_per_unit?: number | null;
    discount_percent?: number | null;
    discount_per_unit?: number | null;
  }[];
  discount_ends_at?: string | null;
  listing_offer?: BackendListingOffer | null;
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
// documents, not the enriched ProductListResponse shape /products returns.
// thumbnail_url and base_price are now indexed and present here, but
// category_slug/category_name still are not — mapSearchDoc() below still
// bridges that part of the gap via the categoryMap parameter.
export interface BackendSearchDoc {
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
  base_price: number | null;
  thumbnail_url: string | null;
  base_mrp?: number | null;
  discount_percent?: number | null;
  discount_amount?: number | null;
  has_discount?: boolean;
  pack_size?: number | null;
  unit_label?: string | null;
  // Not indexed by Typesense yet — treated as optional/absent, same posture as
  // category_slug/category_name below, until search results carry it too.
  medium_url?: string | null;
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

function discountFields(src: {
  mrp?: number | null;
  percent?: number | null;
  amount?: number | null;
  onSale?: boolean;
}): Pick<Product, "mrpFrom" | "discountPercent" | "discountAmount" | "onSale"> {
  return {
    mrpFrom: src.mrp ?? undefined,
    discountPercent: src.percent ?? undefined,
    discountAmount: src.amount ?? undefined,
    onSale: src.onSale ?? false,
  };
}

function mapListingOffer(o: BackendListingOffer | null | undefined): ListingOffer | null {
  if (!o) return null;
  const price = Number(o.price);
  if (!Number.isFinite(price)) return null;
  const sale = o.sale_price === null || o.sale_price === undefined ? null : Number(o.sale_price);
  return {
    quantity: o.quantity,
    packSize: normalizePack(o.pack_size).packSize,
    price,
    salePrice: sale !== null && Number.isFinite(sale) ? sale : null,
    saleStartsAt: o.sale_starts_at ?? null,
    saleEndsAt: o.sale_ends_at ?? null,
    inStock: o.in_stock ?? true,
    query: o.query ?? "",
  };
}

function packFields(src: {
  packSize?: number | null;
  unitLabel?: string | null;
  priceFrom?: number | null;
  mrpFrom?: number | null;
  priceFromPack?: number | null;
  mrpFromPack?: number | null;
}): Pick<Product, "packSize" | "unitLabel" | "priceFromPack" | "mrpFromPack"> {
  const { packSize, unitLabel } = normalizePack(src.packSize, src.unitLabel);
  if (packSize === 1) return { packSize, unitLabel };
  // Server pack figures win; otherwise derive from the already-rounded
  // per-unit price so a card is never left showing a per-unit price.
  return {
    packSize,
    unitLabel,
    priceFromPack: src.priceFromPack ?? (src.priceFrom != null ? packPrice(src.priceFrom, packSize) : undefined),
    mrpFromPack: src.mrpFromPack ?? (src.mrpFrom != null ? packPrice(src.mrpFrom, packSize) : undefined),
  };
}

export function mapCard(c: BackendProductCard): Product {
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
    thumbnailUrl: c.thumbnail_url,
    // 800px, aspect-preserving — sized for grid tiles (listing/search/related/
    // featured) rendered wider than thumbnail_url's 300x300 hard crop
    mediumUrl: c.medium_url ?? c.thumbnail_url ?? `https://picsum.photos/seed/${c.slug}/800/600`,
    printSpec: EMPTY_PRINT_SPEC,
    pricingTiers: [],
    turnaroundOptions: [],
    averageRating: c.rating,
    reviewCount: c.review_count,
    isFeatured: c.is_featured,
    tags: c.tags,
    badge: c.badge,
    priceFrom: c.price_from ?? undefined,
    ...discountFields({ mrp: c.mrp_from, percent: c.discount_percent, amount: c.discount_amount, onSale: c.on_sale }),
    ...packFields({ packSize: c.pack_size, unitLabel: c.unit_label, priceFrom: c.price_from, mrpFrom: c.mrp_from, priceFromPack: c.price_from_pack, mrpFromPack: c.mrp_from_pack }),
    customizationMode: "none" as CustomizationMode,
    templateFields: [],
  };
}

export function mapDetail(d: BackendProductDetail): Product {
  const lgImages = d.images.map((i) => i.lg);
  const images =
    lgImages.length > 0
      ? lgImages
      : [`https://picsum.photos/seed/${d.slug}/800/600`];

  const sizes: SizeOption[] = d.sizes
    .filter((s) => s.is_active)
    .map((s) => ({
      id: s.id || slugify(s.label),
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
      id: p.id || slugify(p.label),
      label: p.label,
      weight: p.gsm ? `${p.gsm}gsm` : "",
      description: p.label,
      priceMultiplier: p.price_multiplier,
      isDefault: p.is_default,
    }));

  const finishes = d.finishes
    .filter((f) => f.is_active)
    .map((f) => ({
      id: f.id || slugify(f.label),
      label: f.label,
      description: f.label,
      priceMultiplier: f.price_multiplier,
      isDefault: f.is_default,
    }));

  const sides: SidesOption[] = d.sides_options
    .filter((s) => s.is_active !== false)
    .map((s) => ({
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
    mrpPerUnit: t.mrp_per_unit ?? undefined,
    discountPercent: t.discount_percent ?? undefined,
    discountPerUnit: t.discount_per_unit ?? undefined,
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
    thumbnailUrl: d.thumbnail_url ?? d.images[0]?.thumb ?? null,
    mediumUrl: d.medium_url ?? d.images[0]?.md ?? d.thumbnail_url ?? `https://picsum.photos/seed/${d.slug}/800/600`,
    // Index-aligned with `images` (lg/1600px) — feeds the gallery thumbnail rail
    // so it doesn't fetch the full-size slide image at ~120px.
    imageThumbnails: d.images.map((i) => i.thumb),
    videoUrl: d.video_url,
    videoThumbnailUrl: d.video_thumbnail_url,
    printSpec,
    pricingTiers,
    turnaroundOptions,
    averageRating: d.rating,
    reviewCount: d.review_count,
    isFeatured: d.is_featured,
    tags: d.tags,
    badge: d.badge,
    priceFrom: d.price_from ?? undefined,
    ...discountFields({ mrp: d.mrp_from, percent: d.discount_percent, amount: d.discount_amount, onSale: d.on_sale }),
    ...packFields({ packSize: d.pack_size, unitLabel: d.unit_label, priceFrom: d.price_from, mrpFrom: d.mrp_from, priceFromPack: d.price_from_pack, mrpFromPack: d.mrp_from_pack }),
    listingOffer: mapListingOffer(d.listing_offer),
    discountEndsAt: d.discount_ends_at ?? undefined,
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

// Typesense now indexes thumbnail_url/base_price, so search results carry a
// real image and price. category_slug/category_name are still not indexed,
// so those keep coming from the categoryMap lookup below.
export function mapSearchDoc(
  d: BackendSearchDoc,
  categoryMap: Map<number, { slug: string; name: string }>
): Product {
  const category = categoryMap.get(d.category_id);
  const imageUrl = d.thumbnail_url ?? `https://picsum.photos/seed/${d.slug}/600/400`;
  return {
    id: d.id,
    slug: d.slug,
    name: d.name,
    categoryId: String(d.category_id ?? ""),
    categorySlug: category?.slug ?? "",
    categoryName: category?.name ?? "",
    description: d.description ?? "",
    shortDescription: d.short_description ?? "",
    images: [imageUrl],
    thumbnailUrl: d.thumbnail_url,
    mediumUrl: d.medium_url ?? d.thumbnail_url ?? `https://picsum.photos/seed/${d.slug}/800/600`,
    printSpec: EMPTY_PRINT_SPEC,
    pricingTiers: [],
    turnaroundOptions: [],
    averageRating: d.rating,
    reviewCount: d.review_count,
    isFeatured: d.is_featured,
    tags: d.tags ?? [],
    badge: d.badge,
    priceFrom: d.base_price ?? undefined,
    ...discountFields({ mrp: d.base_mrp, percent: d.discount_percent, amount: d.discount_amount, onSale: d.has_discount }),
    ...packFields({ packSize: d.pack_size, unitLabel: d.unit_label, priceFrom: d.base_price, mrpFrom: d.base_mrp }),
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

// Sort/filter in mock mode mirrors the server: the display ("From") price is
// the best-value tier x the product's min active option multipliers.
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
      results = results.filter((p) => p.pricingTiers.some((t) => round2(t.pricePerUnit * minOptionMultiplier(p.printSpec)) >= min));
    }
    if (filters.maxPrice !== undefined) {
      const max = filters.maxPrice;
      results = results.filter((p) => p.pricingTiers.some((t) => round2(t.pricePerUnit * minOptionMultiplier(p.printSpec)) <= max));
    }
    // Mirrors product_repository.py: every selected tag must be present (AND, not OR).
    if (filters.tags?.length) {
      results = results.filter((p) => filters.tags!.every((tag) => p.tags.includes(tag)));
    }
    if (filters.badge === "sale") {
      results = results.filter((p) => p.onSale);
    } else if (filters.badge) {
      results = results.filter((p) => p.badge === filters.badge);
    }
    switch (filters.sort) {
      case "rating":
        results.sort((a, b) => b.averageRating - a.averageRating);
        break;
      case "price-asc":
        results.sort((a, b) => getDisplayPricePerUnit(a) - getDisplayPricePerUnit(b));
        break;
      case "price-desc":
        results.sort((a, b) => getDisplayPricePerUnit(b) - getDisplayPricePerUnit(a));
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
    // "On Sale" is derived from live pricing (on_sale), not the stored badge.
    if (filters.badge === "sale") params.set("on_sale", "true");
    else if (filters.badge) params.set("badge", filters.badge);
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
  } catch (err) {
    logApiError("getProducts", err);
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
  } catch (err) {
    logApiError(`getProductBySlug(${slug})`, err);
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
  } catch (err) {
    logApiError("getFeaturedProducts", err);
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
  } catch (err) {
    logApiError(`getRelatedProducts(${categorySlug})`, err);
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
  } catch (err) {
    logApiError("getRecommendedProducts", err);
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
  } catch (err) {
    logApiError(`runSearch(${query})`, err);
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
