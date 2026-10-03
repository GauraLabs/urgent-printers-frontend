import { describe, it, beforeEach } from "vitest";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/revalidate/products/route";
import { planProductRevalidation } from "@/lib/revalidate-products";
import { revalidated } from "./stubs/next-cache";

const SECRET = "s3cret-value";
let ipCounter = 0;

function req(body: unknown, opts: { secret?: string | null; ip?: string; raw?: string } = {}): NextRequest {
  const headers = new Headers({ "content-type": "application/json", "x-forwarded-for": opts.ip ?? `10.0.0.${++ipCounter}` });
  const secret = opts.secret === undefined ? SECRET : opts.secret;
  if (secret !== null) headers.set("X-Revalidate-Secret", secret);
  return new NextRequest("http://localhost/api/revalidate/products", {
    method: "POST",
    headers,
    body: opts.raw ?? JSON.stringify(body),
  });
}

describe("POST /api/revalidate/products", () => {
  beforeEach(() => {
    process.env.REVALIDATE_SECRET = SECRET;
    revalidated.length = 0;
  });

  it("401 without or with a wrong secret, and nothing is revalidated", async () => {
    assert.equal((await POST(req({ all: true }, { secret: null }))).status, 401);
    assert.equal((await POST(req({ all: true }, { secret: "nope" }))).status, 401);
    assert.equal(revalidated.length, 0);
  });

  it("401 when REVALIDATE_SECRET is unset", async () => {
    delete process.env.REVALIDATE_SECRET;
    assert.equal((await POST(req({ all: true }))).status, 401);
  });

  it("revalidates product, category and home paths (not tags)", async () => {
    const res = await POST(req({ products: [{ category_slug: "business-cards", slug: "standard-cards" }], category_slugs: ["flyers"], all: false }));
    assert.equal(res.status, 200);
    assert.deepEqual(revalidated.map((r) => r.path).sort(), [
      "/", "/products/business-cards", "/products/business-cards/standard-cards", "/products/flyers",
    ]);
    assert.ok(revalidated.every((r) => r.type === undefined));
  });

  it("all=true revalidates the root layout", async () => {
    const res = await POST(req({ all: true }));
    assert.equal(res.status, 200);
    assert.deepEqual(revalidated, [{ path: "/", type: "layout" }]);
  });

  it("400 on bad JSON, bad slugs, non-boolean all, oversize arrays", async () => {
    assert.equal((await POST(req(null, { raw: "{nope" }))).status, 400);
    assert.equal((await POST(req({ products: [{ category_slug: "../x", slug: "a" }] }))).status, 400);
    assert.equal((await POST(req({ products: [{ category_slug: "a", slug: "A_B" }] }))).status, 400);
    assert.equal((await POST(req({ category_slugs: ["ok", "bad slug"] }))).status, 400);
    assert.equal((await POST(req({ all: "yes" }))).status, 400);
    assert.equal((await POST(req({ category_slugs: Array.from({ length: 201 }, () => "a") }))).status, 400);
    assert.equal(revalidated.length, 0);
  });

  it("accepts exactly 200 items", async () => {
    const res = await POST(req({ category_slugs: Array.from({ length: 200 }, (_, i) => `c${i}`) }));
    assert.equal(res.status, 200);
  });

  it("429 after 30 requests per IP, before the secret is even checked", async () => {
    const ip = "203.0.113.9";
    for (let i = 0; i < 30; i++) assert.equal((await POST(req({ all: true }, { ip }))).status, 200);
    assert.equal((await POST(req({ all: true }, { ip }))).status, 429);
    assert.equal((await POST(req({ all: true }, { ip, secret: "wrong" }))).status, 429);
    assert.equal((await POST(req({ all: true }, { ip: "203.0.113.10" }))).status, 200);
  });
});

describe("planProductRevalidation", () => {
  it("empty body just refreshes the home page", () => {
    assert.deepEqual(planProductRevalidation({}), { ok: true, all: false, paths: ["/"] });
  });
  it("rejects non-objects", () => {
    assert.equal(planProductRevalidation([]).ok, false);
    assert.equal(planProductRevalidation("x").ok, false);
  });
});
