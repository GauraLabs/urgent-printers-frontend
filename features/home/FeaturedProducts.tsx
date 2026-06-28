import Link from "next/link";
import { ArrowRight, PackageSearch } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionHeading } from "@/components/common/SectionHeading";
import { ProductCard } from "@/features/products/ProductCard";
import { ROUTES } from "@/lib/constants/routes";
import type { Product } from "@/types";

interface FeaturedProductsProps {
  products: Product[];
}

export function FeaturedProducts({ products }: FeaturedProductsProps) {
  return (
    <section aria-labelledby="featured-heading" className="relative overflow-hidden py-12 lg:py-16 bg-secondary/30">
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl -z-10" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <SectionHeading
            id="featured-heading"
            eyebrow="Bestsellers"
            title="Popular Products"
            description="Our customers' most-ordered print products"
            align="left"
          />
          <Link
            href={ROUTES.products}
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Browse all <ArrowRight size={14} />
          </Link>
        </div>

        {products.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="Nothing to show right now"
            description="We couldn't load these products. Please check back shortly."
          />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
