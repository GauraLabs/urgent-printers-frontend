"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckoutStepper, type CheckoutStep } from "@/features/checkout/CheckoutStepper";
import { AddressStep } from "@/features/checkout/AddressStep";
import { PaymentStep, type PaymentMethod } from "@/features/checkout/PaymentStep";
import { ReviewStep } from "@/features/checkout/ReviewStep";
import { useCartStore } from "@/features/cart/store";
import { ROUTES } from "@/lib/constants/routes";
import type { Address } from "@/types";

type PartialAddress = Omit<Address, "id" | "userId" | "isDefault">;

export default function CheckoutPage() {
  const router = useRouter();
  const items    = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const clearCart = useCartStore((s) => s.clearCart);

  const [step, setStep]                     = useState<CheckoutStep>(1);
  const [address, setAddress]               = useState<PartialAddress | null>(null);
  const [paymentMethod, setPaymentMethod]   = useState<PaymentMethod>("upi");
  const [paymentDetail, setPaymentDetail]   = useState("");
  const [isPlacing, setIsPlacing]           = useState(false);

  function handleAddressNext(addr: PartialAddress) {
    setAddress(addr);
    setStep(2);
  }

  function handlePaymentNext(method: PaymentMethod, detail: string) {
    setPaymentMethod(method);
    setPaymentDetail(detail);
    setStep(3);
  }

  async function handlePlaceOrder() {
    setIsPlacing(true);
    try {
      // REAL API: POST /api/orders with { items, address, paymentMethod, paymentDetail }
      await new Promise((r) => setTimeout(r, 1200));

      const mockOrderId = `ord-${Date.now()}`;
      clearCart();
      toast.success("Order placed successfully!");
      router.replace(ROUTES.checkoutConfirmation(mockOrderId));
    } catch {
      toast.error("Failed to place order. Please try again.");
      setIsPlacing(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-heading font-bold text-2xl mb-6">Checkout</h1>

      {/* Stepper */}
      <div className="mb-8 p-4 rounded-2xl border border-border bg-card">
        <CheckoutStepper currentStep={step} />
      </div>

      {/* Step content */}
      {step === 1 && <AddressStep onNext={handleAddressNext} />}

      {step === 2 && (
        <PaymentStep
          onNext={handlePaymentNext}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && address && (
        <ReviewStep
          items={items}
          subtotal={subtotal}
          address={address}
          paymentMethod={paymentMethod}
          paymentDetail={paymentDetail}
          onPlaceOrder={handlePlaceOrder}
          onBack={() => setStep(2)}
          isPlacing={isPlacing}
        />
      )}
    </div>
  );
}
