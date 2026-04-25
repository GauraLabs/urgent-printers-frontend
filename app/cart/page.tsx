"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag, CheckCircle2, XCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/common/EmptyState";
import { useCartStore } from "@/features/cart/store";
import { useAuthStore } from "@/features/auth/store";
import { ROUTES } from "@/lib/constants/routes";
import { formatPrice, formatPricePerUnit, cn } from "@/lib/utils";
import { validateCoupon, applyCoupon, type Coupon } from "@/lib/constants/coupons";

const GST_RATE = 0.18;
const SHIPPING_THRESHOLD = 999;
const SHIPPING_COST = 99;

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const subtotal = useCartStore((s) => s.subtotal());
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [promoInput, setPromoInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [promoError, setPromoError] = useState("");

  const discount = appliedCoupon ? applyCoupon(appliedCoupon, subtotal) : 0;
  const discountedSubtotal = subtotal - discount;
  const shipping = discountedSubtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const gst = parseFloat((discountedSubtotal * GST_RATE).toFixed(2));
  const total = discountedSubtotal + shipping + gst;

  function handleApplyPromo() {
    setPromoError("");
    const coupon = validateCoupon(promoInput, subtotal);
    if (!coupon) {
      setPromoError("Invalid code or minimum order not met.");
      setAppliedCoupon(null);
      return;
    }
    setAppliedCoupon(coupon);
  }

  function handleRemovePromo() {
    setAppliedCoupon(null);
    setPromoInput("");
    setPromoError("");
  }

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Add products to your cart to get started."
          actionLabel="Browse Products"
          actionHref={ROUTES.products}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-heading font-bold text-2xl lg:text-3xl mb-8">Your Cart</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Items list */}
        <div className="flex-1 min-w-0">
          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-3 bg-muted/30 border-b border-border">
              <p className="text-sm font-semibold">
                {items.length} item{items.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="divide-y divide-border">
              {items.map((item) => (
                <div key={item.cartItemId} className="flex gap-4 p-5">
                  {/* Image */}
                  <Link
                    href={ROUTES.product(item.product.slug.split("-").slice(0, -2).join("-") || "products", item.product.slug)}
                    className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-muted border border-border"
                  >
                    <Image
                      src={item.product.images[0]}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </Link>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={ROUTES.product(item.product.slug.split("-").slice(0, -2).join("-") || "products", item.product.slug)}
                      className="font-semibold text-sm hover:text-primary transition-colors line-clamp-1"
                    >
                      {item.product.name}
                    </Link>
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      <p>{item.config.sizeLabel}</p>
                      <p>{item.config.paperLabel} · {item.config.finishLabel} · {item.config.sides === "double" ? "Double-sided" : "Single-sided"}</p>
                      <p className="text-primary font-medium">{item.config.turnaroundLabel}</p>
                    </div>

                    {/* Qty + price row */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const step = item.config.quantity <= 100 ? 25 : 50;
                            const next = Math.max(25, item.config.quantity - step);
                            updateQuantity(item.cartItemId, next);
                          }}
                          aria-label="Decrease quantity"
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-sm font-semibold w-12 text-center">
                          {item.config.quantity.toLocaleString("en-IN")}
                        </span>
                        <button
                          onClick={() => {
                            const step = item.config.quantity < 100 ? 25 : 50;
                            updateQuantity(item.cartItemId, item.config.quantity + step);
                          }}
                          aria-label="Increase quantity"
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                        <span className="text-xs text-muted-foreground">
                          × {formatPricePerUnit(item.pricePerUnit)}/unit
                        </span>
                      </div>
                      <p className="font-heading font-bold text-base">
                        {formatPrice(item.totalPrice)}
                      </p>
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(item.cartItemId)}
                    aria-label={`Remove ${item.product.name}`}
                    className="shrink-0 self-start p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <Link
              href={ROUTES.products}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              ← Continue Shopping
            </Link>
          </div>
        </div>

        {/* Order summary */}
        <div className="lg:w-80 shrink-0">
          <div className="rounded-2xl border border-border bg-card p-6 sticky top-20 space-y-4">
            <h2 className="font-heading font-bold text-base">Order Summary</h2>
            <Separator />

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-success">
                  <span className="font-medium">Discount ({appliedCoupon.code})</span>
                  <span className="font-semibold">−{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className={cn("font-medium", shipping === 0 && "text-success")}>
                  {shipping === 0 ? "Free" : formatPrice(shipping)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST (18%)</span>
                <span className="font-medium">{formatPrice(gst)}</span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between font-heading font-bold text-lg">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>

            {subtotal < SHIPPING_THRESHOLD && (
              <p className="text-xs text-center text-muted-foreground bg-muted/50 rounded-lg p-2.5">
                Add{" "}
                <span className="font-semibold text-foreground">
                  {formatPrice(SHIPPING_THRESHOLD - subtotal)}
                </span>{" "}
                more for free shipping
              </p>
            )}

            {/* Promo code */}
            {appliedCoupon ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-success/5 border border-success/30">
                <CheckCircle2 size={15} className="text-success shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-success">{appliedCoupon.code} applied</p>
                  <p className="text-[11px] text-muted-foreground truncate">{appliedCoupon.description}</p>
                </div>
                <button onClick={handleRemovePromo} className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                  <XCircle size={14} />
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                      placeholder="Promo code"
                      className={cn(
                        "w-full h-9 pl-9 pr-3 rounded-lg border bg-background text-sm font-mono tracking-widest",
                        "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors",
                        promoError ? "border-destructive" : "border-border"
                      )}
                    />
                  </div>
                  <button onClick={handleApplyPromo} className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                    Apply
                  </button>
                </div>
                {promoError && <p className="text-xs text-destructive">{promoError}</p>}
                <p className="text-[10px] text-muted-foreground">Try: FIRST10 · FLAT100 · SUMMER15</p>
              </div>
            )}

            {isAuthenticated ? (
              <Link
                href={ROUTES.checkout}
                className={cn(
                  "w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2",
                  "bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground",
                  "transition-all shadow-md shadow-brand-orange/20"
                )}
              >
                Proceed to Checkout <ArrowRight size={16} />
              </Link>
            ) : (
              <div className="space-y-2">
                <Link
                  href={`${ROUTES.login}?redirect=${encodeURIComponent(ROUTES.checkout)}`}
                  className={cn(
                    "w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2",
                    "bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground",
                    "transition-all shadow-md shadow-brand-orange/20"
                  )}
                >
                  Sign In to Checkout <ArrowRight size={16} />
                </Link>
                <p className="text-xs text-center text-muted-foreground">
                  <Link href={ROUTES.register} className="text-primary hover:underline">
                    Create a free account
                  </Link>{" "}
                  to place your order
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-4 pt-1">
              {["Visa", "Mastercard", "UPI", "COD"].map((m) => (
                <span key={m} className="text-[10px] font-medium text-muted-foreground border border-border rounded px-1.5 py-0.5">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
