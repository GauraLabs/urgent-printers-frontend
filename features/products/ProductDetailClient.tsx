"use client";

import { useRef, useState, useCallback } from "react";
import { ProductConfigurator } from "./configurator/ProductConfigurator";
import { StickyAddToCart } from "./StickyAddToCart";
import { ArtworkUpload } from "./artwork/ArtworkUpload";
import { useCartStore } from "@/features/cart/store";
import { formatPrice } from "@/lib/utils";
import type { Product, CartItemConfig } from "@/types";

interface ProductDetailClientProps {
  product: Product;
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const addItemRef = useRef<HTMLButtonElement>(null);
  const addItem = useCartStore((s) => s.addItem);

  // Mirror the configurator's current total so the sticky bar shows accurate price
  const [stickyLabel, setStickyLabel] = useState(
    formatPrice(product.pricingTiers[2]?.totalPrice ?? product.pricingTiers[0].totalPrice)
  );

  // The sticky bar calls this which clicks the main button — keeps a single source of truth
  const handleStickyAdd = useCallback(() => {
    addItemRef.current?.click();
  }, []);

  return (
    <>
      <ProductConfigurator ref={addItemRef} product={product} />
      <div className="mt-8 pt-6 border-t border-border">
        <ArtworkUpload />
      </div>
      <StickyAddToCart
        productName={product.name}
        price="Tap to configure"
        observeRef={addItemRef}
        onAddToCart={handleStickyAdd}
      />
    </>
  );
}
