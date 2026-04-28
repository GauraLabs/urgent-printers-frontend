# Step 5 — Product Detail Page

## Files created
| Path | Type | Purpose |
|---|---|---|
| `features/products/gallery/ProductGallery.tsx` | Client | Swiper with swipe on mobile; Thumbs-controlled main image on desktop |
| `features/products/configurator/PricingTable.tsx` | Client | All quantity tiers as clickable rows; best value star badge; selected row highlighted |
| `features/products/configurator/ProductConfigurator.tsx` | Client (forwardRef) | Step-through: size → paper → finish → sides → quantity → turnaround. Live price updates. Adds to Zustand cart. |
| `features/products/artwork/ArtworkUpload.tsx` | Client | react-dropzone v15 — PDF/AI/PSD/PNG/JPG, 100MB limit, filename+size preview, DPI/bleed spec box, Canva CTA |
| `features/products/StickyAddToCart.tsx` | Client | IntersectionObserver watches main Add to Cart button; spring-animated sticky bar from `motion/react` appears when button scrolls out |
| `features/products/ProductDetailClient.tsx` | Client | Thin wrapper holding the button ref; wires Configurator ↔ StickyAddToCart |
| `features/products/ReviewsSection.tsx` | Server (async) | Fetches reviews; star distribution bar; verified badge; `en-IN` date format |
| `features/products/RelatedProducts.tsx` | Server (async) | Fetches same-category products; null-safe (returns null if empty) |
| `app/products/[categorySlug]/[productSlug]/page.tsx` | Server (SSG) | `generateStaticParams` pre-builds all 18 products; `generateMetadata`; Product + AggregateRating + AggregateOffer JSON-LD |
| `app/products/[categorySlug]/[productSlug]/loading.tsx` | Server | Two-column skeleton matching page layout |

## Architecture decisions
- `ProductConfigurator` is a `forwardRef` so `ProductDetailClient` can pass the ref to `StickyAddToCart`'s `IntersectionObserver`
- Sticky bar is offset `bottom-16` on mobile (above MobileBottomNav), `bottom-0` on desktop
- Reviews and RelatedProducts are both `async` server components inside `Suspense` — they stream in independently
- All 18 product pages are SSG (`generateStaticParams`) — zero runtime latency for SEO crawlers
- Turnaround price multiplier applied at runtime in configurator, not stored in tiers — keeps tier data clean

## JSON-LD schema
`Product` with `AggregateRating` and `AggregateOffer` (low/high INR price across quantity tiers). Injected via `<script type="application/ld+json">` in the page.

## API swap path
- Configurator sends data to `useCartStore` (client) — no API call; cart syncs to checkout in Step 8
- `ReviewsSection` calls `getReviewsByProduct(productId)` — swap body in `lib/api/reviews.ts`
- `RelatedProducts` calls `getRelatedProducts(productId, categorySlug)` — swap in `lib/api/products.ts`
