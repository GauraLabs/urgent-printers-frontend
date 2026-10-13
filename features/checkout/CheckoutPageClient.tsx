"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { CheckoutStepper, type CheckoutStep } from "@/features/checkout/CheckoutStepper";
import { AddressStep } from "@/features/checkout/AddressStep";
import { PaymentStep, type PaymentMethod } from "@/features/checkout/PaymentStep";
import { ReviewStep } from "@/features/checkout/ReviewStep";
import { useCartStore } from "@/features/cart/store";
import { useAuthStore } from "@/features/auth/store";
import { ApiError, NetworkError, ResponseHandlingError } from "@/lib/api/client";
import { getPreviousPaymentInfo } from "@/lib/api/orders";
import { createOrder, previewOrder, verifyPayment, isPriceChangedError, isQuantityLimitError, isCodUnavailableError, getCart, getSiteStatus } from "@/lib/api";
import { revalidateAppliedCoupon } from "@/features/cart/couponRevalidation";
import { buildClientPricing } from "./clientPricing";
import { resolveCod, codBlockApplies, type ServerCodBlock } from "./cod";
import { applyPreviewPrices, pricesDiffer } from "./repricing";
import type { SiteStatus } from "@/lib/api/siteStatus";
import { isInfrastructureFailure } from "@/lib/api/errorClassification";
import { showPersonalisationError, describePersonalisationError, type PersonalisationNotice } from "@/features/cart/personalisationToast";
import { trackConnectivity } from "@/features/site-status/trackConnectivity";
import { ROUTES } from "@/lib/constants/routes";
import { RAZORPAY_THEME_COLOR } from "@/lib/constants/payment";
import { loadRazorpay } from "@/lib/razorpay";
import type { Address, OrderPreview, CreateOrderRequest, ClientPricing } from "@/types";

// Only these answers prove no order was created; anything else (408/425/429, 5xx, ...) may have succeeded.
const DEFINITIVE_ERROR_STATUSES: ReadonlySet<number> = new Set([400, 401, 403, 404, 409, 422]);
const IN_PROGRESS_COOLDOWN_MS = 3000;
export const PREVIEW_OFFLINE_MESSAGE = "Couldn't confirm the latest price — check your connection and tap Retry.";

function newIdempotencyKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

type PartialAddress = Omit<Address, "id" | "userId" | "isDefault">;

interface CheckoutPageClientProps {
  siteStatus: SiteStatus;
}

