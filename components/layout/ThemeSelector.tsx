"use client";

import { Sun, Moon } from "lucide-react";
import { useThemeStore } from "@/features/theme/store";
import { useMounted } from "@/hooks/useMounted";
import { cn } from "@/lib/utils";

export function ThemeSelector() {
  const mounted = useMounted();
  const storeColorMode = useThemeStore((s) => s.colorMode);
  const toggleColorMode = useThemeStore((s) => s.toggleColorMode);

  // The store's initial value is read off <html>'s class, which the
  // blocking inline script in app/layout.tsx sets before hydration — none
  // of that exists during SSR, so the server always renders "light" for
  // this button. Gate on mounted so the first client render matches that
  // SSR output, then swap to the real value right after (same pattern as
  // cart count).
  const colorMode = mounted ? storeColorMode : "light";

  return (
    <button
      type="button"
      onClick={toggleColorMode}
      aria-label={colorMode === "light" ? "Switch to dark mode" : "Switch to light mode"}
      className={cn(
        "flex items-center justify-center h-9 w-9 rounded-full",
        "hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      )}
    >
      {colorMode === "light" ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
