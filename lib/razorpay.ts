const RAZORPAY_SRC = "https://checkout.razorpay.com/v1/checkout.js";
const LOAD_TIMEOUT_MS = 15000;

let pending: Promise<boolean> | null = null;

/**
 * Loads Razorpay's checkout.js on demand (it is not in the root layout, to keep
 * it off every page). Safe to call repeatedly: concurrent callers share one
 * request, and a failed load is retried on the next call. Resolves false if the
 * script could not be loaded, so callers keep their "gateway failed to load" guard.
 */
export function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (pending) return pending;

  pending = new Promise<boolean>((resolve) => {
    let script = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_SRC}"]`);
    const settle = (ok: boolean) => {
      clearTimeout(timer);
      pending = null;
      const ready = ok && !!window.Razorpay;
      if (!ready) script?.remove();
      resolve(ready);
    };

    if (!script) {
      script = document.createElement("script");
      script.src = RAZORPAY_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    const timer = setTimeout(() => settle(false), LOAD_TIMEOUT_MS);
    script.addEventListener("load", () => settle(true), { once: true });
    script.addEventListener("error", () => settle(false), { once: true });
  });
  return pending;
}
