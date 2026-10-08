"use client";

import { useState, forwardRef, useEffect } from "react";
import { ShoppingBag, CheckCircle2, Info } from "lucide-react";
import { motion, AnimatePresence, usePresence, useAnimationControls } from "motion/react";
import { toast } from "sonner";
import { TierRateGuide } from "./TierRateGuide";
import { TierNudge } from "./TierNudge";
import type { Preselection } from "./preselect";
import { PriceDisplay } from "@/components/common/PriceDisplay";
import { QuantityInput } from "@/components/common/QuantityInput";
import { DeliveryCheck } from "../DeliveryCheck";
import { SizeSpecGuide } from "./SizeSpecGuide";
import { ProductTrustBadges } from "../ProductTrustBadges";
import { SelectableCard } from "@/components/ui/selectable-card";
import { isRedundantDescription, isSingleChoice, prettySize } from "./optionText";
import { useCartStore } from "@/features/cart/store";
import { makeCartItemId } from "@/features/cart/cartItemId";
import { formatPrice, formatPricePerUnit, cn } from "@/lib/utils";
import {
  clampQuantity, effectiveBounds, formatQty, nextTierNudge, normalizeUnitLabel, perPieceSuffix,
  priceForQuantity, tierGuideEntries,
} from "@/lib/quantity";
import { ROUTES } from "@/lib/constants/routes";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import Link from "next/link";
import type { Product, SidesOption, TurnaroundOption, CartItemConfig } from "@/types";

interface ProductConfiguratorProps {
  product: Product;
  artworkFileKey?: string;
  artworkFileName?: string;
  templateData?: Record<string, string>;
  onBlockedByTemplate?: () => void;
  /** Landing configuration from feed-link query params (already validated). */
  preselection?: Preselection;
  onStateChange?: (state: { isInCart: boolean; totalPrice: number; savings: number; discountPercent?: number; quantityLabel?: string; quantityEmpty?: boolean }) => void;
}

function OptionButton({
  label,
  description,
  selected,
  onClick,
  delta,
  isDefault,
  showPriceDelta = true,
  perUnitSuffix,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  delta?: number;
  isDefault?: boolean;
  showPriceDelta?: boolean;
  /** "/pc" or " each": option deltas are per unit, so mobile spells that out. */
  perUnitSuffix?: string;
}) {
  const showDescription = !isRedundantDescription(label, description);
  const showDelta = showPriceDelta && delta !== undefined && Math.abs(delta) >= 0.01;
  return (
    <SelectableCard
      selected={selected}
      onClick={onClick}
      className="relative flex flex-col items-start px-3 py-2.5 rounded-xl"
    >
      <div className="flex w-full gap-1.5 max-md:flex-col md:items-center md:justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn("text-sm font-medium leading-snug md:truncate transition-colors duration-200", selected && "text-primary")}>
            {label}
          </span>
          {isDefault && (
            <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide max-md:absolute max-md:top-0 max-md:right-0 max-md:rounded-none max-md:rounded-bl-lg max-md:rounded-tr-xl max-md:text-[8px] max-md:py-0.5">
              Popular
            </span>
          )}
        </div>
        {showDelta && (
          <span className={cn(
            "shrink-0 self-start text-[10px] font-bold px-1.5 py-0.5 rounded-full",
            delta! > 0
              ? "bg-brand-orange/10 text-brand-orange"
              : "bg-success/10 text-success"
          )}>
            {delta! > 0 ? "+" : "−"}{formatPrice(Math.abs(delta!))}
            {perUnitSuffix && <span className="md:hidden">{perUnitSuffix}</span>}
          </span>
        )}
      </div>
      {showDescription && (
        <span className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{description}</span>
      )}
    </SelectableCard>
  );
}

