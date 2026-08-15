import { Zap, ShieldCheck, Headphones, Leaf, Award, Truck } from "lucide-react";
import { TrustBadgeItem } from "@/components/common/TrustBadgeItem";

const BADGES = [
  { icon: Zap, title: "Next-Day Delivery", description: "Order by 2 PM for overnight dispatch" },
  { icon: ShieldCheck, title: "Quality Guarantee", description: "Not happy? We reprint or refund" },
  { icon: Award, title: "Premium Materials", description: "Industry-leading paper and ink stocks" },
  { icon: Truck, title: "Free Delivery Over ₹999", description: "Pan-India delivery, no code needed" },
  { icon: Headphones, title: "Expert Support", description: "Real humans available Mon–Sat 9–6 IST" },
  { icon: Leaf, title: "Eco-Friendly Options", description: "Recycled stocks and soy-based inks" },
];

export function TrustBadges() {
  return (
    <section aria-label="Why choose Urgent Printers" className="py-10 border-y border-border bg-secondary/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 lg:gap-4">
          {BADGES.map((badge) => (
            <TrustBadgeItem
              key={badge.title}
              icon={badge.icon}
              title={badge.title}
              description={badge.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
