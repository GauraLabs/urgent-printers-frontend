"use client";

import { useRef, useState, useCallback } from "react";
import { ProductConfigurator } from "./configurator/ProductConfigurator";
import { StickyAddToCart } from "./StickyAddToCart";
import { ArtworkUpload } from "./artwork/ArtworkUpload";
import { SavedArtworks } from "./artwork/SavedArtworks";
import { TemplateForm } from "./template/TemplateForm";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductDetailClientProps {
  product: Product;
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const addItemRef = useRef<HTMLButtonElement>(null);

  const [artworkFileKey, setArtworkFileKey] = useState<string>("");
  const [artworkFileName, setArtworkFileName] = useState<string>("");
  const [templateData, setTemplateData] = useState<Record<string, string>>({});

  const handleArtworkChange = useCallback((fileKey: string, fileName: string) => {
    setArtworkFileKey(fileKey);
    setArtworkFileName(fileName);
  }, []);

  const handleStickyAdd = useCallback(() => {
    addItemRef.current?.click();
  }, []);

  const showArtwork =
    product.customizationMode === "artwork" || product.customizationMode === "both";
  const showTemplate =
    product.customizationMode === "template" || product.customizationMode === "both";

  return (
    <>
      <ProductConfigurator
        ref={addItemRef}
        product={product}
        artworkFileKey={artworkFileKey || undefined}
        artworkFileName={artworkFileName || undefined}
        templateData={Object.keys(templateData).length > 0 ? templateData : undefined}
      />

      {showTemplate && product.templateFields.length > 0 && (
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Personalise Your Print
          </p>
          <TemplateForm fields={product.templateFields} onChange={setTemplateData} />
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
        price={formatPrice(product.pricingTiers[0]?.totalPrice ?? product.priceFrom ?? 0)}
        observeRef={addItemRef}
        onAddToCart={handleStickyAdd}
      />
    </>
  );
}
