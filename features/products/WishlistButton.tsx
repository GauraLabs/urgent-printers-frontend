"use client";

import { Heart } from "lucide-react";
import { useWishlistStore } from "@/features/wishlist/store";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  productId: string;
  productSlug: string;
  productName: string;
  productImage: string;
}

export function WishlistButton({ productId, productSlug, productName, productImage }: WishlistButtonProps) {
  const toggleItem = useWishlistStore((s) => s.toggleItem);
  const isWishlisted = useWishlistStore((s) => s.isWishlisted(productId));

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleItem({ productId, productSlug, productName, productImage });
  }

  return (
    <button
      onClick={handleClick}
      aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
      className={cn(
        "absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center",
        "bg-white/80 backdrop-blur-sm shadow-sm border border-white/60",
        "transition-all hover:scale-110",
        isWishlisted ? "text-rose-500" : "text-muted-foreground hover:text-rose-400"
      )}
    >
      <Heart size={15} className={cn(isWishlisted && "fill-rose-500")} />
    </button>
  );
}
