import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Package, ArrowRight, Home } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ROUTES } from "@/lib/constants/routes";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Order Confirmed!" };

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { orderId } = await params;

  // Generate a human-readable order number from the ID
  const orderNumber = `UP-${new Date().getFullYear()}-${orderId.replace("ord-", "").slice(-5).padStart(5, "0")}`;

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

      <h1 className="font-heading font-bold text-2xl lg:text-3xl mb-2">
        Order Confirmed!
      </h1>
      <p className="text-muted-foreground text-sm mb-1">
        Thank you for your order. We've received your payment and will start processing shortly.
      </p>
      <p className="text-xs text-muted-foreground mb-8">
        A confirmation email has been sent to your registered address.
      </p>

      {/* Order number card */}
      <div className="rounded-2xl border border-border bg-card p-6 mb-8 text-left space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Order Number</p>
            <p className="font-heading font-bold text-xl mt-0.5">{orderNumber}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Package size={22} className="text-primary" />
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            { label: "Status",            value: "Order Confirmed"    },
            { label: "Payment",           value: "Successful"         },
            { label: "Estimated Dispatch","value": "Within 24 hours"  },
            { label: "Delivery",          value: "5–7 business days"  },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-semibold mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        <Separator />

        <div className="rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">What happens next?</span> Our team will
          review your artwork and begin printing. You'll receive email updates at each stage — Confirmed,
          Printing, Shipped, and Delivered.
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href={ROUTES.accountOrders}
          className={cn(
            buttonVariants(),
            "gap-2 bg-primary hover:bg-primary/90 text-primary-foreground justify-center"
          )}
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
