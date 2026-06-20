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

        <div className="flex sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6 overflow-x-auto sm:overflow-visible snap-x snap-mandatory scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 pb-2">
          {products.map((p) => (
            <div key={p.id} className="w-[62%] sm:w-auto shrink-0 snap-start">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
