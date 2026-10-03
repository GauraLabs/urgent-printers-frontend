// Typed fixtures for the MRP-discount contract (spec §2.4/§2.5). Public
// product payloads are snake_case; order/cart/preview payloads are camelCase.
// `*Legacy` variants omit every new field, as today's backend does.
import type { BackendProductCard, BackendProductDetail, BackendSearchDoc } from "@/lib/api/products";
import type { BackendCartItem } from "@/lib/api/cart";
import type { BackendOrderDetail, BackendPreview } from "@/lib/api/orders";
import type { BackendCouponResponse } from "@/lib/api/coupons";

// §1.2 golden vectors: [mrp, price, percent]
export const GOLDEN_VECTORS: [number, number, number][] = [
  [12.0, 9.0, 25],
  [3.0, 2.0, 33],
  [7.0, 6.5, 7],
  [200.0, 199.0, 1],
  [1000.0, 996.0, 0],
  [10.0, 5.5, 45],
];

export const cardLegacy: BackendProductCard = {
  id: 1,
  name: "Standard Business Cards",
  slug: "standard-business-cards",
  short_description: "Premium cards",
  category_id: 2,
  category_slug: "business-cards",
  category_name: "Business Cards",
  badge: "bestseller",
  is_featured: true,
  tags: [],
  thumbnail_url: null,
  medium_url: null,
  price_from: 9,
  rating: 4.5,
  review_count: 10,
};

export const cardOnSale: BackendProductCard = {
  ...cardLegacy,
  price_from: 9,
  mrp_from: 12,
  discount_percent: 25,
  discount_amount: 3,
  on_sale: true,
};

export const detailOnSale: BackendProductDetail = {
  ...cardOnSale,
  description: "d",
  images: [],
  video_url: null,
  video_thumbnail_url: null,
  sizes: [],
  paper_types: [],
  finishes: [],
  sides_options: [],
  quantity_steps: [100],
  pricing_tiers: [
    { quantity: 100, price_per_unit: 9, mrp_per_unit: 12, discount_percent: 25, discount_per_unit: 3, is_best_value: true },
    { quantity: 500, price_per_unit: 996, mrp_per_unit: null, discount_percent: null, discount_per_unit: null, is_best_value: false },
  ],
  turnaround_options: [],
  seo: { title: null, description: null, canonical_url: null },
  customization_mode: "none",
  template_fields: [],
  created_at: null,
  discount_ends_at: "2026-10-12T13:00:00Z",
};

export const detailLegacy: BackendProductDetail = {
  ...detailOnSale,
  ...cardLegacy,
  mrp_from: undefined,
  discount_percent: undefined,
  discount_amount: undefined,
  on_sale: undefined,
  pricing_tiers: [{ quantity: 100, price_per_unit: 9, is_best_value: true }],
  discount_ends_at: undefined,
};

export const searchDocOnSale: BackendSearchDoc = {
  id: "1",
  name: "Standard Business Cards",
  description: "",
  short_description: "",
  category_id: 2,
  slug: "standard-business-cards",
  badge: "none",
  is_featured: false,
  is_active: true,
  rating: 0,
  review_count: 0,
  tags: [],
  base_price: 9,
  thumbnail_url: null,
  base_mrp: 12,
  discount_percent: 25,
  discount_amount: 3,
  has_discount: true,
};

export const searchDocLegacy: BackendSearchDoc = {
  ...searchDocOnSale,
  base_mrp: undefined,
  discount_percent: undefined,
  discount_amount: undefined,
  has_discount: undefined,
};

export const cartItemOnSale: BackendCartItem = {
  productId: "1",
  productSlug: "standard-business-cards",
  productName: "Standard Business Cards",
  thumbnailUrl: null,
  categoryName: "Business Cards",
  categorySlug: "business-cards",
  sizeId: null,
  sizeLabel: null,
  paperId: null,
  paperLabel: null,
  finishId: null,
  finishLabel: null,
  sides: null,
  quantity: 100,
  turnaroundId: "standard",
  turnaroundLabel: "Standard",
  pricePerUnit: 9,
  totalPrice: 900,
  mrpPerUnit: 12,
  discountPerUnit: 3,
  artworkFileKey: null,
  templateData: null,
};

export const cartItemLegacy: BackendCartItem = {
  ...cartItemOnSale,
  mrpPerUnit: undefined,
  discountPerUnit: undefined,
};

const address = {
  fullName: "A", phone: "9999999999", line1: "1 St", city: "Pune", state: "MH", postalCode: "411001", country: "IN",
};

export const orderOnSale: BackendOrderDetail = {
  id: "10",
  orderNumber: "UP-10",
  status: "placed",
  payment: { method: "cod", status: "pending", amount: "1018.82" },
  items: [
    {
      id: "100", productId: "1", productName: "Standard Business Cards", productSlug: "standard-business-cards",
      thumbnailUrl: null, sizeLabel: null, paperLabel: null, finishLabel: null, sides: null,
      quantity: 100, turnaroundLabel: "Standard", pricePerUnit: "9.00", totalPrice: "900.00",
      mrpPerUnit: "12.00", discountPerUnit: "3.00", lineSavings: "300.00",
    },
  ],
  shippingAddress: address,
  pricing: {
    subtotal: "900.00", discountAmount: "50.00", couponCode: "SAVE50", shippingCost: "99.00",
    gstRate: "18", gstAmount: "129.46", totalAmount: "949.00", mrpSavings: "300.00", totalSavings: "350.00",
  },
  totalAmount: "949.00",
  statusHistory: [],
  placedAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
};

export const orderLegacy: BackendOrderDetail = {
  ...orderOnSale,
  items: [{ ...orderOnSale.items[0], mrpPerUnit: undefined, discountPerUnit: undefined, lineSavings: undefined }],
  pricing: { ...orderOnSale.pricing, mrpSavings: undefined, totalSavings: undefined },
};

export const previewRepriced: BackendPreview = {
  pricing: orderOnSale.pricing,
  items: [
    {
      productId: "1", productName: "Standard Business Cards", quantity: 100, turnaroundLabel: "Standard",
      pricePerUnit: "12.00", totalPrice: "1200.00",
    },
  ],
};

export const couponExclusive: BackendCouponResponse = {
  code: "SAVE50",
  is_valid: true,
  discount_type: "fixed",
  discount_value: 50,
  discount_amount: 50,
  description: null,
  min_order_amount: null,
  max_discount_amount: null,
  message: "ok",
  applies_to_discounted_items: false,
};
