import type { Metadata } from "next";
import { AuthGuard } from "@/features/auth/AuthGuard";
import { AccountNav } from "@/features/account/AccountNav";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <AccountNav />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
