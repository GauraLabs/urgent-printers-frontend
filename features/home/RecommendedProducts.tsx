import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/common/SectionHeading";
import { ProductCard } from "@/features/products/ProductCard";
import { ROUTES } from "@/lib/constants/routes";
import type { Product } from "@/types";

interface RecommendedProductsProps {
  products: Product[];
}

export function RecommendedProducts({ products }: RecommendedProductsProps) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="recommended-heading" className="py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <SectionHeading
            id="recommended-heading"
            eyebrow="Just for You"
            title="Recommended for You"
            description="Picked based on what businesses like yours order most"
            align="left"
          />
          <Link
            href={ROUTES.products}
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>

        <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-4 lg:gap-6 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 pb-2">
          {products.map((p) => (
            <div key={p.id} className="w-[62%] sm:w-[38%] md:w-[28%] lg:w-[21%] shrink-0 snap-start">
              <ProductCard
                product={p}
                sizes="(max-width: 639px) 62vw, (max-width: 767px) 38vw, (max-width: 1023px) 28vw, 21vw"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
