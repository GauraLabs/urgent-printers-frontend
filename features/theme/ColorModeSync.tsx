"use client";

import { useLayoutEffect } from "react";
import { COLOR_MODE_STORAGE_KEY } from "@/lib/themes";
import { useThemeStore } from "./store";

// If hydration ever fails anywhere in the tree, React client-renders from the
// root and resets <html>'s attributes to the server's props, wiping the
// .dark/.light class COLOR_MODE_INIT_SCRIPT painted. A layout effect runs in
// that same commit, before paint, so re-applying here avoids a visible flip.
// The storage listener keeps other open tabs in step with a toggle.
export function ColorModeSync() {
  const syncFromStorage = useThemeStore((s) => s.syncFromStorage);

  useLayoutEffect(() => {
    syncFromStorage();
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === COLOR_MODE_STORAGE_KEY) syncFromStorage();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [syncFromStorage]);

  return null;
}
