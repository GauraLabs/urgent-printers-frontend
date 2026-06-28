"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/common/EmptyState";
import { useCartStore } from "@/features/cart/store";
import { useAuthStore } from "@/features/auth/store";
import { useMounted } from "@/hooks/useMounted";
import { validateCoupon } from "@/lib/api";
import { ROUTES } from "@/lib/constants/routes";
import { formatPrice, formatPricePerUnit, slugify, cn } from "@/lib/utils";

function CartSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      <div className="h-8 w-36 bg-muted rounded-xl mb-8" />
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-3 bg-muted/30 border-b border-border h-10" />
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-4 p-5 border-b border-border last:border-0">
              <div className="shrink-0 w-20 h-20 rounded-xl bg-muted" />
              <div className="flex-1 space-y-2.5">
                <div className="h-4 w-2/3 bg-muted rounded-lg" />
                <div className="h-3 w-1/2 bg-muted rounded-lg" />
                <div className="h-3 w-1/3 bg-muted rounded-lg" />
                <div className="flex gap-2 mt-3">
                  <div className="h-7 w-7 bg-muted rounded-lg" />
                  <div className="h-7 w-12 bg-muted rounded-lg" />
                  <div className="h-7 w-7 bg-muted rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="lg:w-80 shrink-0">
          <div className="rounded-2xl border border-border p-6 space-y-4">
            <div className="h-5 w-32 bg-muted rounded-lg" />
            <div className="h-px bg-muted" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 w-20 bg-muted rounded" />
                <div className="h-4 w-16 bg-muted rounded" />
              </div>
            ))}
            <div className="h-11 w-full bg-muted rounded-xl mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

const SHIPPING_THRESHOLD = 999;
const SHIPPING_COST = 99;

