# Step 3 — Homepage + Multi-Theme System

## Theme system
| Path | Purpose |
|---|---|
| `lib/themes.ts` | 5 theme definitions (id, label, primary swatch, accent swatch) + `ColorMode` type |
| `app/globals.css` | `.theme-emerald / .rose / .violet / .slate` — each overrides primary, secondary, ring, border, sidebar tokens. Dark mode works within any theme. |
| `features/theme/store.ts` | Zustand (persisted) — `theme: ThemeId`, `colorMode: ColorMode`, setters + toggleColorMode |
| `components/providers/ThemeProvider.tsx` | Client — applies `theme-*` and `dark` classes to `<html>` on mount/change |
| `components/layout/ThemeSelector.tsx` | Client — palette icon → dropdown with color swatches + dark/light toggle |

**Themes available:** Indigo (default) · Emerald · Rose · Violet · Slate  
**Note:** `@base-ui` components (Button, DropdownMenuTrigger) have no `asChild`. Use the element directly as the trigger child or apply `buttonVariants()` on native elements.

## Homepage sections
| Path | Type | Data source |
|---|---|---|
| `features/home/HeroBannerSection.tsx` | Client | `getHeroBanners()` → Swiper carousel with autoplay, pagination, gradient overlay |
| `features/home/TrustBadges.tsx` | Server | Static — 6 trust icons (speed, quality, eco, etc.) |
| `features/home/CategoryGrid.tsx` | Server | `getCategories()` → 2-col mobile / 3-col desktop image grid |
| `features/home/FeaturedProducts.tsx` | Server | `getFeaturedProducts()` → product cards with price, rating, CTA |
| `features/home/HowItWorks.tsx` | Server | Static — 4 steps with numbered icon badges |
| `features/home/PromoBanner.tsx` | Server | Static — full-width promo with discount code |
| `features/home/TestimonialsSection.tsx` | Server | `getTestimonials()` → quote cards with avatar and star rating |
| `app/page.tsx` | Server | Parallel `Promise.all` fetch of all homepage data |

## Page section order
Hero → Trust Badges → Categories → Featured Products → How It Works → Promo Banner → Testimonials

## API swap path
`app/page.tsx` calls `lib/api` functions. Swap only the function bodies in `lib/api/homepage.ts`, `lib/api/products.ts`, `lib/api/categories.ts` — the page assembly is untouched.
