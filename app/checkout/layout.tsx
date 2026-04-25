import type { Metadata } from "next";
import { AuthGuard } from "@/features/auth/AuthGuard";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your print order securely.",
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
