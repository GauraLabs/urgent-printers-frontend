# Urgent Printers — Frontend

> Premium online printing platform for India. Business cards, flyers, banners, packaging, brochures, and custom merchandise — delivered fast.

Built with **Next.js 16**, **TypeScript**, **Tailwind CSS v4**, and **shadcn/ui (base-nova)**.

---

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

```bash
npm run build    # production build + sitemap generation
npm start        # serve production build locally
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 (App Router, React 19) |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS v4, shadcn/ui base-nova |
| State | Zustand v5 (cart, auth, wishlist, theme) |
| Data fetching | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Animation | Motion (motion/react) |
| UI components | @base-ui/react, lucide-react, sonner |
| Carousel | Swiper 12 |
| File upload | react-dropzone 15 |
| SEO | next-sitemap 4 |

---

## Project Structure

```
urgent-printers-frontend/
├── app/                        # Next.js App Router routes
│   ├── page.tsx                # Homepage
│   ├── products/               # Product listing + detail pages
│   ├── cart/                   # Cart page
│   ├── checkout/               # 3-step checkout + confirmation
│   ├── auth/                   # Login, Register, OTP verify
│   ├── account/                # Protected account pages
│   ├── search/                 # Search results
│   ├── contact/                # Contact page
│   ├── policies/               # Privacy, Terms, Shipping, etc.
│   ├── not-found.tsx           # Custom 404
│   ├── error.tsx               # Route error boundary
│   └── global-error.tsx        # Root error boundary
│
├── components/
│   ├── layout/                 # Header, Footer, MobileBottomNav, ThemeSelector
│   ├── common/                 # Breadcrumb, StarRating, EmptyState, Skeletons
│   ├── ui/                     # shadcn/ui components
│   └── providers/              # QueryProvider, ThemeProvider
│
├── features/                   # Feature-based modules
│   ├── home/                   # Homepage sections
│   ├── products/               # Product card, configurator, gallery, reviews
│   ├── cart/                   # Cart drawer + items
│   ├── checkout/               # Address, payment, review steps
│   ├── auth/                   # AuthGuard, auth store
│   ├── account/                # Account nav, order status tracker
│   ├── wishlist/               # Wishlist store
│   └── theme/                  # Theme store
│
├── lib/
│   ├── api/                    # API service layer (mock → real swap point)
│   ├── mock-data/              # 18 products, 6 categories, orders, reviews
│   ├── constants/              # Routes, print specs, coupon codes
│   ├── themes.ts               # 5 colour theme definitions
│   └── utils.ts                # cn(), formatPrice(), formatPricePerUnit()
│
├── hooks/                      # useDebounce, useMounted
├── types/                      # TypeScript interfaces
├── docs/                       # Build logs and deployment guide
└── next-sitemap.config.js      # Sitemap + robots.txt config
```

---

## Features

### Storefront
- **Homepage** — Hero carousel (Swiper + motion animations), category grid, featured products, how-it-works, promo banner, testimonials
- **Product listing** — URL-driven filters (category, sort, price, tags), desktop sidebar + mobile bottom drawer, active filter badges
- **Product detail** — Swiper gallery, 6-step live configurator with INR pricing, quantity pricing table, artwork upload (react-dropzone), sticky Add to Cart
- **Search** — Instant dropdown (debounced, keyboard navigable), results page with popular suggestions on no-results
- **Cart** — Inline quantity controls, coupon codes (FIRST10 · URGENT20 · SUMMER15 · FLAT100 · BULK500), GST 18%, free shipping ≥ ₹999

### Checkout
- 3-step flow: Address → Payment → Review
- Payment: UPI, Credit/Debit Card, Net Banking, Cash on Delivery
- Order confirmation page

### Account
- Dashboard with order stats
- Orders list + detail with 5-step status tracker (Placed → Confirmed → Printing → Shipped → Delivered)
- Write a review after delivery (5-star picker + form)
- Saved items (wishlist)
- Addresses CRUD with Indian PIN code validation
- Profile settings

### Auth
- Login + Register (react-hook-form + Zod)
- OTP verification (demo: `123456`)
- Route protection via AuthGuard (Zustand `_isHydrated` guard prevents flash-redirect)

### Themes
- 5 colour themes: **Indigo** (default) · **Emerald** · **Rose** · **Violet** · **Slate**
- Dark / light mode toggle per theme
- Persisted in localStorage

### SEO
- `generateMetadata` on every page
- JSON-LD: Organization (homepage), BreadcrumbList (category pages), Product + AggregateRating (product pages)
- `sitemap.xml` + `robots.txt` auto-generated on every build via next-sitemap
- Custom 404, route error boundary, global error boundary

### India-specific
- INR pricing with `en-IN` locale formatting
- Indian phone validation (`^[6-9]\d{9}$`), 6-digit PIN code
- GST 18% at checkout
- Payment: UPI, Card, Net Banking (6 major banks), COD
- Delhivery tracking integration

---

## Coupon Codes (Demo)

| Code | Discount | Min Order |
|---|---|---|
| `FIRST10` | 10% off | None |
| `SUMMER15` | 15% off | ₹500 |
| `URGENT20` | 20% off | ₹2,000 |
| `FLAT100` | ₹100 flat off | None |
| `BULK500` | ₹500 flat off | ₹5,000 |

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Production URL (e.g. `https://urgentprinters.com`) | Yes (for sitemap + OG URLs) |
| `REVALIDATE_SECRET` | Shared secret checked on incoming `X-Revalidate-Secret` header at `app/api/revalidate/theme/route.ts`, `site-status/route.ts` and `products/route.ts` (the last invalidates product/category/home pages by path after price or discount-window changes; payload `{products:[{category_slug,slug}], category_slugs:[], all:false}`, slugs `^[a-z0-9-]+$`, arrays max 200). Must match `REVALIDATE_SECRET` configured on `urgent-printers-backend` exactly — the backend calls this route as a webhook after an admin theme change, using this value to authenticate the request. Server-side only, never `NEXT_PUBLIC_*`. | Yes (for the admin theme-revalidation webhook) |

