import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api/client";
import { safeRedirect } from "@/lib/safeRedirect";
import { buildProductMetadata } from "@/lib/seo/metadata";
import { buildCspReportOnly, RESET_PASSWORD_HEADERS } from "@/lib/security/headers";
import type { Product } from "@/types";

const pathname = vi.hoisted(() => ({ value: "/" }));
const consent = vi.hoisted(() => ({ status: "accepted" }));
const resetApi = vi.hoisted(() => ({ resetPassword: vi.fn() }));

vi.mock("@/hooks/useAppPathname", () => ({ useAppPathname: () => pathname.value }));
vi.mock("@/hooks/useConsent", () => ({ useConsent: () => ({ status: consent.status }) }));
vi.mock("next/script", () => ({
  default: ({ id, src }: { id?: string; src?: string }) => <i data-testid="script" data-id={id ?? src} />,
}));
vi.mock("@/lib/api/auth", async (orig) => ({ ...(await orig<typeof import("@/lib/api/auth")>()), ...resetApi }));

import { ConsentedScripts } from "@/components/analytics/ConsentedScripts";
import { ResetPasswordForm } from "@/features/auth/ResetPasswordForm";

describe("safeRedirect", () => {
  it.each(["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "%2F%2Fevil.com", "/\t/evil.com", "evil.com", "", null, undefined])(
    "rejects %j",
    (raw) => expect(safeRedirect(raw)).toBe("/account")
  );

  it("allows same-origin relative paths with query strings", () => {
    expect(safeRedirect("/checkout")).toBe("/checkout");
    expect(safeRedirect("/account/orders/5?x=1#y")).toBe("/account/orders/5?x=1#y");
    expect(safeRedirect("//evil.com", "/")).toBe("/");
  });
});

describe("analytics on secret-bearing pages", () => {
  it("loads scripts on normal pages once consent is accepted", () => {
    pathname.value = "/products";
    render(<ConsentedScripts />);
    expect(screen.getAllByTestId("script").length).toBeGreaterThan(0);
  });

  it.each(["/auth/reset-password", "/auth/forgot-password"])("loads nothing on %s", (p) => {
    pathname.value = p;
    render(<ConsentedScripts />);
    expect(screen.queryAllByTestId("script")).toHaveLength(0);
  });

  it("sends no referrer from the reset page", () => {
    expect(RESET_PASSWORD_HEADERS).toEqual([{ key: "Referrer-Policy", value: "no-referrer" }]);
  });
});

describe("ResetPasswordForm token handling", () => {
  beforeEach(() => vi.clearAllMocks());

  it("strips the token from the address bar but still submits it", async () => {
    window.history.pushState(null, "", "/auth/reset-password?token=secret");
    const user = userEvent.setup();
    resetApi.resetPassword.mockResolvedValue(undefined);
    render(<ResetPasswordForm token="secret" />);
    await waitFor(() => expect(window.location.search).toBe(""));
    await user.type(screen.getByLabelText(/^New password/), "longenough1");
    await user.type(screen.getByLabelText(/^Confirm password/), "longenough1");
    await user.click(screen.getByRole("button", { name: /Reset password/ }));
    await waitFor(() => expect(resetApi.resetPassword).toHaveBeenCalledWith("secret", "longenough1"));
  });

  it("offers a new link keyed on the error code, not the message text", async () => {
    const user = userEvent.setup();
    resetApi.resetPassword.mockRejectedValue(new ApiError("anything at all", 400, "invalid_or_expired_token"));
    render(<ResetPasswordForm token="t" />);
    await user.type(screen.getByLabelText(/^New password/), "longenough1");
    await user.type(screen.getByLabelText(/^Confirm password/), "longenough1");
    await user.click(screen.getByRole("button", { name: /Reset password/ }));
    expect(await screen.findByRole("link", { name: /Request a new link/ })).toHaveAttribute("href", "/auth/forgot-password");
  });
});

describe("getPreviousPaymentInfo", () => {
  it("reads top-level string extras from the error envelope", async () => {
    const { getPreviousPaymentInfo } = await import("@/lib/api/orders");
    const err = new ApiError("m", 409, "previous_payment_pending", { status: 409, error: "previous_payment_pending", message: "m", order_id: "55", order_number: "UP-55" });
    expect(getPreviousPaymentInfo(err)).toEqual({ kind: "pending", orderId: "55", orderNumber: "UP-55" });
  });
});

describe("product social metadata", () => {
  it("mirrors the product images into twitter:image", () => {
    const p = { id: "1", slug: "a", name: "A", categorySlug: "c", images: ["https://cdn/p1.jpg"], description: "d", shortDescription: "s" } as unknown as Product;
    const meta = buildProductMetadata(p, "https://x.test");
    expect(meta.twitter?.images).toEqual(["https://cdn/p1.jpg"]);
    expect(meta.openGraph?.images).toEqual([{ url: "https://cdn/p1.jpg", alt: "A" }]);
  });
});

describe("CSP coverage", () => {
  const csp = buildCspReportOnly({ apiUrl: "https://api.x.com/api/v1", cdnUrl: "https://cdn.x.com" });
  it.each(["media-src 'self' blob: https://api.x.com https://cdn.x.com", "https://*.g.doubleclick.net", "https://*.googletagmanager.com", "https://www.recaptcha.net"])(
    "contains %s",
    (needle) => expect(csp).toContain(needle)
  );
});
