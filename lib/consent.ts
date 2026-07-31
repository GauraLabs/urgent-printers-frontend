export type ConsentStatus = "accepted" | "rejected" | "undecided";

// localStorage key for the cookie-consent choice. Read by ConsentScripts
// (components/analytics/ConsentedScripts.tsx) to decide whether to inject
// gated analytics scripts, and by CookieConsentBanner to decide whether to
// show the banner. Named alongside COLOR_MODE_STORAGE_KEY in lib/themes.ts —
// kept here (not there) since consent is unrelated to theming, but follows
// the same "one exported key constant per persisted concern" convention.
export const COOKIE_CONSENT_STORAGE_KEY = "cookie-consent";

export function getConsentStatus(): ConsentStatus {
  if (typeof window === "undefined") return "undecided";
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (raw === "accepted" || raw === "rejected") return raw;
    return "undecided";
  } catch {
    return "undecided";
  }
}

export function setConsentStatus(status: "accepted" | "rejected"): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, status);
  } catch {
    // localStorage unavailable (private mode / disabled) — consent choice
    // won't persist, but the banner action itself must not throw.
  }
}

export function clearConsentStatus(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
  } catch {
    // no-op — see setConsentStatus
  }
}
