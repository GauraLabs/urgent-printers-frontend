"use client";

import Link from "next/link";
import { Trash2, Plus, Minus } from "lucide-react";
import { SafeImage } from "@/components/common/SafeImage";
import { useCartStore } from "./store";
import { PriceDisplay } from "@/components/common/PriceDisplay";
import { cartItemDiscount, cartLinePrice } from "./savings";
import { formatPrice, slugify, cn } from "@/lib/utils";
import { formatQuantity, isPack, normalizePack, stepQuantity } from "@/lib/pack";
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

  const discount = cartItemDiscount(item);
  const linePrice = cartLinePrice(item);
  const { packSize, unitLabel } = normalizePack(item.config.packSize, item.config.unitLabel);

  const specLine = [item.config.sizeLabel, item.config.paperLabel, item.config.finishLabel].filter(
    (v): v is string => Boolean(v)
  );

  return (
    <div className="flex gap-3 py-4">
      {/* Product image */}
      <Link
        href={productHref}
        onClick={closeCart}
        className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-border bg-muted"
      >
        {item.product.thumbnailUrl ?? item.product.images[0] ? (
          <SafeImage
            src={item.product.thumbnailUrl ?? item.product.images[0]}
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
        {specLine.length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {specLine.join(" · ")}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {item.config.sides
            ? `${item.config.sides.toLowerCase().includes("double") ? "Double-sided" : "Single-sided"} · `
            : ""}
          {item.config.turnaroundLabel.split(" ")[0]}
        </p>

        {discount && (
          <PriceDisplay variant="line" {...linePrice} className="mt-1" />
        )}

        {/* Quantity + price row */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() =>
                updateQuantity(item.cartItemId, stepQuantity(item.config.quantity, "down", packSize))
              }
              aria-label="Decrease quantity"
              className={cn(
                "w-6 h-6 flex items-center justify-center rounded border border-border",
                "hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              )}
            >
              <Minus size={10} />
            </button>
            <span className={cn("text-xs font-medium text-center", isPack(packSize) ? "min-w-10" : "w-10")}>
              {isPack(packSize) ? formatQuantity(item.config.quantity, packSize, unitLabel) : item.config.quantity}
            </span>
            <button
              onClick={() =>
                updateQuantity(item.cartItemId, stepQuantity(item.config.quantity, "up", packSize))
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
