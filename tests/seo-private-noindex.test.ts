import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildRobots } from "@/lib/seo/robots";
import { STATIC_SITEMAP_PATHS } from "@/lib/seo/sitemap";
import { metadata as accountMeta } from "@/app/account/layout";
import { metadata as authMeta } from "@/app/auth/layout";
import { metadata as cartMeta } from "@/app/cart/layout";
import { metadata as checkoutMeta } from "@/app/checkout/layout";
import { metadata as proofMeta } from "@/app/proof-approval/[token]/layout";

const NOINDEX = { index: false, follow: false };
const PRIVATE = ["/cart", "/checkout", "/account", "/auth"];

describe("private areas are crawlable but noindex", () => {
  it.each([
    ["app/account/layout (covers /account root)", accountMeta],
    ["app/auth/layout (covers /auth/login)", authMeta],
    ["app/cart/layout", cartMeta],
    ["app/checkout/layout (covers confirmation)", checkoutMeta],
    ["app/proof-approval/[token]/layout", proofMeta],
  ])("%s emits noindex,nofollow", (_n, meta) => {
    expect(meta.robots).toEqual(NOINDEX);
  });

  it("robots.txt no longer disallows cart/checkout/account/auth in either group", () => {
    const rules = buildRobots("https://x.test").rules as { disallow: string[] }[];
    for (const r of rules) {
      for (const p of PRIVATE) expect(r.disallow).not.toContain(p);
      expect(r.disallow).toEqual(expect.arrayContaining(["/api/", "/proof-approval/"]));
    }
  });

  it("sitemap static paths exclude private areas", () => {
    for (const p of STATIC_SITEMAP_PATHS) {
      for (const priv of [...PRIVATE, "/proof-approval"]) expect(p.startsWith(priv)).toBe(false);
    }
  });

  it("no page or layout under private dirs sets robots to anything but noindex", () => {
    const root = path.resolve(__dirname, "../app");
    const walk = (d: string): string[] =>
      fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(path.join(d, e.name)) : /^(page|layout)\.tsx$/.test(e.name) ? [path.join(d, e.name)] : [],
      );
    const files = ["account", "auth", "cart", "checkout", "proof-approval"].flatMap((d) => walk(path.join(root, d)));
    expect(files.length).toBeGreaterThan(10);
    for (const f of files) {
      const src = fs.readFileSync(f, "utf8");
      const m = src.match(/robots\s*:\s*\{([^}]*)\}/);
      if (m) expect(m[1].replace(/\s/g, ""), f).toBe("index:false,follow:false");
      expect(src, f).not.toMatch(/generateMetadata[\s\S]*robots/);
    }
  });
});
