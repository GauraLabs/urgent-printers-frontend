import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api/client";

const api = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  changePassword: vi.fn(),
  linkGoogleAccount: vi.fn(),
}));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));

vi.mock("sonner", () => ({ toast }));
vi.mock("@/lib/api/auth", async (orig) => ({ ...(await orig<typeof import("@/lib/api/auth")>()), ...api }));

import { ForgotPasswordForm } from "@/features/auth/ForgotPasswordForm";
import { ResetPasswordForm } from "@/features/auth/ResetPasswordForm";
import { PasswordSection } from "@/features/account/PasswordSection";
import { GoogleLinkSection } from "@/features/account/GoogleLinkSection";
import { useAuthStore } from "@/features/auth/store";
import { mapUserForTest } from "./fixtures/user";

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ user: null, token: null });
});

describe("ForgotPasswordForm", () => {
  it("validates the email before calling the API", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    await user.click(screen.getByRole("button", { name: /Send reset link/ }));
    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Email address/), "nope");
    await user.click(screen.getByRole("button", { name: /Send reset link/ }));
    expect(await screen.findByText("Enter a valid email")).toBeInTheDocument();
    expect(api.requestPasswordReset).not.toHaveBeenCalled();
  });

  it("shows the generic message on success", async () => {
    const user = userEvent.setup();
    api.requestPasswordReset.mockResolvedValue(undefined);
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText(/Email address/), "a@b.com");
    await user.click(screen.getByRole("button", { name: /Send reset link/ }));
    expect(await screen.findByRole("status")).toHaveTextContent(/If an account exists for that email, we.ve sent a reset link/);
    expect(api.requestPasswordReset).toHaveBeenCalledWith("a@b.com");
  });
});

describe("ResetPasswordForm", () => {
  it("enforces length and matching passwords", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm token="t" />);
    await user.type(screen.getByLabelText(/^New password/), "short");
    await user.type(screen.getByLabelText(/^Confirm password/), "short");
    await user.click(screen.getByRole("button", { name: /Reset password/ }));
    expect(await screen.findByText("Password must be at least 8 characters")).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/^New password/));
    await user.type(screen.getByLabelText(/^New password/), "longenough1");
    await user.click(screen.getByRole("button", { name: /Reset password/ }));
    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
    expect(api.resetPassword).not.toHaveBeenCalled();
  });

  it("maps invalid_or_expired_token to a readable message", async () => {
    const user = userEvent.setup();
    api.resetPassword.mockRejectedValue(new ApiError("bad", 400, "invalid_or_expired_token"));
    render(<ResetPasswordForm token="t" />);
    await user.type(screen.getByLabelText(/^New password/), "longenough1");
    await user.type(screen.getByLabelText(/^Confirm password/), "longenough1");
    await user.click(screen.getByRole("button", { name: /Reset password/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid or has expired/);
    expect(api.resetPassword).toHaveBeenCalledWith("t", "longenough1");
  });

  it("links to login after success", async () => {
    const user = userEvent.setup();
    api.resetPassword.mockResolvedValue(undefined);
    render(<ResetPasswordForm token="t" />);
    await user.type(screen.getByLabelText(/^New password/), "longenough1");
    await user.type(screen.getByLabelText(/^Confirm password/), "longenough1");
    await user.click(screen.getByRole("button", { name: /Reset password/ }));
    expect(await screen.findByRole("link", { name: /Go to sign in/ })).toHaveAttribute("href", "/auth/login");
  });

  it("explains a missing token", () => {
    render(<ResetPasswordForm token="" />);
    expect(screen.getByRole("alert")).toHaveTextContent(/incomplete/);
  });
});

