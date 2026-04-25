import { Zap, ShieldCheck, Headphones, Leaf, Award, Truck } from "lucide-react";

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
          {BADGES.map((badge) => {
            const Icon = badge.icon;
            return (
              <div key={badge.title} className="flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon size={20} className="text-primary" />
                </div>
                <div>
                  <p className="font-heading font-semibold text-xs leading-snug">{badge.title}</p>
                  <p className="text-muted-foreground text-[11px] mt-0.5 leading-snug">{badge.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
