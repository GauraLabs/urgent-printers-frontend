import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getOrderById } from "@/lib/api";
import { OrderStatusTracker } from "@/features/account/OrderStatusTracker";
import { Separator } from "@/components/ui/separator";
import { ROUTES } from "@/lib/constants/routes";
import { formatPrice } from "@/lib/utils";
import { ORDER_STATUS_LABELS } from "@/lib/constants/print-specs";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const order = await getOrderById(id);
  return { title: order ? `Order ${order.orderNumber}` : "Order Not Found" };
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  const addr = order.shippingAddress;

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link href={ROUTES.accountOrders} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={14} /> Back to Orders
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading font-bold text-2xl">{order.orderNumber}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Placed on {new Date(order.placedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        {order.trackingNumber && (
          <a
            href={`https://www.delhivery.com/track/package/${order.trackingNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
          >
            Track Shipment <ExternalLink size={12} />
          </a>
        )}
      </div>

      {/* Status tracker */}
      <div className="p-5 rounded-2xl border border-border bg-card">
        <p className="font-heading font-semibold text-sm mb-5">
          Status: <span className="text-brand-orange">{ORDER_STATUS_LABELS[order.status]}</span>
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

      {/* Items */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-3 bg-muted/30 border-b border-border">
          <p className="font-heading font-semibold text-sm">
            {order.items.length} item{order.items.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="divide-y divide-border">
          {order.items.map((item, i) => (
            <div key={i} className="flex gap-4 p-5">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0">
                <Image src={item.productImage} alt={item.productName} fill className="object-cover" sizes="64px" />
              </div>
              <div className="flex-1 min-w-0">
                <Link href={ROUTES.product(item.productSlug.split("-").slice(0, -2).join("-") || "products", item.productSlug)} className="font-semibold text-sm hover:text-primary transition-colors line-clamp-1">
                  {item.productName}
                </Link>
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <p>{item.config.sizeLabel} · {item.config.paperLabel} · {item.config.finishLabel}</p>
                  <p>{item.config.sides.toLowerCase().includes("double") ? "Double-sided" : "Single-sided"} · {item.config.quantity.toLocaleString("en-IN")} units</p>
                  <p>{item.config.turnaroundLabel}</p>
                  {item.config.artworkFileName && <p>Artwork: {item.config.artworkFileName}</p>}
                </div>
              </div>
              <div className="text-right shrink-0 flex flex-col items-end gap-2">
                <p className="font-semibold text-sm">{formatPrice(item.totalPrice)}</p>
                <p className="text-xs text-muted-foreground">{formatPrice(item.pricePerUnit)}/unit</p>
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
          ))}
        </div>
      </div>

      {/* Bottom grid: summary + address + payment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Price summary */}
        <div className="rounded-2xl border border-border p-5 space-y-3">
          <p className="font-heading font-semibold text-sm">Price Summary</p>
          <Separator />
          {[
            { label: "Subtotal",  value: order.subtotal  },
            { label: "Shipping",  value: order.shippingCost },
            { label: "GST (18%)", value: order.taxAmount },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span>{value === 0 ? <span className="text-success font-medium">Free</span> : formatPrice(value)}</span>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between font-heading font-bold text-base">
            <span>Total</span>
            <span>{formatPrice(order.totalAmount)}</span>
          </div>
          <p className="text-xs text-muted-foreground">Paid via {order.paymentMethod}</p>
        </div>

        {/* Shipping address */}
        <div className="rounded-2xl border border-border p-5 space-y-3">
          <p className="font-heading font-semibold text-sm">Shipping Address</p>
          <Separator />
          <div className="text-sm text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground">{addr.fullName}</p>
            <p>{addr.line1}</p>
            {addr.line2 && <p>{addr.line2}</p>}
            <p>{addr.city}, {addr.state} — {addr.postalCode}</p>
            <p>{addr.country}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
