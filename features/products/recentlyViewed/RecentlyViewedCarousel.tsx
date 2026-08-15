"use client";

import Image from "next/image";
import Link from "next/link";
import { useMounted } from "@/hooks/useMounted";
import { ROUTES } from "@/lib/constants/routes";
import { formatPricePerUnit, cn } from "@/lib/utils";
import { useRecentlyViewedStore } from "./store";

interface RecentlyViewedCarouselProps {
  /** Excluded from its own list — a product doesn't show up in its own "recently viewed". */
  currentProductId: string;
}

export function RecentlyViewedCarousel({ currentProductId }: RecentlyViewedCarouselProps) {
  const mounted = useMounted();
  const items = useRecentlyViewedStore((s) => s.items);

  // Guard against the SSR/first-paint mismatch (empty store on the server) and
  // against a bare "Recently Viewed" heading with nothing under it on a
  // customer's very first product view of the session.
  if (!mounted) return null;
  const otherItems = items.filter((i) => i.productId !== currentProductId);
  if (otherItems.length === 0) return null;

  return (
    <section aria-labelledby="recently-viewed-heading" className="mt-16 pt-10 border-t border-border">
      <h2 id="recently-viewed-heading" className="font-heading font-bold text-xl mb-6">
        Recently Viewed
      </h2>
      <div className="flex sm:grid sm:grid-cols-2 md:grid-cols-4 gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 pb-2">
        {otherItems.map((item) => (
          <Link
            key={item.productId}
            href={ROUTES.product(item.categorySlug, item.productSlug)}
            className={cn(
              "group w-[45%] sm:w-auto shrink-0 snap-start flex flex-col rounded-2xl overflow-hidden",
              "border border-border bg-card hover:border-primary/30 transition-colors duration-300"
            )}
          >
            <div className="relative aspect-square overflow-hidden bg-muted">
              <Image
                src={item.productImage}
                alt={item.productName}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 639px) 45vw, (max-width: 767px) 50vw, 25vw"
              />
            </div>
            <div className="p-3 flex flex-col gap-1">
              <h3 className="font-heading font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {item.productName}
              </h3>
              <p className="text-xs text-muted-foreground">
                From <span className="font-semibold text-foreground">{formatPricePerUnit(item.pricePerUnit)}</span>
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