// Crossfades to a new price whenever `value` actually changes (key === value,
// so re-renders with an unchanged price never re-trigger the animation).
// Reduced-motion users get an instant swap instead, matching the
// window.matchMedia gating pattern used in HeroBannerSection/CategoryVideoOverlay.
//
// mode is intentionally the default "overlapping" (not "wait" — that caused a
// blank-frame flicker, fixed in a prior pass) so outgoing and incoming <p>s
// are both mounted during the crossfade. To stop that from doubling the
// block's height, the outgoing one is pulled out of flow (position: absolute)
// via usePresence so only the incoming, in-flow one sizes the container.
function PriceValue({
  value,
  formatted,
  className,
  prefersReducedMotion,
}: {
  value: number;
  formatted: string;
  className: string;
  prefersReducedMotion: boolean;
}) {
  return (
    <div className="relative">
      <AnimatePresence initial={false}>
        <PriceValueFrame
          key={value}
          formatted={formatted}
          className={className}
          prefersReducedMotion={prefersReducedMotion}
        />
      </AnimatePresence>
    </div>
  );
}

function PriceValueFrame({
  formatted,
  className,
  prefersReducedMotion,
}: {
  formatted: string;
  className: string;
  prefersReducedMotion: boolean;
}) {
  const [isPresent, safeToRemove] = usePresence();

  // Reduced-motion has no exit animation, so onAnimationComplete below never
  // fires for it — remove the outgoing node the moment it stops being
  // present instead of waiting on an animation that won't run.
  useEffect(() => {
    if (!isPresent && prefersReducedMotion) safeToRemove?.();
  }, [isPresent, prefersReducedMotion, safeToRemove]);

  return (
    <motion.p
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      onAnimationComplete={() => {
        if (!isPresent && !prefersReducedMotion) safeToRemove?.();
      }}
      style={!isPresent ? { position: "absolute", inset: 0 } : undefined}
      className={className}
    >
      {formatted}
    </motion.p>
  );
}

function getDefault<T extends { isDefault: boolean }>(options: T[]): T | undefined {
  return options.find((o) => o.isDefault) ?? options[0];
}

function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {children}
      </p>
      {action}
    </div>
  );
}

