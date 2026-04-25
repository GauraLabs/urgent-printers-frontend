"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _isHydrated: boolean;

  setUser: (user: User, token: string) => void;
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

      clearUser: () =>
        set({ user: null, token: null, isAuthenticated: false }),

      setLoading: (isLoading) => set({ isLoading }),

      _setHydrated: () => set({ _isHydrated: true }),
    }),
    {
      name: "urgent-printers-auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?._setHydrated();
      },
    }
  )
);
