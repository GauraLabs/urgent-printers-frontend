import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const unstableCacheRevalidates: number[] = [];
vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => Promise<unknown>, _keys: string[], opts: { revalidate: number }) => {
    unstableCacheRevalidates.push(opts.revalidate);
    return fn;
  },
}));

const API = "http://api.test/api/v1";

const category = (id: number, slug: string, productCount: number) => ({
  id, name: slug, slug, description: null, icon_name: null, meta_title: null, meta_description: null,
  is_active: true, parent_id: null, sort_order: id, product_count: productCount, thumbnail_url: null,
  medium_url: null, banner_url: null, video_url: null, video_thumbnail_url: null, children: [],
});

const card = (id: number, categorySlug: string) => ({
  id, name: `P${id}`, slug: `p-${id}`, short_description: null, category_id: 1, category_slug: categorySlug,
  category_name: categorySlug, badge: "none", is_featured: false, tags: [], thumbnail_url: null, medium_url: null,
  price_from: 1000, rating: 0, review_count: 0,
});

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
}

const categoriesOk = (): Response => json({ data: [category(1, "wedding", 3)], message: "" });
const productsPage = (page: number, totalPages: number, ids: number[]): Response =>
  json({ data: ids.map((i) => card(i, "wedding")), message: "", meta: { page, page_size: 100, total: ids.length, total_pages: totalPages } });

type Route = (url: string) => Response | Promise<Response>;
let routes: Route[];
const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async (input) => {
  const next = routes.shift();
  if (!next) throw new Error(`unexpected fetch ${String(input)}`);
  return next(String(input));
});

async function load() {
  vi.resetModules();
  const api = await import("@/lib/api/seoCatalog");
  const sitemapRoute = await import("@/app/sitemap.xml/route");
  const llmsRoute = await import("@/app/llms.txt/route");
  const sitemap = async (): Promise<{ url: string }[]> => {
    const xml = await (await sitemapRoute.GET()).text();
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => ({ url: m[1] }));
  };
  return { api, sitemap, sitemapGet: sitemapRoute.GET, llmsGet: llmsRoute.GET };
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", API);
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.urgentprinters.com");
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PHASE", "phase-production-server");
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
  fetchMock.mockClear();
  unstableCacheRevalidates.length = 0;
  routes = [];
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("parseRetryAfterMs", () => {
  it("accepts delta-seconds and HTTP-dates, rejects junk", async () => {
    const { api } = await load();
    expect(api.parseRetryAfterMs("2")).toBe(2000);
    expect(api.parseRetryAfterMs(new Date(10_000).toUTCString(), 7_000)).toBe(3000);
    expect(api.parseRetryAfterMs("soon")).toBeNull();
    expect(api.parseRetryAfterMs(null)).toBeNull();
  });
});

