"use client";

import { Star } from "lucide-react";
import { DiscountBadge, PriceDisplay, StruckMrp } from "@/components/common/PriceDisplay";
import { formatPrice, formatPricePerUnit, cn } from "@/lib/utils";
import { isPack, normalizePack, perUnitSuffix } from "@/lib/pack";
import type { PricingTier } from "@/types";

interface PricingTableProps {
  tiers: PricingTier[];
  selectedQuantity: number;
  onSelectQuantity: (qty: number) => void;
  packSize?: number;
  unitLabel?: string;
}

export function PricingTable({ tiers, selectedQuantity, onSelectQuantity, packSize, unitLabel }: PricingTableProps) {
  const pack = normalizePack(packSize, unitLabel);
  const packMode = isPack(pack.packSize);
  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-sm">
      <div className="bg-muted/50 px-4 py-2.5 flex items-center justify-between border-b border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Quantity Pricing
        </p>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Star size={10} className="fill-brand-orange text-brand-orange" />
          Best value highlighted
        </p>
      </div>

      <div className="divide-y divide-border">
        {tiers.map((tier) => {
          const isSelected = selectedQuantity === tier.quantity;
          const isBest = tier.isBestValue;
          const packs = tier.quantity / pack.packSize;

          if (packMode) {
            const mrpTotal = tier.mrpPerUnit !== undefined ? Math.round(tier.mrpPerUnit * 100) * tier.quantity / 100 : undefined;
            const showDiscount = mrpTotal !== undefined && tier.discountPercent !== undefined && mrpTotal > tier.totalPrice;
            return (
              <button
                key={tier.quantity}
                onClick={() => onSelectQuantity(tier.quantity)}
                className={cn(
                  "w-full flex items-center justify-between gap-3 px-4 py-3 text-left border-l-2 border-transparent transition-colors duration-200 text-sm",
                  "hover:bg-muted/50",
                  isSelected && "bg-primary/5 border-primary",
                  isBest && !isSelected && "bg-brand-orange/5"
                )}
              >
                <span className="min-w-0">
                  <span className={cn("block font-medium transition-colors duration-200", isSelected && "text-primary")}>
                    {tier.quantity.toLocaleString("en-IN")} {pack.unitLabel} · {formatPrice(tier.totalPrice)}
                    {isBest && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-[9px] font-bold text-brand-orange bg-brand-orange/10 px-1.5 py-0.5 rounded-full">
                        <Star size={8} className="fill-brand-orange text-brand-orange" /> BEST
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {formatPricePerUnit(tier.pricePerUnit)}{perUnitSuffix(pack.unitLabel)}
                    {packs > 1 ? ` · ${packs.toLocaleString("en-IN")} packs` : ""}
                  </span>
                </span>
                {showDiscount && (
                  <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 text-xs">
                    <StruckMrp mrp={mrpTotal} />
                    <DiscountBadge percent={tier.discountPercent!} />
                  </span>
                )}
              </button>
            );
          }

          return (
            <button
              key={tier.quantity}
              onClick={() => onSelectQuantity(tier.quantity)}
              className={cn(
                "w-full grid grid-cols-3 px-4 py-3 text-left border-l-2 border-transparent transition-colors duration-200 text-sm",
                "hover:bg-muted/50",
                isSelected && "bg-primary/5 border-primary",
                isBest && !isSelected && "bg-brand-orange/5"
              )}
            >
              <span className={cn("font-medium transition-colors duration-200", isSelected && "text-primary")}>
                {tier.quantity.toLocaleString("en-IN")}
                {isBest && (
                  <span className="ml-1.5 inline-flex items-center gap-0.5 text-[9px] font-bold text-brand-orange bg-brand-orange/10 px-1.5 py-0.5 rounded-full">
                    <Star size={8} className="fill-brand-orange text-brand-orange" /> BEST
                  </span>
                )}
              </span>
              <PriceDisplay
                variant="line"
                align="center"
                price={tier.pricePerUnit}
                mrp={tier.mrpPerUnit}
                percent={tier.discountPercent}
                unitLabel={<span className="text-[10px]">/unit</span>}
                className="text-center text-sm"
              />
              <span className={cn("text-right font-semibold transition-colors duration-200", isSelected && "text-primary")}>
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
