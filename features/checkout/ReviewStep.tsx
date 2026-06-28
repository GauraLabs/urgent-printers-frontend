"use client";

import Image from "next/image";
import {
  Loader2, MapPin, CreditCard, Tag,
  Banknote, PartyPopper, AlertCircle, Lock,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/features/cart/store";
import { formatPrice, formatPricePerUnit, cn } from "@/lib/utils";
import type { CartItem, Address, OrderPreview } from "@/types";
import type { PaymentMethod } from "./PaymentStep";

const SHIPPING_THRESHOLD = 999;
const SHIPPING_COST = 99;

interface ReviewStepProps {
  items: CartItem[];
  address: Omit<Address, "id" | "userId" | "isDefault">;
  paymentMethod: PaymentMethod;
  preview: OrderPreview | null;
  previewLoading: boolean;
  previewError: string | null;
  onPlaceOrder: () => Promise<void>;
  onBack: () => void;
  isPlacing: boolean;
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  online: "Pay Online (Razorpay)",
  cod:    "Cash on Delivery",
};

export function ReviewStep({
  items, address, paymentMethod,
  preview, previewLoading, previewError,
  onPlaceOrder, onBack, isPlacing,
}: ReviewStepProps) {
  const appliedCoupon = useCartStore((s) => s.appliedCoupon);

  // Use server-confirmed pricing when available; fall back to client estimate
  const subtotal      = items.reduce((s, i) => s + i.totalPrice, 0);
  const discount      = preview?.pricing.discountAmount ?? (appliedCoupon?.discountAmount ?? 0);
  const discountedSub = preview ? (preview.pricing.subtotal - preview.pricing.discountAmount) : parseFloat((subtotal - discount).toFixed(2));
  const shipping      = preview?.pricing.shippingCost ?? (discountedSub >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST);
  const total         = preview?.pricing.totalAmount ?? (discountedSub + shipping);
  const gst           = preview?.pricing.gstAmount ?? parseFloat((discountedSub - discountedSub / 1.18).toFixed(2));
  const totalSavings  = discount;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="font-heading font-bold text-lg">Review Your Order</h2>
        <p className="text-muted-foreground text-sm mt-1">Everything looks right? Place your order below.</p>
      </div>

      {/* Items */}
      <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="divide-y divide-border">
          {items.map((item) => (
            <div key={item.cartItemId} className="flex gap-3 p-4">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0 border border-border">
                {item.product.images[0] ? (
                  <Image src={item.product.images[0]} alt={item.product.name} fill className="object-cover" sizes="56px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[9px] font-medium px-1 text-center leading-tight">
                    {item.product.name.slice(0, 12)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm line-clamp-1">{item.product.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.config.quantity.toLocaleString("en-IN")} units
                  {item.config.sizeLabel ? ` · ${item.config.sizeLabel}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[item.config.paperLabel, item.config.finishLabel, item.config.turnaroundLabel]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-sm">{formatPrice(item.totalPrice)}</p>
                <p className="text-xs text-muted-foreground">{formatPricePerUnit(item.pricePerUnit)}/unit</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Address + Payment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border p-4 space-y-2 shadow-sm">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-primary shrink-0" />
            <p className="font-semibold text-sm">{address.label} — Delivery</p>
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed pl-5">
            <p className="font-medium text-foreground">{address.fullName}</p>
            <p className="text-foreground/70">{address.phone}</p>
            <p>{address.line1}{address.line2 ? `, ${address.line2}` : ""}</p>
            <p>{address.city}, {address.state} — {address.postalCode}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border p-4 space-y-2 shadow-sm">
          <div className="flex items-center gap-2">
            <CreditCard size={14} className="text-primary shrink-0" />
            <p className="font-semibold text-sm">Payment Method</p>
          </div>
          <div className="pl-5">
            <p className="text-sm font-medium">{PAYMENT_LABELS[paymentMethod]}</p>
            {paymentMethod === "online" && (
              <p className="text-xs text-muted-foreground mt-0.5">UPI · Card · Net Banking · QR</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Price breakdown ── */}
      <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Price Breakdown</p>
          {previewLoading ? (
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Loader2 size={10} className="animate-spin" /> Confirming prices…
            </span>
          ) : (
            <p className="text-[10px] text-muted-foreground">All amounts in INR</p>
          )}
        </div>

        <div className="p-4 space-y-4">

          {/* Coupon applied badge — read-only here; apply/remove from cart page */}
          {appliedCoupon && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-success/5 border border-success/30">
              <Tag size={14} className="text-success shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-success">{appliedCoupon.code}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/15 text-success font-semibold">
                    {appliedCoupon.discountType === "percentage"
                      ? `${appliedCoupon.discountValue}% OFF`
                      : `FLAT ₹${appliedCoupon.discountValue} OFF`}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{appliedCoupon.description}</p>
              </div>
            </div>
          )}

          <Separator />

          {/* Line items */}
          <div className="space-y-3 text-sm">

            {/* Items subtotal */}
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Items subtotal
                <span className="text-xs ml-1">({items.length} product{items.length !== 1 ? "s" : ""})</span>
              </span>
              <span className="font-medium">{formatPrice(subtotal)}</span>
            </div>

            {/* Coupon discount */}
            {appliedCoupon && (
              <div className="flex justify-between text-success">
                <div>
                  <span className="font-medium">Coupon discount</span>
                  <p className="text-[10px] text-success/70 mt-0.5">
                    {appliedCoupon.discountType === "percentage"
                      ? `${appliedCoupon.discountValue}% off on ₹${subtotal}`
                      : `Flat ₹${appliedCoupon.discountValue} off`}
                  </p>
                </div>
                <span className="font-bold text-base">−{formatPrice(discount)}</span>
              </div>
            )}

            {/* After-discount subtotal — only show when coupon applied */}
            {appliedCoupon && (
              <div className="flex justify-between border-t border-dashed border-border pt-2">
                <span className="text-muted-foreground text-xs">After coupon</span>
                <span className="font-semibold">{formatPrice(discountedSub)}</span>
              </div>
            )}

            {/* Shipping */}
            <div className="flex justify-between">
              <div>
                <span className={cn("font-medium", shipping === 0 ? "text-success" : "text-muted-foreground")}>
                  Shipping
                </span>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {shipping === 0
                    ? `Free — order is above ₹${SHIPPING_THRESHOLD}`
                    : `Free above ₹${SHIPPING_THRESHOLD} · Add ${formatPrice(SHIPPING_THRESHOLD - discountedSub)} more`}
                </p>
              </div>
              <span className={cn("font-medium", shipping === 0 && "text-success")}>
                {shipping === 0 ? "Free" : formatPrice(shipping)}
              </span>
            </div>
          </div>

          <Separator />

          {/* Total payable */}
          <div className="flex justify-between items-baseline">
            <div>
              <p className="font-heading font-bold text-lg">Total Payable</p>
              <p className="text-[11px] text-muted-foreground">Inclusive of GST: {formatPrice(gst)}</p>
            </div>
            <p className="font-heading font-bold text-2xl text-primary">{formatPrice(total)}</p>
          </div>

          {/* Savings callout */}
          {totalSavings > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-success/8 border border-success/25">
              <PartyPopper size={15} className="text-success shrink-0" />
              <p className="text-sm font-semibold text-success">
                You're saving {formatPrice(totalSavings)} on this order!
              </p>
            </div>
          )}

          {/* Payment instruction — COD */}
          {paymentMethod === "cod" && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <Banknote size={18} className="text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-primary">
                  Pay {formatPrice(total)} in cash on delivery
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Keep the exact amount ready when our delivery partner arrives.
                  No online payment needed right now.
                </p>
              </div>
            </div>
          )}

          {/* Payment instruction — online (Razorpay) */}
          {paymentMethod !== "cod" && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <Lock size={16} className="text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-primary">
                  Razorpay secure checkout will open
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Clicking &quot;Pay&quot; creates your order and opens a secure Razorpay window.
                  Your card / UPI / bank details are entered there — never on this page.
                  If payment fails, your order is saved and you can retry from My Orders.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview error — shown if server couldn't compute pricing */}
      {previewError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/5 border border-destructive/20 text-xs">
          <AlertCircle size={14} className="text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive">Could not confirm pricing</p>
            <p className="text-muted-foreground mt-0.5">{previewError} — shown amounts are estimates. You can still place the order.</p>
          </div>
        </div>
      )}

      {/* Razorpay security note — only for online payments */}
      {paymentMethod !== "cod" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock size={13} className="text-primary shrink-0" />
          <span>Payments processed by <span className="font-semibold text-foreground">Razorpay</span> · PCI DSS Level 1 · 256-bit SSL encryption</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isPlacing}
          className="h-12 px-5 rounded-xl text-sm font-medium border border-border hover:bg-muted transition-colors disabled:opacity-50"
        >
          ← Back
        </button>
        <button
          onClick={onPlaceOrder}
          disabled={isPlacing || previewLoading}
          className={cn(
            "flex-1 h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2",
            "bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground",
            "disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md shadow-brand-orange/20"
          )}
        >
          {isPlacing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {paymentMethod === "cod" ? "Placing Order…" : "Opening Razorpay…"}
            </>
          ) : paymentMethod === "cod" ? (
            <>Place Order · {formatPrice(total)}</>
          ) : (
            <><Lock size={14} /> Pay {formatPrice(total)} securely</>
          )}
        </button>
      </div>
    </div>
  );
}
