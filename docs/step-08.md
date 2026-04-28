# Step 8 — Checkout Flow

## Files created
| Path | Type | Purpose |
|---|---|---|
| `app/cart/page.tsx` | Client | Full cart page — item list with qty steppers, remove, order summary (subtotal / shipping / GST 18%), promo code input, conditional CTA (sign-in vs checkout) |
| `app/cart/loading.tsx` | Server | Skeleton for cart |
| `features/checkout/CheckoutStepper.tsx` | Server | 3-step indicator (Address → Payment → Review); done=primary filled, current=brand-orange scaled, pending=grey |
| `features/checkout/AddressStep.tsx` | Client | Saved address radio selector + new address form (react-hook-form + zod, 6-digit PIN) |
| `features/checkout/PaymentStep.tsx` | Client | UPI ID input · Card (number/expiry/CVV) · Net Banking select · COD; per-method validation |
| `features/checkout/ReviewStep.tsx` | Client | Items, address, payment summary; full price breakdown; SSL note; place order button |
| `app/checkout/page.tsx` | Client | Orchestrates steps with local state; `clearCart()` on success; redirects to confirmation |
| `app/checkout/confirmation/[orderId]/page.tsx` | Server | Success screen — order number, status grid, "what happens next" note, track + home CTAs |

## Checkout flow
1. `/cart` — review items, see GST + shipping, apply promo code, proceed
2. `/checkout` — Step 1: pick/add address → Step 2: choose payment → Step 3: review + place order
3. On success → `clearCart()` → redirect to `/checkout/confirmation/[orderId]`
4. Confirmation shows order number, estimated dispatch, tracking CTA

## Indian-specific details
- GST 18% applied on subtotal at checkout (shown as separate line)
- Free shipping threshold: ₹999; standard shipping: ₹99
- Payment options: UPI (with @-validation), Card, Net Banking (6 major banks), COD (₹49 convenience fee note)
- COD available up to ₹50,000

## API swap path
In `app/checkout/page.tsx` `handlePlaceOrder()`: replace the `setTimeout` with `POST /api/orders`. Function returns the new order ID which drives the confirmation redirect.
Promo code in cart: wire the "Apply" button to `POST /api/promos/validate` and apply the discount to subtotal.
