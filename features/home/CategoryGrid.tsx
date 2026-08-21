"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, LayoutGrid } from "lucide-react";
import { motion } from "motion/react";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionHeading } from "@/components/common/SectionHeading";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { ROUTES } from "@/lib/constants/routes";
import type { Category } from "@/types";

interface CategoryGridProps {
  categories: Category[];
}

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
            const imageUrl = cat.bannerUrl ?? cat.mediumUrl ?? cat.imageUrl;
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
                <div className="relative rounded-3xl aspect-[3/4] sm:aspect-[4/5] flex flex-col overflow-hidden bg-card">
                  {/* Blurred, enlarged copy of the card's own photo as a vivid
                      colorful backdrop — pure CSS filters, no server work.
                      scale-[1.35] pushes the sharp source edges well outside the
                      card before blur-[20px] softens them, so overflow-hidden
                      above never reveals a crisp/legible boundary. brightness-[1.22]
                      and saturate-[1.45] punch up the blur so it reads as vivid
                      photo-color rather than a muted pastel wash (design choice
                      "Vivid & saturated", picked from a set of backdrop options —
                      paired with a much thinner scrim below). */}
                  <Image
                    src={imageUrl}
                    alt=""
                    aria-hidden="true"
                    fill
                    className="absolute inset-0 object-cover blur-[20px] brightness-[1.22] saturate-[1.45] scale-[1.35]"
                    sizes="(max-width: 767px) 60vw, (max-width: 1279px) 40vw, 320px"
                  />
                  {/* Scrim keeps the title/description legible over whatever
                      brightness the source photo happens to have, in both
                      light and dark mode. Light stays thin so the
                      vivid/saturated backdrop shows through clearly instead of
                      being flattened toward a pastel wash. Dark is meaningfully
                      stronger (50% vs 18%) because near-white text needs more
                      dimming of the vivid/bright backdrop to stay legible;
                      still short of a full wash so the vivid color survives. */}
                  <div className="absolute inset-0 bg-background/8 dark:bg-background/50" />

                  {/* Full-card stretched link — single navigable target, so the
                      visible "Shop now" pill below can be its own real link without
                      creating nested anchors (same pattern as ProductCard). */}
                  <Link href={href} aria-label={cat.name} className="absolute inset-0 z-[1] rounded-3xl" />

                  <div className="relative z-10 flex flex-col items-center text-center px-6 pt-6 sm:px-7 sm:pt-7">
                    <h3 className="font-sans font-bold text-foreground text-2xl sm:text-[1.75rem] leading-[1.1] tracking-[-0.01em] line-clamp-2 dark:[text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">
                      {cat.name}
                    </h3>
                    {cat.description && (
                      <p className="font-sans text-sm text-muted-foreground mt-2 line-clamp-1 dark:[text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">
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
                      overflow-hidden. object-cover + object-bottom so the
                      image always fills this box edge-to-edge (left, right,
                      bottom) with no gradient gaps; tall/portrait images crop
                      off the top instead, since object-bottom anchors the
                      bottom edge. */}
                  <div className="relative z-0 flex-1 mt-5">
                    <Image
                      src={imageUrl}
                      alt=""
                      aria-hidden="true"
                      fill
                      className="object-cover object-bottom"
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
