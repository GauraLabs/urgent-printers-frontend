import type { User } from "@/types";
import { apiFetch } from "./client";

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

// ─── Phone OTP (legacy — kept for Google account phone-linking flow) ──────────

export async function sendOtp(phone: string): Promise<{ success: boolean }> {
  // REAL API: POST /api/v1/auth/send-otp
  return apiFetch(`${AUTH}/send-otp`, {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function verifyPhoneOtp(
  phone: string,
  otp: string
): Promise<{ user: User; token: string; isNewUser: boolean }> {
  // REAL API: POST /api/v1/auth/verify-otp
  const res = await apiFetch<AuthData>(`${AUTH}/verify-otp`, {
    method: "POST",
    body: JSON.stringify({ phone, otp }),
  });
  return { user: mapUser(res.user), token: res.token, isNewUser: res.isNewUser };
}

// ─── Email registration ───────────────────────────────────────────────────────

export async function initiateRegister(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}): Promise<{ success: boolean }> {
  // REAL API: POST /api/v1/auth/register/initiate
  return apiFetch(`${AUTH}/register/initiate`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function completeRegister(
  phone: string,
  otp: string
): Promise<{ user: User; token: string }> {
  // REAL API: POST /api/v1/auth/register/complete
  const res = await apiFetch<AuthData>(`${AUTH}/register/complete`, {
    method: "POST",
    body: JSON.stringify({ phone, otp }),
  });
  return { user: mapUser(res.user), token: res.token };
}

// ─── Email + Password login ───────────────────────────────────────────────────

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

// ─── Link phone to Google account ────────────────────────────────────────────

export async function linkPhone(
  phone: string,
  otp: string,
  token: string
): Promise<User> {
  // REAL API: POST /api/v1/auth/me/verify-phone
  const res = await apiFetch<BackendUser>(`${AUTH}/me/verify-phone`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ phone, otp }),
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

export async function getMe(token: string): Promise<User | null> {
  // REAL API: GET /api/v1/auth/me
  try {
    const res = await apiFetch<BackendUser>(`${AUTH}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return mapUser(res);
  } catch {
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
  } catch {
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
