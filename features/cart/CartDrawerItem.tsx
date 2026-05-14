"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2, Plus, Minus } from "lucide-react";
import { useCartStore } from "./store";
import { formatPrice, slugify, cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants/routes";
import type { CartItem } from "@/types";

interface CartDrawerItemProps {
  item: CartItem;
}

export function CartDrawerItem({ item }: CartDrawerItemProps) {
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const closeCart = useCartStore((s) => s.closeCart);

  const categorySlug = item.product.categorySlug || slugify(item.product.categoryName) || "products";
  const productHref = ROUTES.product(categorySlug, item.product.slug);

  return (
    <div className="flex gap-3 py-4">
      {/* Product image */}
      <Link
        href={productHref}
        onClick={closeCart}
        className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-border bg-muted"
      >
        {item.product.images[0] ? (
          <Image
            src={item.product.images[0]}
            alt={item.product.name}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-[10px] font-medium px-1 text-center leading-tight">
            {item.product.name.slice(0, 12)}
          </div>
        )}
      </Link>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <Link
          href={productHref}
          onClick={closeCart}
          className="font-medium text-sm leading-tight hover:text-primary transition-colors line-clamp-1"
        >
          {item.product.name}
        </Link>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
          {item.config.sizeLabel} · {item.config.paperLabel} · {item.config.finishLabel}
        </p>
        <p className="text-xs text-muted-foreground">
          {item.config.sides.toLowerCase().includes("double") ? "Double-sided" : "Single-sided"} · {item.config.turnaroundLabel.split(" ")[0]}
        </p>

        {/* Quantity + price row */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() =>
                updateQuantity(
                  item.cartItemId,
                  Math.max(1, item.config.quantity - (item.config.quantity <= 100 ? 25 : 50))
                )
              }
              aria-label="Decrease quantity"
              className={cn(
                "w-6 h-6 flex items-center justify-center rounded border border-border",
                "hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              )}
            >
              <Minus size={10} />
            </button>
            <span className="text-xs font-medium w-10 text-center">
              {item.config.quantity}
            </span>
            <button
              onClick={() =>
                updateQuantity(
                  item.cartItemId,
                  item.config.quantity + (item.config.quantity < 100 ? 25 : 50)
                )
              }
              aria-label="Increase quantity"
              className={cn(
                "w-6 h-6 flex items-center justify-center rounded border border-border",
                "hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              )}
            >
              <Plus size={10} />
            </button>
          </div>
          <span className="font-semibold text-sm">
            {formatPrice(item.totalPrice)}
          </span>
        </div>
      </div>

      {/* Remove */}
      <button
        onClick={() => removeItem(item.cartItemId)}
        aria-label={`Remove ${item.product.name} from cart`}
        className="shrink-0 self-start p-1 text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
