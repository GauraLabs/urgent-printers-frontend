"use client";

import { useRef, useState, useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { ProductConfigurator } from "./configurator/ProductConfigurator";
import { resolvePreselection } from "./configurator/preselect";
import { StickyAddToCart } from "./StickyAddToCart";
import { ArtworkUpload } from "./artwork/ArtworkUpload";
import { SavedArtworks } from "./artwork/SavedArtworks";
import { TemplateForm } from "./template/TemplateForm";
import { useRecentlyViewedStore } from "./recentlyViewed/store";
import { formatPrice, round2 } from "@/lib/utils";
import type { Product } from "@/types";

interface ConfiguratorState {
  isInCart: boolean;
  totalPrice: number;
  savings: number;
  quantityLabel?: string;
  quantityEmpty?: boolean;
}

interface ProductDetailClientProps {
  product: Product;
}

const subscribeNever = () => () => {};
const readSearch = () => window.location.search;
const serverSearch = () => "";

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const addItemRef         = useRef<HTMLButtonElement>(null);
  const templateSectionRef = useRef<HTMLDivElement>(null);

  const [artworkFileKey,     setArtworkFileKey]     = useState<string>("");
  const [artworkFileName,    setArtworkFileName]    = useState<string>("");
  const [templateData,       setTemplateData]       = useState<Record<string, string>>({});
  const [showTemplateErrors, setShowTemplateErrors] = useState(false);
  const [configuratorState,  setConfiguratorState]  = useState<ConfiguratorState>({
    isInCart:   false,
    totalPrice: product.pricingTiers[0]?.totalPrice ?? product.priceFrom ?? 0,
    savings:    0,
  });

  // Feed links land on a configuration via ?qty=&size=... Read client-side (the
  // server snapshot is "" so hydration matches) to keep the page's ISR; the
  // configurator remounts once if params exist.
  const search = useSyncExternalStore(subscribeNever, readSearch, serverSearch);
  const preselection = useMemo(() => resolvePreselection(product, new URLSearchParams(search)), [product, search]);

  const recordView = useRecentlyViewedStore((s) => s.recordView);

  useEffect(() => {
    recordView({
      productId: product.id,
      productSlug: product.slug,
      categorySlug: product.categorySlug,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const handleArtworkChange = useCallback((fileKey: string, fileName: string) => {
    setArtworkFileKey(fileKey);
    setArtworkFileName(fileName);
  }, []);

  const handleStickyAdd = useCallback(() => {
    addItemRef.current?.click();
  }, []);

  // Called by ProductConfigurator when required template fields are missing
  const handleBlockedByTemplate = useCallback(() => {
    setShowTemplateErrors(true);
    templateSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const showArtwork =
    product.customizationMode === "artwork" || product.customizationMode === "both";
  const showTemplate =
    product.customizationMode === "template" || product.customizationMode === "both";

  return (
    <>
      <ProductConfigurator
        key={search}
        ref={addItemRef}
        preselection={preselection}
        product={product}
        artworkFileKey={artworkFileKey || undefined}
        artworkFileName={artworkFileName || undefined}
        templateData={Object.keys(templateData).length > 0 ? templateData : undefined}
        onBlockedByTemplate={handleBlockedByTemplate}
        onStateChange={setConfiguratorState}
      />

      {showTemplate && product.templateFields.length > 0 && (
        <div ref={templateSectionRef} className="mt-8 pt-6 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Personalise Your Print
          </p>
          <TemplateForm
            fields={product.templateFields}
            onChange={setTemplateData}
            showErrors={showTemplateErrors}
          />
        </div>
      )}

      {showArtwork && (
        <div className="mt-8 pt-6 border-t border-border">
          <ArtworkUpload onChange={handleArtworkChange} />
          <SavedArtworks onSelect={handleArtworkChange} />
        </div>
      )}

      <StickyAddToCart
        productName={product.name}
        price={formatPrice(configuratorState.totalPrice)}
        mrpTotal={configuratorState.savings > 0 ? round2(configuratorState.totalPrice + configuratorState.savings) : undefined}
        savings={configuratorState.savings > 0 ? configuratorState.savings : undefined}
        isInCart={configuratorState.isInCart}
        quantityLabel={configuratorState.quantityLabel}
        disabled={configuratorState.quantityEmpty}
        observeRef={addItemRef}
        onAddToCart={handleStickyAdd}
      />
    </>
  );
}
