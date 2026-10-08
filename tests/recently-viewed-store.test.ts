import { beforeEach, describe, expect, it } from "vitest";
import { useRecentlyViewedStore } from "@/features/products/recentlyViewed/store";

const view = (n: number) => ({ productId: String(n), productSlug: `p${n}`, categorySlug: "c" });

describe("recently viewed store", () => {
  beforeEach(() => useRecentlyViewedStore.setState({ items: [] }));

  it("moves a re-viewed product to the front without duplicating", () => {
    const { recordView } = useRecentlyViewedStore.getState();
    recordView(view(1));
    recordView(view(2));
    recordView(view(1));
    expect(useRecentlyViewedStore.getState().items.map((i) => i.productId)).toEqual(["1", "2"]);
  });

  it("caps the list at 12 and stores identifiers only", () => {
    const { recordView } = useRecentlyViewedStore.getState();
    for (let i = 0; i < 15; i++) recordView(view(i));
    const { items } = useRecentlyViewedStore.getState();
    expect(items).toHaveLength(12);
    expect(Object.keys(items[0]).sort()).toEqual(["categorySlug", "productId", "productSlug", "viewedAt"]);
  });

  it("prunes missing products", () => {
    const s = useRecentlyViewedStore.getState();
    s.recordView(view(1));
    s.recordView(view(2));
    s.pruneMissing(["1"]);
    expect(useRecentlyViewedStore.getState().items.map((i) => i.productId)).toEqual(["2"]);
  });
});
