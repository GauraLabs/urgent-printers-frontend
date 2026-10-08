"use client";

import { usePathname } from "next/navigation";
import { HeaderSearch } from "./HeaderSearch";

// Home and the product listings get an Amazon-style full-width bar under the
// header on mobile. Elsewhere it would be noise: /search has its own field and
// product/cart/checkout pages keep the header slim (bottom-nav Search still works).
const LISTING_RE = /^\/products\/?$|^\/products\/[^/]+\/?$/;

export function showsMobileSearchBar(pathname: string): boolean {
  return pathname === "/" || LISTING_RE.test(pathname);
}

export function MobileSearchBar({ popularSearches }: { popularSearches: string[] }) {
  const pathname = usePathname();
  if (!showsMobileSearchBar(pathname)) return null;
  return (
    <div className="md:hidden pb-2">
      <HeaderSearch variant="mobile" popularSearches={popularSearches} />
    </div>
  );
}
