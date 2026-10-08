import { describe, expect, it } from "vitest";
import { bucketShelves, MIN_RAIL_PRODUCTS, type CategoryShelf } from "@/features/home/shelfBuckets";
import type { Category, Product } from "@/types";

function shelf(slug: string, n: number): CategoryShelf {
  const category = { id: slug, slug, name: slug, productCount: n } as unknown as Category;
  const products = Array.from({ length: n }, (_, i) => ({ id: `${slug}-${i}`, slug: `${slug}-${i}` }) as unknown as Product);
  return { category, products };
}

describe("bucketShelves", () => {
  it("matches the production catalog shape (fetch results are capped at 8)", () => {
    const { rails, quads } = bucketShelves([
      shelf("wedding", 8),
      shelf("shagun-envelope", 8),
      shelf("wedding-essentials", 7),
      shelf("welcome-board", 2),
      shelf("birthday-party", 1),
      shelf("anniversary", 1),
    ]);
    expect(rails.map((r) => r.category.slug)).toEqual(["wedding", "shagun-envelope", "wedding-essentials"]);
    expect(quads).toHaveLength(2);
    expect(quads[0]).toMatchObject({ kind: "category" });
    const merged = quads[1];
    expect(merged.kind).toBe("merged");
    if (merged.kind === "merged") {
      expect(merged.cells.map((c) => c.category.slug)).toEqual(["birthday-party", "anniversary"]);
    }
  });

  it("uses the rail threshold exactly", () => {
    expect(bucketShelves([shelf("a", MIN_RAIL_PRODUCTS)]).rails).toHaveLength(1);
    const below = bucketShelves([shelf("a", MIN_RAIL_PRODUCTS - 1)]);
    expect(below.rails).toHaveLength(0);
    expect(below.quads).toHaveLength(1);
  });

  it("keeps a lone single-product category as its own card, not a merged one", () => {
    const { quads } = bucketShelves([shelf("a", 1), shelf("b", 3)]);
    expect(quads.map((q) => q.kind)).toEqual(["category", "category"]);
  });

  it("chunks singles four per merged card and never leaves a one-cell merged card", () => {
    const { quads } = bucketShelves(["a", "b", "c", "d", "e"].map((s) => shelf(s, 1)));
    expect(quads.map((q) => q.kind)).toEqual(["merged", "category"]);
  });

  it("skips empty categories", () => {
    const { rails, quads } = bucketShelves([shelf("a", 0)]);
    expect(rails).toHaveLength(0);
    expect(quads).toHaveLength(0);
  });
});
