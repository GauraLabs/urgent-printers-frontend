import { describe, it, expect, afterEach, vi } from "vitest";
import { apiFetch, NetworkError, ResponseHandlingError, ApiError } from "@/lib/api/client";
import { isInfrastructureFailure } from "@/lib/api/errorClassification";
import { createOrder } from "@/lib/api/orders";
import type { CreateOrderRequest } from "@/types";

afterEach(() => vi.unstubAllGlobals());

describe("error classification", () => {
  it("apiFetch converts a rejected fetch into NetworkError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    const err = await apiFetch("/x").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NetworkError);
    expect(isInfrastructureFailure(err)).toBe(true);
  });

  it("an aborted fetch stays an AbortError and is connectivity", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new DOMException("t", "AbortError"); }));
    const err = await apiFetch("/x").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(DOMException);
    expect(isInfrastructureFailure(err)).toBe(true);
  });

  it("a bare TypeError (e.g. a mapping bug) is not connectivity", () => {
    expect(isInfrastructureFailure(new TypeError("Cannot read properties of undefined"))).toBe(false);
  });

  it("a 2xx with a non-JSON body (captive portal) is connectivity, not 'order may exist'", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>", { status: 200 })));
    const err = await apiFetch("/x").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NetworkError);
    expect(isInfrastructureFailure(err)).toBe(true);
  });

  it("non-fetch programming errors are not turned into NetworkError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new RangeError("bug"); }));
    const err = await apiFetch("/x").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RangeError);
  });

  it("createOrder wraps a mapping failure on a 2xx response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ data: {} }), { status: 201 })));
    const req = { items: [], shippingAddress: {}, paymentMethod: "cod" } as unknown as CreateOrderRequest;
    const err = await createOrder(req, "tok").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ResponseHandlingError);
    expect(isInfrastructureFailure(err)).toBe(false);
  });

  it("5xx ApiError is still infrastructure, 4xx and orders_halted are not", () => {
    expect(isInfrastructureFailure(new ApiError("x", 502))).toBe(true);
    expect(isInfrastructureFailure(new ApiError("x", 409))).toBe(false);
    expect(isInfrastructureFailure(new ApiError("x", 503, "orders_halted"))).toBe(false);
  });
});
