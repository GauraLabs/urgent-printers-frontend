import { type ColorMode, COLOR_MODE_STORAGE_KEY } from "@/lib/themes";

export const DEFAULT_COLOR_MODE: ColorMode = "light";

// Only an explicit "dark" opts in; OS prefers-color-scheme is deliberately ignored.
export function resolveColorMode(stored: string | null | undefined): ColorMode {
  return stored === "dark" ? "dark" : DEFAULT_COLOR_MODE;
}

export function readStoredColorMode(): ColorMode {
  try {
    return resolveColorMode(window.localStorage.getItem(COLOR_MODE_STORAGE_KEY));
  } catch {
    return DEFAULT_COLOR_MODE;
  }
}

export function persistColorMode(mode: ColorMode): void {
  try {
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
  } catch {
    // Storage blocked (private mode / disabled): the toggle still applies for this page view.
  }
}

export function paintColorMode(mode: ColorMode, root: HTMLElement = document.documentElement): void {
  root.classList.toggle("dark", mode === "dark");
  root.classList.toggle("light", mode !== "dark");
}

// Must stay logically identical to resolveColorMode + paintColorMode: it runs
// as a blocking inline script before any bundle loads.
export const COLOR_MODE_INIT_SCRIPT = `(function(){var d=false;try{d=localStorage.getItem(${JSON.stringify(COLOR_MODE_STORAGE_KEY)})==="dark";}catch(e){}var h=document.documentElement;h.classList.toggle("dark",d);h.classList.toggle("light",!d);})();`;
