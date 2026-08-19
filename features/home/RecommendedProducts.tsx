"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { SectionHeading } from "@/components/common/SectionHeading";
import { ProductCard } from "@/features/products/ProductCard";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { ROUTES } from "@/lib/constants/routes";
import { useScrollRail } from "./useScrollRail";
import { ScrollRailButtons } from "./ScrollRailButtons";
import type { Product } from "@/types";

interface RecommendedProductsProps {
  products: Product[];
}

export function RecommendedProducts({ products }: RecommendedProductsProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { trackRef, canScrollLeft, canScrollRight, scrollByPage } = useScrollRail();

  if (products.length === 0) return null;

  return (
    <section aria-labelledby="recommended-heading" className="py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
          >
            <SectionHeading
              id="recommended-heading"
              eyebrow="Just for You"
              title="Recommended for You"
              description="Picked based on what businesses like yours order most"
              align="left"
            />
          </motion.div>
          <div className="hidden sm:flex items-center gap-4">
            <Link
              href={ROUTES.products}
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              View all <ArrowRight size={14} />
            </Link>
            <ScrollRailButtons
              canScrollLeft={canScrollLeft}
              canScrollRight={canScrollRight}
              onScroll={scrollByPage}
            />
          </div>
        </div>

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
      </div>
    </section>
  );
}
