"use client";

import { useDegradedStore } from "@/features/site-status/degradedStore";
import { SiteStatusBannerContent } from "./SiteStatusBannerContent";

// Degraded variant only — driven exclusively by real client-side fetch
// failures in the cart/checkout flow (see
// features/site-status/trackConnectivity.ts), never by a health-check poll
// and never by GET /site-status. This component must never import
// lib/api/siteStatus.ts — that's the "halted" variant's exclusive data
// source (components/layout/SiteStatusBanner.tsx). See order-halt plan
// Phase 6 for why these two stay independently triggerable.
const DEGRADED_MESSAGE = "We're having trouble connecting right now. Please try again shortly.";

export function DegradedStatusBanner() {
  const isDegraded = useDegradedStore((s) => s.isDegraded);
  if (!isDegraded) return null;

  return <SiteStatusBannerContent variant="degraded" message={DEGRADED_MESSAGE} />;
}
