"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, LayoutGrid } from "lucide-react";
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

        <div
          ref={trackRef}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 pb-2"
        >
          {categories.map((cat, index) => (
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
                  : { y: -6, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }
              }
              whileTap={
                prefersReducedMotion
                  ? undefined
                  : { scale: 0.98, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } }
              }
              className={cn(
                "group relative shrink-0 snap-start overflow-hidden rounded-2xl shadow-[var(--shadow-card-resting)] hover:shadow-[var(--shadow-card-hover)]",
                "ring-1 ring-border hover:ring-primary/40 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                "w-[220px] sm:w-[240px] lg:w-[260px] aspect-[3/4]"
              )}
            >
              <Image
                src={cat.mediumUrl ?? cat.imageUrl}
                alt={cat.name}
                fill
                className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                sizes="(max-width: 640px) 220px, (max-width: 1024px) 240px, 260px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent transition-all duration-300 group-hover:from-black/85" />

              <div className="absolute bottom-0 inset-x-0 p-4">
                <h3 className="font-heading font-bold text-white text-lg leading-[1.05] tracking-[-0.01em]">
                  {cat.name}
                </h3>
                <p className="font-sans text-white/70 text-xs mt-1 leading-snug line-clamp-1">
                  {cat.description || `${cat.productCount} products`}
                </p>
              </div>

              <div
                className={cn(
                  "absolute top-3 right-3 w-7 h-7 rounded-full bg-white/0 flex items-center justify-center",
                  "group-hover:bg-white/20 transition-all duration-300"
                )}
              >
                <ArrowRight size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </MotionLink>
          ))}
        </div>
      </div>
    </section>
  );
}
