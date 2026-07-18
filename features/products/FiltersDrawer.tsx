"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { buttonVariants } from "@/components/ui/button";
import { FilterControls } from "./FilterControls";
import { useProductFilters } from "./useProductFilters";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

interface FiltersDrawerProps {
  categories: Category[];
  showCategoryFilter?: boolean;
  disabled?: boolean;
}

export function FiltersDrawer({ categories, showCategoryFilter, disabled }: FiltersDrawerProps) {
  const [open, setOpen] = useState(false);
  const { activeCount } = useProductFilters();

  if (disabled) {
    return (
      <span
        title="Filters aren't available for search results"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "gap-2 lg:hidden opacity-50 pointer-events-none"
        )}
      >
        <SlidersHorizontal size={14} />
        Filters
      </span>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "gap-2 lg:hidden relative"
        )}
      >
        <SlidersHorizontal size={14} />
        Filters
        {activeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-orange text-brand-orange-foreground text-[9px] font-bold flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </SheetTrigger>

      <SheetContent side="bottom" className="max-h-[85vh] flex flex-col rounded-t-2xl">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="font-heading text-base">Filter Products</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto py-4 px-1">
          <FilterControls
            categories={categories}
            showCategoryFilter={showCategoryFilter}
            onClose={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
