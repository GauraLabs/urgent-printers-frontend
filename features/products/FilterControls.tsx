"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useProductFilters } from "./useProductFilters";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

const AVAILABLE_TAGS = [
  { value: "bestseller", label: "Bestseller" },
  { value: "luxury", label: "Luxury / Premium" },
  { value: "eco", label: "Eco Friendly" },
  { value: "event", label: "Events" },
  { value: "corporate", label: "Corporate" },
];

interface FilterControlsProps {
  categories: Category[];
  showCategoryFilter?: boolean;
  onClose?: () => void;
}

export function FilterControls({ categories, showCategoryFilter = true, onClose }: FilterControlsProps) {
  const { current, setCategory, setPriceRange, toggleTag, clearAll, activeCount } = useProductFilters();
  const [localMin, setLocalMin] = useState(current.minPrice);
  const [localMax, setLocalMax] = useState(current.maxPrice);

  function applyPrice() {
    setPriceRange(localMin, localMax);
  }

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
              {categories.map((cat) => (
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

      {/* Tags */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Product Type
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
