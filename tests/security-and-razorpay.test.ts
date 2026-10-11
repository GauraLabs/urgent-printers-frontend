import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { buildSecurityHeaders, buildCspReportOnly } from "@/lib/security/headers";

describe("security headers", () => {
  const headers = Object.fromEntries(
    buildSecurityHeaders({ apiUrl: "https://api.example.com/api/v1", cdnUrl: "https://cdn.example.com" }).map((h) => [h.key, h.value])
  );

  it("sets the baseline headers and enforces only frame-ancestors", () => {
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["X-Frame-Options"]).toBe("SAMEORIGIN");
    expect(headers["Content-Security-Policy"]).toBe("frame-ancestors 'self'");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
    expect(headers["Permissions-Policy"]).toContain("payment=(self");
  });

  it("report-only CSP allows the API origin and every third party the site loads", () => {
    const csp = buildCspReportOnly({ apiUrl: "https://api.example.com/api/v1", cdnUrl: "https://cdn.example.com" });
    for (const origin of [
      "https://api.example.com", "https://cdn.example.com", "https://checkout.razorpay.com", "https://lumberjack.razorpay.com",
      "https://www.googletagmanager.com", "https://www.clarity.ms", "https://accounts.google.com", "https://www.gstatic.com",
      "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com", "https://*.firebaseapp.com",
    ]) expect(csp).toContain(origin);
    expect(csp).not.toContain("frame-ancestors");
    expect(headers["Content-Security-Policy-Report-Only"]).toBe(csp);
  });
});

describe("loadRazorpay", () => {
  let loadRazorpay: () => Promise<boolean>;
  beforeEach(async () => {
    ({ loadRazorpay } = await vi.importActual<typeof import("@/lib/razorpay")>("@/lib/razorpay"));
  });

  afterEach(() => {
    delete window.Razorpay;
    document.head.querySelectorAll("script").forEach((s) => s.remove());
  });

  it("resolves true immediately when the SDK is present", async () => {
    window.Razorpay = class {} as unknown as typeof window.Razorpay;
    await expect(loadRazorpay()).resolves.toBe(true);
    expect(document.head.querySelector("script")).toBeNull();
  });

  it("injects one script for concurrent callers and resolves on load", async () => {
    const a = loadRazorpay();
    const b = loadRazorpay();
    const scripts = document.head.querySelectorAll('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    expect(scripts).toHaveLength(1);
    window.Razorpay = class {} as unknown as typeof window.Razorpay;
    scripts[0].dispatchEvent(new Event("load"));
    await expect(Promise.all([a, b])).resolves.toEqual([true, true]);
  });

  it("resolves false on a load error so the failed-to-load guard fires, then retries", async () => {
    const first = loadRazorpay();
    document.head.querySelector("script")!.dispatchEvent(new Event("error"));
    await expect(first).resolves.toBe(false);
    const second = loadRazorpay();
    expect(document.head.querySelectorAll("script")).toHaveLength(1);
    document.head.querySelector("script")!.dispatchEvent(new Event("error"));
    await expect(second).resolves.toBe(false);
  });
});

describe("loadRazorpay load-without-global", () => {
  it("removes the tag and resolves false when load fires but window.Razorpay is missing", async () => {
    const { loadRazorpay } = await vi.importActual<typeof import("@/lib/razorpay")>("@/lib/razorpay");
    const p = loadRazorpay();
    document.head.querySelector("script")!.dispatchEvent(new Event("load"));
    await expect(p).resolves.toBe(false);
    expect(document.head.querySelector("script")).toBeNull();
  });
});
