import {
  ShoppingCart,
  CheckCircle,
  Printer,
  Truck,
  PackageCheck,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderStatus, OrderStatusEvent } from "@/types";

const STEPS: { status: OrderStatus; label: string; icon: React.ElementType }[] = [
  { status: "placed",    label: "Order Placed",  icon: ShoppingCart  },
  { status: "confirmed", label: "Confirmed",     icon: CheckCircle   },
  { status: "printing",  label: "Printing",      icon: Printer       },
  { status: "shipped",   label: "Shipped",       icon: Truck         },
  { status: "delivered", label: "Delivered",     icon: PackageCheck  },
];

interface OrderStatusTrackerProps {
  currentStatus: OrderStatus;
  statusHistory: OrderStatusEvent[];
}

export function OrderStatusTracker({ currentStatus, statusHistory }: OrderStatusTrackerProps) {
  if (currentStatus === "cancelled") {
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/5 border border-destructive/20">
        <XCircle size={20} className="text-destructive shrink-0" />
        <div>
          <p className="font-semibold text-sm text-destructive">Order Cancelled</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {statusHistory.find(e => e.status === "cancelled")?.note ?? "This order has been cancelled."}
          </p>
        </div>
      </div>
    );
  }

  const currentStepIndex = STEPS.findIndex(s => s.status === currentStatus);

  function getEvent(status: OrderStatus) {
    return statusHistory.find(e => e.status === status);
  }

  return (
    <div className="relative">
      {/* Connecting line — desktop horizontal */}
      <div className="hidden md:block absolute top-5 left-5 right-5 h-0.5 bg-border z-0" />

      <div className="flex flex-col md:flex-row gap-0 md:gap-0 relative z-10">
        {STEPS.map((step, i) => {
          const isDone      = i < currentStepIndex;
          const isCurrent   = i === currentStepIndex;
          const isPending   = i > currentStepIndex;
          const Icon        = step.icon;
          const event       = getEvent(step.status);

          return (
            <div key={step.status} className="flex md:flex-col items-start md:items-center flex-1 gap-3 md:gap-2 pb-4 md:pb-0">
              {/* Mobile connector line */}
              {i < STEPS.length - 1 && (
                <div className={cn(
                  "md:hidden absolute left-5 w-0.5 mt-10",
                  "h-full max-h-12",
                  isDone ? "bg-primary" : "bg-border"
                )} style={{ top: `${i * 5}rem` }} />
              )}

              {/* Icon bubble */}
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 transition-all",
                isDone    && "bg-primary border-primary text-primary-foreground",
                isCurrent && "bg-brand-orange border-brand-orange text-brand-orange-foreground shadow-md shadow-brand-orange/30 scale-110",
                isPending && "bg-background border-border text-muted-foreground"
              )}>
                <Icon size={16} />
              </div>

              {/* Label + timestamp */}
              <div className="md:text-center min-w-0">
                <p className={cn(
                  "text-xs font-semibold leading-snug",
                  isDone    && "text-primary",
                  isCurrent && "text-brand-orange",
                  isPending && "text-muted-foreground"
                )}>
                  {step.label}
                </p>
                {event?.timestamp && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(event.timestamp).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                )}
                {isCurrent && !event && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">In progress</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
