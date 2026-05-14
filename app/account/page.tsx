"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Package, Heart, MapPin, ArrowRight, Clock, Loader2 } from "lucide-react";
import { getOrders } from "@/lib/api";
import { useAuthStore } from "@/features/auth/store";
import { ROUTES } from "@/lib/constants/routes";
import { formatPrice } from "@/lib/utils";
import { ORDER_STATUS_LABELS } from "@/lib/constants/print-specs";
import type { OrderCard } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  placed:           "bg-muted text-muted-foreground",
  confirmed:        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  artwork_approved: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  printing:         "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  shipped:          "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  delivered:        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  cancelled:        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export default function DashboardPage() {
  const user  = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [orders,  setOrders]  = useState<OrderCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !user) return;
    getOrders(user.id, token)
      .then(({ orders }) => setOrders(orders))
      .finally(() => setLoading(false));
  }, [token, user]);

  const activeCount = orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;

  const stats = [
    { label: "Total Orders",  value: loading ? "…" : orders.length, icon: Package, href: ROUTES.accountOrders    },
    { label: "Active Orders", value: loading ? "…" : activeCount,   icon: Clock,   href: ROUTES.accountOrders    },
    { label: "Saved Items",   value: "View",                         icon: Heart,   href: ROUTES.accountSaved     },
    { label: "Addresses",     value: "Manage",                       icon: MapPin,  href: ROUTES.accountAddresses },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading font-bold text-2xl">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of your account activity</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="flex flex-col gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon size={18} className="text-primary" />
              </div>
              <div>
                <p className="font-heading font-bold text-xl leading-none">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-semibold text-base">Recent Orders</h2>
          <Link href={ROUTES.accountOrders} className="text-xs text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border rounded-2xl">
            No orders yet.{" "}
            <Link href={ROUTES.products} className="text-primary hover:underline">Browse products</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.slice(0, 3).map((order) => (
              <Link
                key={order.id}
                href={ROUTES.accountOrder(order.id)}
                className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{order.orderNumber}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] ?? ""}`}>
                      {ORDER_STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {order.items.length} item{order.items.length !== 1 ? "s" : ""} ·{" "}
                    {new Date(order.placedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-sm">{formatPrice(order.totalAmount)}</p>
                  <ArrowRight size={14} className="text-muted-foreground ml-auto mt-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
