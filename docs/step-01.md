# Step 1 — Foundation

## Packages installed
`shadcn/ui` (base-nova, Tailwind v4) + 15 UI components · `zustand` v5 · `react-hook-form` · `zod` · `@hookform/resolvers` · `lucide-react` · `clsx` · `tailwind-merge` · `class-variance-authority` · `swiper` · `react-dropzone` · `next-sitemap` · `sonner`

## Files created
| Path | Purpose |
|---|---|
| `app/globals.css` | Brand design system — Deep Indigo primary, Vivid Orange CTA, Warm White surface, Sora/DM Sans font vars |
| `app/layout.tsx` | Root layout with Sora + DM Sans fonts, QueryProvider, Toaster |
| `types/index.ts` | 22 TypeScript interfaces — Product, PrintSpec, PricingTier, CartItem, Order, Review, etc. |
| `lib/mock-data/` | 6 categories · 18 products · 54+ reviews · 3 orders · 2 hero banners · 4 testimonials |
| `lib/api/` | 8 async API modules with simulated delay + `// REAL API:` swap comments |
| `lib/utils.ts` | `cn()`, `formatPrice()`, `formatPricePerUnit()`, `formatFileSize()`, `slugify()`, `truncate()` |
| `lib/constants/routes.ts` | All app route constants |
| `lib/constants/print-specs.ts` | Accepted file types, DPI/bleed, order status labels |
| `features/cart/store.ts` | Zustand cart (persisted) — items, drawer state, add/remove/update |
| `features/auth/store.ts` | Zustand auth (persisted) — user, token, isAuthenticated |
| `features/wishlist/store.ts` | Zustand wishlist (persisted) — toggle, isWishlisted |
| `components/providers/QueryProvider.tsx` | TanStack Query v5 client provider |

## API swap path
Every function in `lib/api/*.ts` has a `// REAL API:` comment. Replace only the function body — signatures are locked.

## Key design tokens
- Primary: `oklch(0.38 0.16 271)` → `bg-primary`
- CTA/accent: `oklch(0.68 0.21 37)` → `bg-brand-orange`
- Headings: `font-heading` (Sora) · Body: `font-sans` (DM Sans)
