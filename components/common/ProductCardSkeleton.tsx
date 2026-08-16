import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ProductCardSkeletonProps {
  className?: string;
}

export function ProductCardSkeleton({ className }: ProductCardSkeletonProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl overflow-hidden border border-border bg-card",
        className
      )}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Skeleton className="absolute inset-0 rounded-none" />
        {/* Wishlist button placeholder */}
        <Skeleton className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full" />
      </div>

      {/* Content — mirrors ProductCard's p-4 flex flex-col gap-1.5 md:gap-2 */}
      <div className="p-4 flex flex-col gap-1.5 md:gap-2 flex-1">
        {/* Category label */}
        <Skeleton className="h-[11px] w-1/3 rounded" />

        {/* Title (2-line clamp, shown at all breakpoints like the real h2) */}
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-full rounded" />
          <Skeleton className="h-3.5 w-2/3 rounded" />
        </div>

        {/* Description — desktop-only, matching ProductCard's `hidden md:block` */}
        <div className="hidden md:block space-y-1.5">
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-4/5 rounded" />
        </div>

        {/* Rating row */}
        <Skeleton className="h-3.5 w-24 rounded mt-0.5" />

        {/* Divider + price/CTA row */}
        <div className="mt-auto pt-3 border-t border-border flex flex-wrap items-end justify-between gap-2">
          <div className="space-y-1">
            <Skeleton className="h-2.5 w-8 rounded" />
            <Skeleton className="h-5 w-16 rounded" />
            <Skeleton className="h-2.5 w-10 rounded" />
          </div>
          <Skeleton className="h-7 w-24 rounded-full shrink-0" />
        </div>
      </div>
    </div>
  );
}

interface ProductGridSkeletonProps {
  count?: number;
  /** Override the responsive grid-column/gap classes to match the calling page's real grid. */
  gridClassName?: string;
}

export function ProductGridSkeleton({ count = 8, gridClassName }: ProductGridSkeletonProps) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5", gridClassName)}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CategoryCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="w-full aspect-square rounded-xl" />
      <Skeleton className="h-4 w-2/3 mx-auto rounded" />
    </div>
  );
}

export function CategoryGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <CategoryCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ReviewSkeleton() {
  return (
    <div className="space-y-3 py-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="space-y-1 flex-1">
          <Skeleton className="h-3 w-1/4 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
        </div>
      </div>
      <Skeleton className="h-4 w-1/2 rounded" />
      <Skeleton className="h-3 w-full rounded" />
      <Skeleton className="h-3 w-4/5 rounded" />
    </div>
  );
}
