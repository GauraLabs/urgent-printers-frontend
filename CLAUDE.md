@AGENTS.md

# Urgent Printers — Frontend

Next.js 16.2 e-commerce storefront for an India-based online printing business.

## Project layout

```
app/            Next.js App Router routes (root level — NOT under src/)
components/     Shared UI: layout/, common/, ui/ (shadcn), providers/
features/       Feature modules: home/, products/, cart/, checkout/, auth/, account/, wishlist/, theme/
lib/            api/, mock-data/, constants/, themes.ts, utils.ts
hooks/          useDebounce, useMounted
types/          index.ts — all TypeScript interfaces
docs/           Build logs (step-01…step-11), overview.md, deployment.md
```

Path alias `@/*` maps to `./` (project root). Never use `@/src/`.

## Non-negotiable rules

- **TypeScript strict** everywhere. No `any`. Every param, return, and prop must be typed.
- **Server Components are the default.** Only add `"use client"` when hooks, browser APIs, or event handlers are genuinely needed.
- **Mobile-first styles.** Default classes are mobile. Desktop via `lg:` / `md:` prefixes only.
- **All data fetching goes through `lib/api/`** exclusively. Components never import from `lib/mock-data/` directly.
- **`cn()` from `lib/utils.ts`** for all className logic (clsx + tailwind-merge).
- **`next/image`** for all images. **`next/link`** for all internal links.
- **INR currency** everywhere. Use `formatPrice()` and `formatPricePerUnit()` from `lib/utils.ts` — both use `en-IN` locale.

## shadcn/ui — base-nova style (critical)

This project uses `@base-ui/react`, not Radix UI. The APIs differ:

- **No `asChild` prop** on any component. Use `buttonVariants()` from `@/components/ui/button` applied to native `<a>` / `<button>` / `<Link>` elements instead.
- **`DropdownMenuLabel`** is `MenuGroupLabel` — it **must** be a direct child of `<DropdownMenuGroup>`. Using it bare inside `DropdownMenuContent` throws `MenuGroupRootContext is missing`.
- **`DropdownMenuTrigger`** renders as a button itself — do not wrap it in another `<button>`.
- Tailwind v4 is used — no `tailwind.config.js` needed. CSS variables in `app/globals.css`.

## Zustand + SSR (hydration)

Zustand `persist` stores (cart, auth, wishlist, theme) hydrate from `localStorage` on the client. The server renders with default values, causing React hydration mismatches if those values appear in the initial HTML.

**Fix pattern:** Use `useMounted` from `@/hooks/useMounted.ts`. Never render persisted store values (cart count, auth state) until `mounted === true`.

```tsx
const mounted = useMounted();
const displayCount = mounted ? itemCount : 0;
```

The auth store also has `_isHydrated` / `_setHydrated` via `onRehydrateStorage` — use this in `AuthGuard` to wait for rehydration before redirecting.

## Design system

- **"Rose Gold Boutique"** premium palette — blush/ivory backgrounds, rose-gold/copper primary, warm gold accents
- **Primary:** Rose Gold / Copper `oklch(0.50 0.13 35)` → `bg-primary`
- **CTA:** Warm Gold `oklch(0.72 0.16 55)` → `bg-brand-orange text-brand-orange-foreground`
- **4 themes:** `roseGold` (default, rootless `:root`) · `gold` ("Royal Gold & Ivory") · `emerald` ("Emerald & Gold Heritage") · `slate` ("Slate Luxury") — non-default variants applied as `.theme-*` class on `<html>`; defined in `lib/themes.ts`
- **Headings:** `font-heading` (Cormorant Garamond via `--font-display`)
- **Body:** `font-sans` (DM Sans via `--font-dm-sans`)
- **Border radius base:** `0.75rem` (modern, rounded)
- **Status badges:** use `lib/constants/order-status.ts` (`ORDER_STATUS_COLORS`) and `Badge` `success`/`sale` variants — both token-based, never raw Tailwind colors (e.g. `bg-blue-100`)
- **Razorpay theme color:** `lib/constants/payment.ts` → `RAZORPAY_THEME_COLOR` (hex, kept in sync with `--primary`; Razorpay SDK can't parse `oklch()`)
- **Hero sparkles:** `features/home/HeroSparkles.tsx` — `@react-three/fiber`/`drei` `<Sparkles>`, lazy-loaded via `next/dynamic(..., { ssr: false })`, desktop-only + `prefers-reduced-motion`-gated, mounted 1.5s after initial paint (227KB gzip chunk, never in initial HTML)

## API layer pattern

Every function in `lib/api/` has a `// REAL API:` comment. Replace only the function body when wiring a real backend — signatures are locked, no callers change.

```ts
export async function getProducts(filters: ProductFilters): Promise<PaginatedResponse<Product>> {
  // REAL API: return fetch(`/api/products?...`).then(r => r.json())
  await delay(500);
  return ...; // mock
}
```

## Key known fixes (do not regress)

| Issue | Fix |
|---|---|
| Hydration mismatch on cart count / auth | `useMounted` in `HeaderActions` + `MobileBottomNav` |
| Theme dropdown crash | `DropdownMenuLabel` must be inside `DropdownMenuGroup` |
| LCP image warning | `loading="eager"` on hero banner and first product gallery slide |
| `node-domexception` warning | `shadcn` is in `devDependencies` — do not move it to `dependencies` |

## Branch strategy

- `dev` → Vercel preview URL — **all development work goes here**
- `main` → production (`urgentprinters.in`) — merge from `dev` only when shipping

## Build

```bash
npm run dev          # local development
npm run build        # next build + next-sitemap (generates sitemap.xml + robots.txt)
```

One required env var for production: `NEXT_PUBLIC_SITE_URL=https://urgentprinters.in`
