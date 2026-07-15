import type { HeroBanner, Testimonial } from "@/types";
import { mockHeroBanners, mockTestimonials } from "@/lib/mock-data";
import { delay } from "./delay";
import { apiFetch } from "./client";

// ─── Backend shapes ───────────────────────────────────────────────────────────

interface BackendBanner {
  id: number;
  title: string;
  subtitle: string | null;
  badge_text: string | null;
  image_url: string;
  link_url: string | null;
  link_text: string | null;
  sort_order: number;
  valid_from: string | null;
  valid_until: string | null;
}

interface BackendTestimonial {
  id: number;
  customer_name: string;
  customer_title: string | null;
  avatar_url: string | null;
  content: string;
  rating: number;
  sort_order: number;
}

export interface BackendAnnouncement {
  id: number;
  message: string;
  link_url: string | null;
  link_text: string | null;
  bg_color: string;
  text_color: string;
  countdown_end_at: string | null;
}

function mapBanner(b: BackendBanner): HeroBanner {
  return {
    id: String(b.id),
    headline: b.title,
    subheading: b.subtitle ?? "",
    badgeText: b.badge_text ?? undefined,
    ctaText: b.link_text ?? "Shop Now",
    ctaHref: b.link_url ?? "/products",
    imageUrl: b.image_url,
  };
}

function mapTestimonial(t: BackendTestimonial): Testimonial {
  return {
    id: String(t.id),
    authorName: t.customer_name,
    company: t.customer_title ?? "",
    avatarUrl: t.avatar_url,
    rating: t.rating,
    quote: t.content,
  };
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function getHeroBanners(): Promise<HeroBanner[]> {
  // REAL API: GET /api/v1/content/banners
  if (!process.env.NEXT_PUBLIC_API_URL) {
    await delay(300);
    return mockHeroBanners;
  }
  try {
    const data = await apiFetch<BackendBanner[]>("/content/banners");
    return data.map(mapBanner);
  } catch {
    return [];
  }
}

export async function getTestimonials(): Promise<Testimonial[]> {
  // REAL API: GET /api/v1/content/testimonials
  if (!process.env.NEXT_PUBLIC_API_URL) {
    await delay(300);
    return mockTestimonials;
  }
  try {
    const data = await apiFetch<BackendTestimonial[]>("/content/testimonials");
    return data.map(mapTestimonial);
  } catch {
    return [];
  }
}

export async function getAnnouncement(): Promise<BackendAnnouncement | null> {
  // REAL API: GET /api/v1/content/announcement — returns `data: null` when no active announcement
  if (!process.env.NEXT_PUBLIC_API_URL) {
    return null;
  }
  try {
    return await apiFetch<BackendAnnouncement | null>("/content/announcement");
  } catch {
    return null;
  }
}
