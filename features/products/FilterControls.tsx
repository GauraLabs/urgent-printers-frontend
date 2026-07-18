"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useProductFilters } from "./useProductFilters";
import { cn } from "@/lib/utils";
import type { Category, ProductBadgeFilter } from "@/types";

// These tag values are cross-checked against real product tags in
// lib/mock-data/products.ts and the backend's freeform Product.tags — the
// backend has no tag-facet endpoint, so this list is a curated, verified
// subset rather than a full taxonomy. "Bestseller" deliberately isn't here —
// it's a Product.badge value, not a Product.tags entry (see Highlights below).
const AVAILABLE_TAGS = [
  { value: "luxury", label: "Luxury / Premium" },
  { value: "eco", label: "Eco Friendly" },
  { value: "events", label: "Events" },
  { value: "corporate", label: "Corporate" },
];

const BADGE_OPTIONS: { value: ProductBadgeFilter; label: string }[] = [
  { value: "bestseller", label: "Bestseller" },
  { value: "new", label: "New" },
  { value: "sale", label: "On Sale" },
  { value: "popular", label: "Popular" },
];

const CATEGORY_VISIBLE_LIMIT = 6;

interface FilterControlsProps {
  categories: Category[];
  showCategoryFilter?: boolean;
  onClose?: () => void;
  disabled?: boolean;
}

export function FilterControls({ categories, showCategoryFilter = true, onClose, disabled }: FilterControlsProps) {
  const { current, setCategory, setPriceRange, toggleTag, setBadge, clearAll, activeCount } = useProductFilters();
  const [localMin, setLocalMin] = useState(current.minPrice);
  const [localMax, setLocalMax] = useState(current.maxPrice);
  const [showAllCategories, setShowAllCategories] = useState(false);

  function applyPrice() {
    setPriceRange(localMin, localMax);
  }

  if (disabled) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4">
        <p className="text-sm font-medium mb-1">Filters unavailable</p>
        <p className="text-xs text-muted-foreground">
          Category, price, and tag filters aren&rsquo;t available while searching. Clear your search to use them.
        </p>
      </div>
    );
  }

  const visibleCategories = showAllCategories ? categories : categories.slice(0, CATEGORY_VISIBLE_LIMIT);
  const hasMoreCategories = categories.length > CATEGORY_VISIBLE_LIMIT;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="font-heading font-semibold text-sm">Filters</p>
        {activeCount > 0 && (
          <button
            onClick={() => { clearAll(); onClose?.(); }}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <X size={11} /> Clear all ({activeCount})
          </button>
        )}
      </div>

      {/* Category */}
      {showCategoryFilter && (
        <>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Category
            </p>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="category"
                  checked={!current.category}
                  onChange={() => setCategory("")}
                  className="accent-primary w-3.5 h-3.5"
                />
                <span className="text-sm">All Products</span>
              </label>
              {visibleCategories.map((cat) => (
                <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="category"
                    checked={current.category === cat.slug}
                    onChange={() => { setCategory(cat.slug); onClose?.(); }}
                    className="accent-primary w-3.5 h-3.5"
                  />
                  <span className="text-sm">{cat.name}</span>
                </label>
              ))}
              {hasMoreCategories && (
                <button
                  type="button"
                  onClick={() => setShowAllCategories((v) => !v)}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline mt-1 w-fit"
                >
                  {showAllCategories ? (
                    <>Show less <ChevronUp size={12} /></>
                  ) : (
                    <>Show all {categories.length} categories <ChevronDown size={12} /></>
                  )}
                </button>
              )}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Price range */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Price per Unit (₹)
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={localMin}
            onChange={(e) => setLocalMin(e.target.value)}
            onBlur={applyPrice}
            onKeyDown={(e) => e.key === "Enter" && applyPrice()}
            min={0}
            className={cn(
              "w-full h-8 rounded-md border border-border bg-background px-3 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            )}
          />
          <span className="text-muted-foreground text-xs shrink-0">to</span>
          <input
            type="number"
            placeholder="Max"
            value={localMax}
            onChange={(e) => setLocalMax(e.target.value)}
            onBlur={applyPrice}
            onKeyDown={(e) => e.key === "Enter" && applyPrice()}
            min={0}
            className={cn(
              "w-full h-8 rounded-md border border-border bg-background px-3 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            )}
          />
        </div>
      </div>

      <Separator />

      {/* Highlights (Product.badge — distinct from freeform tags) */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Highlights
        </p>
        <div className="flex flex-col gap-2">
          {BADGE_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={current.badge === opt.value}
                onChange={() => setBadge(opt.value)}
                className="accent-primary w-3.5 h-3.5 rounded"
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {/* Tags */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Tags
        </p>
        <div className="flex flex-col gap-2">
          {AVAILABLE_TAGS.map((tag) => (
            <label key={tag.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={current.tags.includes(tag.value)}
                onChange={() => toggleTag(tag.value)}
                className="accent-primary w-3.5 h-3.5 rounded"
              />
              <span className="text-sm">{tag.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
