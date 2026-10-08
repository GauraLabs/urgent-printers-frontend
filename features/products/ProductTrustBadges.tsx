import { Zap, ShieldCheck, Lock, Truck } from "lucide-react";
import { TrustBadgeItem } from "@/components/common/TrustBadgeItem";

// ₹999 free-delivery threshold matches the homepage hero badge
// (lib/mock-data/homepage.ts) — kept in sync so the claim doesn't diverge
// between pages.
const PRODUCT_TRUST_BADGES = [
  { icon: Zap, title: "Fast Turnaround", description: "Pick your delivery speed below" },
  { icon: ShieldCheck, title: "Quality Guarantee", description: "Not happy? We reprint or refund" },
  { icon: Lock, title: "Secure Payment", description: "Razorpay-protected checkout" },
  { icon: Truck, title: "Free Delivery Over ₹999", description: "Pan-India delivery, no code needed" },
];

export function ProductTrustBadges() {
  return (
    <>
    {/* Mobile: one compact scrollable strip (icon + title); the grid below is md+ only. */}
    <ul
      aria-label="Why buy from Urgent Printers"
      className="md:hidden flex gap-4 overflow-x-auto scrollbar-hide py-2.5 border-y border-border"
    >
      {PRODUCT_TRUST_BADGES.map((badge) => (
        <li key={badge.title} className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium">
          <badge.icon size={14} className="text-primary" aria-hidden="true" />
          {badge.title}
        </li>
      ))}
    </ul>
    <div
      aria-label="Why buy from Urgent Printers"
      className="max-md:hidden grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-2 py-4 border-y border-border"
    >
      {PRODUCT_TRUST_BADGES.map((badge) => (
        <TrustBadgeItem
          key={badge.title}
          icon={badge.icon}
          title={badge.title}
          description={badge.description}
          compact
        />
      ))}
    </div>
    </>
  );
}
