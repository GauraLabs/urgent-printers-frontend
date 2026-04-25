import type { HeroBanner, Testimonial } from "@/types";
import { mockHeroBanners, mockTestimonials } from "@/lib/mock-data";
import { delay } from "./delay";

// ─── Real API: replace the body of each function with a fetch() call ─────────

export async function getHeroBanners(): Promise<HeroBanner[]> {
  // REAL API: return fetch('/api/homepage/banners').then(r => r.json())
  await delay(300);
  return mockHeroBanners;
}

export async function getTestimonials(): Promise<Testimonial[]> {
  // REAL API: return fetch('/api/homepage/testimonials').then(r => r.json())
  await delay(300);
  return mockTestimonials;
}
