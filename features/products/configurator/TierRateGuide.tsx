"use client";

import { Star } from "lucide-react";
import { cn, formatPricePerUnit } from "@/lib/utils";
import { formatCount, perPieceSuffix, type TierGuideEntry } from "@/lib/quantity";

interface TierRateGuideProps {
  entries: TierGuideEntry[];
  unitLabel?: string;
  onSelect: (quantity: number) => void;
}

export function TierRateGuide({ entries, unitLabel, onSelect }: TierRateGuideProps) {
  if (entries.length < 2) return null;
  const suffix = perPieceSuffix(unitLabel);
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rate by quantity</p>
      <div className="flex flex-wrap gap-1.5">
        {entries.map((e) => (
          <button
            key={e.quantity}
            type="button"
            onClick={() => onSelect(e.label)}
            aria-current={e.current ? "true" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-xs font-medium transition-colors",
              e.current
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-muted"
            )}
          >
            {formatCount(e.label)}+ {formatPricePerUnit(e.pricePerUnit)}{suffix}
            {e.isBestValue && <Star size={11} className="fill-current" aria-label="Best value" />}
          </button>
        ))}
      </div>
    </div>
  );
}
