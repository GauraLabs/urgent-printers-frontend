"use client";

import { useEffect, useState } from "react";
import { getProductBySlug } from "@/lib/api";
import type { OrderItem } from "@/types";

/**
 * Order items snapshot only `productSlug` / `categoryName` (sometimes blank)
 * at time of purchase — never a category slug — and a product's category can
 * also change after the order was placed. Building `/products/[categorySlug]/...`
 * links from that snapshot 404s. Resolve the *current* category slug per item
 * by looking up the live product; a `null` entry means the product no longer
 * exists (or the lookup failed) — callers should render a non-link fallback.
 */
export function useOrderItemCategorySlugs(
  items: OrderItem[] | undefined
): Record<string, string | null> {
  const [categorySlugs, setCategorySlugs] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!items || items.length === 0) return;

    let cancelled = false;
    const uniqueSlugs = Array.from(new Set(items.map((item) => item.productSlug)));

    Promise.all(
      uniqueSlugs.map(async (slug) => {
        const product = await getProductBySlug(slug);
        return [slug, product?.categorySlug ?? null] as const;
      })
    ).then((entries) => {
      if (!cancelled) setCategorySlugs(Object.fromEntries(entries));
    });

    return () => {
      cancelled = true;
    };
  }, [items]);

  return categorySlugs;
}
