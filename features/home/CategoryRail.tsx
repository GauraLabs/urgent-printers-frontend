"use client";

import Image from "next/image";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { motion } from "motion/react";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionHeading } from "@/components/common/SectionHeading";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { useScrollRail } from "./useScrollRail";
import { ScrollRailButtons } from "./ScrollRailButtons";
import type { Category } from "@/types";

interface CategoryRailProps {
  categories: Category[];
}

const MotionLink = motion.create(Link);

/**
 * Full-catalog companion to CategoryGrid's curated bento layout above it —
 * every category, swipeable on touch and click/scroll-driven on desktop.
 * Tile widths are fixed (not vw-based) so the row overflows and is
 * demonstrably scrollable even on wide desktop viewports with a short
 * category list.
 */
export function CategoryRail({ categories }: CategoryRailProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { trackRef, canScrollLeft, canScrollRight, scrollByPage } = useScrollRail();

  if (categories.length === 0) {
    return (
      <section aria-labelledby="category-rail-heading" className="py-12 lg:py-16 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            id="category-rail-heading"
            eyebrow="Explore"
            title="All Categories"
            description="Swipe through everything we print"
            align="left"
            className="mb-8"
          />
          <EmptyState
            icon={LayoutGrid}
            title="Nothing to show right now"
            description="Categories are temporarily unavailable. Please check back shortly."
          />
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="category-rail-heading" className="py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
          >
            <SectionHeading
              id="category-rail-heading"
              eyebrow="Explore"
              title="All Categories"
              description="Swipe through everything we print, from cards to custom merch"
              align="left"
            />
          </motion.div>
          <ScrollRailButtons
            canScrollLeft={canScrollLeft}
            canScrollRight={canScrollRight}
            onScroll={scrollByPage}
          />
        </div>
      </div>

      <div
        ref={trackRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-4 py-8 pl-4 sm:pl-6 lg:pl-[max(1rem,calc((100vw-1280px)/2+2rem))] pr-4 scroll-pl-4 sm:scroll-pl-6 lg:scroll-pl-[max(1rem,calc((100vw-1280px)/2+2rem))] scroll-pr-4"
      >
        {categories.map((cat, index) => {
          const inverted = index % 2 === 1;
          return (
            <MotionLink
              key={cat.id}
              href={ROUTES.category(cat.slug)}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{
                opacity: 1,
                y: 0,
                transition: { duration: 0.4, delay: Math.min(index * 0.05, 0.3) },
              }}
              viewport={{ once: true, margin: "-40px" }}
              whileHover={
                prefersReducedMotion
                  ? undefined
                  : { y: -4, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }
              }
              whileTap={
                prefersReducedMotion
                  ? undefined
                  : { scale: 0.98, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } }
              }
              className={cn(
                "group flex flex-col shrink-0 snap-start overflow-hidden rounded-2xl transition-shadow duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                "shadow-[var(--shadow-rail-resting)] hover:shadow-[var(--shadow-rail-hover)]",
                "w-[240px] sm:w-[260px] lg:w-[280px] h-[320px] sm:h-[340px] lg:h-[360px]",
                inverted ? "bg-foreground text-background" : "bg-card text-card-foreground"
              )}
            >
              <div className="flex flex-col gap-1 p-5 pb-3">
                <h3 className="font-sans font-extrabold text-lg leading-[1.05] tracking-[-0.01em]">
                  {cat.name}
                </h3>
                {cat.description && (
                  <p className="font-sans text-xs opacity-70 leading-snug line-clamp-2">
                    {cat.description}
                  </p>
                )}
                <span className="font-sans text-[11px] opacity-50 mt-1.5">
                  {cat.productCount} products
                </span>
              </div>

              <div
                className={cn(
                  "relative flex-1 mx-4 mb-4 rounded-xl overflow-hidden",
                  inverted ? "bg-foreground" : "bg-card"
                )}
              >
                <Image
                  src={cat.mediumUrl ?? cat.imageUrl}
                  alt={cat.name}
                  fill
                  className={cn(
                    "object-cover scale-[1.02] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
                    "group-hover:scale-105",
                    "motion-reduce:transition-none motion-reduce:scale-100 motion-reduce:group-hover:scale-100"
                  )}
                  sizes="(max-width: 640px) 240px, (max-width: 1024px) 260px, 280px"
                />
              </div>
            </MotionLink>
          );
        })}
      </div>
    </section>
  );
}
