# Step 4 — Product Listing Page

## Files created
| Path | Type | Purpose |
|---|---|---|
| `features/products/WishlistButton.tsx` | Client | Heart toggle, reads/writes Zustand wishlist, stops link propagation |
| `features/products/ProductCard.tsx` | Server | Product card with image, badge, rating, INR price, WishlistButton island |
| `features/products/useProductFilters.ts` | Client hook | Single source of truth — reads `useSearchParams`, exposes setters that push to URL |
| `features/products/SortDropdown.tsx` | Client | Dropdown driven by `useProductFilters` |
| `features/products/FilterControls.tsx` | Client | Category radios, price min/max inputs, tag checkboxes — all URL-driven |
| `features/products/FiltersDrawer.tsx` | Client | Mobile Sheet (bottom drawer) wrapping FilterControls |
| `features/products/ActiveFilters.tsx` | Client | Removable badge strip showing active filters |
| `features/products/ProductsPageShell.tsx` | Client | Suspense boundary wrapper; toolbar + sidebar + grid layout |
| `app/products/page.tsx` | Server | Awaits `searchParams` Promise, calls `getProducts()`, passes data to shell |
| `app/products/[categorySlug]/page.tsx` | Server | Same pattern + `generateMetadata` + `generateStaticParams` |
| `app/products/loading.tsx` | Server | Suspense fallback with header + grid skeletons |
| `app/products/[categorySlug]/loading.tsx` | Server | Re-exports the same loading component |

## Filter URL params
| Param | Values | Example |
|---|---|---|
| `sort` | `popular` `rating` `price-asc` `price-desc` `newest` | `?sort=price-asc` |
| `category` | any category slug | `?category=business-cards` |
| `min` / `max` | numeric price per unit (₹) | `?min=2&max=50` |
| `tags` | comma-separated | `?tags=bestseller,eco` |
| `page` | integer | `?page=2` |

All filters are shareable and crawlable. Changing any filter resets `page` to 1.

## Layout
- Mobile: toolbar (count + Filters button + Sort) → Active filter badges → full-width grid  
- Desktop: toolbar → Active filter badges → sidebar (sticky `top-20`) + 3-col grid side by side
- `useSearchParams` requires `Suspense` — shell wraps inner content automatically

## API swap path
`app/products/page.tsx` and `app/products/[categorySlug]/page.tsx` call `getProducts(filters)` and `getCategories()`. Swap only the function bodies in `lib/api/products.ts` and `lib/api/categories.ts`.
