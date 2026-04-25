import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetailLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Skeleton className="h-3 w-64 mb-6 rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-16">
        <div className="flex flex-col gap-3">
          <Skeleton className="w-full aspect-[4/3] rounded-2xl" />
          <div className="hidden md:flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="flex-1 aspect-[4/3] rounded-lg" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-8 w-3/4 rounded" />
          <Skeleton className="h-4 w-48 rounded" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24 rounded" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
              </div>
            </div>
          ))}
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
