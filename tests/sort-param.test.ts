import { describe, expect, it } from "vitest";
import { parseBadgeParam, parseSortParam } from "@/lib/api/products";

describe("parseSortParam", () => {
  it.each(["price-asc", "price-desc", "rating", "newest", "popular"])("keeps %s", (v) => {
    expect(parseSortParam(v)).toBe(v);
  });

  it.each(["", "bogus", "price_asc", "toString", "__proto__", "constructor"])("drops %j", (v) => {
    expect(parseSortParam(v)).toBeUndefined();
  });
});

describe("parseBadgeParam", () => {
  it.each(["bestseller", "new", "sale", "popular"])("keeps %s", (v) => {
    expect(parseBadgeParam(v)).toBe(v);
  });

  it.each(["", "bogus", "Sale", "toString", "__proto__", "constructor", "hasOwnProperty"])("drops %j", (v) => {
    expect(parseBadgeParam(v)).toBeUndefined();
  });
});
