import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
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
