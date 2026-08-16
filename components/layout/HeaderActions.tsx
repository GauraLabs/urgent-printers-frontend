"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ShoppingBag, User, LogIn } from "lucide-react";
import { motion, useAnimationControls } from "motion/react";
import { buttonVariants } from "@/components/ui/button";
import { useCartStore } from "@/features/cart/store";
import { useAuthStore } from "@/features/auth/store";
import { useMounted } from "@/hooks/useMounted";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

export function HeaderActions() {
  const mounted = useMounted();
  const prefersReducedMotion = usePrefersReducedMotion();

  const itemCount = useCartStore((s) => s.itemCount());
  const openCart = useCartStore((s) => s.openCart);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  // Suppress client-only values until after hydration to prevent mismatch.
  const displayCount = mounted ? itemCount : 0;
  const displayAuth = mounted ? isAuthenticated : false;

  // Bump the badge only on a genuine increase (add-to-cart from any entry
  // point — PDP, cart-sync merge on login, etc. all flow through itemCount),
  // never on the mount-time reveal of a persisted count or on a decrease.
  // prevCountRef starts at null so the first post-mount value is only
  // recorded as a baseline, not treated as an "increase" from 0.
  //
  // Gated on the cart store's own persist hydration (not just `mounted`) —
  // relying on effect-ordering between zustand's rehydration promise and
  // React's passive effects is an implementation detail of two libraries'
  // scheduling, not a guarantee. `useCartStore.persist.hasHydrated()` is
  // zustand's explicit signal for this.
  //
  // Guarded with `typeof window !== "undefined"`: on the server, the
  // persist middleware's default storage getter touches
  // `window.localStorage`, throws, and the middleware bails out *before*
  // attaching `.persist` to the store at all — reading `.persist` during
  // SSR (e.g. unconditionally, from this useState initializer, which also
  // runs server-side) throws "Cannot read properties of undefined (reading
  // 'hasHydrated')". The `&&` short-circuits before touching `.persist` on
  // the server; on the client `.persist` is always attached.
  const badgeControls = useAnimationControls();
  const prevCountRef = useRef<number | null>(null);
  const [cartHydrated, setCartHydrated] = useState(
    () => typeof window !== "undefined" && useCartStore.persist.hasHydrated()
  );

  useEffect(() => {
    if (cartHydrated) return;
    return useCartStore.persist.onFinishHydration(() => setCartHydrated(true));
  }, [cartHydrated]);

  useEffect(() => {
    if (!mounted || !cartHydrated) return;
    const prevCount = prevCountRef.current;
    if (prevCount !== null && displayCount > prevCount && !prefersReducedMotion) {
      void badgeControls.start({
        scale: [1, 1.35, 1],
        transition: { duration: 0.24, ease: "easeOut" },
      });
    }
    prevCountRef.current = displayCount;
  }, [displayCount, mounted, cartHydrated, prefersReducedMotion, badgeControls]);

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
          <motion.span
            initial={false}
            animate={badgeControls}
            className={cn(
              "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1",
              "flex items-center justify-center rounded-full",
              "bg-brand-orange text-brand-orange-foreground text-[10px] font-bold leading-none"
            )}
          >
            {displayCount > 99 ? "99+" : displayCount}
          </motion.span>
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
