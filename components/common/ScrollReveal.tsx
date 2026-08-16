"use client";

import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Fades/slides below-fold content in once it scrolls into view. Animates
 * only `opacity`/`transform` (compositor-only properties that don't
 * participate in layout), so the wrapper can never shift surrounding
 * content or change the size of what it wraps — safe to place around
 * Suspense boundaries, async Server Components, or client components that
 * conditionally render `null`.
 *
 * When the user prefers reduced motion, motion is skipped entirely (plain
 * `div`, no animation props) rather than merely swapping props — this is a
 * fully static render path, so there's no dependency on motion/react's
 * animation-skip semantics for correctness.
 */
export function ScrollReveal({ children, className }: ScrollRevealProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
