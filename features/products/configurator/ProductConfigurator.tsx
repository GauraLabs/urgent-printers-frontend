"use client";

import { useState, useId, forwardRef, useEffect } from "react";
import { ShoppingBag, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";
import { PricingTable } from "./PricingTable";
import { SelectableCard } from "@/components/ui/selectable-card";
import { useCartStore } from "@/features/cart/store";
import { makeCartItemId } from "@/features/cart/cartItemId";
import { formatPrice, formatPricePerUnit, cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants/routes";
import Link from "next/link";
import type { Product, SidesOption, CartItemConfig } from "@/types";

interface ProductConfiguratorProps {
  product: Product;
  artworkFileKey?: string;
  artworkFileName?: string;
  templateData?: Record<string, string>;
  onBlockedByTemplate?: () => void;
  onStateChange?: (state: { isInCart: boolean; totalPrice: number }) => void;
}

function OptionButton({
  label,
  description,
  selected,
  onClick,
  delta,
  isDefault,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  delta?: number;
  isDefault?: boolean;
}) {
  const showDelta = delta !== undefined && Math.abs(delta) >= 0.01;
  return (
    <SelectableCard
      selected={selected}
      onClick={onClick}
      className="flex flex-col items-start px-3 py-2.5 rounded-xl"
    >
      <div className="flex items-center justify-between w-full gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn("text-sm font-medium leading-snug truncate", selected && "text-primary")}>
            {label}
          </span>
          {isDefault && (
            <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide">
              Popular
            </span>
          )}
        </div>
        {showDelta && (
          <span className={cn(
            "shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
            delta! > 0
              ? "bg-brand-orange/10 text-brand-orange"
              : "bg-success/10 text-success"
          )}>
            {delta! > 0 ? "+" : "−"}{formatPrice(Math.abs(delta!))}
          </span>
        )}
      </div>
      {description && (
        <span className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{description}</span>
      )}
    </SelectableCard>
  );
}

function getDefault<T extends { isDefault: boolean }>(options: T[]): T {
  return options.find((o) => o.isDefault) ?? options[0];
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
  function ProductConfigurator({ product, artworkFileKey, artworkFileName, templateData, onBlockedByTemplate, onStateChange }, ref) {
    const { pricingTiers, turnaroundOptions, printSpec } = product;
    const defaultTier = pricingTiers.find((t) => t.isBestValue) ?? pricingTiers[0];

    const [selectedSize, setSelectedSize] = useState(() => getDefault(printSpec.sizes));
    const [selectedPaper, setSelectedPaper] = useState(() => getDefault(printSpec.papers));
    const [selectedFinish, setSelectedFinish] = useState(() => getDefault(printSpec.finishes));
    const [selectedSides, setSelectedSides] = useState<SidesOption>(() => getDefault(printSpec.sides));
    const [selectedQuantity, setSelectedQuantity] = useState(defaultTier.quantity);
    const [selectedTurnaround, setSelectedTurnaround] = useState(turnaroundOptions[0]);

    const addItem    = useCartStore((s) => s.addItem);
    const cartItems  = useCartStore((s) => s.items);

    // Matches the cartItemId formula in the cart store (same function)
    const currentCartItemId = makeCartItemId(
      product.id,
      selectedSize?.id ?? "", selectedPaper?.id ?? "",
      selectedFinish?.id ?? "", selectedSides?.label ?? "",
      selectedTurnaround?.id ?? "",
      artworkFileKey, templateData
    );
    const isInCart = cartItems.some((i) => i.cartItemId === currentCartItemId);

    // Price = tier base × spec multipliers; turnaround extraCost is flat INR added once
    const baseTier =
      pricingTiers.find((t) => t.quantity === selectedQuantity) ?? pricingTiers[0];
    const sizeM   = selectedSize?.priceMultiplier ?? 1;
    const paperM  = selectedPaper?.priceMultiplier ?? 1;
    const finishM = selectedFinish?.priceMultiplier ?? 1;
    const sidesM  = selectedSides?.priceMultiplier ?? 1;
    const pricePerUnit = parseFloat((baseTier.pricePerUnit * sizeM * paperM * finishM * sidesM).toFixed(2));
    const totalPrice = parseFloat((pricePerUnit * selectedQuantity + selectedTurnaround.extraCost).toFixed(2));

    // Notify parent (ProductDetailClient) so StickyAddToCart stays in sync
    useEffect(() => {
      onStateChange?.({ isInCart, totalPrice });
    }, [isInCart, totalPrice, onStateChange]);

    // Delta helpers — show cost impact vs cheapest option in each category
    const minSizeM   = Math.min(...printSpec.sizes.map((s) => s.priceMultiplier));
    const minPaperM  = Math.min(...printSpec.papers.map((p) => p.priceMultiplier));
    const minFinishM = Math.min(...printSpec.finishes.map((f) => f.priceMultiplier));
    const minSidesM  = Math.min(...printSpec.sides.map((s) => s.priceMultiplier));
    // "base without this category" = what the per-unit price would be using the cheapest option there
    const baseWithoutSize   = baseTier.pricePerUnit * paperM  * finishM * sidesM;
    const baseWithoutPaper  = baseTier.pricePerUnit * sizeM   * finishM * sidesM;
    const baseWithoutFinish = baseTier.pricePerUnit * sizeM   * paperM  * sidesM;
    const baseWithoutSides  = baseTier.pricePerUnit * sizeM   * paperM  * finishM;
    const sizeDelta   = (m: number) => parseFloat((baseWithoutSize   * (m - minSizeM)).toFixed(2));
    const paperDelta  = (m: number) => parseFloat((baseWithoutPaper  * (m - minPaperM)).toFixed(2));
    const finishDelta = (m: number) => parseFloat((baseWithoutFinish * (m - minFinishM)).toFixed(2));
    const sidesDelta  = (m: number) => parseFloat((baseWithoutSides  * (m - minSidesM)).toFixed(2));

    function handleAddToCart() {
      // Validate required template fields before allowing add to cart
      const needsTemplate =
        product.customizationMode === "template" || product.customizationMode === "both";
      if (needsTemplate && product.templateFields.length > 0) {
        const missing = product.templateFields.filter(
          (f) => f.required && !templateData?.[f.id]?.trim()
        );
        if (missing.length > 0) {
          toast.error("Please fill in your print details", {
            description: missing.map((f) => f.label).join(", "),
          });
          onBlockedByTemplate?.();
          return;
        }
      }

      const config: CartItemConfig = {
        sizeId: selectedSize.id,
        sizeLabel: selectedSize.label,
        paperId: selectedPaper.id,
        paperLabel: selectedPaper.label,
        finishId: selectedFinish.id,
        finishLabel: selectedFinish.label,
        sides: selectedSides?.label ?? "",
        quantity: selectedQuantity,
        turnaroundId: selectedTurnaround.id,
        turnaroundLabel: selectedTurnaround.label,
        artworkFileKey,
        artworkFileName,
        templateData,
      };

      addItem(
        { id: product.id, slug: product.slug, name: product.name, images: product.images, categoryName: product.categoryName, categorySlug: product.categorySlug },
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
        <div className="rounded-2xl border border-border bg-secondary/30 p-4 shadow-sm">
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
                delta={sizeDelta(size.priceMultiplier)}
                isDefault={size.isDefault}
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
                delta={paperDelta(paper.priceMultiplier)}
                isDefault={paper.isDefault}
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
                delta={finishDelta(finish.priceMultiplier)}
                isDefault={finish.isDefault}
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
                  key={side.label}
                  label={side.label}
                  selected={selectedSides?.label === side.label}
                  onClick={() => setSelectedSides(side)}
                  delta={sidesDelta(side.priceMultiplier)}
                  isDefault={side.isDefault}
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
              const costLabel = opt.extraCost > 0
                ? `+${formatPrice(opt.extraCost)}`
                : "Included";
              return (
                <SelectableCard
                  key={opt.id}
                  selected={selectedTurnaround.id === opt.id}
                  onClick={() => setSelectedTurnaround(opt)}
                  className="flex items-center justify-between px-4 py-3 rounded-xl"
                >
                  <div>
                    <p className={cn("text-sm font-medium", selectedTurnaround.id === opt.id && "text-primary")}>
                      {opt.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{opt.businessDays} business days</p>
                  </div>
                  <span className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full",
                    opt.extraCost === 0
                      ? "bg-success/10 text-success"
                      : "bg-brand-orange/10 text-brand-orange"
                  )}>
                    {costLabel}
                  </span>
                </SelectableCard>
              );
            })}
          </div>
        </div>

        {/* Add to Cart / Update Cart button */}
        <div className="flex flex-col gap-2">
          <button
            ref={ref}
            onClick={handleAddToCart}
            className={cn(
              "w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2",
              "transition-all active:scale-[0.98] shadow-md",
              isInCart
                ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
                : "bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground shadow-brand-orange/20"
            )}
          >
            {isInCart ? <CheckCircle2 size={18} /> : <ShoppingBag size={18} />}
            {isInCart ? "Update Cart" : "Add to Cart"} · {formatPrice(totalPrice)}
          </button>

          {isInCart && (
            <Link
              href={ROUTES.cart}
              className="w-full h-10 rounded-xl text-sm font-medium flex items-center justify-center gap-2 border border-border hover:bg-muted transition-colors text-foreground"
            >
              View Cart
            </Link>
          )}
        </div>
      </div>
    );
  }
);
