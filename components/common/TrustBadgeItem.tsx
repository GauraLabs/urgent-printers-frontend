import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrustBadgeItemProps {
  icon: LucideIcon;
  title: string;
  description: string;
  // Smaller icon circle + type scale for tight spaces like the PDP buy box,
  // vs. the full size used in the homepage's 6-up grid.
  compact?: boolean;
}

export function TrustBadgeItem({ icon: Icon, title, description, compact = false }: TrustBadgeItemProps) {
  return (
    <div className={cn("flex flex-col items-center text-center gap-2", compact && "gap-1.5")}>
      <div
        className={cn(
          "rounded-xl bg-primary/10 flex items-center justify-center shrink-0",
          compact ? "w-8 h-8" : "w-10 h-10"
        )}
      >
        <Icon size={compact ? 16 : 20} className="text-primary" />
      </div>
      <div>
        <p className={cn("font-heading font-semibold leading-snug", compact ? "text-[11px]" : "text-xs")}>
          {title}
        </p>
        <p
          className={cn(
            "text-muted-foreground leading-snug",
            compact ? "text-[10px] mt-0.5" : "text-[11px] mt-0.5"
          )}
        >
          {description}
        </p>
      </div>
    </div>
  );
}
