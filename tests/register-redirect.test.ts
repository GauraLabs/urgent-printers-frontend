import { describe, it, expect, vi } from "vitest";

const redirect = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ redirect }));

import RegisterRedirect from "@/app/auth/register/page";

describe("/auth/register", () => {
  it("redirects to login", async () => {
    await RegisterRedirect({ searchParams: Promise.resolve({}) });
    expect(redirect).toHaveBeenLastCalledWith("/auth/login");
  });

  it("keeps the redirect param", async () => {
    await RegisterRedirect({ searchParams: Promise.resolve({ redirect: "/checkout" }) });
    expect(redirect).toHaveBeenLastCalledWith("/auth/login?redirect=%2Fcheckout");
  });
});
