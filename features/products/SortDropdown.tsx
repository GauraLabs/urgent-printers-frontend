"use client";

import { ArrowUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { useProductFilters, type SortOption } from "./useProductFilters";
import { cn } from "@/lib/utils";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "popular", label: "Most Popular" },
  { value: "rating", label: "Highest Rated" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
];

interface SortDropdownProps {
  disabled?: boolean;
}

export function SortDropdown({ disabled }: SortDropdownProps) {
  const { current, setSort } = useProductFilters();
  const activeLabel = disabled ? "Relevance" : SORT_OPTIONS.find((o) => o.value === current.sort)?.label ?? "Most Popular";

  if (disabled) {
    return (
      <span
        title="Sorting isn't available for search results"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "gap-2 text-sm font-medium opacity-50 pointer-events-none"
        )}
      >
        <ArrowUpDown size={14} />
        {activeLabel}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "gap-2 text-sm font-medium"
        )}
      >
        <ArrowUpDown size={14} />
        {activeLabel}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {SORT_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => setSort(opt.value)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span className="text-sm">{opt.label}</span>
            {current.sort === opt.value && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
