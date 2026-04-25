import { Skeleton } from "@/components/ui/skeleton";
import { ProductGridSkeleton } from "@/components/common/ProductCardSkeleton";

export default function ProductsLoading() {
  return (
    <section>
      <div className="border-b border-border bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Skeleton className="h-3 w-32 mb-4 rounded" />
          <Skeleton className="h-8 w-48 mb-2 rounded" />
          <Skeleton className="h-3 w-72 rounded" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-8 w-32 rounded" />
        </div>
        <div className="flex gap-8">
          <div className="hidden lg:block w-56 shrink-0 space-y-4">
            <Skeleton className="h-4 w-20 rounded" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-3.5 w-full rounded" />
            ))}
          </div>
          <div className="flex-1">
            <ProductGridSkeleton count={9} />
          </div>
        </div>
      </div>
    </section>
  );
}
