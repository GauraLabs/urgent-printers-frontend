import Image from "next/image";
import { BadgeCheck } from "lucide-react";
import { StarRating } from "@/components/common/StarRating";
import { getReviewsByProduct } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ReviewsSectionProps {
  productId: string;
  averageRating: number;
  reviewCount: number;
}

export async function ReviewsSection({ productId, averageRating, reviewCount }: ReviewsSectionProps) {
  const reviews = await getReviewsByProduct(productId);

  return (
    <section aria-labelledby="reviews-heading">
      {/* Summary bar */}
      <div className="flex items-center gap-5 mb-8 p-5 rounded-2xl bg-secondary/30 border border-border">
        <div className="text-center shrink-0">
          <p className="font-heading font-bold text-5xl leading-none">{averageRating.toFixed(1)}</p>
          <StarRating rating={averageRating} size="sm" className="justify-center mt-2" />
          <p className="text-xs text-muted-foreground mt-1">{reviewCount} reviews</p>
        </div>
        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = reviews.filter((r) => Math.round(r.rating) === star).length;
            const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-4 text-right text-muted-foreground">{star}</span>
                <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-7 text-muted-foreground">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review list */}
      <h2 id="reviews-heading" className="font-heading font-bold text-lg mb-5">
        Customer Reviews
      </h2>
      <div className="divide-y divide-border">
        {reviews.map((review) => (
          <article key={review.id} className="py-6">
            <div className="flex items-start gap-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0">
                {review.authorAvatarUrl ? (
                  <Image
                    src={review.authorAvatarUrl}
                    alt={review.authorName}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground font-bold text-sm">
                    {review.authorName[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm">{review.authorName}</p>
                  {review.verifiedPurchase && (
                    <span className="flex items-center gap-1 text-[10px] text-success font-medium">
                      <BadgeCheck size={11} /> Verified Purchase
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                <StarRating rating={review.rating} size="sm" className="mt-1" />
                <p className="font-semibold text-sm mt-2">{review.title}</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{review.body}</p>
                {review.helpfulCount > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {review.helpfulCount} people found this helpful
                  </p>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
