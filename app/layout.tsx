import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { TokenRefreshProvider } from "@/features/auth/TokenRefreshProvider";
import { CartSyncProvider } from "@/features/cart/CartSyncProvider";
import { WishlistSyncProvider } from "@/features/wishlist/WishlistSyncProvider";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { SiteStatusBanner } from "@/components/layout/SiteStatusBanner";
import { DegradedStatusBanner } from "@/components/layout/DegradedStatusBanner";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { CookieConsentBanner } from "@/components/layout/CookieConsentBanner";
import { ConsentedScripts } from "@/components/analytics/ConsentedScripts";
import { CartDrawer } from "@/features/cart/CartDrawer";
import { getSiteTheme } from "@/lib/api/theme";
import { DEFAULT_THEME, COLOR_MODE_STORAGE_KEY } from "@/lib/themes";
import { COOKIE_CONSENT_STORAGE_KEY } from "@/lib/consent";
import { cn } from "@/lib/utils";
import "./globals.css";

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-display", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Urgent Printers — Premium Print Solutions, Fast", template: "%s | Urgent Printers" },
  description: "Business cards, flyers, banners, packaging, brochures, and custom merch. Premium quality printing delivered fast across India. Order from 25 units.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://urgentprinters.com"),
  openGraph: { siteName: "Urgent Printers", type: "website", locale: "en_IN" },
  twitter: { card: "summary_large_image" },
  other: { "facebook-domain-verification": "u044je9nha35ro4pu7mbsxyxop4kfw" },
};

// Blocking (no async/defer, no src) so it runs before the browser paints
// anything — the same next-themes-style technique used to avoid a
// dark/light flash without forcing the whole site into dynamic rendering.
// next/headers `cookies()` would do that (see git history on app/layout.tsx
// for the earlier, reverted approach): reading a cookie in the shared root
// layout opts every route out of static generation. This inline script
// reads localStorage instead, entirely client-side, so brand-theme fetching
// below remains the only server-side data dependency of this layout.
const COLOR_MODE_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem(${JSON.stringify(COLOR_MODE_STORAGE_KEY)});var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;var h=document.documentElement;h.classList.toggle("dark",d);h.classList.toggle("light",!d);}catch(e){}})();`;

// Same technique as COLOR_MODE_INIT_SCRIPT above, applied to the cookie
// consent banner: useConsent (hooks/useConsent.ts) can't tell "accepted" or
// "rejected" apart from "undecided" until after mount, so without this the
// banner flashes visible for one frame on every reload, even for visitors
// who already chose. This runs before hydration and, if localStorage
// already holds a decided status, sets data-cookie-consent-decided on
// <html> synchronously so the CSS rule in globals.css
// ([data-cookie-consent-decided] [data-cookie-consent-banner]) hides the
// banner before the browser ever paints it. React's own status check still
// drives the real unmount shortly after — this only closes the pre-paint gap.
const CONSENT_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem(${JSON.stringify(COOKIE_CONSENT_STORAGE_KEY)});if(s==="accepted"||s==="rejected"){document.documentElement.setAttribute("data-cookie-consent-decided","");}}catch(e){}})();`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const presetId = await getSiteTheme();
  const brandClass = presetId === DEFAULT_THEME ? null : `theme-${presetId}`;

  return (
    <html lang="en-IN" className={cn(cormorant.variable, dmSans.variable, "h-full", brandClass)} suppressHydrationWarning>
      <body className="min-h-full flex flex-col antialiased">
        <script dangerouslySetInnerHTML={{ __html: COLOR_MODE_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: CONSENT_INIT_SCRIPT }} />
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
        <ConsentedScripts />
        <QueryProvider>
          <TokenRefreshProvider>
          <CartSyncProvider>
          <WishlistSyncProvider>
            <SiteStatusBanner />
            <DegradedStatusBanner />
            <AnnouncementBar />
            <Header />
            <main className="flex-1 pb-16 lg:pb-0">{children}</main>
            <Footer />
            <MobileBottomNav />
            <CookieConsentBanner />
            <CartDrawer />
            <Toaster
              richColors
              position="bottom-left"
              toastOptions={{
                classNames: {
                  toast: "!rounded-2xl !border-border !shadow-lg !font-sans",
                  title: "!font-semibold !text-sm",
                  description: "!text-xs",
                },
              }}
            />
          </WishlistSyncProvider>
          </CartSyncProvider>
          </TokenRefreshProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
