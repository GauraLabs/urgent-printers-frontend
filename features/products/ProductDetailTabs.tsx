"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ProductDetailTabsProps {
  description: ReactNode;
  reviews: ReactNode;
  reviewCount: number;
  /** Specifications body; null when the product has no spec data (the section is then skipped). */
  specs?: ReactNode;
}

type SectionId = "description" | "specs" | "reviews" | "delivery";

function AccordionSection({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: SectionId;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div id={id === "reviews" ? "reviews" : undefined} className="border-b border-border">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`pdp-acc-${id}`}
          onClick={onToggle}
          className="flex min-h-12 w-full items-center justify-between gap-3 py-3 text-left font-heading text-base font-semibold"
        >
          {title}
          <ChevronDown size={18} className={cn("shrink-0 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
      </h2>
      <div id={`pdp-acc-${id}`} hidden={!open} className="pb-4">
        {children}
      </div>
    </div>
  );
}

// Desktop keeps the tabs. Both panels use `keepMounted` so they stay in the DOM
// (hidden via the native `hidden` attribute) regardless of which tab is active,
// so the SSR'd description HTML and the Reviews Suspense boundary stay crawlable
// and streamable. Below md the same content is offered as accordions instead.
export function ProductDetailTabs({ description, reviews, reviewCount, specs }: ProductDetailTabsProps) {
  const [open, setOpen] = useState<Record<SectionId, boolean>>({
    description: true,
    specs: false,
    reviews: false,
    delivery: false,
  });
  const toggle = (id: SectionId) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  // Deep links such as /products/x/y#reviews open (and scroll to) the Reviews section.
  useEffect(() => {
    if (window.location.hash !== "#reviews") return;
    const frame = requestAnimationFrame(() => {
      setOpen((o) => ({ ...o, reviews: true }));
      requestAnimationFrame(() => document.getElementById("reviews")?.scrollIntoView());
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      <Tabs defaultValue="description" className="mt-14 pt-10 border-t border-border max-md:hidden">
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

      <div className="md:hidden mt-6 border-t border-border">
        <AccordionSection id="description" title="Description" open={open.description} onToggle={() => toggle("description")}>
          {description}
        </AccordionSection>
        {specs && (
          <AccordionSection id="specs" title="Specifications" open={open.specs} onToggle={() => toggle("specs")}>
            {specs}
          </AccordionSection>
        )}
        <AccordionSection
          id="reviews"
          title={`Reviews${reviewCount > 0 ? ` (${reviewCount})` : ""}`}
          open={open.reviews}
          onToggle={() => toggle("reviews")}
        >
          {reviews}
        </AccordionSection>
        <AccordionSection id="delivery" title="Delivery & Returns" open={open.delivery} onToggle={() => toggle("delivery")}>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Delivery time is the turnaround you pick plus shipping. Standard shipping is ₹99 and free on orders over
            ₹999. Not happy with your print? We reprint or refund.
          </p>
          <p className="mt-2 flex gap-4 text-sm font-medium">
            <Link href="/policies/shipping" className="text-primary hover:underline">Shipping info</Link>
            <Link href="/policies/returns" className="text-primary hover:underline">Returns policy</Link>
          </p>
        </AccordionSection>
      </div>
    </>
  );
}
