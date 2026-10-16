import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { buildGcrConfig, gcrCountryCode, gcrDeliveryDate, isGcrEligible } from "@/lib/gcr";
import { buildCspReportOnly } from "@/lib/security/headers";
import type { Order } from "@/types";

const scriptProps = vi.hoisted(() => ({ last: null as null | { src?: string; strategy?: string; onReady?: () => void }, count: 0 }));
vi.mock("next/script", () => ({
  default: (p: { src?: string; strategy?: string; onReady?: () => void }) => {
    scriptProps.last = p;
    scriptProps.count += 1;
    return <span data-testid="script" data-src={p.src} />;
  },
}));

import { GoogleCustomerReviewsOptIn } from "@/features/checkout/GoogleCustomerReviewsOptIn";

const NOW = new Date(2026, 9, 17, 10, 0, 0);

function order(over: Partial<Order> = {}): Order {
  return {
    id: "1", orderNumber: "UP-2026-0042", status: "confirmed", paymentMethod: "online", paymentStatus: "paid",
    items: [], shippingAddress: { fullName: "A", phone: "1", line1: "x", city: "c", state: "s", postalCode: "1", country: "India" },
    pricing: {}, totalAmount: 1, statusHistory: [], placedAt: "2026-10-17", updatedAt: "2026-10-17",
    estimatedDelivery: "2026-10-22",
    ...over,
  } as unknown as Order;
}

describe("gcr helpers", () => {
  it("maps country", () => {
    expect(gcrCountryCode("India")).toBe("IN");
    expect(gcrCountryCode(" india ")).toBe("IN");
    expect(gcrCountryCode("in")).toBe("IN");
    expect(gcrCountryCode(undefined)).toBe("IN");
    expect(gcrCountryCode("Narnia")).toBe("IN");
  });

  it("formats delivery date as YYYY-MM-DD with fallback", () => {
    expect(gcrDeliveryDate("2026-10-22", NOW)).toBe("2026-10-22");
    expect(gcrDeliveryDate("2026-10-22T18:30:00Z", NOW)).toBe("2026-10-22");
    expect(gcrDeliveryDate(undefined, NOW)).toBe("2026-10-27");
    expect(gcrDeliveryDate("garbage", NOW)).toBe("2026-10-27");
    expect(gcrDeliveryDate("2026-10-01", NOW)).toBe("2026-10-27");
    expect(gcrDeliveryDate("Oct 22 2026", NOW)).toBe("2026-10-22");
  });

  it("eligibility", () => {
    expect(isGcrEligible(order())).toBe(true);
    expect(isGcrEligible(order({ paymentMethod: "cod", paymentStatus: "pending" }))).toBe(true);
    expect(isGcrEligible(order({ paymentStatus: "pending" }))).toBe(false);
    expect(isGcrEligible(order({ paymentStatus: "failed" }))).toBe(false);
    expect(isGcrEligible(order({ status: "cancelled" }))).toBe(false);
    expect(isGcrEligible(order({ paymentMethod: "cod", status: "cancelled" }))).toBe(false);
  });

  it("builds config or null", () => {
    expect(buildGcrConfig(order(), "a@b.com", "5844943747", NOW)).toEqual({
      merchant_id: 5844943747, order_id: "UP-2026-0042", email: "a@b.com",
      delivery_country: "IN", estimated_delivery_date: "2026-10-22",
    });
    expect(buildGcrConfig(order(), undefined, "5844943747", NOW)).toBeNull();
    expect(buildGcrConfig(order(), "  ", "5844943747", NOW)).toBeNull();
    expect(buildGcrConfig(order(), "a@b.com", undefined, NOW)).toBeNull();
    expect(buildGcrConfig(order(), "a@b.com", "abc", NOW)).toBeNull();
    expect(buildGcrConfig(order({ paymentStatus: "pending" }), "a@b.com", "5844943747", NOW)).toBeNull();
  });
});

describe("GoogleCustomerReviewsOptIn", () => {
  beforeEach(() => {
    scriptProps.last = null;
    scriptProps.count = 0;
    delete window.gapi;
  });

  it("renders nothing without config", () => {
    const { container } = render(<GoogleCustomerReviewsOptIn config={null} />);
    expect(container).toBeEmptyDOMElement();
    expect(scriptProps.count).toBe(0);
  });

  it("loads platform.js afterInteractive and renders the survey opt-in once", () => {
    const config = buildGcrConfig(order(), "a@b.com", "5844943747", NOW)!;
    const surveyRender = vi.fn();
    window.gapi = { load: vi.fn((_n: string, cb: () => void) => { cb(); }), surveyoptin: { render: surveyRender } };
    render(<GoogleCustomerReviewsOptIn config={config} />);
    expect(scriptProps.last?.src).toBe("https://apis.google.com/js/platform.js");
    expect(scriptProps.last?.strategy).toBe("afterInteractive");
    scriptProps.last?.onReady?.();
    scriptProps.last?.onReady?.();
    expect(window.gapi.load).toHaveBeenCalledTimes(1);
    expect(window.gapi.load).toHaveBeenCalledWith("surveyoptin", expect.any(Function));
    expect(surveyRender).toHaveBeenCalledTimes(1);
    expect(surveyRender).toHaveBeenCalledWith(config);
  });
});

describe("CSP", () => {
  it("allows GCR origins", () => {
    const csp = buildCspReportOnly({});
    const dir = (n: string) => csp.split("; ").find((d) => d.startsWith(`${n} `)) ?? "";
    expect(dir("script-src")).toContain("https://apis.google.com");
    for (const n of ["frame-src", "connect-src"]) expect(dir(n)).toContain("https://apis.google.com");
    expect(dir("frame-src")).toContain("https://*.googleusercontent.com");
    expect(dir("frame-src")).toContain("https://www.gstatic.com");
    expect(dir("frame-src")).toContain("https://www.google.com");
  });
});
