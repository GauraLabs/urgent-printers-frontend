"use client";

import { useEffect, useState, useRef } from "react";
import { ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface StickyAddToCartProps {
  productName: string;
  price: string;
  observeRef: React.RefObject<HTMLButtonElement | null>;
  onAddToCart: () => void;
}

export function StickyAddToCart({ productName, price, observeRef, onAddToCart }: StickyAddToCartProps) {
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
              <p className="text-xs text-muted-foreground">{price}</p>
            </div>
            <button
              onClick={onAddToCart}
              className={cn(
                "shrink-0 flex items-center gap-2 h-10 px-5 rounded-xl font-semibold text-sm",
                "bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground",
                "transition-all active:scale-[0.98] shadow-md shadow-brand-orange/20"
              )}
            >
              <ShoppingBag size={16} />
              Add to Cart
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
