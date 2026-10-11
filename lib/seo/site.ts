// Single source of truth for the canonical origin. Prod should set
// NEXT_PUBLIC_SITE_URL=https://www.urgentprinters.com (apex 307s to www).
export const DEFAULT_SITE_URL = "https://urgentprinters.com";

export function resolveSiteUrl(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (!/^https?:\/\//i.test(value)) return DEFAULT_SITE_URL;
  return value.replace(/\/+$/, "");
}

export const SITE_URL = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

export const SITE_NAME = "Urgent Printers";

export const CONTACT_PHONE_DISPLAY = "+91 95281 91807";
export const CONTACT_PHONE_HREF = "tel:+919528191807";
export const CONTACT_PHONE_E164_DASHED = "+91-95281-91807";

export function absoluteUrl(path: string, siteUrl: string = SITE_URL): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (!path || path === "/") return siteUrl;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
