"use client";

import { X } from "lucide-react";
import { useProductFilters } from "./useProductFilters";
import { cn } from "@/lib/utils";

interface ActiveFiltersProps {
  categoryName?: string;
}

export function ActiveFilters({ categoryName }: ActiveFiltersProps) {
  const { current, setSort, setCategory, setPriceRange, toggleTag, activeCount } = useProductFilters();

  if (activeCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Active:</span>

      {current.sort !== "popular" && (
        <FilterBadge label={`Sort: ${current.sort.replace("-", " ")}`} onRemove={() => setSort("popular")} />
      )}

      {current.category && (
        <FilterBadge label={categoryName || current.category} onRemove={() => setCategory("")} />
      )}

      {(current.minPrice || current.maxPrice) && (
        <FilterBadge
          label={`₹${current.minPrice || "0"} – ₹${current.maxPrice || "∞"}`}
          onRemove={() => setPriceRange("", "")}
        />
      )}

      {current.tags.map((tag) => (
        <FilterBadge key={tag} label={tag} onRemove={() => toggleTag(tag)} />
      ))}
    </div>
  );
}

function FilterBadge({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
      "bg-primary/10 text-primary border border-primary/20"
    )}>
      {label}
      <button onClick={onRemove} aria-label={`Remove ${label} filter`} className="hover:text-primary/60 transition-colors ml-0.5">
        <X size={10} />
      </button>
    </span>
  );
}
