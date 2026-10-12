import { toast } from "sonner";
import { ROUTES } from "@/lib/constants/routes";
import { getPersonalisationError } from "@/lib/api/personalisationErrors";
import type { CartItem } from "@/types";

export interface PersonalisationNotice {
  message: string;
  href: string | null;
}

// Maps the 422 onto the cart line(s) of its product_id so the customer is told which product to fix.
export function describePersonalisationError(err: unknown, items: CartItem[]): PersonalisationNotice | null {
  const p = getPersonalisationError(err);
  if (!p) return null;
  let lines = p.productId ? items.filter((i) => String(i.product.id) === p.productId) : [];
  if (lines.length === 0 && p.code === "invalid_artwork") lines = items.filter((i) => i.config.artworkFileKey);
  const names = [...new Set(lines.map((l) => l.product.name))];
  const where = names.length > 0 ? ` for ${names.join(", ")}` : "";
  const first = lines[0];
  return {
    message: p.code === "invalid_artwork"
      ? `${p.message}${where ? ` (${names.join(", ")})` : ""}`
      : `Please fix your personalisation details${where}. ${p.message}`,
    href: first ? ROUTES.product(first.product.categorySlug, first.product.slug) : null,
  };
}

// Returns true when `err` was a personalisation 422 and has been surfaced; the caller then skips its generic failure message.
export function showPersonalisationError(err: unknown, items: CartItem[], navigate: (href: string) => void): boolean {
  const notice = describePersonalisationError(err, items);
  if (!notice) return false;
  const href = notice.href;
  toast.error(notice.message, {
    duration: 12000,
    ...(href && { action: { label: "Fix details", onClick: () => navigate(href) } }),
  });
  return true;
}
