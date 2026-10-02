"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { SafeImage } from "@/components/common/SafeImage";
import { useMounted } from "@/hooks/useMounted";
import { getProductBySlug } from "@/lib/api";
import { ROUTES } from "@/lib/constants/routes";
import { formatPricePerUnit, cn, getDisplayPricePerUnit } from "@/lib/utils";
import type { Product } from "@/types";
import { useRecentlyViewedStore } from "./store";

interface RecentlyViewedCarouselProps {
  /** Excluded from its own list — a product doesn't show up in its own "recently viewed". */
  currentProductId: string;
}

// Module scope so identity is stable across renders — recreating it per
// render would remount the link (and drop hover/animation state) every time.
const MotionLink = motion.create(Link);

export function RecentlyViewedCarousel({ currentProductId }: RecentlyViewedCarouselProps) {
  const mounted = useMounted();
  const items = useRecentlyViewedStore((s) => s.items);
  const pruneMissing = useRecentlyViewedStore((s) => s.pruneMissing);

  const otherItems = items.filter((i) => i.productId !== currentProductId);
  // Stable key for the effect below — re-fetch only when membership/order of
  // recently-viewed IDs actually changes, not on every store re-render.
  const otherIdsKey = otherItems.map((i) => i.productId).join(",");

  // Product data is never snapshotted into the store — only IDs/slugs are
  // persisted, and the current name/image/price are always looked up live
  // here so a renamed/re-priced/deleted product is reflected immediately.
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;

    void (async () => {
      // Resolves to [] immediately when otherItems is empty (e.g. the list was
      // just cleared), which still clears out any stale `products` from a
      // previous render via the setProducts call below.
      const results = await Promise.all(
        otherItems.map(async (item) => ({
          item,
          product: await getProductBySlug(item.productSlug),
        }))
      );
      if (cancelled) return;

      // A null result means the product 404'd (deleted, unpublished, etc.) —
      // drop it from this render and prune it from the persisted list so we
      // stop re-attempting the dead lookup on every future view.
      const missingIds = results.filter((r) => r.product === null).map((r) => r.item.productId);
      if (missingIds.length > 0) pruneMissing(missingIds);

      setProducts(results.map((r) => r.product).filter((p): p is Product => p !== null));
    })();

    return () => {
      cancelled = true;
    };
    // otherIdsKey captures the membership/order this effect should react to;
    // otherItems/pruneMissing are intentionally excluded to avoid refetching
    // on every store reference change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, otherIdsKey]);

  // Guard against the SSR/first-paint mismatch (empty store on the server) and
  // against a bare "Recently Viewed" heading with nothing under it on a
  // customer's very first product view of the session (or while nothing has
  // resolved yet / everything turned out to be deleted).
  if (!mounted) return null;
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="recently-viewed-heading" className="mt-16 pt-10 border-t border-border">
      <h2 id="recently-viewed-heading" className="font-heading font-bold text-xl mb-6">
        Recently Viewed
      </h2>
      <div className="flex sm:grid sm:grid-cols-2 md:grid-cols-4 gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 pb-2">
        {products.map((product) => (
          <MotionLink
            key={product.id}
            href={ROUTES.product(product.categorySlug, product.slug)}
            whileHover={{ y: -4, boxShadow: "0 12px 32px -4px rgba(159,66,43,0.18)" }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className={cn(
              "group w-[45%] sm:w-auto shrink-0 snap-start flex flex-col rounded-2xl overflow-hidden",
              "border border-border bg-card hover:border-primary/30 transition-colors duration-300"
            )}
          >
            <div className="relative aspect-square overflow-hidden bg-muted">
              <SafeImage
                src={product.mediumUrl ?? product.images[0]}
                alt={product.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 639px) 45vw, (max-width: 767px) 50vw, 25vw"
              />
            </div>
            <div className="p-3 flex flex-col gap-1">
              <h3 className="font-heading font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {product.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                From{" "}
                <span className="font-semibold text-foreground">
                  {formatPricePerUnit(getDisplayPricePerUnit(product))}
                </span>
              </p>
            </div>
          </MotionLink>
        ))}
      </div>
    </section>
  );
}
