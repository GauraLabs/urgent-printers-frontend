import { getSiteStatus } from "@/lib/api/siteStatus";
import { SiteStatusBannerContent } from "./SiteStatusBannerContent";

// Halted variant only — driven exclusively by the admin-toggled
// GET /site-status endpoint. Never merge halt-status messaging into
// AnnouncementBar: that bar is admin-authored marketing copy with
// admin-picked colors, this is an operational incident notice and the two
// must never look or read alike. The "degraded" variant (real client-side
// fetch failures in cart/checkout) lives in the sibling client component
// DegradedStatusBanner.tsx — this file must never read client-side failure
// state, and DegradedStatusBanner.tsx must never import getSiteStatus. See
// order-halt plan Phase 6 for why these two stay independently triggerable.
const DEFAULT_HALTED_MESSAGE = "We're not accepting new orders right now. Please check back shortly.";

export async function SiteStatusBanner() {
  const status = await getSiteStatus();
  if (!status.orders_halted) return null;

  return <SiteStatusBannerContent variant="halted" message={status.message ?? DEFAULT_HALTED_MESSAGE} />;
}
