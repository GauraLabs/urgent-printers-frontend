// Razorpay Standard Checkout v1 — type declarations
// https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/

interface RazorpayDisplayBlock {
  name: string;
  instruments: Array<{ method: string; flows?: string[] }>;
}

interface RazorpayOptions {
  key: string;
  amount: number;        // in paise (₹1 = 100 paise)
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  image?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;   // 10-digit mobile, no country code
    vpa?: string;       // UPI VPA — pre-fills UPI ID field (e.g. name@upi)
    method?: "upi" | "card" | "netbanking" | "wallet";  // opens Razorpay on this tab
  };
  config?: {
    display?: {
      blocks?: Record<string, RazorpayDisplayBlock>;
      sequence?: string[];
      preferences?: { show_default_blocks?: boolean };
    };
  };
  retry?: {
    enabled?: boolean;
    max_count?: number;
  };
  theme?: {
    color?: string;
    hide_topbar?: boolean;
  };
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: {
    ondismiss?: () => void;
    confirm_close?: boolean;
    escape?: boolean;
    animation?: boolean;
  };
  notes?: Record<string, string>;
}

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

// Fired on rzp.on("payment.failed", ...) — bank decline, insufficient funds, etc.
interface RazorpayPaymentFailedResponse {
  error: {
    code: string;             // e.g. "BAD_REQUEST_ERROR"
    description: string;      // user-facing message
    source: string;           // "bank" | "gateway" | "business"
    step: string;             // "payment_authentication" | "payment_authorization" etc.
    reason: string;           // "payment_failed" | "payment_cancelled" etc.
    metadata: {
      order_id: string;
      payment_id?: string;
    };
  };
}

interface RazorpayInstance {
  open(): void;
  close(): void;
  on(event: "payment.failed", handler: (response: RazorpayPaymentFailedResponse) => void): void;
  on(event: string, handler: (response: unknown) => void): void;
}

interface RazorpayConstructor {
  new (options: RazorpayOptions): RazorpayInstance;
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

export {};
