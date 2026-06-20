import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { TokenRefreshProvider } from "@/features/auth/TokenRefreshProvider";
import { CartSyncProvider } from "@/features/cart/CartSyncProvider";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { CartDrawer } from "@/features/cart/CartDrawer";
import "./globals.css";

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-display", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Urgent Printers — Premium Print Solutions, Fast", template: "%s | Urgent Printers" },
  description: "Business cards, flyers, banners, packaging, brochures, and custom merch. Premium quality printing delivered fast across India. Order from 25 units.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://urgentprinters.in"),
  openGraph: { siteName: "Urgent Printers", type: "website", locale: "en_IN" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={`${cormorant.variable} ${dmSans.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
        <QueryProvider>
          <TokenRefreshProvider>
          <CartSyncProvider>
          <ThemeProvider>
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
          </ThemeProvider>
          </CartSyncProvider>
          </TokenRefreshProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
