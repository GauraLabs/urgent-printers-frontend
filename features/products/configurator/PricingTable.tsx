"use client";

import { Star } from "lucide-react";
import { formatPrice, formatPricePerUnit, cn } from "@/lib/utils";
import type { PricingTier } from "@/types";

interface PricingTableProps {
  tiers: PricingTier[];
  selectedQuantity: number;
  onSelectQuantity: (qty: number) => void;
}

export function PricingTable({ tiers, selectedQuantity, onSelectQuantity }: PricingTableProps) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="bg-muted/50 px-4 py-2.5 flex items-center justify-between border-b border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Quantity Pricing
        </p>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Star size={10} className="fill-yellow-400 text-yellow-400" />
          Best value highlighted
        </p>
      </div>

      <div className="divide-y divide-border">
        {tiers.map((tier) => {
          const isSelected = selectedQuantity === tier.quantity;
          const isBest = tier.isBestValue;

          return (
            <button
              key={tier.quantity}
              onClick={() => onSelectQuantity(tier.quantity)}
              className={cn(
                "w-full grid grid-cols-3 px-4 py-3 text-left transition-colors text-sm",
                "hover:bg-muted/50",
                isSelected && "bg-primary/5 border-l-2 border-primary",
                isBest && !isSelected && "bg-yellow-50/50 dark:bg-yellow-900/10"
              )}
            >
              <span className={cn("font-medium", isSelected && "text-primary")}>
                {tier.quantity.toLocaleString("en-IN")}
                {isBest && (
                  <span className="ml-1.5 inline-flex items-center gap-0.5 text-[9px] font-bold text-yellow-600 bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-400 px-1.5 py-0.5 rounded-full">
                    <Star size={8} className="fill-yellow-500 text-yellow-500" /> BEST
                  </span>
                )}
              </span>
              <span className="text-center text-muted-foreground">
                {formatPricePerUnit(tier.pricePerUnit)}<span className="text-[10px]">/unit</span>
              </span>
              <span className={cn("text-right font-semibold", isSelected && "text-primary")}>
                {formatPrice(tier.totalPrice)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="bg-muted/30 px-4 py-2 border-t border-border">
        <p className="text-[10px] text-muted-foreground text-center">
          Click a row to select quantity · Price drops as quantity increases
        </p>
      </div>
    </div>
  );
}
