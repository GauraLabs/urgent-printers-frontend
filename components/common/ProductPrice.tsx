import { PriceDisplay, type PriceVariant } from "@/components/common/PriceDisplay";
import { getFromPackPrice } from "@/lib/utils";
import { formatPackSize, normalizePack } from "@/lib/pack";
import type { Product } from "@/types";

type PricedProduct = Pick<Product, "pricingTiers" | "priceFrom" | "mrpFrom" | "discountPercent" | "printSpec" | "packSize" | "unitLabel" | "priceFromPack" | "mrpFromPack">;

interface ProductPriceProps extends Omit<React.ComponentProps<typeof PriceDisplay>, "price" | "mrp" | "percent" | "variant"> {
  product: PricedProduct;
  variant: PriceVariant;
}

// "From" price + its discount for a card/search/recent product, resolved the
// same way everywhere so the MRP always belongs to the tier being priced.
export function ProductPrice({ product, ...rest }: ProductPriceProps) {
  const { price, discount } = getFromPackPrice(product);
  const { packSize, unitLabel } = normalizePack(product.packSize, product.unitLabel);
  // Packs replace the per-unit caption ("per unit", "/unit") with the pack it prices.
  const packText = formatPackSize(packSize, unitLabel);
  const packCaption = rest.variant === "card" ? `per ${packText}` : ` / ${packText}`;
  return (
    <PriceDisplay
      {...rest}
      unitLabel={packSize > 1 ? packCaption : rest.unitLabel}
      price={price}
      mrp={discount?.mrp}
      percent={discount?.percent}
    />
  );
}
