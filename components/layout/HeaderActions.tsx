"use client";

import Link from "next/link";
import { ShoppingBag, User, LogIn } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useCartStore } from "@/features/cart/store";
import { useAuthStore } from "@/features/auth/store";
import { useMounted } from "@/hooks/useMounted";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

export function HeaderActions() {
  const mounted = useMounted();

  const itemCount = useCartStore((s) => s.itemCount());
  const openCart = useCartStore((s) => s.openCart);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  // Suppress client-only values until after hydration to prevent mismatch.
  const displayCount = mounted ? itemCount : 0;
  const displayAuth = mounted ? isAuthenticated : false;

  return (
    <div className="flex items-center gap-1">
      {/* Cart button */}
      <button
        onClick={openCart}
        aria-label={`Cart${displayCount > 0 ? `, ${displayCount} item${displayCount !== 1 ? "s" : ""}` : ""}`}
        className={cn(
          "relative flex items-center justify-center h-9 w-9 rounded-full",
          "hover:bg-muted transition-colors"
        )}
      >
        <ShoppingBag size={20} />
        {displayCount > 0 && (
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1",
              "flex items-center justify-center rounded-full",
              "bg-brand-orange text-brand-orange-foreground text-[10px] font-bold leading-none"
            )}
          >
            {displayCount > 99 ? "99+" : displayCount}
          </span>
        )}
      </button>

      {/* Auth — always render Sign In until mounted to keep SSR output stable */}
      {displayAuth && user ? (
        <>
          <Link
            href={ROUTES.account}
            aria-label="My account"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-2 hidden md:flex")}
          >
            <User size={16} />
            <span className="max-w-[80px] truncate">{user.firstName}</span>
          </Link>
          <Link
            href={ROUTES.account}
            aria-label="My account"
            className="flex md:hidden items-center justify-center h-9 w-9 rounded-full hover:bg-muted transition-colors"
          >
            <User size={20} />
          </Link>
        </>
      ) : (
        <>
          <Link
            href={ROUTES.login}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-2 hidden md:flex")}
          >
            <LogIn size={16} />
            Sign in
          </Link>
          <Link
            href={ROUTES.login}
            aria-label="Sign in"
            className="flex md:hidden items-center justify-center h-9 w-9 rounded-full hover:bg-muted transition-colors"
          >
            <LogIn size={20} />
          </Link>
        </>
      )}
    </div>
  );
}
