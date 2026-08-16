"use client";

import { Heart } from "lucide-react";
import { motion } from "motion/react";
import { useWishlistStore } from "@/features/wishlist/store";
import { useMounted } from "@/hooks/useMounted";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  productId: string;
  productSlug: string;
  productName: string;
  productImage: string;
}

export function WishlistButton({ productId, productSlug, productName, productImage }: WishlistButtonProps) {
  const mounted = useMounted();
  const prefersReducedMotion = usePrefersReducedMotion();
  const toggleItem = useWishlistStore((s) => s.toggleItem);
  const wishlisted = useWishlistStore((s) => s.isWishlisted(productId));
  const isWishlisted = mounted && wishlisted;

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleItem({ productId, productSlug, productName, productImage });
  }

  return (
    <button
      onClick={handleClick}
      aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={isWishlisted}
      className={cn(
        "absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full flex items-center justify-center",
        "bg-white/80 backdrop-blur-sm shadow-sm border border-white/60",
        "transition-all hover:scale-110 active:scale-95",
        isWishlisted ? "text-rose-500" : "text-muted-foreground hover:text-rose-400"
      )}
    >
      {/* `key` swap forces a fresh mount on toggle, replaying initial→animate as a pop */}
      <motion.span
        key={isWishlisted ? "filled" : "empty"}
        initial={prefersReducedMotion ? false : { scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 15 }}
        className="inline-flex"
      >
        <Heart size={15} className={cn(isWishlisted && "fill-rose-500")} />
      </motion.span>
    </button>
  );
}
