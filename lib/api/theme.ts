import { DEFAULT_THEME, THEMES, type ThemeId } from "@/lib/themes";
import { apiFetch } from "./client";

// ─── Backend shape ────────────────────────────────────────────────────────────

interface BackendSiteTheme {
  id: number;
  preset_id: string;
  updated_by_admin_id: number;
  created_at: string;
  updated_at: string;
}

function isThemeId(value: string | undefined): value is ThemeId {
  return !!value && THEMES.some((t) => t.id === value);
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function getSiteTheme(): Promise<ThemeId> {
  // REAL API: GET /content/theme — public, no auth, rate-limited 120/min.
  // Tag-only cache: no time-based revalidate — only busted on-demand by
  // /api/revalidate/theme when an admin saves a new preset.
  if (!process.env.NEXT_PUBLIC_API_URL) {
    return DEFAULT_THEME;
  }
  try {
    const data = await apiFetch<BackendSiteTheme | null>("/content/theme", {
      next: { tags: ["site-theme"] },
    });
    return isThemeId(data?.preset_id) ? data.preset_id : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}
