"use client";

import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface AnimateInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
}

const directionMap = {
  up:    { y: 24, x: 0  },
  down:  { y: -24, x: 0 },
  left:  { y: 0, x: 24  },
  right: { y: 0, x: -24 },
  none:  { y: 0, x: 0   },
};

/**
 * When the user prefers reduced motion, motion is skipped entirely (plain
 * `div`, no animation props) — same approach as ScrollReveal — rather than
 * merely swapping props, so there's no dependency on motion/react's
 * animation-skip semantics for correctness.
 */
export function AnimateIn({ children, className, delay = 0, direction = "up" }: AnimateInProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const offset = directionMap[direction];

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function AnimateStagger({
  children,
  className,
  staggerDelay = 0.08,
}: {
  children: React.ReactNode[];
  className?: string;
  staggerDelay?: number;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={className}>
      {children.map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4, delay: i * staggerDelay, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
