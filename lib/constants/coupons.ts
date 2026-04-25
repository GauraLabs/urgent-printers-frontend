export interface Coupon {
  code: string;
  description: string;
  discountType: "percent" | "flat";
  discountValue: number;
  minOrder: number;
}

export const COUPONS: Coupon[] = [
  { code: "FIRST10",  description: "10% off your first order",       discountType: "percent", discountValue: 10,  minOrder: 0    },
  { code: "URGENT20", description: "20% off orders above ₹2,000",   discountType: "percent", discountValue: 20,  minOrder: 2000 },
  { code: "SUMMER15", description: "15% off — summer special",       discountType: "percent", discountValue: 15,  minOrder: 500  },
  { code: "FLAT100",  description: "Flat ₹100 off on any order",     discountType: "flat",    discountValue: 100, minOrder: 0    },
  { code: "BULK500",  description: "₹500 off on orders above ₹5,000",discountType: "flat",    discountValue: 500, minOrder: 5000 },
];

export function validateCoupon(code: string, subtotal: number): Coupon | null {
  const coupon = COUPONS.find((c) => c.code === code.trim().toUpperCase());
  if (!coupon) return null;
  if (subtotal < coupon.minOrder) return null;
  return coupon;
}

export function applyCoupon(coupon: Coupon, subtotal: number): number {
  if (coupon.discountType === "percent") {
    return parseFloat((subtotal * (coupon.discountValue / 100)).toFixed(2));
  }
  return Math.min(coupon.discountValue, subtotal);
}
