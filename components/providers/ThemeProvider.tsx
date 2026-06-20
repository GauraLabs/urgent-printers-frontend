"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/features/theme/store";
import { DEFAULT_THEME } from "@/lib/themes";

/**
 * Reads theme + colorMode from Zustand and applies them as classes on <html>.
 * Must be rendered inside QueryProvider (client boundary).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  const colorMode = useThemeStore((s) => s.colorMode);

  useEffect(() => {
    const html = document.documentElement;

    // Remove all theme classes
    html.classList.remove(
      "theme-gold",
      "theme-emerald",
      "theme-slate",
      "theme-pink",
      "theme-plum"
    );

    // Apply selected theme (no class needed for default roseGold)
    if (theme !== DEFAULT_THEME) {
      html.classList.add(`theme-${theme}`);
    }

    // Apply color mode
    html.classList.toggle("dark", colorMode === "dark");
  }, [theme, colorMode]);

  return <>{children}</>;
}
