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
import type { Category } from "@/types";

interface CategoryGridProps {
  categories: Category[];
}

// Soft pastel gradient tokens defined in app/globals.css (:root / .dark / the
// prefers-color-scheme fallback — all three kept in sync). Cycled by index so
// each of the 3 featured cards gets a distinct tone.
const SPOTLIGHT_BACKGROUNDS = [
  "bg-[image:var(--category-spotlight-coral)]",
  "bg-[image:var(--category-spotlight-lavender)]",
  "bg-[image:var(--category-spotlight-sage)]",
];

export function CategoryGrid({ categories }: CategoryGridProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (categories.length === 0) {
    return (
      <section aria-labelledby="categories-heading" className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            id="categories-heading"
            eyebrow="Browse"
            title="Shop by Category"
            description="Premium print products for every business need"
            align="center"
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
    <section aria-labelledby="categories-heading" className="py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <SectionHeading
            id="categories-heading"
            eyebrow="Browse"
            title="Shop by Category"
            align="center"
            className="mb-10 lg:mb-14"
          />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 lg:gap-x-12">
          {categories.map((cat, index) => {
            const href = ROUTES.category(cat.slug);
            return (
              <motion.div
                key={cat.id}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.45, delay: index * 0.08 },
                }}
                viewport={{ once: true, margin: "-40px" }}
                className="group relative"
              >
                <div
                  className={cn(
                    "relative rounded-3xl aspect-[3/4] sm:aspect-[4/5] flex flex-col overflow-hidden",
                    SPOTLIGHT_BACKGROUNDS[index % SPOTLIGHT_BACKGROUNDS.length]
                  )}
                >
                  {/* Full-card stretched link — single navigable target, so the
                      visible "Shop now" pill below can be its own real link without
                      creating nested anchors (same pattern as ProductCard). */}
                  <Link href={href} aria-label={cat.name} className="absolute inset-0 z-[1] rounded-3xl" />

                  <div className="relative z-10 flex flex-col items-center text-center px-6 pt-6 sm:px-7 sm:pt-7">
                    <h3 className="font-sans font-bold text-foreground text-2xl sm:text-[1.75rem] leading-[1.1] tracking-[-0.01em] line-clamp-2">
                      {cat.name}
                    </h3>
                    {cat.description && (
                      <p className="font-sans text-sm text-muted-foreground mt-2 line-clamp-1">
                        {cat.description}
                      </p>
                    )}
                    <Link
                      href={href}
                      className="relative z-10 inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-5 py-2.5 text-xs font-semibold mt-5"
                    >
                      Shop now <ArrowRight size={13} />
                    </Link>
                  </div>

                  {/* Image tile flush with the card's left/right/bottom edges —
                      clipping is handled by the outer card's rounded-3xl
                      overflow-hidden. object-contain + object-bottom (not
                      object-cover) so a transparent product PNG sits on the
                      gradient without being cropped, gradient showing through
                      above/around it. */}
                  <div className="relative z-0 flex-1 mt-5">
                    <Image
                      src={cat.bannerUrl ?? cat.mediumUrl ?? cat.imageUrl}
                      alt=""
                      aria-hidden="true"
                      fill
                      className="object-contain object-bottom"
                      sizes="(max-width: 767px) 60vw, (max-width: 1279px) 40vw, 320px"
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
