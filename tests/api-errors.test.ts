import { describe, it, expect, afterEach, vi } from "vitest";
import { apiFetch, ApiError } from "@/lib/api/client";
import { formatValidationDetail, codedErrorMessage } from "@/lib/api/validationErrors";

function respond(status: number, body: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));
}
async function failure(): Promise<ApiError> {
  try {
    await apiFetch("/orders");
  } catch (e) {
    return e as ApiError;
  }
  throw new Error("expected failure");
}

afterEach(() => vi.unstubAllGlobals());

describe("formatValidationDetail", () => {
  it("formats pydantic 422 arrays, never [object Object]", () => {
    const out = formatValidationDetail([
      { loc: ["body", "items", 0, "quantity"], msg: "Input should be greater than or equal to 1", type: "greater_than_equal" },
      { loc: ["body", "coupon_code"], msg: "Value error, too long", type: "value_error" },
    ]);
    expect(out).toBe("Item 1 quantity: Input should be greater than or equal to 1; Coupon code: too long");
    expect(out).not.toContain("object");
  });
  it("passes strings through and ignores junk", () => {
    expect(formatValidationDetail("plain")).toBe("plain");
    expect(formatValidationDetail([{ nope: 1 }, null])).toBeUndefined();
    expect(formatValidationDetail(undefined)).toBeUndefined();
  });
  it("handles a message without loc", () => {
    expect(formatValidationDetail([{ msg: "Bad", type: "x" }])).toBe("Bad");
  });
});

describe("apiFetch error messages", () => {
  it("422 detail array becomes readable text", async () => {
    respond(422, { detail: [{ loc: ["body", "items", 0, "quantity"], msg: "Input should be greater than or equal to 1", type: "t" }] });
    const e = await failure();
    expect(e.status).toBe(422);
    expect(e.message).toBe("Item 1 quantity: Input should be greater than or equal to 1");
  });
  it("array under `message` is handled too", async () => {
    respond(422, { message: [{ loc: ["body", "x"], msg: "bad", type: "t" }] });
    expect((await failure()).message).toBe("X: bad");
  });
  it.each([
    ["invalid_option", /print option is no longer available/],
    ["invalid_turnaround", /turnaround option is no longer available/],
    ["product_unavailable", /no longer available/],
    ["invalid_order_total", /valid total/],
  ])("%s maps to a friendly message and keeps the code", async (code, re) => {
    respond(422, { detail: "raw backend text", error: code });
    const e = await failure();
    expect(e.message).toMatch(re);
    expect(e.code).toBe(code);
  });
  it("invalid_coupon keeps the server's specific message, with a friendly fallback", async () => {
    respond(422, { detail: "Add ₹120 more of items not already on sale", error: "invalid_coupon" });
    expect((await failure()).message).toBe("Add ₹120 more of items not already on sale");
    respond(422, { error: "invalid_coupon" });
    expect((await failure()).message).toBe("This coupon can't be applied to your order.");
  });
  it("unknown codes and plain errors are unchanged", async () => {
    respond(409, { detail: "Prices have changed", error: "price_changed" });
    expect((await failure()).message).toBe("Prices have changed");
    respond(500, {});
    expect((await failure()).message).toBe("API 500: /orders");
    expect(codedErrorMessage(undefined)).toBeUndefined();
  });
});
