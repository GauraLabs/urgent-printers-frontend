# Step 11 — UI Polish, Fixes & Extra Features

## Issues fixed
| Issue | Fix |
|---|---|
| Toast at `top-right` | Moved to `bottom-left`; styled with `rounded-2xl`, offset `mb-16 lg:mb-0` to clear mobile nav |
| Theme button threw `MenuGroupRootContext is missing` | `DropdownMenuLabel` (= `@base-ui MenuGroupLabel`) must be inside `DropdownMenuGroup`. Wrapped both label blocks in `ThemeSelector` |
| Hydration mismatch — cart count / auth state | New `hooks/useMounted.ts` — returns `false` first render, `true` after `useEffect`. `HeaderActions` + `MobileBottomNav` read `displayCount = mounted ? itemCount : 0` so server and client first render match |
| LCP image warning | Added explicit `loading="eager"` to first slide in `ProductGallery` and hero banner `Image` |

## Features added
| Feature | Files |
|---|---|
| **Motion animations** | `HeroBannerSection` — badge/headline/subtext/CTA spring in with staggered delays. `HowItWorks` — section fades in, steps stagger, icons spring on hover. `ProductCard` — `whileHover` lifts 4px with shadow spring. `AnimateIn` + `AnimateStagger` reusable wrappers in `components/common/AnimateIn.tsx` |
| **Coupon codes** | `lib/constants/coupons.ts` — 5 codes: FIRST10·URGENT20·SUMMER15·FLAT100·BULK500. `app/cart/page.tsx` wired up: applied discount shown as green line, error on invalid/min-not-met, remove button, hint text |
| **Discount badges** | `discountPercent?` added to `Product` type. 4 products marked: Standard Business Cards 20%, A5 Flyers 15%, Custom T-Shirts 10%, Eco Kraft 25%. `ProductCard` shows red `X% OFF` badge + crossed-out original price |
| **Search no-results suggestions** | Instant dropdown now shows 5 popular-search chips when query returns 0 results instead of a dead end |
| **Policy pages** | `/policies/privacy` · `/policies/terms` · `/policies/cookies` · `/policies/shipping` · `/policies/returns` · `/policies/artwork-guidelines` — shared sidebar layout, Indian-law-referenced content |
| **Contact page** | `/contact` — form (react-hook-form + zod) + office info cards + FAQ links to policy pages |
| **Footer links** | All `href="#"` links now point to real pages |
| **Review submission** | `/account/orders/[id]/review` — 5-star picker (hover + keyboard), title + body form, success state. "★ Write a Review" button appears on delivered order items |
