# Urgent Printers — Project Overview

## What is this?

Urgent Printers is a production-grade e-commerce platform for an Indian online printing business. Customers can browse, configure, and order print products — business cards, flyers, banners, packaging, brochures, and custom merchandise — with fast Pan-India delivery.

The frontend is built with Next.js 16 (App Router), TypeScript strict mode, Tailwind CSS v4, and shadcn/ui (base-nova style). All data is currently served from in-memory mock data baked into the bundle. The API layer is structured so that swapping in a real backend requires changing only the function bodies in `lib/api/` — no pages or components need to change.

---

## What we built — step by step

### Step 1 — Foundation
Defined 22 TypeScript interfaces covering the full domain model (Product with tiered INR pricing, PrintSpec, CartItem with full print configuration, Order with multi-step status history). Created 18 mock products across 6 categories with realistic INR pricing. Built an async API service layer with simulated network delay and `// REAL API:` swap comments throughout. Set up Zustand v5 stores for cart, auth, wishlist, and theme — all persisted to localStorage.

### Step 2 — Layout Shell
Sticky Header with logo, instant-search input, theme selector, and auth/cart actions. Mobile fixed bottom nav (Home / Categories / Search / Cart / Account). Footer with all working links. Global cart slide-in drawer (Sheet) connected to Zustand. Shared common components — Breadcrumb, StarRating, PriceDisplay, EmptyState, and skeleton wrappers.

### Step 3 — Homepage + Multi-Theme System
Complete homepage: Hero carousel (Swiper with motion/react entrance animations), Trust Badges, Category Grid, Featured Products, How It Works, Promo Banner, and Testimonials — all fetching from the API layer. 5-theme system (Indigo · Emerald · Rose · Violet · Slate) with dark/light mode toggle, persisted via Zustand and applied as CSS variable overrides on `<html>`.

### Step 4 — Product Listing
URL-driven product listing with full filtering — category, sort (5 options), price range (₹ min/max), and tag filters. All state in URL search params so filtered pages are shareable and crawlable. Desktop sticky sidebar, mobile bottom Sheet drawer. Active filter badges with individual remove buttons.

### Step 5 — Product Detail
Swiper gallery (touch swipe mobile / thumbnail strip desktop). 6-step product configurator — size, paper, finish, sides, quantity, turnaround — with live INR pricing. Quantity pricing table with best-value highlight. Artwork upload zone (react-dropzone) with 300 DPI / 3mm bleed spec callout and Canva deep-link. Sticky Add to Cart bar via IntersectionObserver. Reviews with star distribution bar. Related products. JSON-LD Product + AggregateRating + AggregateOffer per page.

### Step 6 — Auth Flow
Login and Register pages (react-hook-form + Zod) with Indian phone validation. 6-digit OTP verification with auto-advance inputs and clipboard paste. AuthGuard using `_isHydrated` flag on Zustand to prevent flash-redirect before localStorage rehydrates. Protected layouts on `/account` and `/checkout`.

### Step 7 — Account Pages
Dashboard with order stats. Orders list with colour-coded status badges. Order detail with a 5-step visual status tracker (Placed → Confirmed → Printing → Shipped → Delivered). Saved items from Zustand wishlist. Addresses CRUD with 6-digit PIN validation. Profile settings writing back to Zustand auth store.

### Step 8 — Checkout Flow
Full cart page with inline quantity steppers, GST 18%, free shipping threshold (₹999), and working coupon codes. 3-step checkout: Address → Payment (UPI / Card / Net Banking / COD) → Review with full price breakdown. Order confirmation page.

### Step 9 — Search
Instant-search dropdown in the header — debounced TanStack Query fetches, product thumbnails with INR price, keyboard navigation (↑↓ Enter Esc), popular chips on focus, suggestion chips on no-results. Server-rendered results page with `generateMetadata` and no-JS form fallback.

### Step 10 — SEO & Polish
`generateMetadata` on every page; `robots: noindex` on private routes. JSON-LD Organization (homepage), BreadcrumbList (category pages), Product schema (product pages). `next-sitemap` generates `sitemap.xml` and `robots.txt` on every build. Custom 404, route error boundary, global error boundary.

### Step 11 — UI Fixes & Extra Features
- Toast moved to bottom-left and restyled
- Motion animations on hero banner, How It Works steps, and ProductCard hover
- Coupon codes fully wired in cart (FIRST10 / URGENT20 / SUMMER15 / FLAT100 / BULK500)
- Discount badges on 4 products with crossed-out original price
- Search no-results now shows popular suggestion chips
- 6 policy pages (Privacy, Terms, Cookies, Shipping, Returns, Artwork Guidelines)
- Contact page with validated form
- All footer links wired to real pages
- Review submission flow after delivered orders (5-star picker)
- Hydration mismatch fixed with `useMounted` hook on cart count and auth state
- Theme dropdown crash fixed (`DropdownMenuLabel` must be inside `DropdownMenuGroup` in base-ui)
- `loading="eager"` added to LCP images (hero, product gallery)
- `shadcn` CLI moved to devDependencies — eliminates `node-domexception` warning on Vercel

---

## Current state

- **47 routes** — 30 static, 6 SSG (18 product pages pre-built at build time), 11 dynamic
- **Zero TypeScript errors**, clean production build
- **All data is mock** — baked into the bundle, works identically on Vercel with no configuration
- **`dev` branch** → Vercel preview URL | **`main` branch** → production (`urgentprinters.com`)

---

## What comes next (when moving to real backend)

1. Replace function bodies in `lib/api/` with real fetch calls — no other files change
2. Integrate Razorpay or PayU in `app/checkout/page.tsx` `handlePlaceOrder()`
3. Wire artwork upload to S3 / Cloudflare R2 in `features/products/artwork/ArtworkUpload.tsx`
4. Replace Zustand auth (localStorage token) with NextAuth.js or Supabase Auth (HttpOnly cookies)
5. Add Sentry error monitoring in `app/error.tsx` and `app/global-error.tsx`
6. Add email via Resend / SendGrid in `app/contact/page.tsx` `onSubmit()`
7. Move coupon validation to backend — remove `lib/constants/coupons.ts` client-side logic
