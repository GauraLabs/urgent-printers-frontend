"use client";

import { useCartStore } from "./store";
import { loadLineRates } from "./rateResolver";

export function LineRateStatus({ cartItemId, compact = false }: { cartItemId: string; compact?: boolean }) {
  const unavailable = useCartStore((s) => s.unavailableIds.includes(cartItemId));
  const failed = useCartStore((s) => s.rateErrorIds.includes(cartItemId));
  if (!unavailable && !failed) return null;
  const size = compact ? "text-xs mt-1" : "text-xs";
  if (unavailable) {
    return <p role="status" className={`${size} text-destructive`}>This item is no longer available. Remove it to continue.</p>;
  }
  return (
    <p role="status" className={`${size} text-muted-foreground`}>
      Couldn&rsquo;t load the latest price.{" "}
      <button type="button" onClick={() => void loadLineRates(cartItemId)} className="font-medium text-primary underline underline-offset-2">
        Retry
      </button>
    </p>
  );
}
