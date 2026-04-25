import type { User } from "@/types";
import { delay } from "./delay";

// ─── Real API: replace the body of each function with a fetch() call ─────────

const MOCK_USER: User = {
  id: "user-me",
  email: "arjun.sharma@example.in",
  firstName: "Arjun",
  lastName: "Sharma",
  phone: "+91 98765 43210",
  avatarUrl: "https://picsum.photos/seed/userme/100/100",
  createdAt: "2024-06-15T10:00:00Z",
};

export async function login(
  email: string,
  _password: string
): Promise<{ user: User; token: string }> {
  // REAL API: return fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }).then(r => r.json())
  await delay(800);
  if (email) {
    return { user: { ...MOCK_USER, email }, token: "mock-jwt-token-xyz" };
  }
  throw new Error("Invalid credentials");
}

export async function register(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<{ user: User; token: string }> {
  // REAL API: return fetch('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json())
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

export async function logout(): Promise<void> {
  // REAL API: return fetch('/api/auth/logout', { method: 'POST' }).then(r => r.json())
  await delay(200);
}

export async function getMe(token: string): Promise<User | null> {
  // REAL API: return fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
  await delay(300);
  if (token) return MOCK_USER;
  return null;
}

export async function verifyOtp(
  email: string,
  otp: string
): Promise<{ verified: boolean }> {
  // REAL API: return fetch('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp }) }).then(r => r.json())
  await delay(600);
  return { verified: otp === "123456" };
}
