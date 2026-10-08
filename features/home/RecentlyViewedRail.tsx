"use client";

import { useEffect, useState } from "react";
import { ProductRailSection } from "./ProductRailSection";
import { useMounted } from "@/hooks/useMounted";
import { lookupProductBySlug } from "@/lib/api";
import { ROUTES } from "@/lib/constants/routes";
import { useRecentlyViewedStore } from "@/features/products/recentlyViewed/store";
import type { Product } from "@/types";

export const MIN_RECENTLY_VIEWED = 2;

export function RecentlyViewedRail() {
  const mounted = useMounted();
  const items = useRecentlyViewedStore((s) => s.items);
  const pruneMissing = useRecentlyViewedStore((s) => s.pruneMissing);
  const [products, setProducts] = useState<Product[] | null>(null);
  const idsKey = items.map((i) => i.productId).join(",");

  // Only ids/slugs are persisted; name, image and price are always looked up live.
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    void (async () => {
      const results = await Promise.all(
        items.map(async (item) => ({ item, lookup: await lookupProductBySlug(item.productSlug) }))
      );
      if (cancelled) return;
      // Prune only products that are really gone; a failed request must not erase history.
      const gone = results.filter((r) => r.lookup.status === "gone").map((r) => r.item.productId);
      if (gone.length > 0) pruneMissing(gone);
      setProducts(results.flatMap((r) => (r.lookup.status === "ok" ? [r.lookup.product] : [])));
    })();
    return () => {
      cancelled = true;
    };
    // idsKey tracks membership/order; items/pruneMissing identity changes must not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, idsKey]);

  if (!mounted || items.length < MIN_RECENTLY_VIEWED) return null;

  // Reserve the rail's height while the live lookups run so the sections below don't jump.
  if (products === null) return <div aria-hidden="true" className="min-h-[28rem]" />;
  if (products.length < MIN_RECENTLY_VIEWED) return null;

  return (
    <ProductRailSection
      id="recently-viewed"
      title="Recently viewed"
      description="Pick up where you left off"
      seeAllHref={ROUTES.products}
      seeAllLabel="Browse all"
      products={products}
    />
  );
}
