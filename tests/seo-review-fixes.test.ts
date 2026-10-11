import { beforeEach, describe, expect, it, vi } from "vitest";
import { toPlainText, toParagraphs, cleanFaqs, isKnownCategorySlug } from "@/lib/seo/category";
import { directRootShelves, planShelfCategories, dedupeShelfProducts } from "@/features/home/shelfBuckets";
import type { Category, Product } from "@/types";

const api = vi.hoisted(() => ({
  getProductBySlug: vi.fn(),
  getCategories: vi.fn(),
  getCategoryBySlug: vi.fn(),
  getProducts: vi.fn(),
}));
vi.mock("@/lib/api", () => api);
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
  permanentRedirect: (to: string) => {
    throw new Error(`PERMANENT:${to}`);
  },
}));

const cat = (slug: string, extra: Partial<Category> = {}): Category =>
  ({ id: slug, slug, name: slug, productCount: 5, isActive: true, parentId: null, ancestors: [], sortOrder: 0, ...extra }) as unknown as Category;
const prod = (id: string, categorySlug: string): Product => ({ id, slug: id, categorySlug }) as unknown as Product;

describe("toPlainText", () => {
  it("keeps bare angle brackets in prose", () => {
    expect(toPlainText("Sizes < 5 inch and > 3 inch")).toBe("Sizes < 5 inch and > 3 inch");
  });
  it("strips real tags including script", () => {
    expect(toPlainText("<script>alert(1)</script>Hi <b>there</b>")).toBe("alert(1)Hi there");
    expect(toPlainText("a<br/>b</p>c")).toBe("a\nb\nc");
  });
  it("visible paragraphs and FAQ share the same cleaned strings", () => {
    expect(toParagraphs("x < 5")).toEqual(["x < 5"]);
    expect(cleanFaqs([{ question: "Q <b>1</b>?", answer: "> 3 inch" }])).toEqual([{ question: "Q 1?", answer: "> 3 inch" }]);
  });
});

describe("homepage direct-root shelves", () => {
  const categories = [
    cat("wedding", { productCount: 10 }),
    cat("cards", { productCount: 4, parentId: "wedding", ancestors: [{ id: "wedding", slug: "wedding", name: "wedding" }] }),
    cat("boxes", { productCount: 4, parentId: "wedding", ancestors: [{ id: "wedding", slug: "wedding", name: "wedding" }] }),
    cat("misc", { productCount: 1 }),
  ];
  it("reports split roots and keeps only root-attached products, deduped", () => {
    const plan = planShelfCategories(categories, 10);
    expect(plan.shelves.map((c) => c.slug)).toEqual(["cards", "boxes", "misc"]);
    expect(plan.splitRoots.map((c) => c.slug)).toEqual(["wedding"]);
    const direct = directRootShelves(plan.splitRoots, [[prod("p1", "cards"), prod("p2", "wedding"), prod("p3", "wedding")]]);
    expect(direct[0].products.map((p) => p.id)).toEqual(["p2", "p3"]);
    const deduped = dedupeShelfProducts([{ category: categories[1], products: [prod("p2", "wedding")] }, ...direct]);
    expect(deduped[1].products.map((p) => p.id)).toEqual(["p3"]);
  });
});

describe("isKnownCategorySlug", () => {
  it("matches any level", () => {
    expect(isKnownCategorySlug([cat("a"), cat("b", { parentId: "a" })], "b")).toBe(true);
    expect(isKnownCategorySlug([cat("a")], "junk")).toBe(false);
  });
});

describe("PDP route", () => {
  beforeEach(() => vi.clearAllMocks());
  async function run(categorySlug: string) {
    const { default: Page } = await import("@/app/products/[categorySlug]/[productSlug]/page");
    return Page({ params: Promise.resolve({ categorySlug, productSlug: "inv" }) });
  }
  const product = { slug: "inv", categorySlug: "new-cat", categoryName: "New", categoryAncestors: [], pricingTiers: [], images: [], tags: [], name: "Inv", description: "", printSpec: { sizes: [], papers: [], finishes: [], sides: [] } };

  it("redirects a known old category slug", async () => {
    api.getProductBySlug.mockResolvedValue(product);
    api.getCategories.mockResolvedValue([cat("old-cat"), cat("new-cat")]);
    await expect(run("old-cat")).rejects.toThrow("PERMANENT:/products/new-cat/inv");
  });
  it("404s a junk category slug", async () => {
    api.getProductBySlug.mockResolvedValue(product);
    api.getCategories.mockResolvedValue([cat("new-cat")]);
    await expect(run("junk")).rejects.toThrow("NEXT_NOT_FOUND");
  });
  it("throws (not a cacheable 404) when the categories list is empty", async () => {
    api.getProductBySlug.mockResolvedValue(product);
    api.getCategories.mockResolvedValue([]);
    await expect(run("old-cat")).rejects.toThrow("Categories unavailable");
  });
  it("404s a missing product", async () => {
    api.getProductBySlug.mockResolvedValue(null);
    await expect(run("new-cat")).rejects.toThrow("NEXT_NOT_FOUND");
  });
  it("renders when the segment matches", async () => {
    api.getProductBySlug.mockResolvedValue(product);
    await expect(run("new-cat")).resolves.toBeTruthy();
    expect(api.getCategories).not.toHaveBeenCalled();
  });
});

interface FoundElement {
  type: unknown;
  props: unknown;
}

function findElement(node: unknown, name: string): FoundElement {
  const stack: unknown[] = [node];
  while (stack.length > 0) {
    const cur = stack.pop();
    if (Array.isArray(cur)) stack.push(...cur);
    else if (cur && typeof cur === "object" && "props" in cur && "type" in cur) {
      const el = cur as FoundElement;
      if (typeof el.type === "function" && el.type.name === name) return el;
      stack.push((el.props as { children?: unknown }).children);
    }
  }
  throw new Error(`${name} not found`);
}

describe("category route", () => {
  beforeEach(() => vi.clearAllMocks());
  async function run(sp: Record<string, string> = {}) {
    const { default: Page } = await import("@/app/products/[categorySlug]/page");
    return Page({ params: Promise.resolve({ categorySlug: "c" }), searchParams: Promise.resolve(sp) });
  }
  it("404s an inactive category", async () => {
    api.getCategoryBySlug.mockResolvedValue(cat("c", { isActive: false }));
    api.getCategories.mockResolvedValue([]);
    await expect(run()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(api.getProducts).not.toHaveBeenCalled();
  });
  it("clamps a NaN page param to 1", async () => {
    api.getCategoryBySlug.mockResolvedValue(cat("c"));
    api.getCategories.mockResolvedValue([cat("c")]);
    api.getProducts.mockResolvedValue({ data: [], total: 0 });
    const tree = await run({ page: "abc" });
    // The product fetch lives in a child under Suspense (so the status checks above stay outside it); render it.
    const listing = findElement(tree, "CategoryListing");
    await (listing.type as (props: unknown) => Promise<unknown>)(listing.props);
    expect(api.getProducts).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
  });
});
