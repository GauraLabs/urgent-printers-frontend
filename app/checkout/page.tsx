"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { CheckoutStepper, type CheckoutStep } from "@/features/checkout/CheckoutStepper";
import { AddressStep } from "@/features/checkout/AddressStep";
import { PaymentStep, type PaymentMethod } from "@/features/checkout/PaymentStep";
import { ReviewStep } from "@/features/checkout/ReviewStep";
import { useCartStore } from "@/features/cart/store";
import { useAuthStore } from "@/features/auth/store";
import { createOrder, previewOrder, verifyPayment } from "@/lib/api";
import { ROUTES } from "@/lib/constants/routes";
import { RAZORPAY_THEME_COLOR } from "@/lib/constants/payment";
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
  const [paymentMethod,  setPaymentMethod]  = useState<PaymentMethod>("online");
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
    paymentMethod:   paymentMethod,
    couponCode:      appliedCoupon?.code || undefined,
  }), [items, appliedCoupon, paymentMethod]);

  function handleAddressNext(addr: PartialAddress) {
    setAddress(addr);
    setStep(2);
  }

  function handlePaymentNext(method: PaymentMethod) {
    setPaymentMethod(method);
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

      // ── COD: no payment gateway needed ──────────────────────────────────────
      if (paymentMethod === "cod" || !order.payment?.razorpayOrderId) {
        finishOrder(order.id);
        return;
      }

      // ── Online payment: open Razorpay Standard Checkout ─────────────────────
      if (!window.Razorpay) {
        toast.error("Payment gateway failed to load. Please refresh the page and try again.");
        setIsPlacing(false);
        return;
      }

      const user = useAuthStore.getState().user;

      // Tracks whether a terminal callback (handler / ondismiss / payment.failed) already ran.
      // Used by the window-focus safety net below to avoid double-resetting.
      let paymentHandled = false;

      const rzp = new window.Razorpay({
        key:         order.payment.razorpayKeyId!,
        amount:      Math.round(order.payment.amount * 100),  // rupees → paise
        currency:    "INR",
        order_id:    order.payment.razorpayOrderId,
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
            finishOrder(order.id);
          } catch {
            // Payment captured by Razorpay but verify failed — money may be deducted, don't retry
            toast.error(
              `Payment received but confirmation failed. Contact support with order #${order.orderNumber}.`,
              { duration: 12000 }
            );
            setIsPlacing(false);
          }
        },

        modal: {
          confirm_close: true,
          ondismiss: () => {
            paymentHandled = true;
            toast("Payment not completed. Your order is saved — retry from My Orders.", {
              duration: 7000,
            });
            setIsPlacing(false);
          },
        },
      });

      rzp.on("payment.failed", (response) => {
        paymentHandled = true;
        const msg = response.error.description || "Payment failed.";
        toast.error(`${msg} You can retry from My Orders.`, { duration: 8000 });
        setIsPlacing(false);
      });

      // Safety net: Razorpay does NOT call ondismiss when their own API returns an error
      // (e.g. invalid order_id → 400 on /preferences). The modal closes silently.
      // Window regaining focus is the only reliable signal the modal is gone.
      const handleFocus = () => {
        window.removeEventListener("focus", handleFocus);
        // Small delay so ondismiss/payment.failed can fire first if they're going to
        setTimeout(() => {
          if (!paymentHandled) {
            setIsPlacing(false);
            toast.error(
              "Payment window closed unexpectedly. Your order is saved — retry from My Orders.",
              { duration: 8000 }
            );
          }
        }, 400);
      };
      window.addEventListener("focus", handleFocus);

      try {
        rzp.open();
      } catch {
        window.removeEventListener("focus", handleFocus);
        toast.error("Could not open payment window. Please refresh and try again.");
        setIsPlacing(false);
      }

    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to place order. Please try again.");
      setIsPlacing(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-heading font-bold text-2xl mb-6">Checkout</h1>

      <Card className="mb-8 rounded-2xl p-4">
        <CheckoutStepper currentStep={step} />
      </Card>

      {step === 1 && <AddressStep onNext={handleAddressNext} />}

      {step === 2 && (
        <PaymentStep onNext={handlePaymentNext} onBack={() => setStep(1)} />
      )}


      {step === 3 && address && (
        <ReviewStep
          items={items}
          address={address}
          paymentMethod={paymentMethod}
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
