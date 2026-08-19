"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useRef } from "react";
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

// The full hover-grow ceiling — a card with total clearance from its rail
// gets exactly this. A card with less clearance gets scaled down from here,
// never up past it.
const MAX_HOVER_SCALE = 1.05;

// Walks up from the image frame to find the nearest ancestor whose overflow-x
// is non-visible — that's the rail's own scroll track, and its rendered box
// (not the frame's own aspect-ratio box) is what actually clips visual
// overflow. Returns null in non-rail contexts (e.g. the /products grid),
// where there is nothing to clip against.
function findScrollableRail(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement;
  while (node) {
    const overflowX = getComputedStyle(node).overflowX;
    if (overflowX === "auto" || overflowX === "scroll") return node;
    node = node.parentElement;
  }
  return null;
}

// The frame grows from `origin-top` (x stays centered, y stays pinned to the
// top edge), so a grown frame can only newly clip past its rail's own visible
// viewport in three ways: past the rail's left edge, past its right edge
// (both from the symmetric horizontal growth), or past its bottom edge (the
// only direction vertical growth spills). For each, solve for the largest
// scale that keeps that edge exactly at the rail's boundary, then take the
// tightest of the three, capped at MAX_HOVER_SCALE and floored at 1 (never
// shrink a card that's already peeking past the boundary at rest — just stop
// it from growing further into that same cut).
function computeSafeHoverScale(frame: HTMLElement, maxScale: number): number {
  const rail = findScrollableRail(frame);
  if (!rail) return maxScale;

  const frameRect = frame.getBoundingClientRect();
  const railRect = rail.getBoundingClientRect();
  if (frameRect.width === 0 || frameRect.height === 0) return maxScale;

  const centerX = frameRect.left + frameRect.width / 2;
  const leftBound = (2 * (centerX - railRect.left)) / frameRect.width;
  const rightBound = (2 * (railRect.right - centerX)) / frameRect.width;
  const bottomBound = (railRect.bottom - frameRect.top) / frameRect.height;

  return Math.max(1, Math.min(maxScale, leftBound, rightBound, bottomBound));
}

export function ProductCard({ product, className, sizes = DEFAULT_SIZES }: ProductCardProps) {
  const href = ROUTES.product(product.categorySlug, product.slug);
  const displayPrice = getDisplayPricePerUnit(product);
  const prefersReducedMotion = usePrefersReducedMotion();
  const frameRef = useRef<HTMLDivElement>(null);
  // Desktop-only "hover to see alternate angle" — mock/real data both carry a 2nd+
  // image for most products, but this must degrade gracefully when it's absent.
  const hoverImage = product.images.length > 1 ? product.images[1] : null;

  // Recomputed on every hover (not cached) — scroll position changes which
  // cards have how much clearance. Driven imperatively (not via a
  // group-hover Tailwind class) because Tailwind/lightningcss's arbitrary-value
  // parser for the physical `scale` property can't handle a bare `var()`
  // reference — it emits literally `scale: var(...)` and fails to compile.
  // Setting the `scale` CSS property directly still picks up the existing
  // `transition-transform duration-700` utility (which transitions `scale`
  // alongside `transform`/`translate`/`rotate` in this Tailwind version), so
  // the animation is identical to the old static-class version.
  const handleHoverStart = useCallback(() => {
    if (prefersReducedMotion) return;
    const frame = frameRef.current;
    if (!frame) return;
    const safeScale = computeSafeHoverScale(frame, MAX_HOVER_SCALE);
    frame.style.scale = safeScale.toString();
  }, [prefersReducedMotion]);

  const handleHoverEnd = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    frame.style.scale = "1";
  }, []);

  return (
    <motion.article
      whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={handleHoverStart}
      onMouseLeave={handleHoverEnd}
      className={cn("group relative flex flex-col hover:z-10", className)}
    >
      {/* Full-card stretched link — single navigable target for the whole card, so
          screen reader users hear the product name announced once, not three times. */}
      <Link href={href} aria-label={product.name} className="absolute inset-0 z-[1]" />

      {/* Image frame — edge-to-edge with the card on left/right, no horizontal inset,
          so the photo reads big and prominent. A small bottom margin (not padding on
          all sides) separates it from the content below, just enough for the bottom
          corners to read as rounded — full rounded-2xl on all four corners, matching
          the Apple reference. The FRAME itself (not the <Image>s inside it) carries
          the hover scale, so the whole rounded rectangle grows on hover — a real
          "image gets bigger" feel, not a crop-zoom contained by a static window.
          origin-top anchors growth so it spills sideways/downward only, never up
          into the row above; the card above has no overflow-hidden and gets
          hover:z-10 so the grown frame isn't clipped by neighboring cards.
          The scale value is set imperatively on hover (handleHoverStart/End
          above), not a static Tailwind class — see computeSafeHoverScale,
          which shrinks it below the MAX_HOVER_SCALE ceiling exactly enough to
          keep the grown frame inside its rail's own clip boundary, so a
          peeking edge card never gets cut further on hover. */}
      <div
        ref={frameRef}
        className="origin-top relative aspect-[19/20] overflow-hidden rounded-2xl mb-3 bg-muted transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:transition-none">
        <Image
          src={product.mediumUrl ?? product.images[0]}
          alt={product.name}
          fill
          className={cn(
            "object-cover transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
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
            className="hidden md:block object-cover opacity-0 transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] md:group-hover:opacity-100"
            sizes={sizes}
          />
        )}
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

        <WishlistButton
          productId={product.id}
          productSlug={product.slug}
          productName={product.name}
          productImage={product.images[0]}
        />
      </div>

      {/* Content — the image frame above now carries its own mb-3 gap, so no extra
          pt-* here to avoid doubling the visual space before the category eyebrow. */}
      <div className="p-4 sm:p-5 flex flex-col items-center gap-1.5 md:gap-2 flex-1 text-center">
        <p className="text-[10px] text-primary/70 uppercase tracking-[0.08em] font-semibold">
          {product.categoryName}
        </p>
        <h2 className="font-sans font-bold text-[15px] sm:text-base leading-snug tracking-[-0.01em] text-foreground group-hover:text-primary transition-colors line-clamp-2 px-1">
          {product.name}
        </h2>
        <p className="hidden md:block text-xs text-muted-foreground/90 line-clamp-2 leading-relaxed px-2">
          {product.shortDescription}
        </p>

        <StarRating
          rating={product.averageRating}
          reviewCount={product.reviewCount}
          size="sm"
          showCount
          className="justify-center mt-0.5"
        />

        <div className="mt-auto pt-2.5 flex flex-col items-center gap-2.5">
          <div>
            <p className="font-sans text-sm leading-snug text-foreground">
              From{" "}
              <span className="font-bold text-xl leading-none">
                {formatPricePerUnit(displayPrice)}
              </span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">per unit</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            <Link
              href={href}
              className={cn(
                "relative z-10 inline-flex shrink-0 items-center rounded-full px-5 py-2.5 text-xs font-semibold",
                "bg-primary text-primary-foreground transition-all duration-300",
                "hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25"
              )}
            >
              Configure
            </Link>
            <Link
              href={href}
              className={cn(
                "relative z-10 inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-primary",
                "transition-all duration-300 hover:gap-1"
              )}
            >
              View details <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
