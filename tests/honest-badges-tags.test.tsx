import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FilterControls } from "@/features/products/FilterControls";
import { FeaturedProducts } from "@/features/home/FeaturedProducts";

vi.mock("@/features/products/useProductFilters", () => ({
  useProductFilters: () => ({
    current: { minPrice: "", maxPrice: "", tags: [], badge: undefined, category: undefined },
    setCategory: vi.fn(),
    setPriceRange: vi.fn(),
    toggleTag: vi.fn(),
    setBadge: vi.fn(),
    clearAll: vi.fn(),
    activeCount: 0,
  }),
}));

describe("FilterControls", () => {
  const html = renderToStaticMarkup(<FilterControls categories={[]} showCategoryFilter={false} />);

  it("offers only real tags and drops the dead ones", () => {
    for (const label of ["Wedding", "Haldi", "Birthday", "Anniversary", "Return Gifts", "Sweet Box", "Thank You", "Shagun"]) {
      expect(html).toContain(label);
    }
    for (const dead of ["Luxury", "Eco Friendly", "Events", "Corporate"]) {
      expect(html).not.toContain(dead);
    }
  });

  it("keeps Bestseller/New/On Sale highlights but not Popular", () => {
    expect(html).toContain("Bestseller");
    expect(html).toContain("New");
    expect(html).toContain("On Sale");
    expect(html).not.toContain("Popular");
  });
});

describe("FeaturedProducts", () => {
  it("makes no sales-volume claim and links to the unfiltered listing", () => {
    const html = renderToStaticMarkup(<FeaturedProducts products={[]} />);
    expect(html).toContain("Featured designs");
    expect(html).toContain("Our picks");
    expect(html).not.toMatch(/Popular Products|most-ordered|Bestsellers/);
    expect(html).not.toContain("badge=bestseller");
  });
});
