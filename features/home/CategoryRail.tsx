"use client";

import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { SafeImage } from "@/components/common/SafeImage";
import { SectionHeading } from "@/components/common/SectionHeading";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { CategoryTile } from "@/features/navigation/CategoryTile";
import { getRealCategoryCardImage, getRealCategoryImage } from "@/features/navigation/categoryImage";
import { useScrollRail } from "./useScrollRail";
import { ScrollRailButtons } from "./ScrollRailButtons";
import type { Category } from "@/types";

interface CategoryRailProps {
  categories: Category[];
}


/**
 * Quick-jump nav to every category (the per-category product shelves follow below) —
 * every category, swipeable on touch and click/scroll-driven on desktop.
 * Tile widths are fixed (not vw-based) so the row overflows and is
 * demonstrably scrollable even on wide desktop viewports with a short
 * category list.
 */
export function CategoryRail({ categories }: CategoryRailProps) {
  const { trackRef, canScrollLeft, canScrollRight, scrollByPage } = useScrollRail();

  if (categories.length === 0) {
    return (
      <section aria-labelledby="category-rail-heading" className="py-6 md:py-12 lg:py-16 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            id="category-rail-heading"
            eyebrow="Explore"
            title="All Categories"
            description="Swipe through everything we make"
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
    <section aria-labelledby="category-rail-heading" className="py-5 md:py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-3 md:mb-8">
          <div
          >
            <SectionHeading
              id="category-rail-heading"
              eyebrow="Explore"
              title="All Categories"
              description="Swipe through everything we make, from invitations to event essentials"
              align="left"
            />
          </div>
          <ScrollRailButtons
            canScrollLeft={canScrollLeft}
            canScrollRight={canScrollRight}
            onScroll={scrollByPage}
          />
        </div>
      </div>

      {/* Mobile: compact round icons, ~4.5 visible, swipeable. */}
      <ul className="md:hidden flex overflow-x-auto snap-x scrollbar-hide gap-3 px-4 pb-1" aria-label="Categories">
        {categories.map((cat) => (
          <li key={cat.id} className="shrink-0 snap-start w-[72px]">
            <Link href={ROUTES.category(cat.slug)} className="flex flex-col items-center gap-1.5 min-h-11">
              <CategoryTile
                name={cat.name}
                imageUrl={getRealCategoryImage(cat)}
                className="h-16 w-16 rounded-full border border-border text-xl"
                sizes="64px"
              />
              <span className="text-[11px] font-medium leading-tight text-center line-clamp-2">{cat.name}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div
        ref={trackRef}
        className="hidden md:flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-4 py-8 pl-4 sm:pl-6 lg:pl-[max(1rem,calc((100vw-1280px)/2+2rem))] pr-4 scroll-pl-4 sm:scroll-pl-6 lg:scroll-pl-[max(1rem,calc((100vw-1280px)/2+2rem))] scroll-pr-4"
      >
        {categories.map((cat, index) => {
          const inverted = index % 2 === 1;
          const cardImage = getRealCategoryCardImage(cat);
          return (
            <Link
              key={cat.id}
              href={ROUTES.category(cat.slug)}
              className={cn(
                "group flex flex-col shrink-0 snap-start overflow-hidden rounded-2xl transition-shadow duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                "shadow-[var(--shadow-rail-resting)] hover:shadow-[var(--shadow-rail-hover)]",
                "w-[240px] sm:w-[260px] lg:w-[280px] h-[320px] sm:h-[340px] lg:h-[360px]",
                inverted ? "bg-foreground text-background" : "bg-card text-card-foreground"
              )}
            >
              <div className="flex flex-col gap-0.5 p-4 pb-2">
                <h3 className="font-sans font-extrabold text-lg leading-[1.05] tracking-[-0.01em]">
                  {cat.name}
                </h3>
                {cat.description && (
                  <p className="font-sans text-xs opacity-70 leading-snug line-clamp-2">
                    {cat.description}
                  </p>
                )}
                <span className="font-sans text-[11px] opacity-50 mt-1">
                  {cat.productCount} products
                </span>
              </div>

              <div
                className={cn(
                  "relative flex-1 mx-4 mb-4 rounded-xl overflow-hidden",
                  inverted ? "bg-foreground" : "bg-card"
                )}
              >
                {cardImage ? (
                  <SafeImage
                    src={cardImage}
                    alt={cat.name}
                    fill
                    className={cn(
                      "object-cover scale-[1.02] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
                      "group-hover:scale-105",
                      "motion-reduce:transition-none motion-reduce:scale-100 motion-reduce:group-hover:scale-100"
                    )}
                    sizes="(max-width: 640px) 240px, (max-width: 1024px) 260px, 280px"
                  />
                ) : (
                  <CategoryTile
                    name={cat.name}
                    imageUrl={null}
                    className="absolute inset-0 h-full w-full rounded-xl text-7xl"
                  />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
