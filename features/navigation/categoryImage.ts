import type { Category } from "@/types";

// Mock data (and older cached shapes) still carry seeded picsum.photos URLs, so
// every category image goes through this guard rather than trusting truthiness.
function isRealUrl(url: string | null | undefined): url is string {
  return typeof url === "string" && url.trim() !== "" && !/(^|\/\/)picsum\.photos\//.test(url);
}

/** The category's uploaded image, or null when it only has the placeholder (render an initial tile instead). */
export function getRealCategoryImage(category: Pick<Category, "thumbnailUrl" | "bannerUrl">): string | null {
  if (isRealUrl(category.thumbnailUrl)) return category.thumbnailUrl;
  if (isRealUrl(category.bannerUrl)) return category.bannerUrl;
  return null;
}

export function categoryInitial(name: string): string {
  const ch = name.trim().charAt(0);
  return ch ? ch.toUpperCase() : "•";
}

/** Larger card image (800px medium first), or null when the category has no uploaded image. */
export function getRealCategoryCardImage(
  category: Pick<Category, "bannerUrl" | "mediumUrl" | "thumbnailUrl">
): string | null {
  if (isRealUrl(category.mediumUrl)) return category.mediumUrl;
  if (isRealUrl(category.thumbnailUrl)) return category.thumbnailUrl;
  if (isRealUrl(category.bannerUrl)) return category.bannerUrl;
  return null;
}

/** Wide image for a campaign banner: banner, then the 800px medium, then the thumbnail; null when only placeholders exist. */
export function getRealCampaignImage(
  category: Pick<Category, "bannerUrl" | "mediumUrl" | "thumbnailUrl">
): string | null {
  if (isRealUrl(category.bannerUrl)) return category.bannerUrl;
  if (isRealUrl(category.mediumUrl)) return category.mediumUrl;
  if (isRealUrl(category.thumbnailUrl)) return category.thumbnailUrl;
  return null;
}