// Exposed via ref so StickyAddToCart can observe the button
export const ProductConfigurator = forwardRef<HTMLButtonElement, ProductConfiguratorProps>(
  function ProductConfigurator({ product, artworkFileKey, artworkFileName, templateData, onBlockedByTemplate, preselection, onStateChange }, ref) {
    const { pricingTiers, turnaroundOptions, printSpec } = product;
    const bounds = effectiveBounds(product);
    const unitLabel = normalizeUnitLabel(product.unitLabel);

    const [selectedSize, setSelectedSize] = useState(
      () => printSpec.sizes.find((o) => o.id === preselection?.sizeId) ?? getDefault(printSpec.sizes)
    );
    const [selectedPaper, setSelectedPaper] = useState(
      () => printSpec.papers.find((o) => o.id === preselection?.paperId) ?? getDefault(printSpec.papers)
    );
    const [selectedFinish, setSelectedFinish] = useState(
      () => printSpec.finishes.find((o) => o.id === preselection?.finishId) ?? getDefault(printSpec.finishes)
    );
    const [selectedSides, setSelectedSides] = useState<SidesOption | undefined>(
      () => printSpec.sides.find((o) => o.label === preselection?.sides) ?? getDefault(printSpec.sides)
    );
    const [selectedQuantity, setSelectedQuantity] = useState(preselection?.quantity ?? bounds.listing);
    const [quantityEmpty, setQuantityEmpty] = useState(false);
    // Some legacy/seed-data products have an empty turnaround_options array
    // from the backend — unlike size/paper/finish, turnaround is required by
    // CartItemConfig, so a missing selection here blocks Add to Cart below
    // rather than being silently treated as "not applicable."
    const [selectedTurnaround, setSelectedTurnaround] = useState<TurnaroundOption | undefined>(
      () => turnaroundOptions.find((o) => o.id === preselection?.turnaroundId) ?? turnaroundOptions[0]
    );

    const prefersReducedMotion = usePrefersReducedMotion();
    // Transient click-confirmation pulse on the Add to Cart button content —
    // separate from `isInCart`, which drives the persistent "Update Cart"
    // relabel below and must keep working unchanged.
    const addPulseControls = useAnimationControls();

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

    // Price = tier rate for the quantity x spec multipliers; turnaround extraCost is flat INR added once
    const sizeM   = selectedSize?.priceMultiplier ?? 1;
    const paperM  = selectedPaper?.priceMultiplier ?? 1;
    const finishM = selectedFinish?.priceMultiplier ?? 1;
    const sidesM  = selectedSides?.priceMultiplier ?? 1;
    const optionMultiplier = sizeM * paperM * finishM * sidesM;
    const turnaroundExtra = selectedTurnaround?.extraCost ?? 0;
    // MRP and price are scaled and rounded together (see ./pricing) so the
    // discount shown here equals what the server computes at cart sync and order.
    const pricing = priceForQuantity(pricingTiers, selectedQuantity, optionMultiplier, turnaroundExtra);
    const baseTier = pricing?.tier ?? pricingTiers[0];
    const pricePerUnit = pricing?.pricePerUnit ?? 0;
    const totalPrice = pricing?.total ?? 0;
    const lineSavings = pricing?.savings ?? 0;
    const unavailable = pricing?.unavailable ?? false;
    const hasOptionPricing = [printSpec.sizes, printSpec.papers, printSpec.finishes, printSpec.sides].some(
      (opts) => opts.some((o) => o.priceMultiplier !== 1)
    );
    const guideEntries = tierGuideEntries(pricingTiers, selectedQuantity, optionMultiplier, bounds.min, bounds.max);
    const nudge = nextTierNudge(selectedQuantity, pricingTiers, optionMultiplier, turnaroundExtra, bounds.max);

    // Notify parent (ProductDetailClient) so StickyAddToCart stays in sync
    // Savings only count while the discount is actually displayed (percent >= 1).
    const shownSavings = pricing?.discountPercent !== undefined ? lineSavings : 0;
    const quantityLabel = formatQty(selectedQuantity, unitLabel);
    useEffect(() => {
      onStateChange?.({ isInCart, totalPrice, savings: shownSavings, discountPercent: pricing?.discountPercent, quantityLabel, quantityEmpty });
    }, [isInCart, totalPrice, shownSavings, pricing?.discountPercent, quantityLabel, quantityEmpty, onStateChange]);

    // Delta helpers — show cost impact vs cheapest option in each category
    // (Math.min(...[]) is -Infinity, but these are only read while mapping a
    // non-empty options array, so the empty case never actually multiplies through)
    const minSizeM   = printSpec.sizes.length   ? Math.min(...printSpec.sizes.map((s) => s.priceMultiplier))   : 1;
    const minPaperM  = printSpec.papers.length  ? Math.min(...printSpec.papers.map((p) => p.priceMultiplier))  : 1;
    const minFinishM = printSpec.finishes.length ? Math.min(...printSpec.finishes.map((f) => f.priceMultiplier)) : 1;
    const minSidesM  = printSpec.sides.length   ? Math.min(...printSpec.sides.map((s) => s.priceMultiplier))   : 1;
    // "base without this category" = what the per-unit price would be using the cheapest option there
    const baseWithoutSize   = (baseTier?.pricePerUnit ?? 0) * paperM  * finishM * sidesM;
    const baseWithoutPaper  = (baseTier?.pricePerUnit ?? 0) * sizeM   * finishM * sidesM;
    const baseWithoutFinish = (baseTier?.pricePerUnit ?? 0) * sizeM   * paperM  * sidesM;
    const baseWithoutSides  = (baseTier?.pricePerUnit ?? 0) * sizeM   * paperM  * finishM;
    const sizeDelta   = (m: number) => parseFloat((baseWithoutSize   * (m - minSizeM)).toFixed(2));
    const paperDelta  = (m: number) => parseFloat((baseWithoutPaper  * (m - minPaperM)).toFixed(2));
    const finishDelta = (m: number) => parseFloat((baseWithoutFinish * (m - minFinishM)).toFixed(2));
    const sidesDelta  = (m: number) => parseFloat((baseWithoutSides  * (m - minSidesM)).toFixed(2));

    function handleAddToCart() {
      // An empty options array for a category (size/paper/finish) means that
      // category doesn't apply to this product — not an error. Only guard
      // against the case where options exist but getDefault() still failed
      // to pick one (shouldn't normally happen given its fallback to [0]).
      //
      // Turnaround is different: CartItemConfig requires turnaroundId/Label/
      // ExtraCost, so a product with no turnaround_options at all (seen on
      // some legacy/seed-data rows from the backend) isn't orderable yet —
      // block instead of sending an empty/invalid turnaround to the cart.
      if (
        (printSpec.sizes.length > 0 && !selectedSize) ||
        (printSpec.papers.length > 0 && !selectedPaper) ||
        (printSpec.finishes.length > 0 && !selectedFinish) ||
        !selectedTurnaround
      ) {
        toast.error("Please select all required options", {
          description: "Some print options are missing a selection. Please try again.",
        });
        return;
      }

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
        sizeId: selectedSize?.id,
        sizeLabel: selectedSize?.label,
        paperId: selectedPaper?.id,
        paperLabel: selectedPaper?.label,
        finishId: selectedFinish?.id,
        finishLabel: selectedFinish?.label,
        sides: selectedSides?.label,
        quantity: clampQuantity(selectedQuantity, bounds.min, bounds.max),
        turnaroundId: selectedTurnaround.id,
        turnaroundLabel: selectedTurnaround.label,
        turnaroundExtraCost: selectedTurnaround.extraCost,
        unitLabel,
        minQuantity: bounds.min,
        maxQuantity: bounds.max,
        rateTiers: pricingTiers.map((t) => ({ quantity: t.quantity, pricePerUnit: t.pricePerUnit, mrpPerUnit: t.mrpPerUnit })),
        optionMultiplier,
        artworkFileKey,
        artworkFileName,
        templateData,
      };

      addItem(
        {
          id: product.id,
          slug: product.slug,
          name: product.name,
          images: product.images,
          thumbnailUrl: product.thumbnailUrl,
          categoryName: product.categoryName,
          categorySlug: product.categorySlug,
        },
        config,
        pricePerUnit,
        pricing?.mrpPerUnit
      );

      toast.success(`${product.name} added to cart`, {
        description: `${quantityLabel} · ${formatPrice(totalPrice)}`,
      });

      // Transient confirmation pulse — layered on top of the toast and the
      // persistent isInCart relabel, not a replacement for either.
      if (!prefersReducedMotion) {
        void addPulseControls.start({
          scale: [1, 1.06, 1],
          transition: { duration: 0.2, ease: "easeOut" },
        });
      }
    }

    return (
      <div className="flex flex-col gap-6 max-md:gap-4">
        {/* Mobile reads: options > quantity + rate chips > total > Add to Cart > trust strip > delivery check.
            DOM order stays the desktop order; max-md:order-* rearranges it only below md. */}
        <div className="max-md:order-[12]">
          <DeliveryCheck turnaroundDays={selectedTurnaround?.businessDays} />
        </div>

        {/* Size — category omitted entirely when not applicable to this product */}
        {printSpec.sizes.length > 0 && isSingleChoice(printSpec.sizes) && (
          <p className="md:hidden max-md:order-1 text-sm">
            <span className="text-muted-foreground">Size: </span>
            <span className="font-medium">{prettySize(printSpec.sizes[0].label)}</span>
          </p>
        )}
        {printSpec.sizes.length > 0 && (
          <div className={cn("max-md:order-1", isSingleChoice(printSpec.sizes) && "max-md:hidden")}>
            <SectionLabel
              action={<SizeSpecGuide sizes={printSpec.sizes} papers={printSpec.papers} />}
            >
              Size
            </SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {printSpec.sizes.map((size) => (
                <OptionButton
                  key={size.id}
                  label={size.label}
                  selected={selectedSize?.id === size.id}
                  onClick={() => setSelectedSize(size)}
                  delta={sizeDelta(size.priceMultiplier)}
                  isDefault={size.isDefault}
                  perUnitSuffix={perPieceSuffix(unitLabel)}
                  showPriceDelta={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* Paper — the size/paper comparison guide is anchored to the Size
            section above; when a product has no sizes (empty printSpec.sizes,
            same legacy/seed-data case noted on turnaround below) it's
            anchored here instead so the guide never silently disappears. */}
        {printSpec.papers.length > 0 && isSingleChoice(printSpec.papers) && (
          <p className="md:hidden max-md:order-2 text-sm">
            <span className="text-muted-foreground">Paper: </span>
            <span className="font-medium">{printSpec.papers[0].label}</span>
          </p>
        )}
        {/* When Size collapses to a read-only line on mobile, the comparison guide moves here. */}
        {printSpec.sizes.length === 1 && printSpec.papers.length <= 1 && (
          <div className="md:hidden max-md:order-2">
            <SizeSpecGuide sizes={printSpec.sizes} papers={printSpec.papers} />
          </div>
        )}
        {printSpec.papers.length > 0 && (
          <div className={cn("max-md:order-2", isSingleChoice(printSpec.papers) && "max-md:hidden")}>
            <SectionLabel
              action={
                printSpec.sizes.length === 0 ? (
                  <SizeSpecGuide sizes={printSpec.sizes} papers={printSpec.papers} />
                ) : printSpec.sizes.length === 1 && printSpec.papers.length > 1 ? (
                  <span className="md:hidden">
                    <SizeSpecGuide sizes={printSpec.sizes} papers={printSpec.papers} />
                  </span>
                ) : undefined
              }
            >
              Paper / Material
            </SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {printSpec.papers.map((paper) => (
                <OptionButton
                  key={paper.id}
                  label={paper.label}
                  description={paper.description}
                  selected={selectedPaper?.id === paper.id}
                  onClick={() => setSelectedPaper(paper)}
                  delta={paperDelta(paper.priceMultiplier)}
                  isDefault={paper.isDefault}
                  perUnitSuffix={perPieceSuffix(unitLabel)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Finish */}
        {printSpec.finishes.length > 0 && isSingleChoice(printSpec.finishes) && (
          <p className="md:hidden max-md:order-3 text-sm">
            <span className="text-muted-foreground">Finish: </span>
            <span className="font-medium">{printSpec.finishes[0].label}</span>
          </p>
        )}
        {printSpec.finishes.length > 0 && (
          <div className={cn("max-md:order-3", isSingleChoice(printSpec.finishes) && "max-md:hidden")}>
            <SectionLabel>Finish</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              {printSpec.finishes.map((finish) => (
                <OptionButton
                  key={finish.id}
                  label={finish.label}
                  description={finish.description}
                  selected={selectedFinish?.id === finish.id}
                  onClick={() => setSelectedFinish(finish)}
                  delta={finishDelta(finish.priceMultiplier)}
                  isDefault={finish.isDefault}
                  perUnitSuffix={perPieceSuffix(unitLabel)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Sides — only worth showing a picker when there's more than one option */}
        {printSpec.sides.length > 1 && (
          <div className="max-md:order-4">
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
                  perUnitSuffix={perPieceSuffix(unitLabel)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Turnaround — an empty list means this product's turnaround_options
            weren't set up on the backend; it isn't orderable until they are,
            so we surface that instead of rendering an empty/broken picker. */}
        {turnaroundOptions.length > 0 ? (
          <div className="max-md:order-5">
            <SectionLabel>Turnaround Time</SectionLabel>
            <div className="flex flex-col gap-2">
              {turnaroundOptions.map((opt) => {
                const costLabel = opt.extraCost > 0
                  ? `+${formatPrice(opt.extraCost)}`
                  : "Included";
                return (
                  <SelectableCard
                    key={opt.id}
                    selected={selectedTurnaround?.id === opt.id}
                    onClick={() => setSelectedTurnaround(opt)}
                    className="flex items-center justify-between px-4 py-3 rounded-xl"
                  >
                    <div>
                      <p className={cn("text-sm font-medium transition-colors duration-200", selectedTurnaround?.id === opt.id && "text-primary")}>
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
        ) : (
          <div className="max-md:order-5">
            <SectionLabel>Turnaround Time</SectionLabel>
            <div className="rounded-xl border border-dashed border-border p-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Info size={14} className="shrink-0" />
              Turnaround options aren&rsquo;t available for this product yet. Please contact support to place an order.
            </div>
          </div>
        )}

        {/* Quantity — free entry within the product's allowed range */}
        <div className="max-md:order-6">
          <SectionLabel>Quantity</SectionLabel>
          <QuantityInput
            value={selectedQuantity}
            min={bounds.min}
            max={bounds.max}
            unitLabel={unitLabel}
            onChange={setSelectedQuantity}
            onEmptyChange={setQuantityEmpty}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Min {formatQty(bounds.min, unitLabel)}
            {bounds.max !== null && ` · Max ${formatQty(bounds.max, unitLabel)}`}
          </p>
        </div>

        {/* Live price display */}
        <div className="rounded-2xl border border-border bg-secondary/30 p-4 shadow-sm max-md:order-9">
          {/* Mobile: the order total leads, per-unit rate and MRP are secondary. */}
          <div className="flex items-end justify-between max-md:flex-col-reverse max-md:items-start max-md:gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{formatQty(selectedQuantity, unitLabel)}</p>
              <PriceDisplay
                variant="pdp"
                price={pricePerUnit}
                mrp={pricing?.mrpPerUnit}
                percent={pricing?.discountPercent}
                endsAt={product.discountEndsAt}
                priceSlot={
                  <PriceValue
                    value={pricePerUnit}
                    formatted={`${formatPricePerUnit(pricePerUnit)}${perPieceSuffix(unitLabel)}`}
                    className="font-heading font-bold text-base md:text-3xl tabular-nums"
                    prefersReducedMotion={prefersReducedMotion}
                  />
                }
              />
            </div>
            <div className="text-right max-md:text-left">
              <p className="text-xs text-muted-foreground mb-1">Total</p>
              <PriceValue
                value={totalPrice}
                formatted={formatPrice(totalPrice)}
                className="font-heading font-bold text-3xl md:text-xl text-primary tabular-nums"
                prefersReducedMotion={prefersReducedMotion}
              />
            </div>
          </div>
          {unavailable && (
            <p role="status" className="text-xs font-medium text-destructive mt-2">
              This combination isn&rsquo;t available. Please choose different options.
            </p>
          )}
          {pricing?.discountPercent !== undefined && lineSavings > 0 && (
            <p className="text-xs font-medium text-foreground mt-2">
              You save {formatPrice(lineSavings)} on this quantity
            </p>
          )}
          {hasOptionPricing && (
            <p className="text-[11px] text-muted-foreground mt-2">Price shown is for the options selected</p>
          )}
          <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
            <Info size={11} />
            GST and shipping calculated at checkout
          </p>
        </div>

        <div className="max-md:order-7 empty:hidden">
          <TierRateGuide entries={guideEntries} unitLabel={unitLabel} onSelect={(q) => setSelectedQuantity(clampQuantity(q, bounds.min, bounds.max))} />
        </div>

        {nudge && (
          <div className="max-md:order-8">
            <TierNudge nudge={nudge} unitLabel={unitLabel} onAccept={setSelectedQuantity} />
          </div>
        )}

        <div className="max-md:order-[11]">
          <ProductTrustBadges />
        </div>

        {/* Add to Cart / Update Cart button */}
        <div className="flex flex-col gap-2 max-md:order-10">
          <button
            ref={ref}
            onClick={handleAddToCart}
            disabled={quantityEmpty || unavailable}
            className={cn(
              "disabled:opacity-60 disabled:cursor-not-allowed",
              "w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2",
              "transition-all active:scale-[0.98] shadow-md",
              isInCart
                ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
                : "bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground shadow-brand-orange/20"
            )}
          >
            <motion.span
              initial={false}
              animate={addPulseControls}
              className="flex items-center justify-center gap-2"
            >
              {isInCart ? <CheckCircle2 size={18} /> : <ShoppingBag size={18} />}
              {quantityEmpty ? "Enter a quantity" : unavailable ? "Unavailable" : `${isInCart ? "Update Cart" : "Add to Cart"} · ${formatPrice(totalPrice)}`}
            </motion.span>
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
