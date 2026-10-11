"use client";

import { usePathname } from "next/navigation";

// Vercel's ISR revalidation renders the home page with pathname "/index"
// (its RSC payload carries canonical parts ["", "index"]) while the browser
// hydrates with "/". Any element gated on pathname === "/" then mismatches,
// React throws #418, and the whole document is client-rendered from scratch.
export function normalizePathname(pathname: string): string {
  return pathname === "/index" ? "/" : pathname;
}

export function useAppPathname(): string {
  return normalizePathname(usePathname());
}
