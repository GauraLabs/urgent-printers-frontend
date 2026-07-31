"use client";

import Link from "next/link";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConsent } from "@/hooks/useConsent";

// Non-blocking bar, not a modal: no backdrop, no scroll-lock, page stays
// fully interactive underneath. React-mounted while status === "undecided"
// (useConsent reports "undecided" during SSR/first paint even for decided
// visitors, since localStorage isn't readable server-side) — that gap is
// covered by the [data-cookie-consent-banner] attribute here plus the
// CONSENT_INIT_SCRIPT inline script in app/layout.tsx + the CSS rule in
// globals.css, which hide this element for the first frame pre-hydration
// when a decided status is already in localStorage. Once accept/reject
// fires, this unmounts and never reappears (persisted) — see lib/consent.ts.
// Positioned above MobileBottomNav (fixed, h-16, z-40) on mobile so the two
// never overlap; MobileBottomNav is lg:hidden so bottom-0 is safe at lg+.
export function CookieConsentBanner() {
  const { status, accept, reject } = useConsent();

  if (status !== "undecided") return null;

  return (
    <div
      data-cookie-consent-banner
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-[65px] lg:bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]"
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <Cookie size={18} className="shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-xs sm:text-sm text-muted-foreground">
            We use cookies to run essential site features and, with your consent, to understand how the
            site is used.{" "}
            <Link href="/policies/cookies" className="underline underline-offset-2 font-medium text-foreground">
              Learn more
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={reject}>
            Reject non-essential
          </Button>
          <Button variant="default" size="sm" onClick={accept}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
