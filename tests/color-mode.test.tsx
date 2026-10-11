import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { COLOR_MODE_STORAGE_KEY } from "@/lib/themes";
import { COLOR_MODE_INIT_SCRIPT, resolveColorMode } from "@/lib/colorMode";
import { normalizePathname } from "@/hooks/useAppPathname";
import { showsMobileSearchBar } from "@/components/layout/MobileSearchBar";
import { useThemeStore } from "@/features/theme/store";
import { ColorModeSync } from "@/features/theme/ColorModeSync";

const html = document.documentElement;

function runInitScript(): void {
  new Function(COLOR_MODE_INIT_SCRIPT)();
}

function resetDom(): void {
  html.className = "";
  localStorage.clear();
}

beforeEach(resetDom);
afterEach(() => {
  resetDom();
  vi.restoreAllMocks();
});

describe("resolveColorMode", () => {
  it("defaults to light", () => {
    expect(resolveColorMode(null)).toBe("light");
    expect(resolveColorMode(undefined)).toBe("light");
  });
  it("respects stored values", () => {
    expect(resolveColorMode("dark")).toBe("dark");
    expect(resolveColorMode("light")).toBe("light");
  });
  it("treats invalid values as light", () => {
    expect(resolveColorMode("system")).toBe("light");
    expect(resolveColorMode("DARK")).toBe("light");
    expect(resolveColorMode('"dark"')).toBe("light");
  });
});

describe("COLOR_MODE_INIT_SCRIPT", () => {
  it("paints light with no stored preference, even when the OS prefers dark", () => {
    const matchMedia = vi.fn(() => ({ matches: true }));
    Object.defineProperty(window, "matchMedia", { value: matchMedia, configurable: true, writable: true });
    runInitScript();
    expect(html.classList.contains("light")).toBe(true);
    expect(html.classList.contains("dark")).toBe(false);
    expect(matchMedia).not.toHaveBeenCalled();
  });

  it("paints stored dark", () => {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, "dark");
    runInitScript();
    expect(html.classList.contains("dark")).toBe(true);
    expect(html.classList.contains("light")).toBe(false);
  });

  it("paints stored light over an existing dark class", () => {
    html.classList.add("dark");
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, "light");
    runInitScript();
    expect(html.classList.contains("light")).toBe(true);
    expect(html.classList.contains("dark")).toBe(false);
  });

  it("paints light for an invalid stored value", () => {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, "purple");
    runInitScript();
    expect(html.classList.contains("light")).toBe(true);
    expect(html.classList.contains("dark")).toBe(false);
  });

  it("paints light when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    runInitScript();
    expect(html.classList.contains("light")).toBe(true);
  });

  it("keeps unrelated classes on <html>", () => {
    html.className = "h-full theme-pink";
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, "dark");
    runInitScript();
    expect(html.className.split(" ")).toEqual(expect.arrayContaining(["h-full", "theme-pink", "dark"]));
  });
});

describe("theme store persistence", () => {
  it("toggle writes the choice and a fresh init run restores it", () => {
    act(() => useThemeStore.getState().setColorMode("light"));
    act(() => useThemeStore.getState().toggleColorMode());
    expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe("dark");
    expect(html.classList.contains("dark")).toBe(true);

    html.className = "";
    runInitScript();
    expect(html.classList.contains("dark")).toBe(true);

    act(() => useThemeStore.getState().toggleColorMode());
    expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe("light");
    html.className = "";
    runInitScript();
    expect(html.classList.contains("light")).toBe(true);
    expect(html.classList.contains("dark")).toBe(false);
  });

  it("toggle still paints when storage writes throw", () => {
    act(() => useThemeStore.getState().setColorMode("light"));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    act(() => useThemeStore.getState().toggleColorMode());
    expect(html.classList.contains("dark")).toBe(true);
    expect(useThemeStore.getState().colorMode).toBe("dark");
  });

  it("syncFromStorage does not persist a default", () => {
    act(() => useThemeStore.getState().syncFromStorage());
    expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBeNull();
    expect(html.classList.contains("light")).toBe(true);
    expect(useThemeStore.getState().colorMode).toBe("light");
  });
});

describe("ColorModeSync", () => {
  it("re-applies the stored mode after <html> classes are wiped", () => {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, "dark");
    html.className = "h-full";
    render(<ColorModeSync />);
    expect(html.classList.contains("dark")).toBe(true);
    expect(useThemeStore.getState().colorMode).toBe("dark");
  });

  it("follows a toggle made in another tab", () => {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, "light");
    render(<ColorModeSync />);
    expect(html.classList.contains("light")).toBe(true);

    localStorage.setItem(COLOR_MODE_STORAGE_KEY, "dark");
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: COLOR_MODE_STORAGE_KEY, newValue: "dark" }));
    });
    expect(html.classList.contains("dark")).toBe(true);
    expect(useThemeStore.getState().colorMode).toBe("dark");
  });

  it("ignores unrelated storage keys", () => {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, "light");
    render(<ColorModeSync />);
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, "dark");
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "cart-storage", newValue: "{}" }));
    });
    expect(html.classList.contains("light")).toBe(true);
  });
});

describe("home pathname normalization (Vercel ISR renders / as /index)", () => {
  it("maps /index to /", () => {
    expect(normalizePathname("/index")).toBe("/");
    expect(normalizePathname("/")).toBe("/");
    expect(normalizePathname("/products")).toBe("/products");
  });
  it("mobile search bar shows on the ISR-rendered home page", () => {
    expect(showsMobileSearchBar(normalizePathname("/index"))).toBe(true);
  });
});
