import { Skeleton } from "@/components/ui/skeleton";

export default function CartLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Skeleton className="h-8 w-36 mb-8 rounded" />
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-5 rounded-2xl border border-border">
              <Skeleton className="w-20 h-20 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2 rounded" />
                <Skeleton className="h-3 w-2/3 rounded" />
                <Skeleton className="h-3 w-1/3 rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="lg:w-80 shrink-0">
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
