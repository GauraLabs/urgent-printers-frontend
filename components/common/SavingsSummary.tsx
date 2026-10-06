import { PartyPopper } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import type { OrderPricing } from "@/types";

export interface Savings {
  total: number;
  mrp: number;
  coupon: number;
  couponCode?: string;
}

// totalSavings/mrpSavings come from the server (they're already summed there,
// so nothing is added up client-side on checkout/order pages). An older
// backend sends neither: the coupon discount alone is the saving, as before.
export function savingsFromPricing(p: Pick<OrderPricing, "discountAmount" | "couponCode" | "mrpSavings" | "totalSavings">): Savings {
  const mrp = p.mrpSavings ?? 0;
  return {
    total: p.totalSavings ?? mrp + p.discountAmount,
    mrp,
    coupon: p.discountAmount,
    couponCode: p.couponCode,
  };
}

interface SavingsSummaryProps {
  savings: Savings;
  className?: string;
  variant?: "banner" | "inline";
}

// Informational only: the subtotal above already reflects the lower selling
// prices, so these rows are not part of the sum.
export function SavingsSummary({ savings, className, variant = "banner" }: SavingsSummaryProps) {
  if (savings.total <= 0) return null;
  return (
    <div
      className={cn(
        "rounded-xl border border-success/30 bg-success/10 p-3 text-foreground",
        variant === "inline" && "p-2.5",
        className
      )}
    >
      <p className="flex items-center gap-2 text-sm font-semibold">
        <PartyPopper size={15} className="shrink-0 text-success" aria-hidden="true" />
        You save {formatPrice(savings.total)}
      </p>
      <dl className="mt-1.5 space-y-0.5 pl-[23px] text-xs text-muted-foreground">
        {savings.mrp > 0 && (
          <div className="flex justify-between gap-3">
            <dt>Discount on MRP</dt>
            <dd className="font-medium text-foreground">{formatPrice(savings.mrp)}</dd>
          </div>
        )}
        {savings.coupon > 0 && (
          <div className="flex justify-between gap-3">
            <dt>Coupon{savings.couponCode ? ` ${savings.couponCode}` : ""}</dt>
            <dd className="font-medium text-foreground">{formatPrice(savings.coupon)}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
