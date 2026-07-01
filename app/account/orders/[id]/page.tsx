"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Loader2, XCircle, Lock, CreditCard, Download, FileSearch } from "lucide-react";
import { getOrderById, cancelOrder, verifyPayment, downloadReceipt } from "@/lib/api";
import { useAuthStore } from "@/features/auth/store";
import { OrderStatusTracker } from "@/features/account/OrderStatusTracker";
import { Separator } from "@/components/ui/separator";
import { ROUTES } from "@/lib/constants/routes";
import { formatPrice, formatPricePerUnit, slugify } from "@/lib/utils";
import { ORDER_STATUS_LABELS } from "@/lib/constants/print-specs";
import { RAZORPAY_THEME_COLOR } from "@/lib/constants/payment";
import { toast } from "sonner";
import type { Order } from "@/types";

const CANCELLABLE = new Set(["placed", "confirmed"]);

function ArtworkStatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    sent_for_approval: { label: "Awaiting Your Approval", className: "text-brand-orange" },
    approved:          { label: "Artwork Approved",        className: "text-success" },
    needs_revision:    { label: "Needs Revision",          className: "text-destructive" },
    none:              { label: "",                        className: "" },
  };
  const entry = map[status];
  if (!entry || !entry.label) return null;
  return <p className={`text-xs font-medium ${entry.className}`}>Artwork: {entry.label}</p>;
}

