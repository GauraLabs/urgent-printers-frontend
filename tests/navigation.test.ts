import { describe, expect, it } from "vitest";
import { buildCategoryTree } from "@/features/navigation/buildCategoryTree";
import { getRealCategoryImage, categoryInitial } from "@/features/navigation/categoryImage";
import { buildCategoryChipHref } from "@/features/products/categoryChips";
import { findCategoryPath, toChipCategories } from "@/features/products/categoryChips";
import { pickCampaignCategory, selectShelfCategories } from "@/features/home/shelfBuckets";
import { ROUTES } from "@/lib/constants/routes";
import type { Category } from "@/types";

function cat(id: number, slug: string, over: Partial<Category> = {}): Category {
  return {
    id: String(id),
    slug,
    name: slug.toUpperCase(),
    description: "",
    imageUrl: `https://picsum.photos/seed/${slug}/600/400`,
    productCount: 3,
    thumbnailUrl: null,
    bannerUrl: null,
    isActive: true,
    parentId: null,
    sortOrder: 0,
    ...over,
  };
}

describe("getRealCategoryImage", () => {
  it("is null when only the placeholder exists", () => {
    expect(getRealCategoryImage({ thumbnailUrl: null, bannerUrl: null })).toBeNull();
    expect(getRealCategoryImage({ thumbnailUrl: undefined, bannerUrl: undefined })).toBeNull();
    expect(getRealCategoryImage({ thumbnailUrl: "https://picsum.photos/seed/x/600/400", bannerUrl: null })).toBeNull();
    expect(getRealCategoryImage({ thumbnailUrl: "  ", bannerUrl: null })).toBeNull();
  });
  it("prefers the thumbnail, then the banner", () => {
    expect(getRealCategoryImage({ thumbnailUrl: "https://cdn/t.jpg", bannerUrl: "https://cdn/b.jpg" })).toBe("https://cdn/t.jpg");
    expect(getRealCategoryImage({ thumbnailUrl: null, bannerUrl: "https://cdn/b.jpg" })).toBe("https://cdn/b.jpg");
  });
  it("derives an initial", () => {
    expect(categoryInitial(" wedding")).toBe("W");
    expect(categoryInitial("")).toBe("•");
  });
});

describe("buildCategoryTree", () => {
  it("nests by parentId and sorts by sortOrder", () => {
    const tree = buildCategoryTree([
      cat(2, "b", { sortOrder: 2 }),
      cat(1, "a", { sortOrder: 1 }),
      cat(3, "a-child", { parentId: 1, sortOrder: 2 }),
      cat(4, "a-child-first", { parentId: 1, sortOrder: 1 }),
    ]);
    expect(tree.map((c) => c.slug)).toEqual(["a", "b"]);
    expect(tree[0].children.map((c) => c.slug)).toEqual(["a-child-first", "a-child"]);
  });

  it("promotes orphans and skips inactive categories", () => {
    const tree = buildCategoryTree([
      cat(1, "gone", { isActive: false }),
      cat(2, "orphan", { parentId: 1 }),
      cat(3, "missing-parent", { parentId: 99 }),
    ]);
    expect(tree.map((c) => c.slug).sort()).toEqual(["missing-parent", "orphan"]);
  });

  it("prunes empty leaves but keeps an empty parent with live children", () => {
    const tree = buildCategoryTree([
      cat(1, "empty", { productCount: 0 }),
      cat(2, "parent", { productCount: 0 }),
      cat(3, "kid", { parentId: 2, productCount: 4 }),
    ]);
    expect(tree.map((c) => c.slug)).toEqual(["parent"]);
    expect(tree[0].children.map((c) => c.slug)).toEqual(["kid"]);
  });

  it("caps depth at three levels and survives cycles", () => {
    const deep = buildCategoryTree([
      cat(1, "l1"),
      cat(2, "l2", { parentId: 1 }),
      cat(3, "l3", { parentId: 2 }),
      cat(4, "l4", { parentId: 3 }),
    ]);
    expect(deep[0].children[0].children[0].children).toHaveLength(0);
    const cyc = buildCategoryTree([cat(1, "a", { parentId: 2 }), cat(2, "b", { parentId: 1 })]);
    expect(cyc.map((c) => c.slug)).toEqual(["a"]);
    expect(cyc[0].children.map((c) => c.slug)).toEqual(["b"]);
  });

  it("promotes self-parented and cyclic categories instead of dropping them", () => {
    const self = buildCategoryTree([cat(1, "me", { parentId: 1 })]);
    expect(self.map((c) => c.slug)).toEqual(["me"]);
    const all = buildCategoryTree([
      cat(1, "ok"),
      cat(2, "self", { parentId: 2 }),
      cat(3, "x", { parentId: 4 }),
      cat(4, "y", { parentId: 3 }),
    ]);
    const slugs: string[] = [];
    const walk = (nodes: typeof all) => nodes.forEach((n) => { slugs.push(n.slug); walk(n.children); });
    walk(all);
    expect(slugs.sort()).toEqual(["ok", "self", "x", "y"]);
    expect(new Set(all.map((c) => c.slug)).has("self")).toBe(true);
  });

  it("emits a lean shape with null imageUrl for placeholder-only categories", () => {
    const [c] = buildCategoryTree([cat(1, "a", { thumbnailUrl: "https://cdn/t.jpg" }), cat(2, "b")]);
    expect(Object.keys(c).sort()).toEqual(["children", "imageUrl", "name", "productCount", "slug"]);
    expect(c.imageUrl).toBe("https://cdn/t.jpg");
    expect(buildCategoryTree([cat(2, "b")])[0].imageUrl).toBeNull();
  });
});

