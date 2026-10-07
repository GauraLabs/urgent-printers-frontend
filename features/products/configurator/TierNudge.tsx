"use client";

import { Sparkles } from "lucide-react";
import { formatPrice, formatPricePerUnit } from "@/lib/utils";
import { formatCount, perPieceSuffix, unitNoun, type TierNudge as TierNudgeData } from "@/lib/quantity";

interface TierNudgeProps {
  nudge: TierNudgeData;
  unitLabel?: string;
  onAccept: (quantity: number) => void;
}

export function TierNudge({ nudge, unitLabel, onAccept }: TierNudgeProps) {
  const added = `${formatCount(nudge.addQty)} more ${unitNoun(nudge.addQty, unitLabel)}`;
  const rate = `${formatPricePerUnit(nudge.newPerPiece)}${perPieceSuffix(unitLabel)}`;
  const text =
    nudge.saving > 0
      ? `Add ${added} and pay ${rate}: ${formatPrice(nudge.newTotal)} total (you save ${formatPrice(nudge.saving)})`
      : nudge.extra > 0
        ? `Add ${added} for just ${formatPrice(nudge.extra)} more and pay ${rate}`
        : `Add ${added} at no extra cost and pay ${rate}`;
  return (
    <div role="status" className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2 text-sm text-foreground">
        <Sparkles size={15} className="mt-0.5 shrink-0 text-primary" />
        {text}
      </p>
      <button
        type="button"
        onClick={() => onAccept(nudge.newQty)}
        className="h-10 shrink-0 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Add {formatCount(nudge.addQty)} more
      </button>
    </div>
  );
}