describe("PasswordSection", () => {
  it("offers Set password without a current-password field when the account has none", async () => {
    const user = userEvent.setup();
    useAuthStore.setState({ user: mapUserForTest({ hasPassword: false }), token: "tok" });
    api.changePassword.mockResolvedValue({ user: mapUserForTest({ hasPassword: true }), token: "fresh-tok" });
    render(<PasswordSection />);
    expect(screen.getByRole("heading", { name: "Set password" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Current password/)).toBeNull();
    await user.type(screen.getByLabelText(/^New password/), "longenough1");
    await user.type(screen.getByLabelText(/^Confirm password/), "longenough1");
    await user.click(screen.getByRole("button", { name: "Set password" }));
    await waitFor(() => expect(api.changePassword).toHaveBeenCalledWith("tok", { currentPassword: null, newPassword: "longenough1" }));
    await waitFor(() => expect(useAuthStore.getState().user?.hasPassword).toBe(true));
    expect(useAuthStore.getState().token).toBe("fresh-tok");
  });

  it("shows Change password and surfaces invalid_current_password", async () => {
    const user = userEvent.setup();
    useAuthStore.setState({ user: mapUserForTest({ hasPassword: true }), token: "tok" });
    api.changePassword.mockRejectedValue(new ApiError("x", 400, "invalid_current_password"));
    render(<PasswordSection />);
    expect(screen.getByRole("heading", { name: "Change password" })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Current password/), "oldpassword");
    await user.type(screen.getByLabelText(/^New password/), "longenough1");
    await user.type(screen.getByLabelText(/^Confirm password/), "longenough1");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Your current password is incorrect."));
  });

  it("renders nothing against an old backend that omits has_password", () => {
    useAuthStore.setState({ user: mapUserForTest({}), token: "tok" });
    const { container } = render(<PasswordSection />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("googleLoginErrorMessage", () => {
  it("explains email_in_use_unverified", async () => {
    const { googleLoginErrorMessage } = await vi.importActual<typeof import("@/lib/api/auth")>("@/lib/api/auth");
    expect(googleLoginErrorMessage(new ApiError("x", 409, "email_in_use_unverified"))).toBe(
      "An account with this email already exists. Sign in with your mobile number, then link Google from your Profile."
    );
    expect(googleLoginErrorMessage(new Error("boom"))).toBe("boom");
  });
});

describe("passwordErrorMessage", () => {
  it("maps every link-google code", async () => {
    const { passwordErrorMessage } = await vi.importActual<typeof import("@/lib/api/auth")>("@/lib/api/auth");
    expect(passwordErrorMessage(new ApiError("x", 400, "google_email_unverified"), "f")).toMatch(/email isn.t verified/);
    expect(passwordErrorMessage(new ApiError("x", 409, "google_account_mismatch"), "f")).toMatch(/different Google account/);
    expect(passwordErrorMessage(new ApiError("x", 409, "google_already_linked"), "f")).toMatch(/already linked to a different Urgent Printers/);
    expect(passwordErrorMessage(new Error("net"), "fallback")).toBe("fallback");
  });
});

describe("GoogleLinkSection", () => {
  it("shows Linked when google_linked", () => {
    useAuthStore.setState({ user: mapUserForTest({ googleLinked: true }), token: "tok" });
    render(<GoogleLinkSection />);
    expect(screen.getByText("Linked")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Link Google/ })).toBeNull();
  });

  it("renders Google's button and links, mapping google_already_linked", async () => {
    useAuthStore.setState({ user: mapUserForTest({ googleLinked: false }), token: "tok" });
    let callback: (r: { credential: string; select_by: string }) => void = () => {};
    const renderButton = vi.fn();
    window.google = {
      accounts: {
        id: {
          initialize: (cfg) => { callback = cfg.callback; },
          prompt: vi.fn(),
          renderButton,
          disableAutoSelect: vi.fn(),
          revoke: vi.fn(),
        },
      },
    };
    api.linkGoogleAccount.mockRejectedValueOnce(new ApiError("x", 409, "google_already_linked"));
    render(<GoogleLinkSection />);
    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    callback({ credential: "idtok", select_by: "btn" });
    await waitFor(() => expect(api.linkGoogleAccount).toHaveBeenCalledWith("tok", "idtok"));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/already linked/)));
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    delete window.google;
  });
});
