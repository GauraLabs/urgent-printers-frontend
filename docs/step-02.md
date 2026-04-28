# Step 2 — Layout Shell

## What was built
Full site layout: sticky Header, mobile bottom nav, Footer, global Cart Drawer, and reusable common components.

## Files created
| Path | Purpose |
|---|---|
| `components/layout/Header.tsx` | Server component — logo, desktop nav links, imports client islands |
| `components/layout/HeaderSearch.tsx` | Client — search input with submit + clear, hidden on mobile |
| `components/layout/HeaderActions.tsx` | Client — cart count badge (Zustand), auth button (Zustand) |
| `components/layout/MobileBottomNav.tsx` | Client — fixed bottom nav (Home/Categories/Search/Cart/Account), active-state via `usePathname` |
| `components/layout/Footer.tsx` | Server — brand info, product/account/support links, legal row |
| `features/cart/CartDrawer.tsx` | Client — Sheet slide-in, empty state + item list + subtotal + checkout CTA |
| `features/cart/CartDrawerItem.tsx` | Client — image, config summary, inline quantity stepper, remove button |
| `components/common/Breadcrumb.tsx` | Server — Home icon + chevron-separated crumbs, `aria-current` on last item |
| `components/common/StarRating.tsx` | Server — partial-star support, sm/md/lg sizes, optional review count |
| `components/common/PriceDisplay.tsx` | Server — per-unit + total, sm/md/lg sizes |
| `components/common/EmptyState.tsx` | Server — icon, title, description, optional CTA |
| `components/common/ProductCardSkeleton.tsx` | Server — card, grid, category card/grid, review skeletons |
| `app/layout.tsx` | Updated — Header + Footer + MobileBottomNav + CartDrawer in root layout |

## Key decisions
- `Button` in this shadcn `base-nova` style uses `@base-ui/react` — no `asChild`. Use `buttonVariants()` on `Link`/`button` elements directly.
- `main` has `pb-16 lg:pb-0` to avoid content hiding behind the mobile bottom nav.
- Cart drawer is always a `Sheet` (slide-in), never a page navigation.
- Header is server; only `HeaderSearch` and `HeaderActions` are client boundaries.

## API swap path
No API calls in this step — all state is Zustand (cart/auth). When auth is real, `HeaderActions` reads from the same `useAuthStore`; only the store's `setUser`/`clearUser` callers change.
