"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollRailButtonsProps {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  onScroll: (direction: "left" | "right") => void;
  className?: string;
}

/**
 * Desktop-only prev/next affordance for a horizontal scroll-snap rail.
 * Hidden on mobile/touch widths — native swipe already covers those, and a
 * floating button pair only adds visual noise on small screens.
 */
export function ScrollRailButtons({ canScrollLeft, canScrollRight, onScroll, className }: ScrollRailButtonsProps) {
  return (
    <div className={cn("hidden md:flex items-center gap-2", className)}>
      <button
        type="button"
        aria-label="Scroll left"
        disabled={!canScrollLeft}
        onClick={() => onScroll("left")}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm",
          "transition-all duration-300 hover:border-primary/40 hover:bg-primary hover:text-primary-foreground hover:shadow-md",
          "disabled:opacity-30 disabled:pointer-events-none"
        )}
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        disabled={!canScrollRight}
        onClick={() => onScroll("right")}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm",
          "transition-all duration-300 hover:border-primary/40 hover:bg-primary hover:text-primary-foreground hover:shadow-md",
          "disabled:opacity-30 disabled:pointer-events-none"
        )}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
