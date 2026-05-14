"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckoutStepper, type CheckoutStep } from "@/features/checkout/CheckoutStepper";
import { AddressStep } from "@/features/checkout/AddressStep";
import { PaymentStep, type PaymentMethod } from "@/features/checkout/PaymentStep";
import { ReviewStep } from "@/features/checkout/ReviewStep";
import { useCartStore } from "@/features/cart/store";
import { useAuthStore } from "@/features/auth/store";
import { createOrder, previewOrder, verifyPayment } from "@/lib/api";
import { ROUTES } from "@/lib/constants/routes";
import type { Address, OrderPreview, CreateOrderRequest } from "@/types";

type PartialAddress = Omit<Address, "id" | "userId" | "isDefault">;

export default function CheckoutPage() {
  const router = useRouter();

  const items            = useCartStore((s) => s.items);
  const appliedCoupon    = useCartStore((s) => s.appliedCoupon);
  const clearCart        = useCartStore((s) => s.clearCart);
  const setAppliedCoupon = useCartStore((s) => s.setAppliedCoupon);

  const [step,           setStep]           = useState<CheckoutStep>(1);
  const [address,        setAddress]        = useState<PartialAddress | null>(null);
  const [paymentMethod,  setPaymentMethod]  = useState<PaymentMethod>("cod");
  const [paymentDetail,  setPaymentDetail]  = useState("");
  const [isPlacing,      setIsPlacing]      = useState(false);
  const [preview,        setPreview]        = useState<OrderPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError,   setPreviewError]   = useState<string | null>(null);

  const buildRequest = useCallback((addr: PartialAddress): CreateOrderRequest => ({
    items: items.map((item) => ({
      productId:       item.product.id,
      productSlug:     item.product.slug,
      productName:     item.product.name,
      sizeId:          item.config.sizeId,
      sizeLabel:       item.config.sizeLabel,
      paperId:         item.config.paperId,
      paperLabel:      item.config.paperLabel,
      finishId:        item.config.finishId,
      finishLabel:     item.config.finishLabel,
      sides:           item.config.sides,
      quantity:        item.config.quantity,
      turnaroundId:    item.config.turnaroundId,
      turnaroundLabel: item.config.turnaroundLabel,
      artworkFileKey:  item.config.artworkFileKey,
      templateData:    item.config.templateData,
    })),
    shippingAddress: addr,
    paymentMethod:   paymentMethod === "cod" ? "cod" : paymentMethod as "cod",
    couponCode:      appliedCoupon?.code || undefined,
  }), [items, appliedCoupon, paymentMethod]);

  function handleAddressNext(addr: PartialAddress) {
    setAddress(addr);
    setStep(2);
  }

  function handlePaymentNext(method: PaymentMethod, detail: string) {
    setPaymentMethod(method);
    setPaymentDetail(detail);
    setStep(3);

    const token = useAuthStore.getState().token;
    if (!token || !address) return;

    setPreview(null);
    setPreviewError(null);
    setPreviewLoading(true);

    previewOrder(buildRequest(address), token)
      .then(setPreview)
      .catch((err) => setPreviewError(err instanceof Error ? err.message : "Could not compute pricing."))
      .finally(() => setPreviewLoading(false));
  }

  function finishOrder(orderId: string) {
    clearCart();
    setAppliedCoupon(null);
    toast.success("Order placed successfully!");
    router.replace(ROUTES.checkoutConfirmation(orderId));
  }

  async function handlePlaceOrder() {
    if (!address) return;
    const token = useAuthStore.getState().token;
    if (!token) {
      toast.error("Session expired. Please sign in again.");
      router.replace(`${ROUTES.login}?redirect=${encodeURIComponent(ROUTES.checkout)}`);
      return;
    }

    setIsPlacing(true);

    try {
      const order = await createOrder(buildRequest(address), token);

      // ── COD: order is immediately placed ────────────────────────────────
      if (paymentMethod === "cod" || !order.payment?.razorpayOrderId) {
        finishOrder(order.id);
        return;
      }

      // ── Non-COD: open Razorpay checkout ─────────────────────────────────
      if (!window.Razorpay) {
        toast.error("Payment gateway is not loaded. Please refresh and try again.");
        setIsPlacing(false);
        return;
      }

      const user = useAuthStore.getState().user;

      const rzp = new window.Razorpay({
        key:         order.payment.razorpayKeyId!,
        amount:      Math.round(order.payment.amount * 100), // paise
        currency:    "INR",
        order_id:    order.payment.razorpayOrderId,
        name:        "Urgent Printers",
        description: `Order ${order.orderNumber}`,
        prefill: {
          name:    user ? `${user.firstName} ${user.lastName}`.trim() : undefined,
          email:   user?.email,
          contact: user?.phone?.replace(/\D/g, "").slice(-10),
        },
        theme: { color: "oklch(0.38 0.16 271)" },

        handler: async (response) => {
          try {
            await verifyPayment(order.id, {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            }, token);
            finishOrder(order.id);
          } catch {
            toast.error("Payment verification failed. Please contact support with your order number: " + order.orderNumber);
            setIsPlacing(false);
          }
        },

        modal: {
          confirm_close: true,
          ondismiss: () => {
            // Order exists in "awaiting_payment" — user can go back and try again
            toast("Payment cancelled. Your order is saved — you can retry payment from My Orders.", {
              duration: 6000,
            });
            setIsPlacing(false);
          },
        },
      });

      rzp.open();

    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to place order. Please try again.");
      setIsPlacing(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-heading font-bold text-2xl mb-6">Checkout</h1>

      <div className="mb-8 p-4 rounded-2xl border border-border bg-card">
        <CheckoutStepper currentStep={step} />
      </div>

      {step === 1 && <AddressStep onNext={handleAddressNext} />}

      {step === 2 && (
        <PaymentStep onNext={handlePaymentNext} onBack={() => setStep(1)} />
      )}

      {step === 3 && address && (
        <ReviewStep
          items={items}
          address={address}
          paymentMethod={paymentMethod}
          paymentDetail={paymentDetail}
          preview={preview}
          previewLoading={previewLoading}
          previewError={previewError}
          onPlaceOrder={handlePlaceOrder}
          onBack={() => setStep(2)}
          isPlacing={isPlacing}
        />
      )}
    </div>
  );
}
