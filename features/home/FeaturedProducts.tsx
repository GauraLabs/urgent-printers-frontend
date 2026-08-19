"use client";

import Link from "next/link";
import { ArrowRight, PackageSearch } from "lucide-react";
import { motion } from "motion/react";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionHeading } from "@/components/common/SectionHeading";
import { ProductCard } from "@/features/products/ProductCard";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { ROUTES } from "@/lib/constants/routes";
import { useScrollRail } from "./useScrollRail";
import { ScrollRailButtons } from "./ScrollRailButtons";
import type { Product } from "@/types";

interface FeaturedProductsProps {
  products: Product[];
}

export function FeaturedProducts({ products }: FeaturedProductsProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { trackRef, canScrollLeft, canScrollRight, scrollByPage } = useScrollRail();

  return (
    <section aria-labelledby="featured-heading" className="relative py-12 lg:py-16 bg-secondary/60">
      <div
        className="absolute top-0 right-0 w-[32rem] h-[28rem] overflow-hidden -z-10 pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
          >
            <SectionHeading
              id="featured-heading"
              eyebrow="Bestsellers"
              title="Popular Products"
              description="Our customers' most-ordered print products"
              align="left"
            />
          </motion.div>
          <div className="hidden sm:flex items-center gap-4">
            <Link
              href={ROUTES.products}
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Browse all <ArrowRight size={14} />
            </Link>
            <ScrollRailButtons
              canScrollLeft={canScrollLeft}
              canScrollRight={canScrollRight}
              onScroll={scrollByPage}
            />
          </div>
        </div>

        {products.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="Nothing to show right now"
            description="We couldn't load these products. Please check back shortly."
          />
        ) : (
          <div
            ref={trackRef}
            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-4 lg:gap-6 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 pb-2 scroll-pl-4 scroll-pr-4 sm:scroll-pl-6 sm:scroll-pr-6 lg:scroll-pl-8 lg:scroll-pr-8"
          >
            {products.map((p, i) => (
              <motion.div
                key={p.id}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.3) }}
                className="w-[62%] sm:w-[38%] md:w-[28%] lg:w-[21%] shrink-0 snap-start"
              >
                <ProductCard
                  product={p}
                  sizes="(max-width: 639px) 62vw, (max-width: 767px) 38vw, (max-width: 1023px) 28vw, 21vw"
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
