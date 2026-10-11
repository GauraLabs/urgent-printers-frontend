import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mapCategory, type BackendCategory } from "@/lib/api/categories";
import { buildCategoryMetadata } from "@/lib/seo/metadata";
import { buildSitemapEntries } from "@/lib/seo/sitemap";
import { getRealCategoryCardImage } from "@/features/navigation/categoryImage";
import { CategoryRail } from "@/features/home/CategoryRail";
import type { Category } from "@/types";

const SITE = "https://www.example.test";

const searchCategories = vi.hoisted((): { value: Category[] } => ({ value: [] }));

vi.mock("@/lib/api", () => ({
  searchProductsPaged: vi.fn(),
  getCategories: vi.fn(async () => searchCategories.value),
  getPopularSearches: vi.fn(async () => []),
}));

vi.mock("@/features/products/SearchPageClient", () => ({
  SearchPageProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  SearchResultsFrame: ({ children }: { children: ReactNode }) => <>{children}</>,
  SearchPageForm: () => null,
}));

function backend(over: Partial<BackendCategory> = {}): BackendCategory {
  return {
    id: 7,
    name: "Wedding Tags",
    slug: "wedding-tags",
    description: null,
    icon_name: null,
    meta_title: null,
    meta_description: null,
    is_active: true,
    parent_id: null,
    sort_order: 0,
    product_count: 12,
    thumbnail_url: null,
    medium_url: null,
    banner_url: null,
    video_url: null,
    video_thumbnail_url: null,
    ...over,
  };
}

const imageless = (over: Partial<BackendCategory> = {}): Category => mapCategory(backend(over));

describe("mapCategory images", () => {
  it("returns null image fields (never a stock photo) for an image-less category", () => {
    const c = imageless();
    expect(c.imageUrl).toBeNull();
    expect(c.mediumUrl).toBeNull();
    expect(c.thumbnailUrl).toBeNull();
    expect(c.bannerUrl).toBeNull();
    expect(JSON.stringify(c)).not.toContain("picsum");
  });

  it("keeps real uploads, with banner as the medium fallback", () => {
    const c = imageless({ thumbnail_url: "https://cdn/t.webp", banner_url: "https://cdn/b.webp" });
    expect(c.imageUrl).toBe("https://cdn/t.webp");
    expect(c.mediumUrl).toBe("https://cdn/b.webp");
    expect(imageless({ medium_url: "https://cdn/m.webp" }).mediumUrl).toBe("https://cdn/m.webp");
  });
});

describe("getRealCategoryCardImage", () => {
  it("prefers medium, then thumbnail, then banner, and rejects placeholders", () => {
    expect(getRealCategoryCardImage({ mediumUrl: "https://cdn/m", thumbnailUrl: "https://cdn/t", bannerUrl: null })).toBe("https://cdn/m");
    expect(getRealCategoryCardImage({ mediumUrl: null, thumbnailUrl: "https://cdn/t", bannerUrl: "https://cdn/b" })).toBe("https://cdn/t");
    expect(getRealCategoryCardImage({ mediumUrl: "https://picsum.photos/seed/x/800/600", thumbnailUrl: null, bannerUrl: null })).toBeNull();
  });
});

describe("category og:image", () => {
  it("falls back to the default site card when the category has no real image", () => {
    const meta = buildCategoryMetadata(imageless(), {}, SITE);
    expect(meta.openGraph?.images).toEqual([{ url: `${SITE}/opengraph-image`, alt: "Wedding Tags" }]);
    expect(meta.twitter?.images).toEqual([`${SITE}/opengraph-image`]);
  });

  it("ignores a legacy picsum imageUrl", () => {
    const meta = buildCategoryMetadata({ ...imageless(), imageUrl: "https://picsum.photos/seed/x/600/400" }, {}, SITE);
    expect(JSON.stringify(meta)).not.toContain("picsum");
  });

  it("uses the uploaded banner when present", () => {
    const meta = buildCategoryMetadata(imageless({ banner_url: "https://cdn/b.webp", thumbnail_url: "https://cdn/t.webp" }), {}, SITE);
    expect(meta.openGraph?.images).toEqual([{ url: "https://cdn/b.webp", alt: "Wedding Tags" }]);
    expect(meta.twitter?.images).toEqual(["https://cdn/b.webp"]);
  });
});

describe("sitemap category images", () => {
  it("omits the image entry for an image-less category and keeps real ones", () => {
    const entries = buildSitemapEntries(
      [imageless(), imageless({ id: 8, slug: "favours", thumbnail_url: "https://cdn/f.webp" })],
      [],
      SITE,
    );
    const bare = entries.find((e) => e.url.endsWith("/wedding-tags"));
    const real = entries.find((e) => e.url.endsWith("/favours"));
    expect(bare).toBeDefined();
    expect(bare && "images" in bare).toBe(false);
    expect(real?.images).toEqual(["https://cdn/f.webp"]);
  });
});

describe("CategoryRail image fallback", () => {
  it("renders letter tiles (mobile and desktop) and no <img> for an image-less category", () => {
    const html = renderToStaticMarkup(<CategoryRail categories={[imageless()]} />);
    expect(html).not.toContain("<img");
    expect(html).not.toContain("picsum");
    expect(html.match(/aria-hidden="true"[^>]*>W<\/span>/g)?.length).toBe(2);
  });

  it("renders the uploaded medium image on the desktop card", () => {
    const html = renderToStaticMarkup(
      <CategoryRail categories={[imageless({ medium_url: "https://cdn/m.webp", thumbnail_url: "https://cdn/t.webp" })]} />,
    );
    expect(html).toContain("<img");
    expect(html).toContain(encodeURIComponent("https://cdn/m.webp"));
  });
});

describe("search page category grid", () => {
  it("renders a letter tile instead of a stock photo for an image-less category", async () => {
    searchCategories.value = [imageless(), imageless({ id: 8, name: "Favours", slug: "favours", thumbnail_url: "https://cdn/f.webp" })];
    const { default: SearchPage } = await import("@/app/search/page");
    const html = renderToStaticMarkup(await SearchPage({ searchParams: Promise.resolve({}) }));
    expect(html).not.toContain("picsum");
    expect(html).toMatch(/aria-hidden="true"[^>]*>W<\/span>/);
    expect(html).toContain(encodeURIComponent("https://cdn/f.webp"));
  });
});
