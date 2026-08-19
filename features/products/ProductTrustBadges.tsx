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
    <div
      aria-label="Why buy from Urgent Printers"
      className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-2 py-4 border-y border-border"
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
  );
}
