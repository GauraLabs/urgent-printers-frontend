import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { TokenRefreshProvider } from "@/features/auth/TokenRefreshProvider";
import { CartSyncProvider } from "@/features/cart/CartSyncProvider";
import { WishlistSyncProvider } from "@/features/wishlist/WishlistSyncProvider";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { CartDrawer } from "@/features/cart/CartDrawer";
import { getSiteTheme } from "@/lib/api/theme";
import { DEFAULT_THEME, COLOR_MODE_STORAGE_KEY } from "@/lib/themes";
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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const presetId = await getSiteTheme();
  const brandClass = presetId === DEFAULT_THEME ? null : `theme-${presetId}`;

  return (
    <html lang="en-IN" className={cn(cormorant.variable, dmSans.variable, "h-full", brandClass)} suppressHydrationWarning>
      <body className="min-h-full flex flex-col antialiased">
        <script dangerouslySetInnerHTML={{ __html: COLOR_MODE_INIT_SCRIPT }} />
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
        <QueryProvider>
          <TokenRefreshProvider>
          <CartSyncProvider>
          <WishlistSyncProvider>
            <AnnouncementBar />
            <Header />
            <main className="flex-1 pb-16 lg:pb-0">{children}</main>
            <Footer />
            <MobileBottomNav />
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
