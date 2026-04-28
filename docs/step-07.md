# Step 7 — Account Pages

## Files created
| Path | Type | Purpose |
|---|---|---|
| `features/account/AccountNav.tsx` | Client | Sidebar nav with active state (`usePathname`), user initials chip, sign-out button |
| `features/account/OrderStatusTracker.tsx` | Server | 5-step tracker (Placed→Confirmed→Printing→Shipped→Delivered); horizontal desktop / vertical mobile; cancelled state handled separately |
| `app/account/layout.tsx` | Server | Wraps AuthGuard + AccountNav + children in responsive two-column layout |
| `app/account/page.tsx` | Server | Dashboard — stat cards (orders count, active, saved, addresses) + recent 3 orders strip |
| `app/account/orders/page.tsx` | Server | Orders list with stacked image previews, status badge, total |
| `app/account/orders/[id]/page.tsx` | Server | Order detail — tracker, full item config, price breakdown (subtotal/shipping/GST), shipping address, tracking link |
| `app/account/saved/page.tsx` | Client | Wishlist from Zustand — product image + name + date saved + remove |
| `app/account/addresses/page.tsx` | Client | CRUD for addresses (client state); inline add/edit form with react-hook-form + zod; 6-digit PIN validation; set-default |
| `app/account/profile/page.tsx` | Client | Edit name/email/phone; `isDirty` guard on submit button; updates Zustand user object |

## Order Status Tracker design
- Current step: brand-orange bubble, `scale-110`, drop shadow
- Completed steps: primary-color filled bubble  
- Pending steps: grey outlined bubble
- Timestamps shown from `statusHistory` array when available
- Estimated delivery shown when status is not yet `delivered`

## Key decisions
- `app/account/orders/[id]/page.tsx` is dynamic (`ƒ`) — order IDs are not known at build time
- All other account pages are static (`○`) — client-side auth gate handles protection at runtime
- Addresses page uses local React state (not Zustand) — CRUD is transient and gets reset on refresh; swap to API calls in `lib/api/addresses.ts` when backend is ready
- Profile page writes back to Zustand user object so the nav chip updates immediately

## API swap path
- Dashboard / Orders: swap `getOrders()` in `lib/api/orders.ts`
- Order detail: swap `getOrderById()` in `lib/api/orders.ts`
- Addresses: replace local state with calls to `getAddresses()`, `createAddress()`, `updateAddress()`, `deleteAddress()` in `lib/api/addresses.ts`
- Profile: add `PATCH /api/users/me` call in the `onSubmit` function in `app/account/profile/page.tsx`
