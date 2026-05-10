import type { User } from "@/types";
import { delay } from "./delay";

// ─── Mock user ────────────────────────────────────────────────────────────────

const MOCK_USER: User = {
  id: "user-me",
  email: "arjun.sharma@example.in",
  firstName: "Arjun",
  lastName: "Sharma",
  phone: "+91 98765 43210",
  avatarUrl: "https://picsum.photos/seed/userme/100/100",
  createdAt: "2024-06-15T10:00:00Z",
};

// ─── Phone OTP ────────────────────────────────────────────────────────────────

export async function sendOtp(phone: string): Promise<{ success: boolean }> {
  // REAL API: POST /api/v1/auth/send-otp  { phone }
  await delay(800);
  if (!phone || phone.replace(/\D/g, "").length < 10) throw new Error("Invalid phone number");
  return { success: true };
}

export async function verifyPhoneOtp(
  phone: string,
  otp: string
): Promise<{ user: User; token: string; isNewUser: boolean }> {
  // REAL API: POST /api/v1/auth/verify-otp  { phone, otp }
  // isNewUser: true when backend creates a new account (no prior registration)
  await delay(700);
  if (otp !== "123456") throw new Error("Invalid OTP. Use 123456 in demo.");
  const isNewUser = phone === "0000000000";
  return {
    user: { ...MOCK_USER, phone: `+91 ${phone}` },
    token: "mock-jwt-token-phone",
    isNewUser,
  };
}

// ─── Google OAuth ─────────────────────────────────────────────────────────────

export async function loginWithGoogle(): Promise<{ user: User; token: string }> {
  // REAL API: POST /api/v1/auth/google  { id_token }  (id_token from Google SDK)
  await delay(1000);
  return {
    user: {
      ...MOCK_USER,
      id: "user-google",
      firstName: "Google",
      lastName: "User",
      email: "google.user@gmail.com",
      avatarUrl: "https://picsum.photos/seed/googleuser/100/100",
    },
    token: "mock-jwt-token-google",
  };
}

// ─── Profile completion (new phone users who need name collected) ─────────────

export async function completeProfile(
  _token: string,
  data: { firstName: string; lastName: string; email?: string }
): Promise<User> {
  // REAL API: PATCH /api/v1/auth/me  { first_name, last_name, email? }
  await delay(600);
  return { ...MOCK_USER, ...data };
}

// ─── Email + Password ─────────────────────────────────────────────────────────

export async function login(
  email: string,
  _password: string
): Promise<{ user: User; token: string }> {
  // REAL API: POST /api/v1/auth/login  { email, password }
  await delay(800);
  if (!email) throw new Error("Invalid credentials");
  return { user: { ...MOCK_USER, email }, token: "mock-jwt-token-xyz" };
}

export async function register(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<{ user: User; token: string }> {
  // REAL API: POST /api/v1/auth/register  { email, password, first_name, last_name }
  await delay(1000);
  return {
    user: {
      id: "user-new",
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      createdAt: new Date().toISOString(),
    },
    token: "mock-jwt-token-new",
  };
}

// ─── Session ──────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  // REAL API: POST /api/v1/auth/logout
  await delay(200);
}

export async function getMe(token: string): Promise<User | null> {
  // REAL API: GET /api/v1/auth/me  (Authorization: Bearer <token>)
  await delay(300);
  if (token) return MOCK_USER;
  return null;
}

export async function verifyOtp(
  email: string,
  otp: string
): Promise<{ verified: boolean }> {
  // REAL API: POST /api/v1/auth/verify-email-otp  { email, otp }
  await delay(600);
  return { verified: otp === "123456" };
}
