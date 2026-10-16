function originOf(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

export interface CspEnv {
  apiUrl?: string;
  cdnUrl?: string;
}

/**
 * Full CSP shipped as Report-Only: lists every third party the storefront loads
 * (Razorpay, GA4, Clarity, Firebase Auth + reCAPTCHA, Google Identity Services,
 * Nominatim/pincode lookups, R2 artwork uploads). 'unsafe-inline' is required by
 * the inline theme/consent init scripts and next/script bodies.
 */
export function buildCspReportOnly({ apiUrl, cdnUrl }: CspEnv): string {
  const own = [originOf(apiUrl), originOf(cdnUrl)].filter((o): o is string => o !== null);

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'", "'unsafe-inline'", "'unsafe-eval'",
      "https://checkout.razorpay.com",
      "https://accounts.google.com", "https://apis.google.com",
      "https://www.googletagmanager.com", "https://www.google-analytics.com",
      "https://www.clarity.ms", "https://scripts.clarity.ms",
      "https://www.google.com", "https://www.gstatic.com", "https://www.recaptcha.net",
      "https://vercel.live",
    ],
    "style-src": ["'self'", "'unsafe-inline'", "https://accounts.google.com", "https://fonts.googleapis.com"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    "connect-src": [
      "'self'", ...own,
      "https://*.r2.cloudflarestorage.com", "https://*.r2.dev",
      "https://api.razorpay.com", "https://lumberjack.razorpay.com", "https://checkout.razorpay.com",
      "https://www.google-analytics.com", "https://*.google-analytics.com", "https://*.analytics.google.com",
      "https://www.googletagmanager.com", "https://*.googletagmanager.com", "https://*.g.doubleclick.net", "https://*.clarity.ms",
      "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com", "https://www.googleapis.com",
      "https://*.firebaseapp.com", "https://accounts.google.com", "https://www.google.com", "https://apis.google.com",
      "https://nominatim.openstreetmap.org", "https://api.postalpincode.in",
      "https://vercel.live", "wss://ws-us3.pusher.com",
    ],
    "frame-src": [
      "'self'",
      "https://api.razorpay.com", "https://checkout.razorpay.com",
      "https://accounts.google.com", "https://www.google.com", "https://apis.google.com",
      "https://*.googleusercontent.com", "https://www.gstatic.com",
      "https://*.firebaseapp.com", "https://www.recaptcha.net", "https://vercel.live",
    ],
    "media-src": ["'self'", "blob:", ...own, "https://*.r2.dev", "https://*.r2.cloudflarestorage.com"],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'", "https://api.razorpay.com"],
  };

  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

export const PERMISSIONS_POLICY =
  'camera=(), microphone=(), geolocation=(self), payment=(self "https://checkout.razorpay.com" "https://api.razorpay.com")';

export function buildSecurityHeaders(env: CspEnv): Array<{ key: string; value: string }> {
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
    { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
    { key: "Content-Security-Policy-Report-Only", value: buildCspReportOnly(env) },
  ];
}

/** Reset links carry a secret token in the URL, so never send it as a referrer. */
export const RESET_PASSWORD_HEADERS = [{ key: "Referrer-Policy", value: "no-referrer" }];
