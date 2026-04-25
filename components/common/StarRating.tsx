import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  max?: number;
  reviewCount?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  showCount?: boolean;
}

const SIZE_MAP = { sm: 12, md: 14, lg: 18 } as const;

export function StarRating({
  rating,
  max = 5,
  reviewCount,
  size = "md",
  className,
  showCount = false,
}: StarRatingProps) {
  const px = SIZE_MAP[size];

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center gap-0.5" aria-label={`${rating} out of ${max} stars`}>
        {Array.from({ length: max }).map((_, i) => {
          const filled = i < Math.floor(rating);
          const partial = !filled && i < rating;
          return (
            <span key={i} className="relative inline-flex">
              <Star size={px} className="text-border fill-border" />
              {(filled || partial) && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: filled ? "100%" : `${(rating % 1) * 100}%` }}
                >
                  <Star size={px} className="text-yellow-400 fill-yellow-400" />
                </span>
              )}
            </span>
          );
        })}
      </div>
      {showCount && reviewCount !== undefined && (
        <span className="text-muted-foreground text-xs">
          ({reviewCount.toLocaleString()})
        </span>
      )}
    </div>
  );
}
