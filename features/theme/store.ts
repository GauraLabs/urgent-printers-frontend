"use client";

import { create } from "zustand";
import { type ColorMode, COLOR_MODE_STORAGE_KEY } from "@/lib/themes";

// Single source of truth for "apply this mode" — used when the user
// toggles. Keeping localStorage as the only persisted copy (no zustand
// `persist` middleware here) avoids a second, separately-serialized blob
// drifting out of sync with what the blocking inline script in
// app/layout.tsx already read and painted before this module ever runs.
function applyColorMode(mode: ColorMode): void {
  const html = document.documentElement;
  html.classList.toggle("dark", mode === "dark");
  html.classList.toggle("light", mode === "light");
  localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
}

// The inline script runs synchronously before any client bundle, so by the
// time this module evaluates in the browser, <html> already carries the
// resolved class (from localStorage, or matchMedia as a fallback). Reading
// it back off the DOM — instead of re-reading localStorage and redoing the
// matchMedia fallback here — guarantees this store can never disagree with
// what's already painted.
function getInitialColorMode(): ColorMode {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

interface ThemeStore {
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  colorMode: getInitialColorMode(),

  setColorMode: (colorMode) => {
    applyColorMode(colorMode);
    set({ colorMode });
  },

  toggleColorMode: () => {
    const colorMode = get().colorMode === "light" ? "dark" : "light";
    applyColorMode(colorMode);
    set({ colorMode });
  },
}));
