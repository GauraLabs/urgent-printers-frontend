import { initializeApp, getApps, FirebaseError, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

let _auth: Auth | undefined;

// Lazy getter — only initializes when called, never during SSR.
// Firebase Auth is a browser-only SDK; calling it server-side throws.
export function getFirebaseAuth(): Auth {
  if (!_auth) {
    const app: FirebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    _auth = getAuth(app);
  }
  return _auth;
}

// Maps Firebase Auth error codes to user-facing copy. Unknown codes fall back
// to a generic message so raw "Firebase: Error (auth/...)" strings never reach the UI.
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-verification-code": "Incorrect OTP. Please check and try again.",
  "auth/code-expired": "This OTP has expired. Please request a new one.",
  "auth/missing-verification-code": "Please enter the 6-digit OTP.",
  "auth/invalid-phone-number": "Enter a valid 10-digit mobile number.",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
  "auth/quota-exceeded": "SMS limit reached. Please try again later.",
  "auth/captcha-check-failed": "Verification check failed. Please refresh the page and try again.",
  "auth/invalid-app-credential": "Verification check failed. Please refresh the page and try again.",
  "auth/network-request-failed": "Network error. Please check your connection and try again.",
};

export function getAuthErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof FirebaseError) {
    return AUTH_ERROR_MESSAGES[err.code] ?? fallback;
  }
  return fallback;
}
