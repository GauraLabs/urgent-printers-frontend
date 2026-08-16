"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/common/StarRating";
import { WishlistButton } from "./WishlistButton";
import { ROUTES } from "@/lib/constants/routes";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { formatPricePerUnit, getDisplayPricePerUnit, cn } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  className?: string;
  /** Must match the calling grid's real column layout — see next/image `sizes` docs. */
  sizes?: string;
}

const DEFAULT_SIZES = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw";

export function ProductCard({ product, className, sizes = DEFAULT_SIZES }: ProductCardProps) {
  const href = ROUTES.product(product.categorySlug, product.slug);
  const displayPrice = getDisplayPricePerUnit(product);
  const prefersReducedMotion = usePrefersReducedMotion();
  // Desktop-only "hover to see alternate angle" — mock/real data both carry a 2nd+
  // image for most products, but this must degrade gracefully when it's absent.
  const hoverImage = product.images.length > 1 ? product.images[1] : null;

  return (
    <motion.article
      whileHover={prefersReducedMotion ? undefined : { y: -6, scale: 1.015 }}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative flex flex-col rounded-2xl overflow-hidden border border-border bg-card",
        "shadow-[var(--shadow-card-resting)] hover:shadow-[var(--shadow-card-hover)]",
        "hover:border-primary/30 transition-[border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        className
      )}
    >
      {/* Full-card stretched link — single navigable target for the whole card, so
          screen reader users hear the product name announced once, not three times. */}
      <Link href={href} aria-label={product.name} className="absolute inset-0 z-[1]" />

      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Image
          src={product.mediumUrl ?? product.images[0]}
          alt={product.name}
          fill
          className={cn(
            "object-cover transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110",
            "motion-reduce:transition-none motion-reduce:group-hover:scale-100",
            hoverImage && "md:group-hover:opacity-0"
          )}
          sizes={sizes}
        />
        {hoverImage && (
          <Image
            src={hoverImage}
            alt=""
            aria-hidden="true"
            fill
            className={cn(
              "hidden md:block object-cover opacity-0 scale-110 transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
              "md:group-hover:opacity-100 motion-reduce:transition-none"
            )}
            sizes={sizes}
          />
        )}
        {/* Bottom scrim, desktop-only — lifts the "Configure" pill's contrast once it slides in on hover */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-14 bg-gradient-to-t from-black/35 to-transparent opacity-0 transition-opacity duration-300 md:block md:group-hover:opacity-100"
        />
        {product.badge && product.badge !== "none" && (
          <Badge
            variant={
              product.badge === "new"
                ? "success"
                : product.badge === "sale"
                  ? "sale"
                  : "default"
            }
            className={cn(
              "absolute top-2.5 left-2.5 z-10 border-0 text-[10px] px-2 capitalize",
              product.badge === "bestseller" && "bg-brand-orange text-brand-orange-foreground"
            )}
          >
            {product.badge}
          </Badge>
        )}
      </div>

      {/* Wishlist */}
      <WishlistButton
        productId={product.id}
        productSlug={product.slug}
        productName={product.name}
        productImage={product.images[0]}
      />

      {/* Content */}
      <div className="p-4 flex flex-col gap-1.5 md:gap-2 flex-1">
        <p className="text-[10px] text-primary/70 uppercase tracking-[0.08em] font-semibold">
          {product.categoryName}
        </p>
        <h2 className="font-heading font-semibold text-base leading-[1.2] tracking-[-0.01em] group-hover:text-primary transition-colors line-clamp-2">
          {product.name}
        </h2>
        <p className="hidden md:block text-xs text-muted-foreground/90 line-clamp-2 leading-normal">
          {product.shortDescription}
        </p>

        <StarRating rating={product.averageRating} reviewCount={product.reviewCount} size="sm" showCount className="mt-0.5" />

        <div className="mt-auto pt-3 border-t border-border flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">From</p>
            <div className="flex items-baseline gap-1.5">
              <p className="font-heading font-bold text-lg leading-none text-foreground">
                {formatPricePerUnit(displayPrice)}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">per unit</p>
          </div>
          <Link
            href={href}
            className={cn(
              "relative z-10 inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold",
              "bg-primary/10 text-primary transition-all duration-300",
              "hover:bg-primary hover:text-primary-foreground hover:gap-1.5 hover:shadow-md hover:shadow-primary/25",
              "md:group-hover:bg-primary md:group-hover:text-primary-foreground md:group-hover:shadow-md md:group-hover:shadow-primary/25"
            )}
          >
            Configure <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
