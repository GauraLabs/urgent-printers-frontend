import { Skeleton } from "@/components/ui/skeleton";
import { ProductGridSkeleton } from "@/components/common/ProductCardSkeleton";

export default function SearchLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Skeleton className="h-3 w-32 mb-6 rounded" />
      <Skeleton className="h-8 w-64 mb-2 rounded" />
      <Skeleton className="h-3 w-28 mb-8 rounded" />
      <Skeleton className="h-12 w-full max-w-xl rounded-2xl mb-10" />
      <ProductGridSkeleton count={8} />
    </div>
  );
}
