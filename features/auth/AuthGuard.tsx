"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "./store";
import { ROUTES } from "@/lib/constants/routes";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s._isHydrated);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      const redirect = encodeURIComponent(window.location.pathname);
      router.replace(`${ROUTES.login}?redirect=${redirect}`);
    }
  }, [isHydrated, isAuthenticated, router]);

  // Show spinner while store hydrates from localStorage
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  // Show spinner while redirecting unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
