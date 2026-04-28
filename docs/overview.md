# Urgent Printers — Build Documentation

---

## Step 1 — Foundation

### What was built

Complete project foundation: all third-party packages installed, design system configured, TypeScript types defined, mock data created, API service layer built, Zustand stores set up, and the root layout updated with brand fonts and TanStack Query.

### Files created or modified

**Package / Config**
- `package.json` — added: `zustand`, `react-hook-form`, `zod`, `@hookform/resolvers`, `lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority`, `swiper`, `react-dropzone`, `next-sitemap`, `sonner`
- `components.json` — shadcn/ui config (style: base-nova, Tailwind v4, RSC enabled)
- `app/globals.css` — brand design system: Deep Indigo primary, Vivid Orange accent, Warm White surface; Sora/DM Sans font variables; full dark mode token set
- `app/layout.tsx` — root layout with Sora + DM Sans fonts, QueryProvider, Toaster

**shadcn/ui components** (all in `components/ui/`)
- button, input, card, badge, dialog, drawer, sheet, tabs, select, slider, skeleton, avatar, dropdown-menu, separator, scroll-area, sonner

**Types** (`types/index.ts`)
- Category, SizeOption, PaperOption, FinishOption, PrintSpec, PricingTier, TurnaroundOption, Product, CartItemConfig, CartItem, User, AuthState, Address, OrderStatus, OrderStatusEvent, OrderItem, Order, Review, HeroBanner, Testimonial, PaginatedResponse, ProductFilters

**Mock data** (`lib/mock-data/`)
- `categories.ts` — 6 categories with picsum seeds
- `products.ts` — 18 products (3 per category), each with realistic print specs, 6 quantity tiers using tiered discount formula, turnaround options, ratings
- `reviews.ts` — 3 reviews per product-type sampled (24 total), varied ratings and realistic content
- `orders.ts` — 3 sample orders: confirmed / actively printing / delivered with tracking number
- `homepage.ts` — 2 hero banners, 4 testimonials
- `index.ts` — barrel export

**API service layer** (`lib/api/`)
- `delay.ts` — simulated network latency helper
- `categories.ts` — `getCategories`, `getCategoryBySlug`
- `products.ts` — `getProducts` (with filter/sort/pagination), `getProductBySlug`, `getFeaturedProducts`, `getRelatedProducts`, `searchProducts`
- `reviews.ts` — `getReviewsByProduct`
- `orders.ts` — `getOrders`, `getOrderById`, `getOrderByNumber`
- `homepage.ts` — `getHeroBanners`, `getTestimonials`
- `auth.ts` — `login`, `register`, `logout`, `getMe`, `verifyOtp`
- `addresses.ts` — `getAddresses`, `createAddress`, `updateAddress`, `deleteAddress`
- `index.ts` — barrel export

**Zustand stores** (`features/*/store.ts`)
- `features/cart/store.ts` — items, isOpen, addItem/removeItem/updateQuantity/clearCart, itemCount/subtotal (computed), persisted via localStorage
- `features/auth/store.ts` — user, token, isAuthenticated, setUser/clearUser, persisted
- `features/wishlist/store.ts` — items, addItem/removeItem/toggleItem/isWishlisted, persisted

**Utilities / constants**
- `lib/utils.ts` — cn(), formatPrice(), formatPricePerUnit(), formatFileSize(), slugify(), truncate()
- `lib/constants/routes.ts` — all app route constants
- `lib/constants/print-specs.ts` — accepted file types, DPI/bleed constants, order status labels

**Providers**
- `components/providers/QueryProvider.tsx` — TanStack Query v5 client provider (client component)

### How mock data flows

```
lib/mock-data/* (raw data)
  └→ lib/api/* (async functions with simulated delay)
       └→ TanStack Query hooks (in Step 2+)
            └→ Components (render data)
```

No component ever imports from `lib/mock-data` directly. All access is through `lib/api`.

### Where to swap in the real API

Every function in `lib/api/` has a comment: `// REAL API: ...`. Replace only the function body; the signature stays identical. The TanStack Query hooks (to be built in Step 2+) will automatically pick up the real data without any other changes.

### Design system notes

- Primary color: Deep Indigo `oklch(0.38 0.16 271)`
- CTA / accent: Vivid Orange `oklch(0.68 0.21 37)` — use `bg-brand-orange` + `text-brand-orange-foreground`
- Headings: Sora via `font-heading` class or `h1–h6` (auto-applied in globals.css)
- Body: DM Sans via `font-sans` (default body font)
- Border radius base: `0.75rem` (modern, rounded)

### Known limitations / deferred

- Auth store uses an in-memory mock user; no real JWT validation
- Cart store does not call any server endpoint; checkout integration deferred to Step 8
- `next-sitemap` configured in package but `next-sitemap.config.js` deferred to Step 10
- No server-side session management; token stored in localStorage via Zustand persist

---
