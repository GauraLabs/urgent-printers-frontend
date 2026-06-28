import Image from "next/image";
import Link from "next/link";
import { ArrowRight, LayoutGrid } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionHeading } from "@/components/common/SectionHeading";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

interface CategoryGridProps {
  categories: Category[];
}

export function CategoryGrid({ categories }: CategoryGridProps) {
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
          <SectionHeading
            id="categories-heading"
            eyebrow="Browse"
            title="Shop by Category"
            description="Premium print products for every business need"
            align="left"
          />
          <Link
            href={ROUTES.products}
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            All products <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6 grid-flow-row-dense">
          {categories.map((cat, index) => (
            <Link
              key={cat.id}
              href={ROUTES.category(cat.slug)}
              className={cn(
                "group relative overflow-hidden rounded-2xl shadow-sm hover:shadow-md",
                "ring-1 ring-border hover:ring-primary/40 transition-all duration-300",
                index === 0 ? "aspect-square md:col-span-2 md:row-span-2" : "aspect-[4/3]"
              )}
            >
              <Image
                src={cat.imageUrl}
                alt={cat.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
              {/* Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {/* Label */}
              <div className="absolute bottom-0 inset-x-0 p-4">
                <h3 className={cn(
                  "font-heading font-bold text-white leading-tight",
                  index === 0 ? "text-xl sm:text-2xl" : "text-base sm:text-lg"
                )}>
                  {cat.name}
                </h3>
                <p className="text-white/75 text-xs mt-0.5">
                  {cat.productCount} products
                </p>
              </div>

              {/* Hover arrow */}
              <div className={cn(
                "absolute top-3 right-3 w-7 h-7 rounded-full bg-white/0 flex items-center justify-center",
                "group-hover:bg-white/20 transition-all duration-300"
              )}>
                <ArrowRight size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
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
