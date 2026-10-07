import { PriceDisplay, type PriceVariant } from "@/components/common/PriceDisplay";
import { getFromPrice, getListingPrice } from "@/lib/utils";
import { formatQty } from "@/lib/quantity";
import type { Product } from "@/types";

type PricedProduct = Pick<
  Product,
  | "pricingTiers" | "priceFrom" | "mrpFrom" | "discountPercent" | "printSpec" | "unitLabel"
  | "listingQuantity" | "listingPrice" | "listingMrp" | "listingDiscountPercent"
>;

interface ProductPriceProps extends Omit<React.ComponentProps<typeof PriceDisplay>, "price" | "mrp" | "percent" | "variant"> {
  product: PricedProduct;
  variant: PriceVariant;
}

// Card/search/recent price. With the server's listing figures it reads
// "40 pcs for ₹240.00"; on a backend that predates them it falls back to the
// per-unit "From ₹X" the caller's prefix/unitLabel describe.
export function ProductPrice({ product, ...rest }: ProductPriceProps) {
  const listing = getListingPrice(product);
  if (listing) {
    return (
      <PriceDisplay
        {...rest}
        prefix={`${formatQty(listing.quantity, product.unitLabel)} for`}
        unitLabel={undefined}
        price={listing.price}
        mrp={listing.discount?.mrp}
        percent={listing.discount?.percent}
      />
    );
  }
  const { price, discount } = getFromPrice(product);
  return <PriceDisplay {...rest} price={price} mrp={discount?.mrp} percent={discount?.percent} />;
}
