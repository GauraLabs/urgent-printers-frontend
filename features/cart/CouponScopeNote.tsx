"use client";

import { useState } from "react";
import type { AppliedCoupon, CartItem, CouponScope } from "@/types";
import { formatPrice } from "@/lib/utils";
import { isLineEligible, type CouponScopeData } from "./savings";

interface CouponScopeNoteProps {
  items: CartItem[];
  eligibleItemIds?: string[];
  eligibleLineIndexes?: number[];
  scope?: CouponScope;
}

/** "Applied to 2 of 3 items" with a disclosure; renders nothing when every line is eligible. */
export function CouponScopeNote({ items, eligibleItemIds, eligibleLineIndexes, scope }: CouponScopeNoteProps) {
  const [open, setOpen] = useState(false);
  const data: CouponScopeData = { eligibleItemIds, eligibleLineIndexes };
  if ((!eligibleItemIds && !eligibleLineIndexes) || items.length === 0) return null;
  const eligible = items.filter((i, index) => isLineEligible(index, i.product.id, data));
  if (eligible.length === items.length) return null;
  const covers = scope && !scope.allItems ? [...scope.productNames, ...scope.categoryNames].filter(Boolean) : [];
  return (
    <div className="text-[11px] text-muted-foreground">
      <p>
        Applied to {eligible.length} of {items.length} items{" "}
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="font-medium text-primary underline underline-offset-2">
          {open ? "Hide" : "Which items?"}
        </button>
      </p>
      {open && (
        <div className="mt-1">
          <ul className="list-disc pl-4">
            {eligible.map((i) => (
              <li key={i.cartItemId}>{i.product.name}</li>
            ))}
          </ul>
          {covers.length > 0 && <p className="mt-1">This coupon applies to: {covers.join(", ")}.</p>}
        </div>
      )}
    </div>
  );
}

/** The minimum is judged on the whole cart even when the discount only covers some lines. */
export function CouponMinNote({ coupon }: { coupon: Pick<AppliedCoupon, "minOrderAmount" | "appliesToDiscountedItems" | "scope"> }) {
  const restricted = coupon.appliesToDiscountedItems === false || (coupon.scope !== undefined && !coupon.scope.allItems);
  if (!restricted || !coupon.minOrderAmount || coupon.minOrderAmount <= 0) return null;
  return <p className="text-[11px] text-muted-foreground">Minimum order {formatPrice(coupon.minOrderAmount)} applies to your whole cart</p>;
}
