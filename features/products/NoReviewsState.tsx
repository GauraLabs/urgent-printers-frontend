"use client";

import { motion } from "motion/react";
import { Star } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

// Phase 1 introduced this empty state; this only adds an entrance transition
// on mount. Reduced-motion gating mirrors the window.matchMedia check used in
// HeroBannerSection/CategoryVideoOverlay — content always renders, only the
// animation is skipped.
export function NoReviewsState() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-4 mb-8 p-5 rounded-2xl bg-secondary/30 border border-border"
    >
      <div className="shrink-0 flex items-center justify-center w-14 h-14 rounded-full bg-background border border-border">
        <Star size={22} className="text-yellow-400 fill-yellow-400" />
      </div>
      <div>
        <p className="font-heading font-bold text-base">No reviews yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Be the first to try this product and share your experience.
        </p>
      </div>
    </motion.div>
  );
}
