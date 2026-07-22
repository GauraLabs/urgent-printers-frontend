export type ThemeId = "roseGold" | "gold" | "emerald" | "slate" | "pink" | "plum";
export type ColorMode = "light" | "dark";

export interface Theme {
  id: ThemeId;
  label: string;
  primarySwatch: string;
  accentSwatch: string;
}

export const THEMES: Theme[] = [
  {
    id: "roseGold",
    label: "Rose Gold",
    primarySwatch: "#A1654B",
    accentSwatch: "#D9A35E",
  },
  {
    id: "gold",
    label: "Royal Gold",
    primarySwatch: "#AD8A3C",
    accentSwatch: "#7A352D",
  },
  {
    id: "emerald",
    label: "Emerald Heritage",
    primarySwatch: "#2F6E54",
    accentSwatch: "#9C7530",
  },
  {
    id: "slate",
    label: "Slate Luxury",
    primarySwatch: "#3A332E",
    accentSwatch: "#C9A052",
  },
  {
    id: "pink",
    label: "Blush Pink",
    primarySwatch: "#D9477E",
    accentSwatch: "#D9A35E",
  },
  {
    id: "plum",
    label: "Orchid Plum",
    primarySwatch: "#8C3D7B",
    accentSwatch: "#E25C8C",
  },
];

export const DEFAULT_THEME: ThemeId = "roseGold";

// localStorage key for the dark/light preference. Read by the blocking
// inline script in app/layout.tsx (before hydration, to paint the right
// mode with zero flicker) and by features/theme/store.ts (kept in sync on
// toggle) — kept here so both sides share one name instead of duplicating
// the literal.
export const COLOR_MODE_STORAGE_KEY = "color-mode";
