export function cancelSuccessMessage(paymentStatus: string | undefined): string {
  return paymentStatus === "refund_pending"
    ? "Your order is cancelled. If you paid online, your refund will be processed shortly."
    : "Order cancelled.";
}
