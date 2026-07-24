"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle2, Package, ArrowRight, Home, Loader2,
  Banknote, Download, Printer, MapPin, CreditCard,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ROUTES } from "@/lib/constants/routes";
import { buttonVariants } from "@/components/ui/button";
import { formatPrice, formatPricePerUnit, cn } from "@/lib/utils";
import { getOrderById, downloadReceipt } from "@/lib/api";
import { useAuthStore } from "@/features/auth/store";
import { useOrderItemCategorySlugs } from "@/hooks/useOrderItemCategorySlugs";
import type { Order } from "@/types";

export default function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const token = useAuthStore((s) => s.token);
  const [order,       setOrder]       = useState<Order | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [downloading, setDownloading] = useState(false);

  const categorySlugs = useOrderItemCategorySlugs(order?.items);

  useEffect(() => {
    if (!token || !orderId) return;
    getOrderById(orderId, token)
      .then(setOrder)
      .finally(() => setLoading(false));
  }, [orderId, token]);

  const handleDownload = useCallback(async () => {
    if (!token || !orderId) return;
    setDownloading(true);
    try {
      await downloadReceipt(orderId, token);
    } catch {
      // toast would require sonner import — keep this page dependency-light
    } finally {
      setDownloading(false);
    }
  }, [orderId, token]);

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-12">
      {/* Success header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 size={40} className="text-success" />
            </div>
            <span className="absolute -top-1 -right-1 text-2xl">🎉</span>
          </div>
        </div>
        <h1 className="font-heading font-bold text-2xl lg:text-3xl mb-2">Order Confirmed!</h1>
        <p className="text-muted-foreground text-sm mb-1">
          Thank you! We&apos;ve received your order and will start processing shortly.
        </p>
        <p className="text-xs text-muted-foreground">
          A confirmation email has been sent to your registered contact.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={26} className="animate-spin text-primary" />
        </div>
      ) : order ? (
        <>
          {/* ── Receipt card ── */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden mb-6 shadow-sm">

            {/* Header strip */}
            <div className="px-5 py-4 bg-muted/30 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Package size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Order Number</p>
                  <p className="font-heading font-bold text-lg leading-tight">{order.orderNumber}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Placed on</p>
                <p className="text-sm font-semibold">
                  {new Date(order.placedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            </div>

            {/* Items */}
            <div className="divide-y divide-border">
              {order.items.map((item) => {
                const categorySlug = categorySlugs[item.productSlug];
                return (
                  <div key={item.id} className="flex gap-3 px-5 py-4">
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-muted border border-border shrink-0">
                      {item.thumbnailUrl ? (
                        <Image src={item.thumbnailUrl} alt={item.productName} fill className="object-cover" sizes="56px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground font-medium px-1 text-center leading-tight">
                          {item.productName.slice(0, 12)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {categorySlug ? (
                        <Link
                          href={ROUTES.product(categorySlug, item.productSlug)}
                          className="font-semibold text-sm hover:text-primary transition-colors line-clamp-1"
                        >
                          {item.productName}
                        </Link>
                      ) : (
                        <p className="font-semibold text-sm line-clamp-1">{item.productName}</p>
                      )}
                      {(() => {
                        const specLine = [item.sizeLabel, item.paperLabel, item.finishLabel].filter(
                          (v): v is string => Boolean(v)
                        );
                        return specLine.length > 0 ? (
                          <p className="text-xs text-muted-foreground mt-0.5">{specLine.join(" · ")}</p>
                        ) : null;
                      })()}
                      <p className="text-xs text-muted-foreground">
                        {item.quantity.toLocaleString("en-IN")} units · {item.turnaroundLabel}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-sm">{formatPrice(item.totalPrice)}</p>
                      <p className="text-xs text-muted-foreground">{formatPricePerUnit(item.pricePerUnit)}/unit</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator />

            {/* Pricing */}
            <div className="px-5 py-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatPrice(order.pricing.subtotal)}</span>
              </div>
              {order.pricing.discountAmount > 0 && (
                <div className="flex justify-between text-success">
                  <span className="font-medium">
                    Coupon {order.pricing.couponCode ? `(${order.pricing.couponCode})` : "discount"}
                  </span>
                  <span className="font-semibold">−{formatPrice(order.pricing.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className={order.pricing.shippingCost === 0 ? "text-success font-medium" : "font-medium"}>
                  {order.pricing.shippingCost === 0 ? "Free" : formatPrice(order.pricing.shippingCost)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between font-heading font-bold text-base">
                <span>Total Paid</span>
                <span className="text-primary">{formatPrice(order.pricing.totalAmount)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground text-right">
                Inclusive of GST: {formatPrice(order.pricing.gstAmount)}
              </p>
            </div>

            <Separator />

            {/* Delivery + payment info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
              <div className="px-5 py-4 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  <MapPin size={11} /> Delivering to
                </div>
                <p className="text-sm font-semibold">{order.shippingAddress.fullName}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {order.shippingAddress.line1}
                  {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}<br />
                  {order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.postalCode}
                </p>
              </div>
              <div className="px-5 py-4 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  <CreditCard size={11} /> Payment
                </div>
                <p className="text-sm font-semibold">
                  {order.paymentMethod === "cod" ? "Cash on Delivery" : "Online (Razorpay)"}
                </p>
                <p className={cn(
                  "text-xs font-semibold",
                  order.paymentStatus === "paid" ? "text-success" : "text-brand-orange"
                )}>
                  {order.paymentStatus === "paid" ? "✓ Paid" : order.paymentMethod === "cod" ? "Pay on arrival" : "Payment pending"}
                </p>
                {order.estimatedDelivery && (
                  <p className="text-xs text-muted-foreground">
                    Est. delivery:{" "}
                    <span className="font-semibold text-foreground">
                      {new Date(order.estimatedDelivery).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* COD notice */}
            {order.paymentMethod === "cod" && (
              <>
                <Separator />
                <div className="px-5 py-4 flex items-start gap-3">
                  <Banknote size={16} className="text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-foreground">
                      Pay {formatPrice(order.pricing.totalAmount)} in cash
                    </span>{" "}
                    when your order arrives. Keep the exact amount ready for our delivery partner.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* What happens next */}
          <div className="rounded-2xl bg-secondary/50 border border-border px-5 py-4 text-xs text-muted-foreground leading-relaxed mb-6">
            <span className="font-semibold text-foreground">What happens next?</span>{" "}
            Our team will review your artwork and begin printing. You&apos;ll receive updates at each stage —
            Confirmed → Printing → Shipped → Delivered.
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={ROUTES.accountOrders}
              className={cn(buttonVariants(), "flex-1 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground justify-center")}
            >
              Track Your Order <ArrowRight size={15} />
            </Link>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "gap-2 justify-center disabled:opacity-60"
              )}
            >
              {downloading
                ? <><Loader2 size={14} className="animate-spin" /> Downloading…</>
                : <><Download size={14} /> Receipt PDF</>
              }
            </button>
            <button
              onClick={() => window.print()}
              className={cn(buttonVariants({ variant: "outline" }), "gap-2 justify-center")}
            >
              <Printer size={14} /> Print
            </button>
          </div>

          <div className="mt-6 text-center">
            <Link href={ROUTES.home} className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5">
              <Home size={13} /> Continue Shopping
            </Link>
          </div>
        </>
      ) : (
        /* Fallback */
        <div className="rounded-2xl border border-border bg-card p-6 mb-8 text-left shadow-sm">
          <div className="rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground">
            Your order has been placed. Check{" "}
            <Link href={ROUTES.accountOrders} className="text-primary underline">My Orders</Link>{" "}
            for details.
          </div>
        </div>
      )}
    </div>
  );
}
