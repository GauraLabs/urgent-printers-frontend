import { ApiError } from "@/lib/api/client";

export type VerifyOutcome = "confirming" | "amount_mismatch" | "failed";

// 409 payment_not_captured (bank authorised, capture settling) and 503 payment_verification_unavailable
// are benign: the webhook/sweep confirms the order shortly. Only an amount mismatch is a real problem.
export function classifyVerifyError(err: unknown): VerifyOutcome {
  if (!(err instanceof ApiError)) return "failed";
  if (err.code === "payment_amount_mismatch") return "amount_mismatch";
  if (err.code === "payment_not_captured" || err.code === "payment_verification_unavailable") return "confirming";
  return "failed";
}

export const VERIFY_CONFIRMING_MESSAGE =
  "Payment received — we're confirming your order. Check My Orders in a moment.";

export function verifyMismatchMessage(orderNumber: string): string {
  return `There was a problem confirming your payment amount. Please contact support with order #${orderNumber}.`;
}

export function verifyFailedMessage(orderNumber: string): string {
  return `Payment received but confirmation failed. Contact support with order #${orderNumber}.`;
}

export const VERIFY_POLL_ATTEMPTS = 3;
export const VERIFY_POLL_INTERVAL_MS = 1700;

// The webhook often confirms within seconds; poll a few times (~5s cap) before showing the friendly message.
export async function pollUntilPaid(
  fetchPaymentStatus: () => Promise<string | null>,
  attempts: number = VERIFY_POLL_ATTEMPTS,
  intervalMs: number = VERIFY_POLL_INTERVAL_MS
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    try {
      if ((await fetchPaymentStatus()) === "paid") return true;
    } catch {
      // Polling is best-effort; the friendly fallback still applies.
    }
  }
  return false;
}
