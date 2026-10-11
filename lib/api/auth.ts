import type { User } from "@/types";
import { apiFetch, ApiError } from "./client";
import { logApiError } from "./logApiError";

const AUTH = "/auth";

// ─── Backend shape ────────────────────────────────────────────────────────────
// Backend returns camelCase fields per API spec

interface BackendUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
  hasPassword?: boolean;
  googleLinked?: boolean;
  has_password?: boolean;
  google_linked?: boolean;
}

interface AuthData {
  user: BackendUser;
  token: string;
  isNewUser: boolean;
}

function mapUser(u: BackendUser): User {
  return {
    id: u.id,
    email: u.email ?? undefined,
    firstName: u.firstName ?? "",
    lastName: u.lastName ?? "",
    phone: u.phone ?? undefined,
    avatarUrl: u.avatarUrl ?? undefined,
    createdAt: u.createdAt,
    hasPassword: u.hasPassword ?? u.has_password,
    googleLinked: u.googleLinked ?? u.google_linked,
  };
}

// ─── Phone OTP (Firebase) ─────────────────────────────────────────────────────

export async function firebaseVerifyPhone(
  firebaseToken: string
): Promise<{ user: User; token: string; isNewUser: boolean }> {
  // REAL API: POST /api/v1/auth/firebase-phone-verify
  // No account yet — phone is the login credential. firebaseToken from result.user.getIdToken()
  const res = await apiFetch<AuthData>(`${AUTH}/firebase-phone-verify`, {
    method: "POST",
    body: JSON.stringify({ firebase_token: firebaseToken }),
  });
  return { user: mapUser(res.user), token: res.token, isNewUser: res.isNewUser };
}

export async function firebaseVerifyPhoneLink(
  firebaseToken: string,
  accessToken: string
): Promise<User> {
  // REAL API: POST /api/v1/auth/me/verify-phone-firebase
  // Already logged in via Google/email — adding phone to existing account
  const res = await apiFetch<BackendUser>(`${AUTH}/me/verify-phone-firebase`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ firebase_token: firebaseToken }),
  });
  return mapUser(res);
}

// ─── Email + Password login ───────────────────────────────────────────────────

/** 429 is rate limiting, not a wrong password; other non-401 failures are not credential errors either. */
export function loginErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) return "Too many attempts — please wait a few minutes and try again.";
    if (err.status === 401 || err.status === 400 || err.status === 422) return "Invalid email or password. Please try again.";
  }
  return "We couldn\u2019t sign you in right now. Please try again.";
}

export async function login(
  email: string,
  password: string
): Promise<{ user: User; token: string }> {
  // REAL API: POST /api/v1/auth/login
  const res = await apiFetch<AuthData>(`${AUTH}/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return { user: mapUser(res.user), token: res.token };
}

// ─── Google OAuth ─────────────────────────────────────────────────────────────

export async function loginWithGoogle(
  idToken: string
): Promise<{ user: User; token: string; isNewUser: boolean }> {
  // REAL API: POST /api/v1/auth/google
  // idToken comes from google.accounts.id.initialize callback ({ credential })
  const res = await apiFetch<AuthData>(`${AUTH}/google`, {
    method: "POST",
    body: JSON.stringify({ id_token: idToken }),
  });
  return { user: mapUser(res.user), token: res.token, isNewUser: res.isNewUser };
}

// ─── Password + Google linking ────────────────────────────────────────────────

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const FORGOT_PASSWORD_GENERIC_MESSAGE =
  "If an account exists for that email, we\u2019ve sent a reset link.";

const PASSWORD_ERROR_MESSAGES: Record<string, string> = {
  invalid_or_expired_token: "This reset link is invalid or has expired. Please request a new one.",
  invalid_current_password: "Your current password is incorrect.",
  google_already_linked: "That Google account is already linked to a different Urgent Printers account.",
  google_email_unverified: "This Google account\u2019s email isn\u2019t verified.",
  google_account_mismatch: "Your account is already linked to a different Google account.",
};

export function googleLoginErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.code === "email_in_use_unverified") {
    return "An account with this email already exists. Sign in with your mobile number, then link Google from your Profile.";
  }
  return err instanceof Error ? err.message : "Google sign-in failed";
}

export function passwordErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.code && PASSWORD_ERROR_MESSAGES[err.code]) return PASSWORD_ERROR_MESSAGES[err.code];
    if (err.status === 429) return "Too many attempts \u2014 please wait a few minutes and try again.";
  }
  return fallback;
}

export async function requestPasswordReset(email: string): Promise<void> {
  // REAL API: POST /api/v1/auth/password/forgot — always 200, never reveals whether the email exists
  await apiFetch(`${AUTH}/password/forgot`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  // REAL API: POST /api/v1/auth/password/reset — 400 invalid_or_expired_token
  await apiFetch(`${AUTH}/password/reset`, {
    method: "POST",
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}

export async function changePassword(
  accessToken: string,
  data: { currentPassword: string | null; newPassword: string }
): Promise<{ user: User; token: string | null }> {
  // REAL API: PUT /api/v1/auth/me/password — currentPassword null when the account has no password yet;
  // 400 invalid_current_password. All refresh tokens are revoked server-side; the response carries a
  // fresh access token (and a new refresh cookie) so the session continues.
  const res = await apiFetch<BackendUser & { token?: string; user?: BackendUser }>(`${AUTH}/me/password`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ current_password: data.currentPassword, new_password: data.newPassword }),
  });
  return { user: mapUser(res.user ?? res), token: res.token ?? null };
}

export async function linkGoogleAccount(accessToken: string, idToken: string): Promise<User> {
  // REAL API: POST /api/v1/auth/me/link-google — 409 google_already_linked
  const res = await apiFetch<BackendUser>(`${AUTH}/me/link-google`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ id_token: idToken }),
  });
  return mapUser(res);
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function completeProfile(
  token: string,
  data: { firstName: string; lastName: string; email?: string }
): Promise<User> {
  // REAL API: PATCH /api/v1/auth/me
  const res = await apiFetch<BackendUser>(`${AUTH}/me`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return mapUser(res);
}

export async function updateProfile(
  token: string,
  data: { firstName: string; lastName: string; email?: string; avatarUrl?: string }
): Promise<User> {
  // REAL API: PATCH /api/v1/auth/me
  const res = await apiFetch<BackendUser>(`${AUTH}/me`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return mapUser(res);
}

export async function getMe(token: string): Promise<User | null> {
  // REAL API: GET /api/v1/auth/me
  try {
    const res = await apiFetch<BackendUser>(`${AUTH}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return mapUser(res);
  } catch (err) {
    logApiError("getMe", err);
    return null;
  }
}

// ─── Session ──────────────────────────────────────────────────────────────────

export async function refreshTokens(): Promise<string | null> {
  // REAL API: POST /api/v1/auth/refresh  (refresh_token sent automatically as httpOnly cookie)
  try {
    const res = await apiFetch<{ access_token: string }>(`${AUTH}/refresh`, {
      method: "POST",
    });
    return res.access_token;
  } catch (err) {
    logApiError("refreshTokens", err);
    return null;
  }
}

export async function logout(token?: string): Promise<void> {
  // REAL API: POST /api/v1/auth/logout  (clears refresh_token cookie server-side)
  await apiFetch(`${AUTH}/logout`, {
    method: "POST",
    ...(token && { headers: { Authorization: `Bearer ${token}` } }),
  });
}

// ─── Legacy (email OTP verify — kept for email registration path if needed) ───

export async function verifyOtp(
  _email: string,
  _otp: string
): Promise<{ verified: boolean }> {
  return { verified: false };
}
