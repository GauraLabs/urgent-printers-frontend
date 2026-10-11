import { ROUTES } from "@/lib/constants/routes";

/**
 * Only same-origin relative paths survive: a single leading "/", no "//" or
 * "/\", no scheme, no backslashes or control characters (browsers strip tabs
 * and newlines, so "/\t/evil.com" would otherwise become "//evil.com").
 */
export function safeRedirect(raw: string | null | undefined, fallback: string = ROUTES.account): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) return fallback;
  return raw;
}
