"use client";

import { useState, useId, forwardRef } from "react";
import { ShoppingBag, ChevronDown, Info } from "lucide-react";
import { toast } from "sonner";
import { PricingTable } from "./PricingTable";
import { useCartStore } from "@/features/cart/store";
import { formatPrice, formatPricePerUnit, cn } from "@/lib/utils";
import type { Product, SidesOption, CartItemConfig } from "@/types";

interface ProductConfiguratorProps {
  product: Product;
}

function OptionButton({
  label,
  description,
  selected,
  onClick,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start px-3 py-2.5 rounded-xl border text-left transition-all",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border hover:border-primary/40 hover:bg-muted/50"
      )}
    >
      <span className={cn("text-sm font-medium", selected && "text-primary")}>{label}</span>
      {description && (
        <span className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{description}</span>
      )}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
      {children}
    </p>
  );
}

// Exposed via ref so StickyAddToCart can observe the button
export const ProductConfigurator = forwardRef<HTMLButtonElement, ProductConfiguratorProps>(
  function ProductConfigurator({ product }, ref) {
    const { pricingTiers, turnaroundOptions, printSpec } = product;
    const defaultTier = pricingTiers[2] ?? pricingTiers[0];

    const [selectedSize, setSelectedSize] = useState(printSpec.sizes[0]);
    const [selectedPaper, setSelectedPaper] = useState(printSpec.papers[0]);
    const [selectedFinish, setSelectedFinish] = useState(printSpec.finishes[0]);
    const [selectedSides, setSelectedSides] = useState<SidesOption>(printSpec.sides[0]);
    const [selectedQuantity, setSelectedQuantity] = useState(defaultTier.quantity);
    const [selectedTurnaround, setSelectedTurnaround] = useState(turnaroundOptions[0]);

    const addItem = useCartStore((s) => s.addItem);

    // Computed pricing
    const baseTier =
      pricingTiers.find((t) => t.quantity === selectedQuantity) ?? pricingTiers[0];
    const pricePerUnit = parseFloat(
      (baseTier.pricePerUnit * selectedTurnaround.priceMultiplier).toFixed(2)
    );
    const totalPrice = parseFloat((pricePerUnit * selectedQuantity).toFixed(2));

    function handleAddToCart() {
      const config: CartItemConfig = {
        sizeId: selectedSize.id,
        sizeLabel: selectedSize.label,
        paperId: selectedPaper.id,
        paperLabel: selectedPaper.label,
        finishId: selectedFinish.id,
        finishLabel: selectedFinish.label,
        sides: selectedSides,
        quantity: selectedQuantity,
        turnaroundId: selectedTurnaround.id,
        turnaroundLabel: selectedTurnaround.label,
      };

      addItem(
        { id: product.id, slug: product.slug, name: product.name, images: product.images, categoryName: product.categoryName },
        config,
        pricePerUnit
      );

      toast.success(`${product.name} added to cart`, {
        description: `${selectedQuantity.toLocaleString("en-IN")} units · ${formatPrice(totalPrice)}`,
      });
    }

    return (
      <div className="flex flex-col gap-6">
        {/* Live price display */}
        <div className="rounded-2xl border border-border bg-secondary/30 p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Price per unit</p>
              <p className="font-heading font-bold text-3xl">{formatPricePerUnit(pricePerUnit)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">
                Total for {selectedQuantity.toLocaleString("en-IN")} units
              </p>
              <p className="font-heading font-bold text-xl text-primary">{formatPrice(totalPrice)}</p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
            <Info size={11} />
            GST and shipping calculated at checkout
          </p>
        </div>

        {/* Size */}
        <div>
          <SectionLabel>Size</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {printSpec.sizes.map((size) => (
              <OptionButton
                key={size.id}
                label={size.label}
                selected={selectedSize.id === size.id}
                onClick={() => setSelectedSize(size)}
              />
            ))}
          </div>
        </div>

        {/* Paper */}
        <div>
          <SectionLabel>Paper / Material</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {printSpec.papers.map((paper) => (
              <OptionButton
                key={paper.id}
                label={paper.label}
                description={paper.description}
                selected={selectedPaper.id === paper.id}
                onClick={() => setSelectedPaper(paper)}
              />
            ))}
          </div>
        </div>

        {/* Finish */}
        <div>
          <SectionLabel>Finish</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            {printSpec.finishes.map((finish) => (
              <OptionButton
                key={finish.id}
                label={finish.label}
                description={finish.description}
                selected={selectedFinish.id === finish.id}
                onClick={() => setSelectedFinish(finish)}
              />
            ))}
          </div>
        </div>

        {/* Sides */}
        {printSpec.sides.length > 1 && (
          <div>
            <SectionLabel>Printing Sides</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              {printSpec.sides.map((side) => (
                <OptionButton
                  key={side}
                  label={side === "single" ? "Single-sided" : "Double-sided"}
                  selected={selectedSides === side}
                  onClick={() => setSelectedSides(side)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Quantity — pricing table */}
        <div>
          <SectionLabel>Quantity</SectionLabel>
          <PricingTable
            tiers={pricingTiers}
            selectedQuantity={selectedQuantity}
            onSelectQuantity={setSelectedQuantity}
          />
        </div>

        {/* Turnaround */}
        <div>
          <SectionLabel>Turnaround Time</SectionLabel>
          <div className="flex flex-col gap-2">
            {turnaroundOptions.map((opt) => {
              const extraCost = opt.priceMultiplier > 1
                ? `+${Math.round((opt.priceMultiplier - 1) * 100)}%`
                : "Included";
              return (
                <button
                  key={opt.id}
                  onClick={() => setSelectedTurnaround(opt)}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all",
                    selectedTurnaround.id === opt.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/40 hover:bg-muted/50"
                  )}
                >
                  <div>
                    <p className={cn("text-sm font-medium", selectedTurnaround.id === opt.id && "text-primary")}>
                      {opt.label}
                    </p>
                  </div>
                  <span className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full",
                    opt.priceMultiplier === 1
                      ? "bg-success/10 text-success"
                      : "bg-brand-orange/10 text-brand-orange"
                  )}>
                    {extraCost}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Add to Cart button */}
        <button
          ref={ref}
          onClick={handleAddToCart}
          className={cn(
            "w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2",
            "bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground",
            "transition-all active:scale-[0.98] shadow-md shadow-brand-orange/20"
          )}
        >
          <ShoppingBag size={18} />
          Add to Cart · {formatPrice(totalPrice)}
        </button>
      </div>
    );
  }
);
