"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/common/StarRating";
import { WishlistButton } from "./WishlistButton";
import { ROUTES } from "@/lib/constants/routes";
import { formatPricePerUnit, cn } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const lowestTier = product.pricingTiers[0];
  const href = ROUTES.product(product.categorySlug, product.slug);

  // Discount display support
  const discountPct = (product as Product & { discountPercent?: number }).discountPercent;
  const originalPrice = discountPct
    ? parseFloat((lowestTier.pricePerUnit / (1 - discountPct / 100)).toFixed(2))
    : null;

  return (
    <motion.article
      whileHover={{ y: -4, boxShadow: "0 12px 32px -4px rgba(0,0,0,0.12)" }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn(
        "group relative flex flex-col rounded-2xl overflow-hidden border border-border bg-card",
        "hover:border-primary/30 transition-colors duration-300",
        className
      )}
    >
      {/* Image */}
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        {discountPct && (
          <Badge className="absolute top-2.5 left-2.5 bg-red-500 text-white border-0 text-[10px] px-2 font-bold">
            {discountPct}% OFF
          </Badge>
        )}
        {!discountPct && product.tags.includes("bestseller") && (
          <Badge className="absolute top-2.5 left-2.5 bg-brand-orange text-brand-orange-foreground border-0 text-[10px] px-2">
            Bestseller
          </Badge>
        )}
        {!discountPct && product.tags.includes("luxury") && !product.tags.includes("bestseller") && (
          <Badge className="absolute top-2.5 left-2.5 bg-primary text-primary-foreground border-0 text-[10px] px-2">
            Premium
          </Badge>
        )}
      </Link>

      {/* Wishlist */}
      <WishlistButton
        productId={product.id}
        productSlug={product.slug}
        productName={product.name}
        productImage={product.images[0]}
      />

      {/* Content */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
          {product.categoryName}
        </p>
        <Link href={href}>
          <h2 className="font-heading font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {product.name}
          </h2>
        </Link>
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {product.shortDescription}
        </p>

        <StarRating rating={product.averageRating} reviewCount={product.reviewCount} size="sm" showCount className="mt-0.5" />

        <div className="mt-auto pt-3 border-t border-border flex items-end justify-between gap-2">
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">From</p>
            <div className="flex items-baseline gap-1.5">
              <p className="font-heading font-bold text-base leading-none">
                {formatPricePerUnit(lowestTier.pricePerUnit)}
              </p>
              {originalPrice && (
                <p className="text-[10px] text-muted-foreground line-through leading-none">
                  {formatPricePerUnit(originalPrice)}
                </p>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">per unit</p>
          </div>
          <Link href={href} className="flex items-center gap-1 text-xs font-semibold text-primary shrink-0 hover:gap-2 transition-all">
            Configure <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
