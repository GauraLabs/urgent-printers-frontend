import { cn } from "@/lib/utils";
import { formatPrice, formatPricePerUnit } from "@/lib/utils";

interface PriceDisplayProps {
  pricePerUnit: number;
  quantity: number;
  totalPrice?: number;
  currency?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  showTotal?: boolean;
}

const SIZE_MAP = {
  sm: { unit: "text-base", label: "text-xs", total: "text-xs" },
  md: { unit: "text-xl", label: "text-sm", total: "text-sm" },
  lg: { unit: "text-3xl", label: "text-base", total: "text-base" },
};

export function PriceDisplay({
  pricePerUnit,
  quantity,
  totalPrice,
  currency = "INR",
  className,
  size = "md",
  showTotal = true,
}: PriceDisplayProps) {
  const computed = totalPrice ?? pricePerUnit * quantity;
  const s = SIZE_MAP[size];

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <div className="flex items-baseline gap-1.5">
        <span className={cn("font-heading font-bold text-foreground", s.unit)}>
          {formatPricePerUnit(pricePerUnit, currency)}
        </span>
        <span className={cn("text-muted-foreground", s.label)}>per unit</span>
      </div>
      {showTotal && (
        <p className={cn("text-muted-foreground", s.total)}>
          {formatPrice(computed, currency)} for {quantity.toLocaleString()} units
        </p>
      )}
    </div>
  );
}
