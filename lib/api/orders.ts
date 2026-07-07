import type {
  Order, OrderCard, OrderItem, OrderListItem,
  OrderPricing, OrderShippingAddress, OrderStatusEvent,
  OrderStatus, CreateOrderRequest, CreatedOrder,
  OrderPreview, OrderPreviewItem,
  ProofInfo, ProofApprovalResult, ItemProofInfo,
} from "@/types";
import { apiFetch, apiFetchPage, API_URL } from "./client";

// ─── Backend shapes (camelCase from server, totalAmount as string) ────────────

interface BackendOrderListItem {
  productName: string;
  thumbnailUrl: string | null;
  quantity: number;
}

interface BackendOrderCard {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  totalAmount: string | number;
  placedAt: string;
  items: BackendOrderListItem[];
}

interface BackendOrderItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  thumbnailUrl: string | null;
  categoryName?: string;
  // Null means the product has no options in that category — not an error.
  sizeLabel: string | null;
  paperLabel: string | null;
  finishLabel: string | null;
  sides: string | null;
  quantity: number;
  turnaroundLabel: string;
  pricePerUnit: string | number;
  totalPrice: string | number;
  artworkFileKey?: string;
  artworkUrl?: string;
  artworkStatus?: string;
  templateData?: Record<string, string>;
}

interface BackendPricing {
  subtotal: string | number;
  discountAmount: string | number;
  couponCode?: string;
  couponDescription?: string;
  shippingCost: string | number;
  gstRate: string | number;
  gstAmount: string | number;
  totalAmount: string | number;
}

interface BackendOrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod?: string;   // absent on detail/create — read from payment.method instead
  paymentStatus?: string;   // absent on detail/create — read from payment.status instead
  payment?: {
    method: string;
    status: string;
    amount: string | number;
    razorpayOrderId?: string | null;
    razorpayKeyId?: string | null;
  };
  items: BackendOrderItem[];
  shippingAddress: OrderShippingAddress;
  pricing: BackendPricing;
  totalAmount: string | number;
  notes?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  statusHistory: { status: string; note?: string; createdBy?: string; timestamp: string }[];
  placedAt: string;
  updatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const n = (v: string | number | undefined): number =>
  v === undefined || v === null ? 0 : parseFloat(String(v));

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapOrderCard(b: BackendOrderCard): OrderCard {
  return {
    id: b.id,
    orderNumber: b.orderNumber,
    status: b.status as OrderStatus,
    paymentMethod: b.paymentMethod,
    paymentStatus: b.paymentStatus,
    totalAmount: n(b.totalAmount),
    placedAt: b.placedAt,
    items: b.items.map((i): OrderListItem => ({
      productName: i.productName,
      thumbnailUrl: i.thumbnailUrl,
      quantity: i.quantity,
    })),
  };
}

