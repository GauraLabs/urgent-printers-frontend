import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/common/StarRating";
import { ROUTES } from "@/lib/constants/routes";
import { formatPricePerUnit, cn } from "@/lib/utils";
import type { Product } from "@/types";

interface FeaturedProductsProps {
  products: Product[];
}

function ProductCard({ product }: { product: Product }) {
  const lowestTier = product.pricingTiers[0];
  const href = ROUTES.product(product.categorySlug, product.slug);

  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col rounded-2xl overflow-hidden border border-border bg-card",
        "hover:border-primary/30 hover:shadow-md transition-all duration-300"
      )}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {product.tags.includes("bestseller") && (
          <Badge className="absolute top-3 left-3 bg-brand-orange text-brand-orange-foreground border-0 text-[10px]">
            Bestseller
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <p className="text-xs text-muted-foreground">{product.categoryName}</p>
        <h3 className="font-heading font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {product.name}
        </h3>
        <StarRating rating={product.averageRating} reviewCount={product.reviewCount} size="sm" showCount />

        <div className="mt-auto pt-2 flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground">From</p>
            <p className="font-heading font-bold text-base">
              {formatPricePerUnit(lowestTier.pricePerUnit)}
              <span className="text-xs font-normal text-muted-foreground ml-1">/ unit</span>
            </p>
          </div>
          <span className="text-xs text-primary font-medium flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
            Configure <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function FeaturedProducts({ products }: FeaturedProductsProps) {
  return (
    <section aria-labelledby="featured-heading" className="py-12 lg:py-16 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 id="featured-heading" className="font-heading font-bold text-2xl lg:text-3xl">
              Popular Products
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Our customers' most-ordered print products
            </p>
          </div>
          <Link
            href={ROUTES.products}
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Browse all <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
