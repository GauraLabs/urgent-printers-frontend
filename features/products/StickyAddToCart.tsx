"use client";

import { useEffect, useState } from "react";
import { ShoppingBag, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { StruckMrp } from "@/components/common/PriceDisplay";
import { cn, formatPrice } from "@/lib/utils";

interface StickyAddToCartProps {
  productName: string;
  price: string;
  /** Pre-discount total; with `savings`, shown struck through next to the price. */
  mrpTotal?: number;
  savings?: number;
  isInCart?: boolean;
  /** e.g. "120 pcs". */
  quantityLabel?: string;
  /** Same gate as the PDP button: the quantity field is empty. */
  disabled?: boolean;
  observeRef: React.RefObject<HTMLButtonElement | null>;
  onAddToCart: () => void;
}

export function StickyAddToCart({ productName, price, mrpTotal, savings, isInCart = false, quantityLabel, disabled = false, observeRef, onAddToCart }: StickyAddToCartProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const target = observeRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(!entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [observeRef]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={cn(
            "fixed bottom-16 lg:bottom-0 inset-x-0 z-30 lg:z-40",
            "border-t border-border bg-background/95 backdrop-blur shadow-lg"
          )}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-heading font-semibold text-sm truncate">{productName}</p>
              {quantityLabel && <p className="text-[11px] text-muted-foreground truncate">{quantityLabel}</p>}
              {mrpTotal !== undefined && savings !== undefined ? (
                <p className="flex items-center gap-x-1.5 text-xs text-muted-foreground truncate">
                  <StruckMrp mrp={mrpTotal} className="shrink-0" />
                  <span className="font-semibold text-foreground">{price}</span>
                  <span className="shrink-0 font-medium text-foreground">· Save {formatPrice(savings)}</span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">{price}</p>
              )}
            </div>
            <button
              onClick={onAddToCart}
              disabled={disabled}
              className={cn(
                "disabled:opacity-60 disabled:cursor-not-allowed",
                "shrink-0 flex items-center gap-2 h-10 px-5 rounded-xl font-semibold text-sm",
                "transition-all active:scale-[0.98] shadow-md",
                isInCart
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
                  : "bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground shadow-brand-orange/20"
              )}
            >
              {isInCart ? <CheckCircle2 size={16} /> : <ShoppingBag size={16} />}
              {disabled ? "Enter a quantity" : isInCart ? "Update Cart" : "Add to Cart"}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
