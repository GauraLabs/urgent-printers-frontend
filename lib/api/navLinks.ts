import { ROUTES } from "@/lib/constants/routes";
import { apiFetch } from "./client";

// ─── Backend shape ────────────────────────────────────────────────────────────

interface BackendNavLink {
  id: number;
  label: string;
  category_id: number | null;
  category_name: string | null;
  category_slug: string | null;
  custom_url: string | null;
  placement: "header" | "footer";
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface NavLink {
  label: string;
  href: string;
}

function resolveHref(link: BackendNavLink): string {
  if (link.category_slug) return ROUTES.category(link.category_slug);
  return link.custom_url ?? ROUTES.products;
}

function mapNavLink(link: BackendNavLink): NavLink {
  return { label: link.label, href: resolveHref(link) };
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function getNavLinks(placement: "header" | "footer"): Promise<NavLink[]> {
  // REAL API: GET /api/v1/content/nav-links?placement=header|footer — pre-filtered to active links with active categories
  if (!process.env.NEXT_PUBLIC_API_URL) {
    return [];
  }
  try {
    const data = await apiFetch<BackendNavLink[]>(`/content/nav-links?placement=${placement}`, {
      next: { revalidate: 300, tags: ["nav-links"] },
    });
    return data.map(mapNavLink);
  } catch {
    return [];
  }
}
