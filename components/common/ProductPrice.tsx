import { PriceDisplay, type PriceVariant } from "@/components/common/PriceDisplay";
import { getDisplayDiscount, getDisplayPricePerUnit } from "@/lib/utils";
import type { Product } from "@/types";

type PricedProduct = Pick<Product, "pricingTiers" | "priceFrom" | "mrpFrom" | "discountPercent">;

interface ProductPriceProps extends Omit<React.ComponentProps<typeof PriceDisplay>, "price" | "mrp" | "percent" | "variant"> {
  product: PricedProduct;
  variant: PriceVariant;
}

// "From" price + its discount for a card/search/recent product, resolved the
// same way everywhere so the MRP always belongs to the tier being priced.
export function ProductPrice({ product, ...rest }: ProductPriceProps) {
  const discount = getDisplayDiscount(product);
  return (
    <PriceDisplay
      {...rest}
      price={getDisplayPricePerUnit(product)}
      mrp={discount?.mrp}
      percent={discount?.percent}
    />
  );
}
