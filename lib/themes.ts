export type ThemeId = "indigo" | "emerald" | "rose" | "violet" | "slate";
export type ColorMode = "light" | "dark";

export interface Theme {
  id: ThemeId;
  label: string;
  primarySwatch: string;
  accentSwatch: string;
}

export const THEMES: Theme[] = [
  {
    id: "indigo",
    label: "Indigo",
    primarySwatch: "#4338ca",
    accentSwatch: "#f97316",
  },
  {
    id: "emerald",
    label: "Emerald",
    primarySwatch: "#059669",
    accentSwatch: "#d97706",
  },
  {
    id: "rose",
    label: "Rose",
    primarySwatch: "#e11d48",
    accentSwatch: "#ea580c",
  },
  {
    id: "violet",
    label: "Violet",
    primarySwatch: "#7c3aed",
    accentSwatch: "#db2777",
  },
  {
    id: "slate",
    label: "Slate",
    primarySwatch: "#334155",
    accentSwatch: "#0284c7",
  },
];

export const DEFAULT_THEME: ThemeId = "indigo";