describe("buildCategoryChipHref", () => {
  it("keeps sort and valid filters, drops q, category and page", () => {
    const params = new URLSearchParams("q=ring&sort=price-asc&min=5&category=x&page=3&badge=new&tags=a,b");
    expect(buildCategoryChipHref("wedding", params)).toBe("/products/wedding?sort=price-asc&min=5&tags=a%2Cb&badge=new");
    expect(buildCategoryChipHref(null, new URLSearchParams("q=ring"))).toBe("/products");
  });
});

describe("selectShelfCategories", () => {
  it("keeps only active, non-empty, top-level categories in backend order, capped", () => {
    const cats = [
      cat(1, "parent"),
      cat(2, "child", { parentId: 1 }),
      cat(3, "empty", { productCount: 0 }),
      cat(4, "off", { isActive: false }),
      cat(5, "second"),
      cat(6, "third"),
    ];
    expect(selectShelfCategories(cats, 10).map((c) => c.slug)).toEqual(["parent", "second", "third"]);
    expect(selectShelfCategories(cats, 2).map((c) => c.slug)).toEqual(["parent", "second"]);
  });
});

describe("pickCampaignCategory", () => {
  it("skips railed categories and categories with only the placeholder image", () => {
    const cats = [
      cat(1, "railed", { bannerUrl: "https://cdn/r.jpg" }),
      cat(2, "no-image"),
      cat(3, "placeholder-medium", { mediumUrl: "https://picsum.photos/seed/x/800/600" }),
      cat(4, "good", { bannerUrl: "https://cdn/g.jpg" }),
    ];
    const pick = pickCampaignCategory(cats, new Set(["railed"]));
    expect(pick?.category.slug).toBe("good");
    expect(pick?.imageUrl).toBe("https://cdn/g.jpg");
  });
  it("returns null (banner omitted) when nothing has a real image, never falling back to a railed category", () => {
    const cats = [cat(1, "railed", { bannerUrl: "https://cdn/r.jpg" }), cat(2, "plain")];
    expect(pickCampaignCategory(cats, new Set(["railed"]))).toBeNull();
  });
  it("ignores sub-categories", () => {
    const cats = [cat(1, "p", { productCount: 0 }), cat(2, "kid", { parentId: 1, bannerUrl: "https://cdn/k.jpg" })];
    expect(pickCampaignCategory(cats, new Set())).toBeNull();
  });
});

describe("chip ancestry", () => {
  const tree = toChipCategories(buildCategoryTree([cat(1, "a"), cat(2, "b", { parentId: 1 }), cat(3, "c", { parentId: 2 })]));
  it("finds the root-to-node path so ancestors can be highlighted", () => {
    expect(findCategoryPath(tree, "c").map((n) => n.slug)).toEqual(["a", "b", "c"]);
    expect(findCategoryPath(tree, "nope")).toEqual([]);
    expect(findCategoryPath(tree, null)).toEqual([]);
  });
});

describe("ROUTES slug encoding", () => {
  it("encodes slugs and leaves normal ones untouched", () => {
    expect(ROUTES.category("wedding-cards")).toBe("/products/wedding-cards");
    expect(ROUTES.product("a b", "c/d")).toBe("/products/a%20b/c%2Fd");
  });
});
