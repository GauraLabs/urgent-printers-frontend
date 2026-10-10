import { apiFetch } from "./client";
import { logApiError } from "./logApiError";

// ─── Backend shape ────────────────────────────────────────────────────────────
// GET /site-status is public/unauthenticated — only orders_halted/message/cod are
// ever exposed (see backend PublicSiteStatusResponse). No internal_reason,
// admin ids, or timestamps here.

export interface SiteStatusCod {
  enabled: boolean;
  min_order_amount: number | null;
  max_order_amount: number | null;
}

export interface SiteStatus {
  orders_halted: boolean;
  message: string | null;
  cod: SiteStatusCod;
}

const DEFAULT_COD: SiteStatusCod = { enabled: true, min_order_amount: null, max_order_amount: null };
const DEFAULT_SITE_STATUS: SiteStatus = { orders_halted: false, message: null, cod: DEFAULT_COD };

// Absent on a backend that predates the COD controls: treat as unrestricted.
function bound(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function mapSiteStatusCod(raw: Partial<SiteStatusCod> | null | undefined): SiteStatusCod {
  if (!raw) return DEFAULT_COD;
  return {
    enabled: raw.enabled !== false,
    min_order_amount: bound(raw.min_order_amount),
    max_order_amount: bound(raw.max_order_amount),
  };
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function getSiteStatus(): Promise<SiteStatus> {
  // REAL API: GET /site-status — public, no auth, rate-limited 120/min.
  // Tag-only cache: no time-based revalidate — only busted on-demand by
  // /api/revalidate/site-status when an admin toggles the halt switch.
  // Fails soft to "not halted" on any error so a backend hiccup never blocks
  // browsing/checkout rendering — the checkout submit itself still hits the
  // real API and gets a hard 503 if orders are actually halted.
  if (!process.env.NEXT_PUBLIC_API_URL) {
    return DEFAULT_SITE_STATUS;
  }
  try {
    const data = await apiFetch<Omit<SiteStatus, "cod"> & { cod?: Partial<SiteStatusCod> | null }>("/site-status", {
      next: { tags: ["site-status"] },
    });
    return {
      orders_halted: data.orders_halted === true,
      message: data.message ?? null,
      cod: mapSiteStatusCod(data.cod),
    };
  } catch (err) {
    logApiError("getSiteStatus", err);
    return DEFAULT_SITE_STATUS;
  }
}
