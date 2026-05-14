"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

interface AuthStore {
  user: User | null;
  token: string | null;      // in memory only — NOT persisted to localStorage
  isAuthenticated: boolean;
  isLoading: boolean;
  _isHydrated: boolean;

  setUser: (user: User, token: string) => void;
  setToken: (token: string) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  _setHydrated: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      _isHydrated: false,

      setUser: (user, token) =>
        set({ user, token, isAuthenticated: true, isLoading: false }),

      setToken: (token) => set({ token }),

      clearUser: () =>
        set({ user: null, token: null, isAuthenticated: false }),

      setLoading: (isLoading) => set({ isLoading }),

      _setHydrated: () => set({ _isHydrated: true }),
    }),
    {
      name: "urgent-printers-auth",
      // token is intentionally excluded — access tokens live in memory only.
      // On page refresh, TokenRefreshProvider calls /auth/refresh using the
      // httpOnly refresh cookie to get a new access token.
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        // user is intentionally excluded — no PII in localStorage.
        // Profile is fetched fresh from /auth/me after every token refresh.
      }),
      onRehydrateStorage: () => (state) => {
        state?._setHydrated();
      },
    }
  )
);
