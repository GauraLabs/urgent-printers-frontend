"use client";

import type { ReactNode } from "react";
import { useBottomInset } from "@/features/navigation/bottomNav";
import { cn } from "@/lib/utils";

// Reserves exactly the room the fixed bottom UI needs on mobile, so hiding the
// tab bar on the PDP/cart/checkout doesn't leave an empty strip (or hide content).
export function MainContent({ children }: { children: ReactNode }) {
  const inset = useBottomInset();
  return (
    <main className={cn("flex-1 lg:pb-0", inset === "nav" && "pb-16", inset === "sticky" && "pb-20")}>
      {children}
    </main>
  );
}
