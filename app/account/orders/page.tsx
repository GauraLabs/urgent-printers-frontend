import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Package } from "lucide-react";
import { getOrders } from "@/lib/api";
import { EmptyState } from "@/components/common/EmptyState";
import { ROUTES } from "@/lib/constants/routes";
import { formatPrice } from "@/lib/utils";
import { ORDER_STATUS_LABELS } from "@/lib/constants/print-specs";

export const metadata: Metadata = { title: "My Orders" };

const STATUS_COLORS: Record<string, string> = {
  placed:    "bg-muted text-muted-foreground",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  printing:  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  shipped:   "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export default async function OrdersPage() {
  const orders = await getOrders("user-me");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl">My Orders</h1>
        <p className="text-muted-foreground text-sm mt-1">{orders.length} order{orders.length !== 1 ? "s" : ""} placed</p>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders yet"
          description="Once you place your first order, it will appear here."
          actionLabel="Browse Products"
          actionHref={ROUTES.products}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={ROUTES.accountOrder(order.id)}
              className="block rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all overflow-hidden"
            >
              {/* Order header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="font-semibold text-sm">{order.orderNumber}</p>
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] ?? ""}`}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {new Date(order.placedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  <ArrowRight size={14} />
                </div>
              </div>

              {/* Items preview */}
              <div className="px-5 py-4 flex items-center gap-4">
                <div className="flex -space-x-2">
                  {order.items.slice(0, 3).map((item, i) => (
                    <div key={i} className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-background bg-muted shrink-0">
                      <Image src={item.productImage} alt={item.productName} fill className="object-cover" sizes="48px" />
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div className="w-12 h-12 rounded-xl border-2 border-background bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                      +{order.items.length - 3}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">
                    {order.items.map(i => i.productName).join(", ")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {order.items.reduce((sum, i) => sum + i.config.quantity, 0).toLocaleString("en-IN")} total units
                  </p>
                </div>
                <p className="font-heading font-bold text-base shrink-0">{formatPrice(order.totalAmount)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
