"use client";

import { usePathname } from "next/navigation";

const PDP_RE = /^\/products\/[^/]+\/[^/]+\/?$/;

/**
 * Pages that own the bottom edge on mobile: the product page (sticky Add to
 * Cart bar), the cart and checkout. The tab bar would stack under or beside
 * their own controls, so it is hidden there.
 */
export function isBottomNavHidden(pathname: string): boolean {
  return PDP_RE.test(pathname) || pathname === "/cart" || pathname.startsWith("/cart/") || pathname.startsWith("/checkout");
}

/** Mobile bottom clearance the page needs: tab bar, the PDP's sticky bar, or nothing. */
export type BottomInset = "nav" | "sticky" | "none";

export function getBottomInset(pathname: string): BottomInset {
  if (!isBottomNavHidden(pathname)) return "nav";
  return PDP_RE.test(pathname) ? "sticky" : "none";
}

export function useBottomInset(): BottomInset {
  return getBottomInset(usePathname());
}
