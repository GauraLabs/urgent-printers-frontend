import { Zap, ShieldCheck, Headphones, Leaf, Award, Truck, Package, ChevronRight } from "lucide-react";

const BADGES = [
  { icon: Zap, title: "Next-Day Delivery" },
  { icon: ShieldCheck, title: "Quality Guarantee" },
  { icon: Award, title: "Premium Materials" },
  { icon: Truck, title: "Free Delivery Over ₹999" },
  { icon: Headphones, title: "Expert Support" },
  { icon: Leaf, title: "Eco-Friendly Options" },
];

interface TrustBadgesProps {
  /** Sum of Category.productCount across the live catalog — omitted (not fabricated) when unavailable. */
  totalProducts?: number;
}

export function TrustBadges({ totalProducts }: TrustBadgesProps) {
  return (
    <section aria-label="Why choose Urgent Printers" className="border-y border-border bg-secondary/50">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-5 lg:gap-8 overflow-x-auto snap-x snap-mandatory scrollbar-hide py-3 pr-9">
          {totalProducts !== undefined && totalProducts > 0 && (
            <div className="flex items-center gap-2 shrink-0 snap-start pr-5 border-r border-border">
              <Package size={16} className="text-primary shrink-0" aria-hidden="true" />
              <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                {totalProducts}+ products available
              </span>
            </div>
          )}
          {BADGES.map((badge) => {
            const Icon = badge.icon;
            return (
              <div key={badge.title} className="flex items-center gap-2 shrink-0 snap-start">
                <Icon size={16} className="text-primary shrink-0" aria-hidden="true" />
                <span className="text-xs font-medium text-foreground whitespace-nowrap">{badge.title}</span>
              </div>
            );
          })}
        </div>
        <div
          className="pointer-events-none absolute right-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 shadow-sm"
          aria-hidden="true"
        >
          <ChevronRight className="size-3.5 text-primary" />
        </div>
      </div>
    </section>
  );
}