export function CheckoutPageClient({ siteStatus }: CheckoutPageClientProps) {
  const router = useRouter();

  const items            = useCartStore((s) => s.items);
  const hasUnavailable   = useCartStore((s) => s.items.some((i) => s.unavailableIds.includes(i.cartItemId)));
  const appliedCoupon    = useCartStore((s) => s.appliedCoupon);
  const clearCart        = useCartStore((s) => s.clearCart);
  const setAppliedCoupon = useCartStore((s) => s.setAppliedCoupon);
  const setItems         = useCartStore((s) => s.setItems);

  const [step,           setStep]           = useState<CheckoutStep>(1);
  const [address,        setAddress]        = useState<PartialAddress | null>(null);
  const [paymentMethod,  setPaymentMethod]  = useState<PaymentMethod>("online");
  const [isPlacing,      setIsPlacing]      = useState(false);
  const [preview,        setPreview]        = useState<OrderPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError,   setPreviewError]   = useState<string | null>(null);
  const [priceNotice,    setPriceNotice]    = useState<string | null>(null);
  const [personalisationNotice, setPersonalisationNotice] = useState<PersonalisationNotice | null>(null);
  const [refreshedStatus, setRefreshedStatus] = useState<SiteStatus | null>(null);
  const liveStatus = refreshedStatus ?? siteStatus;
  const [codNotice,      setCodNotice]      = useState<string | null>(null);
  // Set when the server rejected COD on create. Cleared by a fresh preview, a changed
  // COD config, or re-entering the payment step, so a failed refresh can't strand it.
  const [serverCodBlock, setServerCodBlock] = useState<ServerCodBlock | null>(null);

  const cod = useMemo(() => {
    let estimate: number | null = null;
    try {
      estimate = buildClientPricing(items, appliedCoupon)?.total ?? null;
    } catch {
      estimate = null;
    }
    const base = resolveCod(liveStatus.cod, estimate, preview);
    if (codBlockApplies(serverCodBlock, liveStatus.cod) && !base.reason) {
      return { available: false, reason: serverCodBlock.reason };
    }
    return base;
  }, [liveStatus.cod, items, appliedCoupon, preview, serverCodBlock]);

  // Only an authoritative signal flips the customer's choice: a settled preview
  // (or the 422 path). Before that, the client estimate just drives the card's
  // disabled hint. Adjusted during render (React's derived-state pattern) so a
  // request never goes out with a stale "cod".
  if (paymentMethod === "cod" && !cod.available && preview !== null && !previewLoading) {
    setPaymentMethod("online");
    setCodNotice(`${cod.reason ?? "Cash on Delivery is unavailable"}. We switched you to online payment.`);
  }

  useEffect(() => {
    if (step === 3 && codNotice) toast(codNotice);
  }, [step, codNotice]);

  const buildRequest = useCallback((addr: PartialAddress): CreateOrderRequest => ({
    items: items.map((item) => ({
      productId:       item.product.id,
      productSlug:     item.product.slug,
      productName:     item.product.name,
      categoryName:    item.product.categoryName || undefined,
      thumbnailUrl:    item.product.thumbnailUrl ?? item.product.images[0],
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

  const runPreviewRef = useRef<typeof runPreview>(runPreview);

  function handleAddressNext(addr: PartialAddress) {
    setAddress(addr);
    setPreview(null);
    setServerCodBlock(null);
    setStep(2);
  }

  function handlePaymentNext(requested: PaymentMethod) {
    const method: PaymentMethod = requested === "cod" && !cod.available ? "online" : requested;
    setPaymentMethod(method);
    setCodNotice(null);
    setStep(3);

    const token = useAuthStore.getState().token;
    if (!token || !address) return;

    setPreview(null);
    setPreviewError(null);
    setPriceNotice(null);
    void (async () => {
      // Re-check the coupon first so the preview and the review match what the server will accept.
      if ((await revalidateAppliedCoupon(token, { force: true })) === "removed") await new Promise((r) => setTimeout(r, 0));
      void runPreviewRef.current(address, token, "Totals below use the latest prices. Review them before placing your order.", false, true);
    })();
  }

  // Fetches the authoritative preview and, if its line prices differ from the
  // cart (a sale window opened/closed since the item was added), adopts them
  // and shows `noticeIfChanged`. Returns the preview so callers can chain.
  async function runPreview(
    addr: PartialAddress,
    token: string,
    noticeIfChanged: string,
    forceNotice = false,
    reviewStep = false
  ): Promise<OrderPreview | null> {
    setPreviewLoading(true);
    setPersonalisationNotice(null);
    try {
      const request = buildRequest(addr);
      let clientPricing: ClientPricing | null = null;
      if (reviewStep) {
        try {
          clientPricing = buildClientPricing(items, appliedCoupon);
        } catch {
          clientPricing = null;
        }
      }
      const result = await trackConnectivity(
        previewOrder(clientPricing ? { ...request, clientPricing } : request, token)
      );
      setPreview(result);
      setServerCodBlock(null);
      setPreviewError(null);
      if (pricesDiffer(items, result)) {
        setItems(applyPreviewPrices(items, result));
        setPriceNotice(noticeIfChanged);
      } else if (forceNotice) {
        setPriceNotice(noticeIfChanged);
      }
      return result;
    } catch (err) {
      if (isQuantityLimitError(err)) {
        void sendBackToCart(err, token);
      }
      const personalisation = describePersonalisationError(err, items);
      if (personalisation) {
        setPersonalisationNotice(personalisation);
        setPreviewError(null);
        return null;
      }
      setPreviewError(
        isInfrastructureFailure(err)
          ? PREVIEW_OFFLINE_MESSAGE
          : err instanceof Error ? `${err.message.replace(/\.?$/, ".")}` : "Could not compute pricing."
      );
      return null;
    } finally {
      setPreviewLoading(false);
    }
  }

  runPreviewRef.current = runPreview;

  const retryPreview = useCallback(() => {
    const token = useAuthStore.getState().token;
    if (!token || !address) return;
    void runPreviewRef.current(address, token, "Totals below use the latest prices. Review them before placing your order.", false, true);
  }, [address]);

  const retryPreviewRef = useRef(retryPreview);
  retryPreviewRef.current = retryPreview;
  const needsRetryRef = useRef(false);
  needsRetryRef.current = step === 3 && previewError !== null && !previewLoading && !isPlacing;

  useEffect(() => {
    function onOnline() {
      if (needsRetryRef.current) retryPreviewRef.current();
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  // A stale cart line outside its allowed range: pull the server's clamped cart,
  // then explain on the cart page rather than failing the checkout.
  async function sendBackToCart(err: unknown, token: string) {
    try {
      setItems(await getCart(token));
    } catch {
      // The cart page still shows the local lines.
    }
    toast.error(err instanceof Error ? err.message : "Please adjust the quantity in your cart.");
    router.push(ROUTES.cart);
  }

  function finishOrder(orderId: string) {
    clearCart();
    setAppliedCoupon(null);
    toast.success("Order placed successfully!");
    router.replace(ROUTES.checkoutConfirmation(orderId));
  }

  useEffect(() => {
    if (step === 3 && paymentMethod === "online") void loadRazorpay();
  }, [step, paymentMethod]);

  // An unavailable line would be rejected at order creation; send the customer to remove it first.
  useEffect(() => {
    if (!hasUnavailable) return;
    toast.error("An item in your cart is no longer available. Please remove it to continue.");
    router.replace(ROUTES.cart);
  }, [hasUnavailable, router]);

  // One Idempotency-Key per distinct request body. It is kept while the outcome is unknown
  // (lost connection, 5xx, 408/425/429, request still in progress) and through the whole payment
  // flow; it is dropped at a terminal state (payment handler/dismiss/failure, a definitive
  // 400/401/403/404/409/422 answer). A changed body (address, payment, coupon, cart, re-previewed
  // total) always gets a fresh key.
  const idempotencyRef = useRef<{ key: string; fingerprint: string } | null>(null);
  // Synchronous guard: state updates are async, so a double tap could otherwise start two attempts.
  const inFlightRef = useRef(false);

  function release(keepKey = false) {
    if (!keepKey) idempotencyRef.current = null;
    inFlightRef.current = false;
    setIsPlacing(false);
  }

  const cooldownUntilRef = useRef(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
  }, []);

  async function handlePlaceOrder() {
    if (!address || hasUnavailable || inFlightRef.current || Date.now() < cooldownUntilRef.current) return;
    const token = useAuthStore.getState().token;
    if (!token) {
      toast.error("Session expired. Please sign in again.");
      router.replace(`${ROUTES.login}?redirect=${encodeURIComponent(ROUTES.checkout)}`);
      return;
    }

    inFlightRef.current = true;
    setIsPlacing(true);

    try {
      // Make sure the gateway can open before an order exists, so a blocked script never leaves an unpaid order.
      if (paymentMethod === "online" && !(await loadRazorpay())) {
        toast.error("Payment gateway failed to load. Please refresh the page and try again.");
        release();
        return;
      }

      // The disabled CTA is a UX nicety only — this call still goes to the
      // real API, so a halted incident (503, error_code "orders_halted")
      // is still enforced server-side. expectedTotal is the total the customer
      // is looking at; if the server's price differs it answers 409
      // price_changed and creates nothing, so we re-preview and ask again.
      const orderRequest: CreateOrderRequest = {
        ...buildRequest(address),
        ...(preview && { expectedTotal: preview.pricing.totalAmount }),
      };
      const fingerprint = JSON.stringify(orderRequest);
      if (idempotencyRef.current?.fingerprint !== fingerprint) {
        idempotencyRef.current = { key: newIdempotencyKey(), fingerprint };
      }
      let order: Awaited<ReturnType<typeof createOrder>>;
      try {
        order = await trackConnectivity(
          createOrder(orderRequest, token, { idempotencyKey: idempotencyRef.current.key })
        );
      } catch (err) {
        const previous = getPreviousPaymentInfo(err);
        if (previous) {
          release();
          if (previous.kind === "completed") {
            clearCart();
            setAppliedCoupon(null);
            toast.success(`Your previous payment for order #${previous.orderNumber} went through.`);
            router.replace(ROUTES.accountOrder(previous.orderId));
          } else {
            toast.error(
              `Your previous payment for order #${previous.orderNumber} is still being processed by the bank. Please wait a few minutes and check My Orders before paying again.`,
              {
                duration: 15000,
                action: { label: "View order", onClick: () => router.push(ROUTES.accountOrder(previous.orderId)) },
              }
            );
          }
          return;
        }
        if (err instanceof ApiError && err.code === "idempotency_request_in_progress") {
          // The first attempt is still running server-side: same key, and no new tap until the cooldown ends.
          toast.error("Your order is still being processed — please wait a moment.", { duration: IN_PROGRESS_COOLDOWN_MS });
          cooldownUntilRef.current = Date.now() + IN_PROGRESS_COOLDOWN_MS;
          cooldownTimerRef.current = setTimeout(() => {
            cooldownTimerRef.current = null;
            release(true);
          }, IN_PROGRESS_COOLDOWN_MS);
          return;
        }
        if (err instanceof ResponseHandlingError) {
          // The server answered 2xx, so the order very likely exists; keep the key so a blind retry replays it, never duplicates it.
          toast.error("Your order may have been created — please check My Orders before trying again.", {
            duration: 15000,
            action: { label: "My Orders", onClick: () => router.push(ROUTES.accountOrders) },
          });
          release(true);
          return;
        }
        if (err instanceof ApiError) {
          if (DEFINITIVE_ERROR_STATUSES.has(err.status)) idempotencyRef.current = null;
          throw err;
        }
        if (!(err instanceof NetworkError) && !isInfrastructureFailure(err)) throw err;
        toast.error(
          "Connection lost while placing your order. Please check your connection and try again — you won't be charged twice.",
          { duration: 10000 }
        );
        release(true);
        return;
      }

      // ── COD: no payment gateway needed ──────────────────────────────────────
      if (paymentMethod === "cod") {
        idempotencyRef.current = null;
        finishOrder(order.id);
        return;
      }

      // ── Online payment: razorpayOrderId is required to open the gateway.
      // If it's missing, the order was created but never got a payment
      // session — do NOT treat this as success (that would confirm an unpaid
      // order). Surface an error and keep the user on checkout to retry.
      if (!order.payment?.razorpayOrderId) {
        toast.error(
          `Could not start payment for order #${order.orderNumber}. Please retry from My Orders — you have not been charged.`,
          { duration: 10000 }
        );
        release();
        return;
      }

      // ── Online payment: open Razorpay Standard Checkout (script was awaited before the order was created).
      // From here the order exists, so any failure must say so instead of "Failed to place order".
      const payment = order.payment;
      const RazorpayCtor = window.Razorpay;
      const savedMessage = `Order #${order.orderNumber} is saved — retry payment from My Orders.`;
      if (!RazorpayCtor) {
        toast.error(savedMessage, { duration: 10000 });
        release();
        return;
      }

      const user = useAuthStore.getState().user;

      // Tracks whether a terminal callback (handler / ondismiss / payment.failed) already ran.
      // Used by the window-focus safety net below to avoid double-resetting.
      let paymentHandled = false;
      let handleFocus: (() => void) | null = null;

      try {
        const rzp = new RazorpayCtor({
          key:         payment.razorpayKeyId!,
          amount:      Math.round(payment.amount * 100),  // rupees → paise
          currency:    "INR",
          order_id:    payment.razorpayOrderId!,
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
              await trackConnectivity(verifyPayment(order.id, {
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
              }, token));
              idempotencyRef.current = null;
              finishOrder(order.id);
            } catch {
              // Payment captured by Razorpay but verify failed — money may be deducted, don't retry
              toast.error(
                `Payment received but confirmation failed. Contact support with order #${order.orderNumber}.`,
                { duration: 12000 }
              );
              release();
            }
          },

          modal: {
            confirm_close: true,
            ondismiss: () => {
              paymentHandled = true;
              toast("Payment not completed. Your order is saved — retry from My Orders.", {
                duration: 7000,
              });
              release();
            },
          },
        });

        rzp.on("payment.failed", (response) => {
          paymentHandled = true;
          const msg = response.error.description || "Payment failed.";
          toast.error(`${msg} You can retry from My Orders.`, { duration: 8000 });
          release();
        });

        // Safety net: Razorpay does NOT call ondismiss when their own API returns an error
        // (e.g. invalid order_id → 400 on /preferences). The modal closes silently.
        // Window regaining focus is the only reliable signal the modal is gone.
        const onFocus = () => {
          window.removeEventListener("focus", onFocus);
          // Small delay so ondismiss/payment.failed can fire first if they're going to
          setTimeout(() => {
            if (!paymentHandled) {
              release();
              toast.error(
                "Payment window closed unexpectedly. Your order is saved — retry from My Orders.",
                { duration: 8000 }
              );
            }
          }, 400);
        };
        handleFocus = onFocus;
        window.addEventListener("focus", onFocus);

        rzp.open();
      } catch {
        if (handleFocus) window.removeEventListener("focus", handleFocus);
        toast.error(savedMessage, { duration: 10000 });
        release();
      }
      return;

    } catch (err) {
      if (isPriceChangedError(err)) {
        await runPreview(
          address,
          token,
          "Prices changed while you were checking out. Nothing has been charged. Please review the new total and confirm again.",
          true
        );
        toast.error("Prices have changed. Please review the updated total and confirm again.");
      } else if (isQuantityLimitError(err)) {
        void sendBackToCart(err, token);
      } else if (isCodUnavailableError(err)) {
        const msg = err instanceof Error ? err.message : "Cash on Delivery is currently unavailable";
        setPaymentMethod("online");
        setServerCodBlock({ reason: msg, config: liveStatus.cod });
        setCodNotice(`${msg}. We switched you to online payment.`);
        toast.error(msg);
        void getSiteStatus().then(setRefreshedStatus);
        void runPreview(address, token, "Totals below use the latest prices. Review them before placing your order.");
      } else if (showPersonalisationError(err, items, (href) => router.push(href))) {
        setPersonalisationNotice(describePersonalisationError(err, items));
      } else {
        toast.error(err instanceof Error ? err.message : "Failed to place order. Please try again.");
      }
      release(err instanceof ApiError && !DEFINITIVE_ERROR_STATUSES.has(err.status));
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
        <PaymentStep cod={cod} codNotice={codNotice} initialMethod={paymentMethod} onNext={handlePaymentNext} onBack={() => setStep(1)} />
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
          onBack={() => { setServerCodBlock(null); setStep(2); }}
          isPlacing={isPlacing}
          ordersHalted={siteStatus.orders_halted}
          haltMessage={siteStatus.message}
          priceNotice={priceNotice}
          personalisationNotice={personalisationNotice}
          onRetryPreview={retryPreview}
        />
      )}
    </div>
  );
}
