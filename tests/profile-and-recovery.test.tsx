import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import { embeddedGst } from "@/lib/utils";

vi.mock("@/features/account/PasswordSection", () => ({ PasswordSection: () => null }));
vi.mock("@/features/account/GoogleLinkSection", () => ({ GoogleLinkSection: () => null }));
vi.mock("@/lib/api/auth", () => ({ updateProfile: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import ProfilePage from "@/app/account/profile/page";
import { useAuthStore } from "@/features/auth/store";
import { DegradedStatusBanner } from "@/components/layout/DegradedStatusBanner";
import { useDegradedStore } from "@/features/site-status/degradedStore";
import { SafeImage } from "@/components/common/SafeImage";
import { ReviewStep } from "@/features/checkout/ReviewStep";
import type { User } from "@/types";

describe("embeddedGst", () => {
  it("is computed on the GST-inclusive total including shipping", () => {
    expect(embeddedGst(999)).toBe(152.39);
    expect(embeddedGst(900)).toBe(137.29);
    expect(embeddedGst(0)).toBe(0);
  });
});

describe("profile form hydration", () => {
  const user = { id: "1", firstName: "Asha", lastName: "Rao", email: "a@x.in", phone: "+91 9876543210", createdAt: "2026-01-01" } as User;
  beforeEach(() => useAuthStore.setState({ user: null, token: "t", _isHydrated: false }));

  it("fills the form once the store hydrates, with the phone read-only", async () => {
    render(<ProfilePage />);
    expect((screen.getByLabelText(/First name/) as HTMLInputElement).value).toBe("");
    act(() => useAuthStore.setState({ user, _isHydrated: true }));
    await waitFor(() => expect((screen.getByLabelText(/First name/) as HTMLInputElement).value).toBe("Asha"));
    expect((screen.getByLabelText("Email address") as HTMLInputElement).value).toBe("a@x.in");
    const phone = screen.getByLabelText("Mobile number") as HTMLInputElement;
    expect(phone.value).toBe("9876543210");
    expect(phone.readOnly).toBe(true);
  });

  it("does not overwrite edits in progress", async () => {
    useAuthStore.setState({ user, _isHydrated: true });
    render(<ProfilePage />);
    const first = screen.getByLabelText(/First name/) as HTMLInputElement;
    fireEvent.change(first, { target: { value: "Zed" } });
    await waitFor(() => expect(first.value).toBe("Zed"));
    act(() => useAuthStore.setState({ user: { ...user, lastName: "Other" } }));
    expect(first.value).toBe("Zed");
  });
});

describe("connectivity recovery", () => {
  it("clears the degraded banner on the online event", () => {
    useDegradedStore.setState({ isDegraded: true });
    render(<DegradedStatusBanner />);
    expect(screen.getByText(/trouble connecting/i)).toBeTruthy();
    act(() => { window.dispatchEvent(new Event("online")); });
    expect(screen.queryByText(/trouble connecting/i)).toBeNull();
  });

  it("retries a failed image when the connection returns", () => {
    const { container } = render(<SafeImage src="/a.png" alt="thumb" width={10} height={10} />);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    act(() => { window.dispatchEvent(new Event("online")); });
    expect(container.querySelector("img")).not.toBeNull();
  });

  it("shows a Retry button on the pricing notice", () => {
    const onRetry = vi.fn();
    render(
      <ReviewStep
        items={[]} address={{ label: "Home", fullName: "A", phone: "1", line1: "x", city: "c", state: "s", postalCode: "1", country: "IN" }}
        paymentMethod="cod" preview={null} previewLoading={false}
        previewError="Couldn't confirm the latest price — check your connection and tap Retry."
        onPlaceOrder={async () => {}} onBack={() => {}} isPlacing={false} ordersHalted={false} haltMessage={null} priceNotice={null}
        onRetryPreview={onRetry}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.queryByText(/Failed to fetch/)).toBeNull();
  });
});
