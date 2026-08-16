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

// Module scope so identity is stable across renders — recreating it per
// render would remount the link (and drop hover/animation state) every time.
// Must stay the direct grid child (not wrapped in an extra motion.div) so the
// col-span/row-span classes on the first tile keep applying.
const MotionLink = motion.create(Link);

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
    <section aria-labelledby="categories-heading" className="py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
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
              description="Premium print products for every business need"
              align="left"
            />
          </motion.div>
          <Link
            href={ROUTES.products}
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            All products <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 lg:gap-4 grid-flow-row-dense">
          {categories.map((cat, index) => (
            <MotionLink
              key={cat.id}
              href={ROUTES.category(cat.slug)}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0, transition: { duration: 0.4, delay: index * 0.05 } }}
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
                "group relative overflow-hidden rounded-2xl shadow-[var(--shadow-card-resting)] hover:shadow-[var(--shadow-card-hover)]",
                "ring-1 ring-border hover:ring-primary/40 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                index === 0
                  ? "aspect-square md:col-span-2 md:row-span-2"
                  : index === 1 || index === 2
                    ? "aspect-[3/4] md:aspect-auto md:h-full"
                    : "aspect-[3/4]"
              )}
            >
              <Image
                src={index === 0 ? (cat.bannerUrl ?? cat.imageUrl) : (cat.mediumUrl ?? cat.imageUrl)}
                alt={cat.name}
                fill
                className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                sizes={
                  index === 0
                    ? "(max-width: 767px) 50vw, (max-width: 1279px) 66vw, 800px"
                    : "(max-width: 767px) 50vw, (max-width: 1279px) 33vw, 390px"
                }
              />
              {/* Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-all duration-300 group-hover:from-black/80" />

              {/* Label */}
              <div className="absolute bottom-0 inset-x-0 p-5 lg:p-6">
                <h3 className={cn(
                  "font-heading font-bold text-white leading-[1.05] tracking-[-0.01em]",
                  index === 0 ? "text-3xl sm:text-4xl lg:text-5xl" : "text-xl sm:text-2xl"
                )}>
                  {cat.name}
                </h3>
                {cat.description && (
                  <p className={cn(
                    "font-sans text-white/70 mt-1.5 leading-snug",
                    index === 0 ? "text-sm sm:text-base line-clamp-2 max-w-md" : "text-xs sm:text-sm line-clamp-1"
                  )}>
                    {cat.description}
                  </p>
                )}
              </div>

              {/* Hover arrow */}
              <div className={cn(
                "absolute top-3 right-3 w-7 h-7 rounded-full bg-white/0 flex items-center justify-center",
                "group-hover:bg-white/20 transition-all duration-300"
              )}>
                <ArrowRight size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </MotionLink>
          ))}
        </div>

        <div className="mt-6 text-center sm:hidden">
          <Link
            href={ROUTES.products}
            className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
          >
            View all products <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