export default function CartPage() {
  const mounted           = useMounted();
  const items             = useCartStore((s) => s.items);
  const removeItem        = useCartStore((s) => s.removeItem);
  const updateQuantity    = useCartStore((s) => s.updateQuantity);
  const subtotal          = useCartStore((s) => s.subtotal());
  const appliedCoupon     = useCartStore((s) => s.appliedCoupon);
  const setAppliedCoupon  = useCartStore((s) => s.setAppliedCoupon);
  const isAuthenticated   = useAuthStore((s) => s.isAuthenticated);
  const token             = useAuthStore((s) => s.token ?? undefined);

  const [promoInput,  setPromoInput]  = useState("");
  const [promoError,  setPromoError]  = useState("");
  const [validating,  setValidating]  = useState(false);

  const discount          = appliedCoupon?.discountAmount ?? 0;
  const discountedSub     = parseFloat((subtotal - discount).toFixed(2));
  const shipping          = discountedSub >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total             = discountedSub + shipping;
  const gst               = parseFloat((discountedSub - discountedSub / 1.18).toFixed(2));

  async function handleApplyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoError("");
    setValidating(true);
    try {
      const coupon = await validateCoupon(code, subtotal, token);
      setAppliedCoupon(coupon);
      setPromoInput("");
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : "Invalid coupon code");
      setAppliedCoupon(null);
    } finally {
      setValidating(false);
    }
  }

  function handleRemovePromo() {
    setAppliedCoupon(null);
    setPromoInput("");
    setPromoError("");
  }

  if (!mounted) return <CartSkeleton />;

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
          <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
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
                    href={ROUTES.product(item.product.categorySlug || slugify(item.product.categoryName) || "products", item.product.slug)}
                    className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-muted border border-border"
                  >
                    {item.product.images[0] ? (
                      <Image
                        src={item.product.images[0]}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px] font-medium px-1 text-center leading-tight">
                        {item.product.name.slice(0, 14)}
                      </div>
                    )}
                  </Link>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={ROUTES.product(item.product.categorySlug || slugify(item.product.categoryName) || "products", item.product.slug)}
                      className="font-semibold text-sm hover:text-primary transition-colors line-clamp-1"
                    >
                      {item.product.name}
                    </Link>
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      <p>{item.config.sizeLabel}</p>
                      <p>{item.config.paperLabel} · {item.config.finishLabel} · {item.config.sides.toLowerCase().includes("double") ? "Double-sided" : "Single-sided"}</p>
                      <p className="text-primary font-medium">{item.config.turnaroundLabel}</p>
                    </div>

                    {/* Qty + price row — stacked on mobile, side-by-side on sm+ */}
                    <div className="mt-3 space-y-2">
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
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          × {formatPricePerUnit(item.pricePerUnit)}/unit
                        </span>
                        <p className="font-heading font-bold text-base">
                          {formatPrice(item.totalPrice)}
                        </p>
                      </div>
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
          <div className="rounded-2xl border border-border bg-card sticky top-20 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="px-5 py-3.5 bg-muted/30 border-b border-border">
              <h2 className="font-heading font-bold text-sm">Order Summary</h2>
            </div>

            <div className="p-5 space-y-4">
              {/* Line items */}
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items subtotal</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>

                {appliedCoupon && (
                  <>
                    <div className="flex justify-between text-success">
                      <div>
                        <span className="font-medium">Coupon ({appliedCoupon.code})</span>
                        <p className="text-[10px] text-success/70">
                          {appliedCoupon.discountType === "percentage"
                            ? `${appliedCoupon.discountValue}% off`
                            : `Flat ₹${appliedCoupon.discountValue} off`}
                        </p>
                      </div>
                      <span className="font-bold">−{formatPrice(discount)}</span>
                    </div>
                    <div className="flex justify-between border-t border-dashed border-border pt-2">
                      <span className="text-muted-foreground text-xs">After coupon</span>
                      <span className="font-semibold text-xs">{formatPrice(discountedSub)}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between">
                  <div>
                    <span className={cn(shipping === 0 ? "text-success" : "text-muted-foreground")}>Shipping</span>
                    <p className="text-[10px] text-muted-foreground">
                      {shipping === 0
                        ? "Free — above ₹999"
                        : `Add ${formatPrice(SHIPPING_THRESHOLD - discountedSub)} for free`}
                    </p>
                  </div>
                  <span className={cn("font-medium", shipping === 0 && "text-success")}>
                    {shipping === 0 ? "Free" : formatPrice(shipping)}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Total */}
              <div className="flex justify-between items-baseline">
                <div>
                  <p className="font-heading font-bold text-base">Total</p>
                  <p className="text-[10px] text-muted-foreground">Incl. GST: {formatPrice(gst)}</p>
                </div>
                <p className="font-heading font-bold text-xl text-primary">{formatPrice(total)}</p>
              </div>

              {/* Savings callout */}
              {discount > 0 && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-success/8 border border-success/25">
                  <CheckCircle2 size={13} className="text-success shrink-0" />
                  <p className="text-xs font-semibold text-success">
                    You're saving {formatPrice(discount)}!
                  </p>
                </div>
              )}

              {/* Coupon input */}
              {appliedCoupon ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-success/5 border border-success/30">
                  <CheckCircle2 size={14} className="text-success shrink-0" />
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
                      <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={promoInput}
                        onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                        onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                        placeholder="Coupon code"
                        className={cn(
                          "w-full h-9 pl-9 pr-3 rounded-lg border bg-background text-sm font-mono tracking-widest",
                          "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors",
                          promoError ? "border-destructive" : "border-border"
                        )}
                      />
                    </div>
                    <button
                      onClick={handleApplyPromo}
                      disabled={validating || !promoInput.trim()}
                      className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                    >
                      {validating ? <Loader2 size={13} className="animate-spin" /> : "Apply"}
                    </button>
                  </div>
                  {promoError && <p className="text-xs text-destructive">{promoError}</p>}
                </div>
              )}

              {/* Checkout CTA */}
              {isAuthenticated ? (
                <Link
                  href={ROUTES.checkout}
                  className={cn(
                    "w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2",
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
                      "w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2",
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

              <div className="flex items-center justify-center gap-4">
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
    </div>
  );
}