Set in `.env.local` for local development:
```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
REVALIDATE_SECRET=<same value as the backend's REVALIDATE_SECRET>
```

---

## MRP Discounts

Prices come from the backend already resolved: `pricePerUnit` / `priceFrom` are always what is charged right now (outside a sale window that is the MRP), so the storefront never evaluates windows. Optional fields drive the display and are absent on an older backend, in which case nothing changes visually:

- Products: `mrpFrom`, `discountPercent`, `discountAmount`, `onSale`, `discountEndsAt`; pricing tiers: `mrpPerUnit`, `discountPercent`, `discountPerUnit`.
- Cart/order/preview lines: `mrpPerUnit`, `discountPerUnit`, `lineSavings`; order pricing: `mrpSavings`, `totalSavings` (server-computed; `totalSavings = mrpSavings + discountAmount`).
- `components/common/PriceDisplay.tsx` is the single price block (`card` / `pdp` / `line` / `compact`): struck-through MRP, "X% off" badge, final price. A missing or 0% percent hides the MRP too and renders exactly the non-discounted markup. `ProductPrice` resolves the "From" tier for card/search/recent products.
- Savings: checkout, confirmation and order pages show the server's `totalSavings` via `SavingsSummary`; cart and drawer compute `Σ(mrp − price) × qty + coupon` in `features/cart/savings.ts` (display only).
- Checkout: the order preview is authoritative. If its line prices differ from the cart, a "Prices have been updated" notice is shown and the preview prices adopted. `createOrder` sends `expected_total`; a 409 with code `price_changed` re-runs the preview and asks the customer to confirm again.
- "On Sale" filter sends `on_sale=true`; the stored `sale` badge is never rendered (the card's corner "Sale" tag comes from `onSale`).
- Coupon validation sends `eligible_subtotal` (non-discounted line totals) and reads `applies_to_discounted_items`; the authoritative coupon figure comes from the preview.
- Rounding: `round2` / `discountPercent` in `lib/utils.ts` and `features/products/configurator/pricing.ts` mirror the server's `Decimal` HALF_UP rules (golden vectors in `tests/fixtures/mrp-contract.ts`).

---

## Tests

```bash
npm test   # vitest run (jsdom + Testing Library), config in vitest.config.mts
```

Covers discount math, PriceDisplay variants, API mappers (with and without the new fields), checkout repricing and the `CheckoutPageClient` 409 `price_changed` flow, savings, the sticky add-to-cart bar, mock-data discounts, the On Sale filter and the product revalidation route (`next/cache` is aliased to a recording stub in `vitest.config.mts`). Typed contract fixtures live in `tests/fixtures/mrp-contract.ts`.

---

## Swapping Mock Data for Real APIs

All data fetching goes through `lib/api/`. Every function has a `// REAL API:` comment marking the swap point. Replace only the function body — no pages or components change.

```ts
// lib/api/products.ts
export async function getProducts(filters: ProductFilters) {
  // REAL API: return fetch(`/api/products?...`).then(r => r.json())
  await delay(500);
  return mockProducts; // ← replace this block only
}
```

Key integrations to add for production:
- **Auth** → NextAuth.js / Supabase Auth / Firebase Auth
- **Payment** → Razorpay or PayU SDK in `app/checkout/page.tsx`
- **Artwork upload** → AWS S3 / Cloudflare R2 in `features/products/artwork/ArtworkUpload.tsx`
- **Email** → Resend / SendGrid in `app/contact/page.tsx`
- **Error monitoring** → Sentry in `app/error.tsx` and `app/global-error.tsx`

---

## Deploy on Vercel

1. Push to GitHub and import the repo on [vercel.com](https://vercel.com)
2. Set environment variables: `NEXT_PUBLIC_SITE_URL=https://urgentprinters.com` and `REVALIDATE_SECRET` (must match the backend's value — see [Environment Variables](#environment-variables))
3. Set production branch to `main` in Vercel project settings

The `build` script (`next build && next-sitemap`) runs automatically on every deploy.

See [`docs/deployment.md`](docs/deployment.md) for the full guide.

---

## Branch Strategy

```
main  → Production (urgentprinters.com)
dev   → Preview / staging (Vercel preview URL)
```

All development work happens on `dev` or feature branches off `dev`. Merge to `main` only when ready to ship.

---

## Documentation

Full build logs and notes live in [`docs/`](docs/):

| File | Contents |
|---|---|
| [`overview.md`](docs/overview.md) | High-level project summary |
| [`deployment.md`](docs/deployment.md) | Vercel setup and API migration guide |
| [`step-01.md`](docs/step-01.md) → [`step-11.md`](docs/step-11.md) | Per-step build notes |
