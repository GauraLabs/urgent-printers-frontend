"use client";

import { create } from "zustand";
import type { ColorMode } from "@/lib/themes";
import { DEFAULT_COLOR_MODE, paintColorMode, persistColorMode, readStoredColorMode } from "@/lib/colorMode";

// localStorage is the only persisted copy (no zustand `persist`), so this store
// can never drift from what COLOR_MODE_INIT_SCRIPT painted before hydration.
function getInitialColorMode(): ColorMode {
  if (typeof document === "undefined") return DEFAULT_COLOR_MODE;
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

interface ThemeStore {
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
  syncFromStorage: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  colorMode: getInitialColorMode(),

  setColorMode: (colorMode) => {
    paintColorMode(colorMode);
    persistColorMode(colorMode);
    set({ colorMode });
  },

  toggleColorMode: () => {
    get().setColorMode(get().colorMode === "dark" ? "light" : "dark");
  },

  // Re-paints without writing, so a visitor with no stored choice stays on the default.
  syncFromStorage: () => {
    const colorMode = readStoredColorMode();
    paintColorMode(colorMode);
    set({ colorMode });
  },
}));
