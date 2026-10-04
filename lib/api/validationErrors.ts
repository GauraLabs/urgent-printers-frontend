const NUMERIC = /^\d+$/;

function cleanMessage(msg: string): string {
  return msg.replace(/^Value error,\s*/i, "");
}

/** `items.0.quantity` -> `Item 1 quantity`; "body" and "items" wrappers are dropped. */
function humanizeLoc(loc: unknown[]): string {
  const parts: string[] = [];
  for (let i = 0; i < loc.length; i++) {
    const p = String(loc[i]);
    if (p === "body" || p === "query") continue;
    if (NUMERIC.test(p)) {
      const prev = parts.pop();
      parts.push(prev ? `${prev.replace(/s$/, "")} ${Number(p) + 1}` : `#${Number(p) + 1}`);
    } else {
      parts.push(p.replace(/_/g, " "));
    }
  }
  const text = parts.join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Pydantic 422 bodies are `detail: [{loc, msg, type}]`. Turns them into one
// customer-readable line instead of "[object Object]".
export function formatValidationDetail(detail: unknown): string | undefined {
  if (typeof detail === "string") return detail || undefined;
  if (!Array.isArray(detail)) return undefined;
  const lines: string[] = [];
  for (const item of detail) {
    if (!item || typeof item !== "object" || !("msg" in item)) continue;
    const { loc, msg } = item as { loc?: unknown; msg: unknown };
    const where = Array.isArray(loc) ? humanizeLoc(loc) : "";
    const text = cleanMessage(String(msg));
    lines.push(where ? `${where}: ${text}` : text);
  }
  return lines.length > 0 ? lines.join("; ") : undefined;
}

// invalid_coupon / invalid_quantity are deliberately absent: the server's own
// message there is specific ("Add ₹X more…", "usage limit reached") and wins.
const CODED_MESSAGES: Record<string, string> = {
  invalid_option: "A selected print option is no longer available. Please reselect your options.",
  invalid_turnaround: "The selected turnaround option is no longer available. Please reselect your options.",
  product_unavailable: "One of the products in your order is no longer available. Please remove it from your cart and try again.",
  invalid_order_total: "We couldn't calculate a valid total for this order. Please review your cart and coupon, then try again.",
};

const CODED_FALLBACKS: Record<string, string> = {
  invalid_coupon: "This coupon can't be applied to your order.",
};

export function codedErrorMessage(code: string | undefined, serverMessage?: string): string | undefined {
  if (!code) return undefined;
  return CODED_MESSAGES[code] ?? (serverMessage ? undefined : CODED_FALLBACKS[code]);
}
