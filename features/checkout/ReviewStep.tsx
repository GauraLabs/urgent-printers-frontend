"use client";

import Image from "next/image";
import { Loader2, ShieldCheck, MapPin, CreditCard } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { formatPrice, formatPricePerUnit, cn } from "@/lib/utils";
import type { CartItem } from "@/types";
import type { PaymentMethod } from "./PaymentStep";

const GST_RATE = 0.18;
const SHIPPING_THRESHOLD = 999;
const SHIPPING_COST = 99;

interface ReviewStepProps {
  items: CartItem[];
  subtotal: number;
  address: {
    fullName: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  paymentMethod: PaymentMethod;
  paymentDetail: string;
  onPlaceOrder: () => Promise<void>;
  onBack: () => void;
  isPlacing: boolean;
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  upi: "UPI",
  card: "Credit / Debit Card",
  netbanking: "Net Banking",
  cod: "Cash on Delivery",
};

export function ReviewStep({
  items, subtotal, address, paymentMethod, paymentDetail,
  onPlaceOrder, onBack, isPlacing,
}: ReviewStepProps) {
  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const gst      = parseFloat((subtotal * GST_RATE).toFixed(2));
  const total    = subtotal + shipping + gst;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-lg">Review Your Order</h2>
        <p className="text-muted-foreground text-sm mt-1">Check everything before placing</p>
      </div>

      {/* Items */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="divide-y divide-border">
          {items.map((item) => (
            <div key={item.cartItemId} className="flex gap-3 p-4">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0">
                <Image src={item.product.images[0]} alt={item.product.name} fill className="object-cover" sizes="56px" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm line-clamp-1">{item.product.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.config.quantity.toLocaleString("en-IN")} units · {item.config.sizeLabel}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.config.paperLabel} · {item.config.finishLabel}
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

      {/* Address + Payment summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border p-4 space-y-2">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-primary shrink-0" />
            <p className="font-semibold text-sm">Delivery Address</p>
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed pl-5">
            <p className="font-medium text-foreground">{address.fullName}</p>
            <p>{address.line1}{address.line2 ? `, ${address.line2}` : ""}</p>
            <p>{address.city}, {address.state} — {address.postalCode}</p>
            <p>{address.country}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CreditCard size={14} className="text-primary shrink-0" />
            <p className="font-semibold text-sm">Payment</p>
          </div>
          <div className="pl-5">
            <p className="text-sm font-medium">{PAYMENT_LABELS[paymentMethod]}</p>
            <p className="text-xs text-muted-foreground">{paymentDetail}</p>
          </div>
        </div>
      </div>

      {/* Price breakdown */}
      <div className="rounded-2xl border border-border p-5 space-y-3">
        <p className="font-heading font-semibold text-sm">Price Breakdown</p>
        <Separator />
        <div className="space-y-2 text-sm">
          {[
            { label: "Subtotal", value: formatPrice(subtotal) },
            { label: "Shipping", value: shipping === 0 ? "Free" : formatPrice(shipping), green: shipping === 0 },
            { label: "GST (18%)", value: formatPrice(gst) },
          ].map(({ label, value, green }) => (
            <div key={label} className="flex justify-between">
              <span className="text-muted-foreground">{label}</span>
              <span className={cn("font-medium", green && "text-success")}>{value}</span>
            </div>
          ))}
        </div>
        <Separator />
        <div className="flex justify-between font-heading font-bold text-lg">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>

      {/* Trust note */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck size={14} className="text-success shrink-0" />
        Secured by 256-bit SSL encryption. We never store your card details.
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isPlacing}
          className="h-11 px-5 rounded-xl text-sm font-medium border border-border hover:bg-muted transition-colors disabled:opacity-50"
        >
          ← Back
        </button>
        <button
          onClick={onPlaceOrder}
          disabled={isPlacing}
          className={cn(
            "flex-1 h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2",
            "bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground",
            "disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md shadow-brand-orange/20"
          )}
        >
          {isPlacing ? (
            <><Loader2 size={16} className="animate-spin" /> Placing Order…</>
          ) : (
            <>Place Order · {formatPrice(total)}</>
          )}
        </button>
      </div>
    </div>
  );
}
