# Step 9 — Search

## Files created / modified
| Path | Type | Purpose |
|---|---|---|
| `hooks/useDebounce.ts` | Client hook | Debounces any value by a configurable delay (default 300ms) |
| `components/layout/HeaderSearch.tsx` | Client | Upgraded to full instant-search — debounced TanStack Query fetch, dropdown with results + popular searches, keyboard navigation (↑↓ Enter Esc), click-outside close |
| `app/search/page.tsx` | Server | Full results page — inline search bar (no-JS fallback), product grid, popular search chips, browse-by-category grid with emoji icons |
| `app/search/loading.tsx` | Server | Skeleton — search bar + product grid |

## Instant search dropdown behaviour
- Opens on focus (shows popular searches) or when query ≥ 2 chars
- Debounced 320ms via `useDebounce` → calls `searchProducts()` via TanStack Query (`staleTime: 30s`)
- Shows up to 8 results: product thumbnail, name, category, starting price per unit
- "See all results for …" row at the bottom submits the full search
- Keyboard: `↓/↑` moves highlight, `Enter` activates highlighted item or submits, `Esc` closes
- Closes on outside click via `mousedown` listener
- `isFetching` spinner shown on loading, distinct from the clear-query `X` button

## Search results page
- Reads `?q=` as a `Promise<searchParams>` (Next.js 16 pattern)
- `generateMetadata` produces dynamic title and description per query
- Inline `<form>` with `action={ROUTES.search}` — works without JavaScript as a plain GET form
- Empty state (no results) always shows popular chips + category grid below
- Category grid uses emoji icons per category slug

## API swap path
Swap `searchProducts(query)` body in `lib/api/products.ts`. Signature unchanged — returns `Product[]`.
For the instant dropdown, the same function is called via TanStack Query so caching/deduplication is automatic.