function mapOrderDetail(b: BackendOrderDetail): Order {
  const pricing: OrderPricing = {
    subtotal:          n(b.pricing.subtotal),
    discountAmount:    n(b.pricing.discountAmount),
    couponCode:        b.pricing.couponCode,
    couponDescription: b.pricing.couponDescription,
    shippingCost:      n(b.pricing.shippingCost),
    gstRate:           n(b.pricing.gstRate),
    gstAmount:         n(b.pricing.gstAmount),
    totalAmount:       n(b.pricing.totalAmount),
  };

  const items: OrderItem[] = b.items.map((i) => ({
    id:             i.id,
    productId:      i.productId,
    productName:    i.productName,
    productSlug:    i.productSlug,
    thumbnailUrl:   i.thumbnailUrl,
    categoryName:   i.categoryName,
    sizeLabel:      i.sizeLabel ?? undefined,
    paperLabel:     i.paperLabel ?? undefined,
    finishLabel:    i.finishLabel ?? undefined,
    sides:          i.sides ?? undefined,
    quantity:       i.quantity,
    turnaroundLabel: i.turnaroundLabel,
    pricePerUnit:   n(i.pricePerUnit),
    totalPrice:     n(i.totalPrice),
    artworkFileKey: i.artworkFileKey,
    artworkUrl:     i.artworkUrl,
    artworkStatus:  i.artworkStatus,
    templateData:   i.templateData,
  }));

  const statusHistory: OrderStatusEvent[] = b.statusHistory.map((s) => ({
    status:    s.status as OrderStatus,
    timestamp: s.timestamp,
    note:      s.note,
    createdBy: s.createdBy,
  }));

  const payment: import("@/types").OrderPayment | undefined = b.payment
    ? {
        method:          b.payment.method,
        status:          b.payment.status,
        amount:          n(b.payment.amount),
        razorpayOrderId: b.payment.razorpayOrderId ?? null,
        razorpayKeyId:   b.payment.razorpayKeyId   ?? null,
      }
    : undefined;

  return {
    id:            b.id,
    orderNumber:   b.orderNumber,
    status:        b.status as OrderStatus,
    paymentMethod: b.payment?.method ?? b.paymentMethod ?? "cod",
    paymentStatus: b.payment?.status ?? b.paymentStatus ?? "pending",
    payment,
    items,
    shippingAddress: b.shippingAddress,
    pricing,
    totalAmount:   n(b.totalAmount),
    notes:         b.notes,
    trackingNumber: b.trackingNumber,
    estimatedDelivery: b.estimatedDelivery,
    statusHistory,
    placedAt:  b.placedAt,
    updatedAt: b.updatedAt,
  };
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function getOrders(
  _userId: string,
  token: string,
  page = 1
): Promise<{ orders: OrderCard[]; total: number }> {
  // REAL API: GET /api/v1/orders
  try {
    const res = await apiFetchPage<BackendOrderCard>(`/orders?page=${page}&page_size=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { orders: res.data.map(mapOrderCard), total: res.meta.total };
  } catch {
    return { orders: [], total: 0 };
  }
}

export async function getOrderById(orderId: string, token: string): Promise<Order | null> {
  // REAL API: GET /api/v1/orders/{id}
  try {
    const data = await apiFetch<BackendOrderDetail>(`/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return mapOrderDetail(data);
  } catch {
    return null;
  }
}

export async function cancelOrder(orderId: string, token: string): Promise<void> {
  // REAL API: POST /api/v1/orders/{id}/cancel
  await apiFetch(`/orders/${orderId}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reason: "Cancelled by customer" }),
  });
}

export async function previewOrder(
  data: CreateOrderRequest,
  token: string
): Promise<OrderPreview> {
  // REAL API: POST /api/v1/orders/preview
  // Identical computation to createOrder — validates coupon, computes all prices — but no DB write.
  interface BackendPreview {
    pricing: BackendPricing;
    items: { productId: string; productName: string; quantity: number; pricePerUnit: string | number; totalPrice: string | number; turnaroundLabel: string }[];
    estimatedDelivery?: string;
  }

  const raw = await apiFetch<BackendPreview>(`/orders/preview`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(buildOrderBody(data)),
  });

  const pricing: OrderPricing = {
    subtotal:          n(raw.pricing.subtotal),
    discountAmount:    n(raw.pricing.discountAmount),
    couponCode:        raw.pricing.couponCode,
    couponDescription: raw.pricing.couponDescription,
    shippingCost:      n(raw.pricing.shippingCost),
    gstRate:           n(raw.pricing.gstRate),
    gstAmount:         n(raw.pricing.gstAmount),
    totalAmount:       n(raw.pricing.totalAmount),
  };

  const items: OrderPreviewItem[] = raw.items.map((i) => ({
    productId:      i.productId,
    productName:    i.productName,
    quantity:       i.quantity,
    pricePerUnit:   n(i.pricePerUnit),
    totalPrice:     n(i.totalPrice),
    turnaroundLabel: i.turnaroundLabel,
  }));

  return { pricing, items, estimatedDelivery: raw.estimatedDelivery };
}

// ─── Shared request body builder ──────────────────────────────────────────────

function buildOrderBody(data: CreateOrderRequest) {
  return {
    items: data.items.map((item) => ({
      product_id:       item.productId,
      product_slug:     item.productSlug,
      product_name:     item.productName,
      size_id:          item.sizeId,
      size_label:       item.sizeLabel,
      paper_id:         item.paperId,
      paper_label:      item.paperLabel,
      finish_id:        item.finishId,
      finish_label:     item.finishLabel,
      sides:            item.sides,
      quantity:         item.quantity,
      turnaround_id:    item.turnaroundId,
      turnaround_label: item.turnaroundLabel,
      artwork_file_key: item.artworkFileKey ?? null,
      template_data:    item.templateData ?? null,
    })),
    shipping_address: {
      label:       data.shippingAddress.label,
      full_name:   data.shippingAddress.fullName,
      phone:       data.shippingAddress.phone,
      line1:       data.shippingAddress.line1,
      line2:       data.shippingAddress.line2 ?? null,
      city:        data.shippingAddress.city,
      state:       data.shippingAddress.state,
      postal_code: data.shippingAddress.postalCode,
      country:     data.shippingAddress.country,
    },
    payment_method: data.paymentMethod,
    coupon_code:    data.couponCode ?? null,
  };
}

export async function createOrder(
  data: CreateOrderRequest,
  token: string
): Promise<CreatedOrder> {
  // REAL API: POST /api/v1/orders
  // Backend recomputes all prices — never trusts client prices.
  const raw = await apiFetch<BackendOrderDetail>(`/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(buildOrderBody(data)),
  });
  return mapOrderDetail(raw);
}

export async function verifyPayment(
  orderId: string,
  payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  },
  token: string
): Promise<void> {
  // REAL API: POST /api/v1/orders/{id}/payment/verify
  // Backend verifies HMAC-SHA256 signature; on success marks order as "confirmed" + "paid"
  await apiFetch(`/orders/${orderId}/payment/verify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function downloadReceipt(orderId: string, token: string): Promise<void> {
  // REAL API: GET /api/v1/orders/{id}/receipt → PDF attachment
  const res = await fetch(`${API_URL}/orders/${orderId}/receipt`, {
    credentials: "include",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    let detail = "";
    try {
      const errJson = await res.json() as { message?: string; detail?: string };
      detail = errJson.message ?? errJson.detail ?? "";
    } catch { /* non-JSON */ }
    throw new Error(detail || `Could not download receipt (${res.status})`);
  }

  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);

  // Derive filename from Content-Disposition if present
  const cd       = res.headers.get("Content-Disposition") ?? "";
  const match    = cd.match(/filename="?([^";\n]+)"?/i);
  const filename = match?.[1] ?? `receipt-${orderId}.pdf`;

  const a = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Legacy stub — not wired
export async function getOrderByNumber(_orderNumber: string): Promise<Order | null> {
  return null;
}

// ─── Proof approval (public — no auth) ────────────────────────────────────────

export async function getProofInfo(token: string): Promise<ProofInfo> {
  // REAL API: GET /proofs/{token} — peek, does not consume token
  return apiFetch<ProofInfo>(`/proofs/${token}`);
}

export async function submitProofDecision(
  token: string,
  decision: "approved" | "rejected",
  rejectionReason?: string
): Promise<ProofApprovalResult> {
  // REAL API: POST /proofs/{token}
  return apiFetch<ProofApprovalResult>(`/proofs/${token}`, {
    method: "POST",
    body: JSON.stringify({
      decision,
      rejection_reason: rejectionReason ?? null,
    }),
  });
}

// ─── Inline proof approval (authenticated — order detail page) ────────────────

export async function getOrderItemProof(
  orderId: string,
  itemId: string,
  token: string
): Promise<ItemProofInfo | null> {
  // REAL API: GET /api/v1/orders/{order_id}/items/{item_id}/current-proof
  try {
    return await apiFetch<ItemProofInfo>(`/orders/${orderId}/items/${itemId}/current-proof`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // 404 = proof not sent yet; any other error = don't surface to customer
    return null;
  }
}

export async function submitOrderItemProofDecision(
  orderId: string,
  itemId: string,
  decision: "approved" | "rejected",
  rejectionReason: string | undefined,
  token: string
): Promise<void> {
  // REAL API: POST /api/v1/orders/{order_id}/items/{item_id}/current-proof/decision
  // 409 = proof not in approvable state — let caller handle
  await apiFetch<{ message: string }>(`/orders/${orderId}/items/${itemId}/current-proof/decision`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      decision,
      rejection_reason: rejectionReason ?? null,
    }),
  });
}
