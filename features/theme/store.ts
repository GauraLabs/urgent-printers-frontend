"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type ThemeId, type ColorMode, DEFAULT_THEME } from "@/lib/themes";

interface ThemeStore {
  theme: ThemeId;
  colorMode: ColorMode;
  setTheme: (theme: ThemeId) => void;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: DEFAULT_THEME,
      colorMode: "light",

      setTheme: (theme) => set({ theme }),

      setColorMode: (colorMode) => set({ colorMode }),

      toggleColorMode: () =>
        set({ colorMode: get().colorMode === "light" ? "dark" : "light" }),
    }),
    { name: "urgent-printers-theme" }
  )
);