describe("sitemap never caches a degraded catalog", () => {
  it("consistent data renders the full sitemap with every product page", async () => {
    routes = [
      categoriesOk,
      () => productsPage(1, 2, [1, 2]),
      () => productsPage(2, 2, [3]),
    ];
    const { sitemap, api } = await load();
    const key = api.freshnessParam();
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain("https://www.urgentprinters.com/products/wedding");
    for (const id of [1, 2, 3]) expect(urls).toContain(`https://www.urgentprinters.com/products/wedding/p-${id}`);
    expect(fetchMock.mock.calls.map((c) => String(c[0]))).toEqual([
      `${API}/categories?include_children=true&${key}`,
      `${API}/products?page=1&page_size=100&${key}`,
      `${API}/products?page=2&page_size=100&${key}`,
    ]);
    expect(unstableCacheRevalidates).toEqual([]);
  });

  it("throws (so ISR keeps the previous version) when a products page fails", async () => {
    routes = [categoriesOk, () => productsPage(1, 2, [1]), () => json({ detail: "boom" }, 500)];
    const { sitemap } = await load();
    await expect(sitemap()).rejects.toThrow(/products\?page=2.*500/);
  });

  it("throws on a persistent 429 after bounded retries", async () => {
    routes = [categoriesOk, ...Array.from({ length: 3 }, () => () => json({ detail: "slow down" }, 429, { "Retry-After": "0" }))];
    const { sitemap } = await load();
    await expect(sitemap()).rejects.toThrow(/429/);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("throws when the categories request fails or the network errors", async () => {
    routes = [() => json({ detail: "down" }, 503)];
    let { sitemap } = await load();
    await expect(sitemap()).rejects.toThrow(/categories.*503/);
    routes = [categoriesOk, () => { throw new TypeError("fetch failed"); }];
    ({ sitemap } = await load());
    await expect(sitemap()).rejects.toThrow(/network error/);
  });

  it("throws when products come back empty while categories report products", async () => {
    routes = [categoriesOk, () => productsPage(1, 0, [])];
    const { sitemap } = await load();
    await expect(sitemap()).rejects.toThrow(/empty while categories report products/);
  });

  it("an empty catalog with zero reported products is consistent, not degraded", async () => {
    routes = [() => json({ data: [category(1, "wedding", 0)], message: "" }), () => productsPage(1, 0, [])];
    const { sitemap } = await load();
    await expect(sitemap()).resolves.toEqual(expect.any(Array));
    expect(unstableCacheRevalidates).toEqual([]);
  });

  it("retries a 429 honouring Retry-After, then succeeds", async () => {
    routes = [
      categoriesOk,
      () => json({ detail: "slow down" }, 429, { "Retry-After": "1" }),
      () => productsPage(1, 1, [1, 2, 3]),
    ];
    const { api } = await load();
    const sleep = vi.fn(async () => {});
    const { products } = await api.getSeoCatalog(api.createRetryBudget(4000, sleep));
    expect(products).toHaveLength(3);
    expect(sleep).toHaveBeenCalledWith(1000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("uses exponential backoff without Retry-After and gives up once the wait budget is spent", async () => {
    routes = [
      categoriesOk,
      () => json({}, 429),
      () => productsPage(1, 1, [1]),
    ];
    const { api } = await load();
    const sleep = vi.fn(async () => {});
    await api.getSeoCatalog(api.createRetryBudget(4000, sleep));
    expect(sleep).toHaveBeenCalledWith(500);

    routes = [categoriesOk, () => json({}, 429, { "Retry-After": "30" })];
    const sleep2 = vi.fn(async () => {});
    await expect(api.getSeoCatalog(api.createRetryBudget(4000, sleep2))).rejects.toThrow(/429/);
    expect(sleep2).not.toHaveBeenCalled();
  });

  it("at build time (no previous version) falls back to static pages with a short revalidate", async () => {
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    routes = [categoriesOk, () => json({ detail: "boom" }, 500)];
    const { sitemap } = await load();
    const entries = await sitemap();
    expect(entries.length).toBeGreaterThan(5);
    expect(entries.some((e) => e.url.includes("/products/wedding"))).toBe(false);
    expect(unstableCacheRevalidates).toEqual([60]);
  });
});

describe("SEO catalog fetches never reuse a stale data-cache entry", () => {
  it("every read carries the per-regeneration freshness key and stays statically cacheable", async () => {
    routes = [categoriesOk, () => productsPage(1, 2, [1]), () => productsPage(2, 2, [2])];
    const { api } = await load();
    await api.getSeoCatalog();
    const key = api.freshnessParam();
    expect(fetchMock.mock.calls.map((c) => String(c[0]))).toEqual([
      `${API}/categories?include_children=true&${key}`,
      `${API}/products?page=1&page_size=100&${key}`,
      `${API}/products?page=2&page_size=100&${key}`,
    ]);
    expect(fetchMock.mock.calls.every((c) => c[1]?.cache === undefined)).toBe(true);
  });

  it("the key changes between regenerations that are 300s apart", async () => {
    const { api } = await load();
    const t = 1_800_000_000_000;
    expect(api.freshnessParam(t)).not.toBe(api.freshnessParam(t + 300_000));
    expect(api.freshnessParam(t)).toBe(api.freshnessParam(t + 1_000));
  });

  it("a category that reports products but is absent from the listing fails the regeneration", async () => {
    const stale = () => json({ data: [category(1, "wedding", 3), category(9, "wedding-petal-cones", 15)], message: "" });
    routes = [stale, () => productsPage(1, 1, [1])];
    const { api } = await load();
    await expect(api.getSeoCatalog()).rejects.toThrow(/wedding-petal-cones/);
  });

  it("parents that only hold products through children are not flagged", async () => {
    const parent = { ...category(2, "wedding", 5), children: [{ ...category(9, "petals", 5), parent_id: 2 }] };
    routes = [() => json({ data: [parent], message: "" }), () => json({
      data: [{ ...card(1, "petals") }], message: "", meta: { page: 1, page_size: 100, total: 1, total_pages: 1 },
    })];
    const { api } = await load();
    await expect(api.getSeoCatalog()).resolves.toBeDefined();
  });

  it("sitemap carries a generation timestamp in the XML and headers so a frozen copy is detectable", async () => {
    routes = [categoriesOk, () => productsPage(1, 1, [1])];
    const { sitemapGet } = await load();
    const res = await sitemapGet();
    const xml = await res.text();
    const at = res.headers.get("X-Sitemap-Generated-At");
    expect(at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(xml).toContain(`<!-- generated ${at} entries `);
    expect(res.headers.get("X-Sitemap-Stale")).toBeNull();
  });

  it("the build-time degraded fallback is flagged X-Sitemap-Stale and logged", async () => {
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    routes = [categoriesOk, () => json({ detail: "boom" }, 500)];
    const { sitemapGet } = await load();
    const res = await sitemapGet();
    expect(res.headers.get("X-Sitemap-Stale")).toBe("degraded-fallback");
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("sitemap"), expect.anything());
  });

  it("sitemap and llms.txt routes revalidate every 300s, matching their fetches", async () => {
    const sitemapRoute = await import("@/app/sitemap.xml/route");
    const llmsRoute = await import("@/app/llms.txt/route");
    expect(sitemapRoute.revalidate).toBe(300);
    expect(llmsRoute.revalidate).toBe(300);
  });

  it("sitemap.xml is served as escaped XML", async () => {
    routes = [categoriesOk, () => productsPage(1, 1, [1])];
    const { sitemapGet } = await load();
    const res = await sitemapGet();
    expect(res.headers.get("Content-Type")).toBe("application/xml; charset=utf-8");
    const xml = await res.text();
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')).toBe(true);
    expect(xml).toContain("<loc>https://www.urgentprinters.com/products/wedding/p-1</loc>");
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true);
  });
});

describe("llms.txt never caches a degraded catalog", () => {
  it("throws when categories fail or come back empty", async () => {
    routes = [() => json({}, 429, { "Retry-After": "60" })];
    let { llmsGet } = await load();
    await expect(llmsGet()).rejects.toThrow(/429/);
    routes = [() => json({ data: [], message: "" })];
    ({ llmsGet } = await load());
    await expect(llmsGet()).rejects.toThrow(/empty/);
  });

  it("renders categories when the fetch succeeds", async () => {
    routes = [categoriesOk];
    const { llmsGet } = await load();
    const txt = await (await llmsGet()).text();
    expect(txt).toContain("[wedding](https://www.urgentprinters.com/products/wedding)");
  });
});
