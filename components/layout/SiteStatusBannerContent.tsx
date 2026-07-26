import { AlertTriangle, WifiOff, type LucideIcon } from "lucide-react";

// "halted" (admin-toggled order pause, driven by lib/api/siteStatus.ts) and
// "degraded" (real client-side fetch failures in cart/checkout, driven by
// features/site-status/trackConnectivity.ts) are intentionally separate
// trigger mechanisms feeding this one shared shell — see order-halt plan
// Phase 6. They must never look interchangeable to a customer: distinct
// copy, distinct icon, distinct tone.
//
// This file has zero data-fetching imports on purpose — SiteStatusBanner.tsx
// (server, halted) and DegradedStatusBanner.tsx (client, degraded) both
// import only this presentational piece, never each other's data source.
export type SiteStatusBannerVariant = "halted" | "degraded";

interface VariantConfig {
  className: string;
  icon: LucideIcon;
}

const VARIANT_CONFIG: Record<SiteStatusBannerVariant, VariantConfig> = {
  halted: {
    className: "bg-destructive text-white",
    icon: AlertTriangle,
  },
  degraded: {
    className: "bg-brand-orange text-brand-orange-foreground",
    icon: WifiOff,
  },
};

interface SiteStatusBannerContentProps {
  variant: SiteStatusBannerVariant;
  message: string;
}

export function SiteStatusBannerContent({ variant, message }: SiteStatusBannerContentProps) {
  const { className, icon: Icon } = VARIANT_CONFIG[variant];

  return (
    <div
      role="alert"
      className={`flex items-center justify-center gap-2 text-center text-xs sm:text-sm font-semibold py-2 px-4 ${className}`}
    >
      <Icon size={15} className="shrink-0" aria-hidden="true" />
      <p className="min-w-0">{message}</p>
    </div>
  );
}
