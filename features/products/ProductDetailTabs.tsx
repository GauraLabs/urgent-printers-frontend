"use client";

import type { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface ProductDetailTabsProps {
  description: ReactNode;
  reviews: ReactNode;
  reviewCount: number;
}

// Both panels use `keepMounted` so they stay in the DOM (hidden via the
// native `hidden` attribute) regardless of which tab is active — required
// so the SSR'd description HTML and the Reviews Suspense boundary are both
// crawlable/streamable no matter which tab a visitor lands on. Without it,
// Base UI's TabsPanel unmounts the inactive panel entirely, which would
// also stop the Reviews Suspense boundary from ever resolving in the
// background while the Description tab is active.
export function ProductDetailTabs({ description, reviews, reviewCount }: ProductDetailTabsProps) {
  return (
    <Tabs defaultValue="description" className="mt-14 pt-10 border-t border-border">
      <TabsList variant="line" className="h-11 w-full sm:w-fit">
        <TabsTrigger value="description" className="flex-1 sm:flex-none text-sm font-semibold px-4">
          Description
        </TabsTrigger>
        <TabsTrigger value="reviews" className="flex-1 sm:flex-none text-sm font-semibold px-4">
          Reviews{reviewCount > 0 && ` (${reviewCount})`}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="description" keepMounted className="pt-8">
        {description}
      </TabsContent>
      <TabsContent value="reviews" keepMounted className="pt-8">
        {reviews}
      </TabsContent>
    </Tabs>
  );
}