export default function OrderDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const token   = useAuthStore((s) => s.token);
  const user    = useAuthStore((s) => s.user);

  const [order,       setOrder]       = useState<Order | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [cancelling,  setCancelling]  = useState(false);
  const [retrying,    setRetrying]    = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    getOrderById(id, token)
      .then(setOrder)
      .finally(() => setLoading(false));
  }, [id, token]);

  const handleCancel = useCallback(async () => {
    if (!order || !token) return;
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    setCancelling(true);
    try {
      await cancelOrder(order.id, token);
      setOrder((prev) => prev ? { ...prev, status: "cancelled" } : prev);
      toast.success("Order cancelled.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel order.");
    } finally {
      setCancelling(false);
    }
  }, [order, token]);

  const handleDownload = useCallback(async () => {
    if (!order || !token) return;
    setDownloading(true);
    try {
      await downloadReceipt(order.id, token);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not download receipt.");
    } finally {
      setDownloading(false);
    }
  }, [order, token]);

  const handleRetryPayment = useCallback(() => {
    if (!order || !token) return;
    const { razorpayOrderId, razorpayKeyId, amount } = order.payment ?? {};
    if (!razorpayOrderId || !razorpayKeyId) {
      toast.error("Payment details not available. Please contact support.");
      return;
    }
    if (!window.Razorpay) {
      toast.error("Payment gateway failed to load. Please refresh and try again.");
      return;
    }

    setRetrying(true);
    let paymentHandled = false;

    const rzp = new window.Razorpay({
      key:         razorpayKeyId,
      amount:      Math.round((amount ?? order.totalAmount) * 100), // rupees → paise
      currency:    "INR",
      order_id:    razorpayOrderId,
      name:        "Urgent Printers",
      description: `Order ${order.orderNumber}`,

      prefill: {
        name:    user ? `${user.firstName} ${user.lastName}`.trim() : undefined,
        email:   user?.email,
        contact: user?.phone?.replace(/\D/g, "").slice(-10),
      },

      retry: { enabled: true, max_count: 3 },
      theme: { color: RAZORPAY_THEME_COLOR },
      notes: { order_number: order.orderNumber },

      handler: async (response) => {
        paymentHandled = true;
        try {
          await verifyPayment(order.id, {
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
          }, token);
          toast.success("Payment successful! Order confirmed.");
          router.replace(ROUTES.checkoutConfirmation(order.id));
        } catch {
          toast.error(
            `Payment received but confirmation failed. Contact support with order #${order.orderNumber}.`,
            { duration: 12000 }
          );
          setRetrying(false);
        }
      },

      modal: {
        confirm_close: true,
        ondismiss: () => {
          paymentHandled = true;
          toast("Payment not completed. You can retry anytime from this page.", { duration: 6000 });
          setRetrying(false);
        },
      },
    });

    rzp.on("payment.failed", (response) => {
      paymentHandled = true;
      const msg = response.error.description || "Payment failed.";
      toast.error(`${msg} Please try again.`, { duration: 8000 });
      setRetrying(false);
    });

    const handleFocus = () => {
      window.removeEventListener("focus", handleFocus);
      setTimeout(() => {
        if (!paymentHandled) {
          setRetrying(false);
          toast.error("Payment window closed unexpectedly. Please try again.", { duration: 7000 });
        }
      }, 400);
    };
    window.addEventListener("focus", handleFocus);

    try {
      rzp.open();
    } catch {
      window.removeEventListener("focus", handleFocus);
      toast.error("Could not open payment window. Please refresh and try again.");
      setRetrying(false);
    }
  }, [order, token, user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={26} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <Link href={ROUTES.accountOrders} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} /> Back to Orders
        </Link>
        <p className="text-muted-foreground">Order not found.</p>
      </div>
    );
  }

  const addr              = order.shippingAddress;
  const p                 = order.pricing;
  const isAwaitingPayment = order.paymentStatus === "awaiting_payment" && !!order.payment?.razorpayOrderId;

  return (
    <div className="space-y-8">
      {/* Back + header */}
      <Link href={ROUTES.accountOrders} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={14} /> Back to Orders
      </Link>

      {/* ── Pending payment banner ── */}
      {isAwaitingPayment && (
        <div className="rounded-2xl border border-brand-orange/40 bg-brand-orange/5 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <CreditCard size={20} className="text-brand-orange shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-brand-orange">Payment pending</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your order is saved but payment was not completed.
                Complete payment now to confirm your order.
              </p>
            </div>
          </div>
          <button
            onClick={handleRetryPayment}
            disabled={retrying}
            className="shrink-0 flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-bold bg-brand-orange text-brand-orange-foreground hover:bg-brand-orange/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {retrying
              ? <><Loader2 size={14} className="animate-spin" /> Opening…</>
              : <><Lock size={14} /> Complete Payment</>
            }
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading font-bold text-2xl">{order.orderNumber}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Placed on {new Date(order.placedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {order.trackingNumber && (
            <a
              href={`https://www.delhivery.com/track/package/${order.trackingNumber}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
            >
              Track Shipment <ExternalLink size={12} />
            </a>
          )}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground border border-border px-3 py-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-60"
          >
            {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            {downloading ? "Downloading…" : "Receipt PDF"}
          </button>
          {CANCELLABLE.has(order.status) && !isAwaitingPayment && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex items-center gap-1.5 text-xs font-semibold text-destructive border border-destructive/30 px-3 py-1.5 rounded-lg hover:bg-destructive/5 transition-colors disabled:opacity-60"
            >
              {cancelling ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
              Cancel Order
            </button>
          )}
        </div>
      </div>

      {/* Status tracker */}
      <div className="p-5 rounded-2xl border border-border bg-card shadow-sm">
        <p className="font-heading font-semibold text-sm mb-5">
          Status: <span className="text-brand-orange">{ORDER_STATUS_LABELS[order.status] ?? order.status}</span>
        </p>
        <OrderStatusTracker currentStatus={order.status} statusHistory={order.statusHistory} />
        {order.estimatedDelivery && order.status !== "delivered" && (
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Estimated delivery:{" "}
            <span className="font-semibold text-foreground">
              {new Date(order.estimatedDelivery).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}
            </span>
          </p>
        )}
      </div>

      {/* Artwork pending action banner */}
      {order.status === "artwork_pending" && (
        <div className="rounded-2xl border border-brand-orange/40 bg-brand-orange/5 p-4 flex items-start gap-3">
          <FileSearch size={20} className="text-brand-orange shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-brand-orange">Action required: Review your artwork proof</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              We&apos;ve prepared artwork proofs for your order. Check your email or WhatsApp for the approval link.
              Printing will begin once you approve.
            </p>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="px-5 py-3 bg-muted/30 border-b border-border">
          <p className="font-heading font-semibold text-sm">
            {order.items.length} item{order.items.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="divide-y divide-border">
          {order.items.map((item) => {
            const categorySlug = item.categoryName ? slugify(item.categoryName) : "products";
            return (
              <div key={item.id} className="flex gap-4 p-5">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted border border-border shrink-0">
                  {item.thumbnailUrl ? (
                    <Image src={item.thumbnailUrl} alt={item.productName} fill className="object-cover" sizes="64px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground font-medium px-1 text-center leading-tight">
                      {item.productName.slice(0, 12)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={ROUTES.product(categorySlug, item.productSlug)}
                    className="font-semibold text-sm hover:text-primary transition-colors line-clamp-1"
                  >
                    {item.productName}
                  </Link>
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    {(() => {
                      const specLine = [item.sizeLabel, item.paperLabel, item.finishLabel].filter(
                        (v): v is string => Boolean(v)
                      );
                      return specLine.length > 0 ? <p>{specLine.join(" · ")}</p> : null;
                    })()}
                    <p>
                      {item.sides
                        ? `${item.sides.toLowerCase().includes("double") ? "Double-sided" : "Single-sided"} · `
                        : ""}
                      {item.quantity.toLocaleString("en-IN")} units
                    </p>
                    <p>{item.turnaroundLabel}</p>
                    {item.artworkStatus && item.artworkStatus !== "none" && (
                      <ArtworkStatusChip status={item.artworkStatus} />
                    )}
                    {item.templateData && Object.keys(item.templateData).length > 0 && (
                      <p>Personalised print</p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                  <p className="font-semibold text-sm">{formatPrice(item.totalPrice)}</p>
                  <p className="text-xs text-muted-foreground">{formatPricePerUnit(item.pricePerUnit)}/unit</p>
                  {order.status === "delivered" && (
                    <Link
                      href={`/account/orders/${order.id}/review?product=${encodeURIComponent(item.productName)}&orderId=${order.id}`}
                      className="text-[10px] font-semibold text-primary border border-primary/30 px-2 py-1 rounded-lg hover:bg-primary/5 transition-colors whitespace-nowrap"
                    >
                      ★ Write a Review
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pricing + address + payment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Price breakdown */}
        <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="px-5 py-3 bg-muted/30 border-b border-border">
            <p className="font-heading font-semibold text-sm">Price Breakdown</p>
          </div>
          <div className="p-5 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Items subtotal</span>
              <span className="font-medium">{formatPrice(p.subtotal)}</span>
            </div>
            {p.discountAmount > 0 && (
              <div className="flex justify-between text-success">
                <span className="font-medium">
                  Coupon {p.couponCode ? `(${p.couponCode})` : "discount"}
                </span>
                <span className="font-semibold">−{formatPrice(p.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span className={p.shippingCost === 0 ? "text-success font-medium" : "font-medium"}>
                {p.shippingCost === 0 ? "Free" : formatPrice(p.shippingCost)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between font-heading font-bold text-base">
              <span>Total</span>
              <span>{formatPrice(p.totalAmount)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground text-right">
              Inclusive of GST: {formatPrice(p.gstAmount)}
            </p>
            <p className="text-xs text-muted-foreground pt-1">
              {order.paymentMethod === "cod"
                ? "Cash on Delivery"
                : "Online payment via Razorpay"}
              {order.paymentStatus === "paid" && <span className="text-success ml-1.5 font-medium">· Paid</span>}
              {order.paymentStatus === "awaiting_payment" && <span className="text-brand-orange ml-1.5 font-medium">· Payment pending</span>}
            </p>
          </div>
        </div>

        {/* Shipping address */}
        <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="px-5 py-3 bg-muted/30 border-b border-border">
            <p className="font-heading font-semibold text-sm">Shipping Address</p>
          </div>
          <div className="p-5 text-sm text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground">{addr.fullName}</p>
            <p className="text-foreground/70">{addr.phone}</p>
            <p className="mt-1">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p>
            <p>{addr.city}, {addr.state} — {addr.postalCode}</p>
            <p>{addr.country}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
