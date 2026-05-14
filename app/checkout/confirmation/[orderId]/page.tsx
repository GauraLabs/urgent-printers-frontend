"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Package, ArrowRight, Home, Loader2, Banknote } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ROUTES } from "@/lib/constants/routes";
import { buttonVariants } from "@/components/ui/button";
import { formatPrice, cn } from "@/lib/utils";
import { getOrderById } from "@/lib/api";
import { useAuthStore } from "@/features/auth/store";
import type { Order } from "@/types";

export default function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const token = useAuthStore((s) => s.token);

  const [order,   setOrder]   = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !orderId) return;
    getOrderById(orderId, token)
      .then(setOrder)
      .finally(() => setLoading(false));
  }, [orderId, token]);

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-16 text-center">
      {/* Success icon */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 size={40} className="text-success" />
          </div>
          <span className="absolute -top-1 -right-1 text-2xl">🎉</span>
        </div>
      </div>

      <h1 className="font-heading font-bold text-2xl lg:text-3xl mb-2">Order Confirmed!</h1>
      <p className="text-muted-foreground text-sm mb-1">
        Thank you! We've received your order and will start processing shortly.
      </p>
      <p className="text-xs text-muted-foreground mb-8">
        A confirmation has been sent to your registered contact.
      </p>

      {/* Order card */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : order ? (
        <div className="rounded-2xl border border-border bg-card p-6 mb-8 text-left space-y-4">
          {/* Order number */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Order Number</p>
              <p className="font-heading font-bold text-xl mt-0.5">{order.orderNumber}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Package size={22} className="text-primary" />
            </div>
          </div>

          <Separator />

          {/* Key details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-semibold mt-0.5 capitalize">{order.status.replace("_", " ")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payment</p>
              <p className="font-semibold mt-0.5">
                {order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod}
              </p>
            </div>
            {order.estimatedDelivery && (
              <div>
                <p className="text-xs text-muted-foreground">Estimated Delivery</p>
                <p className="font-semibold mt-0.5">
                  {new Date(order.estimatedDelivery).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Items</p>
              <p className="font-semibold mt-0.5">
                {order.items.reduce((s, i) => s + i.quantity, 0).toLocaleString("en-IN")} units
              </p>
            </div>
          </div>

          <Separator />

          {/* Pricing summary */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(order.pricing.subtotal)}</span>
            </div>
            {order.pricing.discountAmount > 0 && (
              <div className="flex justify-between text-success">
                <span>Coupon {order.pricing.couponCode && `(${order.pricing.couponCode})`}</span>
                <span>−{formatPrice(order.pricing.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>{order.pricing.shippingCost === 0 ? "Free" : formatPrice(order.pricing.shippingCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">GST ({order.pricing.gstRate}%)</span>
              <span>{formatPrice(order.pricing.gstAmount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-heading font-bold text-base">
              <span>Total Payable</span>
              <span className="text-primary">{formatPrice(order.pricing.totalAmount)}</span>
            </div>
          </div>

          {/* COD notice */}
          {order.paymentMethod === "cod" && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <Banknote size={16} className="text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">Pay {formatPrice(order.pricing.totalAmount)} in cash</span> when your order arrives. Keep the exact amount ready for our delivery partner.
              </p>
            </div>
          )}

          {/* What happens next */}
          <div className="rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">What happens next?</span> Our team will review your artwork and begin printing. You'll receive updates at each stage — Confirmed, Printing, Shipped, and Delivered.
          </div>
        </div>
      ) : (
        /* Fallback if order fetch fails — still show success */
        <div className="rounded-2xl border border-border bg-card p-6 mb-8 text-left">
          <div className="rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground">
            Your order has been placed. Check <Link href={ROUTES.accountOrders} className="text-primary underline">My Orders</Link> for details.
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href={ROUTES.accountOrders}
          className={cn(buttonVariants(), "gap-2 bg-primary hover:bg-primary/90 text-primary-foreground justify-center")}
        >
          Track Your Order <ArrowRight size={15} />
        </Link>
        <Link
          href={ROUTES.home}
          className={cn(buttonVariants({ variant: "outline" }), "gap-2 justify-center")}
        >
          <Home size={15} /> Back to Home
        </Link>
      </div>
    </div>
  );
}
