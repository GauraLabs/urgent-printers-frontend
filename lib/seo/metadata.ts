import type { Metadata } from "next";
import type { Category, Product } from "@/types";
import { ROUTES } from "@/lib/constants/routes";
import { absoluteUrl, SITE_URL } from "./site";
import { isCategoryIndexable } from "./category";
import { getRealCampaignImage } from "@/features/navigation/categoryImage";

type SearchParams = { [key: string]: string | string[] | undefined };

// Any of these changes what the listing shows without being its own landing page.
const FACET_PARAMS = ["sort", "min", "max", "tags", "badge", "q"] as const;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value ?? "").trim();
}

export function hasFacetParams(sp: SearchParams): boolean {
  return FACET_PARAMS.some((key) => first(sp[key]) !== "");
}

export function parsePageParam(sp: SearchParams): number {
  const n = Number(first(sp.page));
  return Number.isInteger(n) && n > 1 ? n : 1;
}

export interface ListingSeo {
  canonical: string;
  noindex: boolean;
}

/** Facet URLs canonicalise to the bare listing; plain `?page=N` is self-canonical. */
export function listingSeo(basePath: string, sp: SearchParams, siteUrl: string = SITE_URL): ListingSeo {
  const base = absoluteUrl(basePath, siteUrl);
  if (hasFacetParams(sp)) return { canonical: base, noindex: true };
  const page = parsePageParam(sp);
  return { canonical: page > 1 ? `${base}?page=${page}` : base, noindex: false };
}

const META_DESCRIPTION_MAX = 160;

export function clampDescription(text: string, max: number = META_DESCRIPTION_MAX): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function pick(...candidates: Array<string | null | undefined>): string {
  for (const c of candidates) {
    const v = c?.trim();
    if (v) return v;
  }
  return "";
}

export function categoryTitle(category: Pick<Category, "name" | "metaTitle">): string {
  return pick(category.metaTitle, category.name);
}

export function categoryDescription(category: Pick<Category, "name" | "description" | "metaDescription">): string {
  const explicit = pick(category.metaDescription);
  if (explicit) return clampDescription(explicit);
  const body = pick(category.description);
  if (body) return clampDescription(/[.!?]$/.test(body) ? `${body} Delivered across India.` : `${body}. Delivered across India.`);
  return `Shop ${category.name} from Urgent Printers: premium custom printing with fast delivery across India.`;
}

export function buildCategoryMetadata(
  category: Category,
  sp: SearchParams,
  siteUrl: string = SITE_URL,
): Metadata {
  const listing = listingSeo(ROUTES.category(category.slug), sp, siteUrl);
  // Thin subcategories and admin-flagged categories stay crawlable (follow) but out of the index.
  const noindex = listing.noindex || !isCategoryIndexable(category);
  const canonical = listing.canonical;
  const title = categoryTitle(category);
  const description = categoryDescription(category);
  // No site-default OG image exists, so an image-less category omits og:image rather than inventing one.
  const ogImage = getRealCampaignImage(category);
  return {
    title,
    description,
    alternates: { canonical },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: `${title} | Urgent Printers`,
      description,
      url: canonical,
      ...(ogImage && { images: [{ url: ogImage, alt: category.name }] }),
    },
  };
}

export function productTitle(product: Pick<Product, "name" | "seo">): string {
  return pick(product.seo?.title, product.name);
}

export function productDescription(
  product: Pick<Product, "name" | "shortDescription" | "description" | "seo">,
): string {
  const text = pick(product.seo?.description, product.shortDescription, stripHtml(product.description));
  if (text) return clampDescription(text);
  return `Order ${product.name} from Urgent Printers. Custom printing delivered across India.`;
}

export function productCanonical(
  product: Pick<Product, "slug" | "categorySlug" | "seo">,
  siteUrl: string = SITE_URL,
): string {
  const custom = product.seo?.canonicalUrl?.trim();
  if (custom && /^https?:\/\//i.test(custom)) return custom;
  return absoluteUrl(ROUTES.product(product.categorySlug, product.slug), siteUrl);
}

export function buildProductMetadata(product: Product, siteUrl: string = SITE_URL): Metadata {
  const title = productTitle(product);
  const description = productDescription(product);
  const canonical = productCanonical(product, siteUrl);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} | Urgent Printers`,
      description,
      url: canonical,
      images: product.images.map((url) => ({ url, alt: product.name })),
    },
  };
}
