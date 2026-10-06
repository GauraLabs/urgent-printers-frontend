import type { ReactNode } from "react";
import { cn, formatPricePerUnit, formatSaleEnd, toDisplayDiscount } from "@/lib/utils";

export type PriceVariant = "card" | "pdp" | "line" | "compact";

interface PriceDisplayProps {
  /** Price charged right now (the server already resolves sale windows). */
  price: number;
  mrp?: number;
  percent?: number;
  variant: PriceVariant;
  /** Text before the price, e.g. "From". */
  prefix?: string;
  /** Text after the price, e.g. "per unit" (card/pdp) or "/unit" (line/compact). */
  unitLabel?: ReactNode;
  /** ISO end of the sale window; shown as "Sale ends … IST" on the pdp variant only. */
  endsAt?: string;
  /** Replaces the formatted final price (e.g. the configurator's animated value). */
  priceSlot?: ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
  priceClassName?: string;
}

type Align = NonNullable<PriceDisplayProps["align"]>;
const ITEMS: Record<Align, string> = { start: "items-start", center: "items-center", end: "items-end" };
const JUSTIFY: Record<Align, string> = { start: "justify-start", center: "justify-center", end: "justify-end" };

// Tinted background + foreground text rather than a solid fill: foreground
// contrasts with the page background in every theme and in light and dark
// mode (>= 9.9:1 measured), where success/destructive fills with white text
// fall to ~3:1.
export function DiscountBadge({ percent, className }: { percent: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-success/40 bg-success/15",
        "px-1.5 py-0.5 text-[10px] font-bold leading-none text-foreground whitespace-nowrap",
        className
      )}
    >
      {percent}% off
    </span>
  );
}

export function StruckMrp({ mrp, className }: { mrp: number; className?: string }) {
  return (
    <span className={cn("text-muted-foreground line-through decoration-1", className)}>
      <span className="sr-only">Original price </span>
      {formatPricePerUnit(mrp)}
    </span>
  );
}

export function PriceDisplay({
  price,
  mrp,
  percent,
  variant,
  prefix,
  unitLabel,
  endsAt,
  priceSlot,
  align,
  className,
  priceClassName,
}: PriceDisplayProps) {
  const discount = toDisplayDiscount(price, mrp, percent);
  const formatted = priceSlot ?? formatPricePerUnit(price);
  const saleEnd = discount && variant === "pdp" && endsAt ? formatSaleEnd(endsAt) : null;

  if (variant === "card") {
    return (
      <div className={cn(discount && "flex flex-col items-center", className) || undefined}>
        {discount && (
          <div className="mb-1 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-xs">
            <StruckMrp mrp={discount.mrp} />
            <DiscountBadge percent={discount.percent} />
          </div>
        )}
        <p className="font-sans text-sm leading-snug text-foreground">
          {prefix ? `${prefix} ` : null}
          <span className={cn("font-bold text-xl leading-none", priceClassName)}>{formatted}</span>
        </p>
        {unitLabel && <p className="text-[10px] text-muted-foreground mt-0.5">{unitLabel}</p>}
      </div>
    );
  }

  if (variant === "pdp") {
    return (
      <div className={className}>
        {discount && (
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <StruckMrp mrp={discount.mrp} className="text-base tabular-nums" />
            <DiscountBadge percent={discount.percent} className="text-xs px-2 py-1" />
          </div>
        )}
        {typeof formatted === "string" ? (
          <p className={cn("font-heading font-bold text-3xl tabular-nums", priceClassName)}>{formatted}</p>
        ) : (
          formatted
        )}
        {saleEnd && <p className="mt-1 text-xs text-muted-foreground">Sale ends {saleEnd}</p>}
      </div>
    );
  }

  // Spans only: this variant is rendered inside <button> rows (pricing table)
  // where block elements are invalid.
  if (variant === "line") {
    return (
      <span className={cn("block", discount && "flex flex-col", discount && ITEMS[align ?? "start"])}>
        {discount && (
          <span className={cn("mb-0.5 flex flex-wrap items-center gap-1.5 text-xs", JUSTIFY[align ?? "start"])}>
            <StruckMrp mrp={discount.mrp} />
            <DiscountBadge percent={discount.percent} />
          </span>
        )}
        <span className={cn("block text-xs text-muted-foreground", discount && "font-medium text-foreground", className)}>
          {prefix ? `${prefix} ` : null}
          <span className={priceClassName}>{formatted}</span>
          {unitLabel}
        </span>
      </span>
    );
  }

  return (
    <div className={cn(discount && "flex flex-col", discount && ITEMS[align ?? "start"]) || undefined}>
      {discount && (
        <div className={cn("mb-0.5 flex flex-wrap items-center gap-1.5 text-[11px]", JUSTIFY[align ?? "start"])}>
          <StruckMrp mrp={discount.mrp} />
          <DiscountBadge percent={discount.percent} />
        </div>
      )}
      <p className={cn("text-xs text-muted-foreground", className)}>
        {prefix ? `${prefix} ` : null}
        <span className={cn("font-semibold text-foreground", priceClassName)}>{formatted}</span>
        {unitLabel}
      </p>
    </div>
  );
}
