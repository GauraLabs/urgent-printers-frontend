// ─── Customization ────────────────────────────────────────────────────────────

export type CustomizationMode = "artwork" | "template" | "both" | "none";

export interface TemplateField {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "multiline" | "url";
  placeholder?: string;
  required: boolean;
  maxLength?: number;
}

// ─── Category ────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  productCount: number;
  // Fields populated when fetched from the real backend (absent in mock data)
  thumbnailUrl?: string | null;
  bannerUrl?: string | null;
  iconName?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  isActive?: boolean;
  parentId?: number | null;
  sortOrder?: number;
}

// ─── Print Specifications ─────────────────────────────────────────────────────

export interface SizeOption {
  id: string;
  label: string;
  width: number;
  height: number;
  unit: "in" | "mm" | "cm";
  priceMultiplier: number;
  isDefault: boolean;
}

export interface PaperOption {
  id: string;
  label: string;
  weight: string;
  description: string;
  priceMultiplier: number;
  isDefault: boolean;
}

export interface FinishOption {
  id: string;
  label: string;
  description: string;
  priceMultiplier: number;
  isDefault: boolean;
}

export interface SidesOption {
  label: string;
  priceMultiplier: number;
  isDefault: boolean;
}

export interface PrintSpec {
  sizes: SizeOption[];
  papers: PaperOption[];
  finishes: FinishOption[];
  sides: SidesOption[];
  minDpi: number;
  bleedMm: number;
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

export interface PricingTier {
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  isBestValue?: boolean;
}

export interface TurnaroundOption {
  id: string;
  label: string;
  businessDays: number;
  extraCost: number;
}

// ─── Product ──────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  description: string;
  shortDescription: string;
  images: string[];
  printSpec: PrintSpec;
  pricingTiers: PricingTier[];
  turnaroundOptions: TurnaroundOption[];
  averageRating: number;
  reviewCount: number;
  isFeatured: boolean;
  tags: string[];
  badge?: string;
  priceFrom?: number;
  customizationMode: CustomizationMode;
  templateFields: TemplateField[];
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface CartItemConfig {
  // Absent when the corresponding option category doesn't apply to this product
  sizeId?: string;
  sizeLabel?: string;
  paperId?: string;
  paperLabel?: string;
  finishId?: string;
  finishLabel?: string;
  sides?: string;
  quantity: number;
  turnaroundId: string;
  turnaroundLabel: string;
  // Flat surcharge (INR) for the selected turnaround — must be persisted here
  // since it can't be reconstructed from turnaroundId alone once in the cart.
  turnaroundExtraCost: number;
  artworkFileName?: string;
  artworkFileSize?: number;
  artworkFileKey?: string;
  templateData?: Record<string, string>;
}

export interface CartItem {
  cartItemId: string;
  product: Pick<Product, "id" | "slug" | "name" | "images" | "categoryName" | "categorySlug">;
  config: CartItemConfig;
  pricePerUnit: number;
  totalPrice: number;
  addedAt: string;
}

// ─── User / Auth ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email?: string;      // null for phone-only users
  firstName: string;
  lastName: string;
  phone?: string;      // null for email/google users before phone linking
  avatarUrl?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ─── Address ─────────────────────────────────────────────────────────────────

export interface Address {
  id: string;
  userId: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

// ─── Coupon ───────────────────────────────────────────────────────────────────

export interface AppliedCoupon {
  code: string;
  discountType: "percentage" | "flat";  // "fixed" from backend is mapped to "flat"
  discountValue: number;
  discountAmount: number;   // computed server-side based on subtotal
  description: string | null;
  message: string;          // user-friendly message shown directly in UI
}

// ─── Order creation ───────────────────────────────────────────────────────────

export interface CreateOrderItem {
  productId: string;
  productSlug: string;
  productName: string;
  categoryName?: string;
  thumbnailUrl?: string;
  sizeId?: string;
  sizeLabel?: string;
  paperId?: string;
  paperLabel?: string;
  finishId?: string;
  finishLabel?: string;
  sides?: string;
  quantity: number;
  turnaroundId: string;
  turnaroundLabel: string;
  artworkFileKey?: string;
  templateData?: Record<string, string>;
}

export interface CreateOrderAddress {
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface CreateOrderRequest {
  items: CreateOrderItem[];
  shippingAddress: CreateOrderAddress;
  paymentMethod: "cod" | "online";
  couponCode?: string;
}

// POST /api/v1/orders returns the same shape as the full Order
export type CreatedOrder = Order;

// ─── Order preview ────────────────────────────────────────────────────────────

export interface OrderPreviewItem {
  productId: string;
  productName: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  turnaroundLabel: string;
}

export interface OrderPreview {
  pricing: OrderPricing;
  items: OrderPreviewItem[];
  estimatedDelivery?: string;
}

// ─── Order ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "artwork_pending"
  | "artwork_approved"
  | "printing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refund_initiated"
  | "refunded";

export interface OrderStatusEvent {
  status: OrderStatus;
  timestamp: string;
  note?: string;
  createdBy?: string;
}

// Item shape returned in the full order detail response
export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  thumbnailUrl: string | null;
  categoryName?: string;
  sizeLabel?: string;
  paperLabel?: string;
  finishLabel?: string;
  sides?: string;
  quantity: number;
  turnaroundLabel: string;
  pricePerUnit: number;
  totalPrice: number;
  artworkFileKey?: string;
  artworkUrl?: string;
  artworkStatus?: string;
  templateData?: Record<string, string>;
  // Delivered order + this customer hasn't already reviewed the product (any order, ever).
  canReview?: boolean;
}

// Compact item shape used only in the orders list card
export interface OrderListItem {
  productName: string;
  thumbnailUrl: string | null;
  quantity: number;
}

export interface OrderPricing {
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  couponDescription?: string;
  shippingCost: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
}

export interface OrderShippingAddress {
  label?: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderPayment {
  method: string;
  status: string;
  amount: number;
  razorpayOrderId?: string | null;
  razorpayKeyId?: string | null;
}

// Full order (detail + POST response)
export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  payment?: OrderPayment;
  items: OrderItem[];
  shippingAddress: OrderShippingAddress;
  pricing: OrderPricing;
  totalAmount: number;          // convenience copy of pricing.totalAmount
  notes?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  statusHistory: OrderStatusEvent[];
  placedAt: string;
  updatedAt: string;
}

// Compact order shape for the orders list page
export interface OrderCard {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  totalAmount: number;
  placedAt: string;
  items: OrderListItem[];
}

// ─── Review ───────────────────────────────────────────────────────────────────

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface Review {
  id: string;
  productId: string;
  reviewerName: string;
  rating: number;
  title: string;
  body: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  status: ReviewStatus;
  createdAt: string;
}

// ─── Homepage ─────────────────────────────────────────────────────────────────

export interface HeroBanner {
  id: string;
  headline: string;
  subheading: string;
  ctaText: string;
  ctaHref: string;
  imageUrl: string;
  badgeText?: string;
}

export interface Testimonial {
  id: string;
  authorName: string;
  company: string;
  avatarUrl?: string | null;
  rating: number;
  quote: string;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string | null;
}

// ─── API / Pagination ─────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type ProductBadgeFilter = "bestseller" | "new" | "sale" | "popular";

export interface ProductFilters {
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  badge?: ProductBadgeFilter;
  search?: string;
  sort?: "price-asc" | "price-desc" | "rating" | "newest" | "popular";
  page?: number;
  pageSize?: number;
}

// ─── Proof approval ───────────────────────────────────────────────────────────

export interface ProofInfo {
  file_key: string;
  original_filename: string;
  version: number;
  order_number: string;
  product_name: string;
  quantity: number;
}

export interface ProofApprovalResult {
  message: string;
  order_number: string;
  status: "approved" | "rejected";
}

export interface ItemProofInfo {
  proof_id: number;
  file_key: string;
  original_filename: string;
  version: number;
  status: string;
}

// ─── Shipping serviceability ───────────────────────────────────────────────────

export interface ServiceabilityResult {
  pincode: string;
  isServiceable: boolean;
  estimatedDeliveryDate: string | null;
  minDays: number | null;
  maxDays: number | null;
}
