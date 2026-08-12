# Category Storefront Visibility
**Project:** Urgent Printers — Storefront  
**Generated:** 2026-08-10T02:20:00Z  
**Run:** 2026-08-09T20:18:01.030Z — 6 steps, viewport 1280×720  
---
## Overview & Objectives

Customers find products primarily by category — the homepage's "Shop by Category" grid, a dedicated page per category, and a category filter on the general product listing. This is the customer-facing half of the category lifecycle whose admin side (create/edit/reorder/delete) was verified separately — this run confirms categories managed in the admin panel actually show up correctly, and behave sensibly, on the storefront a customer sees.


## Feature Description & Business Logic

Categories reach the customer through three surfaces: a homepage grid (first tile featured larger), a dedicated `/products/[categorySlug]` page with its own header, breadcrumb, and optional hero banner/video, and a checkbox-style filter on the general `/products` listing. A category with no uploaded thumbnail falls back to a seeded placeholder image rather than a broken image icon — deliberate, but worth knowing when judging whether a category "looks right," since a missing real photo won't visually stand out as broken.

**A category created or edited in the admin panel is not instantly visible here.** Both the homepage and the category page are cached for 60 seconds (Next.js ISR) with no on-demand revalidation webhook for categories — unlike a couple of other admin-editable settings in this app (site status, theme) which do have one. A newly created category can take up to a minute to appear.


## User Flow

A customer lands on the homepage, sees the category grid, and clicks a tile through to that category's page — real name, description, and (if the category has one) a hero banner or autoplaying video. From there, or directly from the general `/products` listing, the same category can be selected via a checkbox-style filter alongside price/tag/badge filters, or bypassed entirely by typing a search query, which routes to a different (Typesense-backed) search endpoint that doesn't support category scoping at all.


## Annotated Screenshots

See `screenshot_captions` below for what each captured moment shows.

| Step | Screenshot | What it shows |
| --- | --- | --- |
| `hp-01` | ![hp-01](../../screenshots/category-storefront-visibility/hp-01.png) | The homepage's "Shop by Category" grid, real categories with live product counts, first tile featured larger. |
| `hp-03` | ![hp-03](../../screenshots/category-storefront-visibility/hp-03.png) | The Business Cards category page — heading, description, and breadcrumb with the category marked as the current page. |
| `hp-04` | ![hp-04](../../screenshots/category-storefront-visibility/hp-04.png) | The product grid scoped to just this category's products. |
| `hp-05` | ![hp-05](../../screenshots/category-storefront-visibility/hp-05.png) | The general product listing's Category filter, showing real category names alongside "All Products". |
| `hp-06` | ![hp-06](../../screenshots/category-storefront-visibility/hp-06.png) | The listing re-scoped after selecting a category from the filter. |


## Test Results & Coverage

**4 test runs, all green**, against the real running storefront and backend: the happy path (homepage grid → category page → breadcrumb → scoped product grid → general listing's category filter, 6 steps), an unmatched-category-slug 404, a search-query-present redirect-ordering check, and an image-integrity sweep across every homepage category tile.

Two real findings came out of this pass, both confirmations rather than bugs: the 404 page correctly renders for a category slug that doesn't exist (`Page Not Found`, not a blank page or a crash), and — a genuinely easy ordering bug to get backwards — a bogus category slug *with* a search query present correctly redirects to the general search results instead of 404ing, matching the source code's actual execution order (the search redirect fires before the category lookup). Every homepage category tile's image request also resolved with no broken images, confirmed via a live network-request sweep rather than just "an image rendered somewhere."


## Accessibility

automated scan only — manual/screen-reader review still needed. A **critical** `aria-allowed-attr` violation and a **serious** `aria-prohibited-attr` violation recurred together on every page in this flow (homepage, category page, general and filtered listings) — the consistent co-occurrence suggests one shared component is the source, not four unrelated page bugs. **Serious** color-contrast issues also recurred. Two **moderate** findings (missing document title, no level-one heading) appeared on the category page specifically, but the same run's own functional check confirmed a real, visible `<h1>` with the category name at that point in the flow — these may be an axe-sampling-timing artifact rather than a real gap, and are flagged as such rather than taken at face value either way.


## Performance

Not measured — Lighthouse was deliberately left off across every run in this suite to keep things light on a resource-constrained test environment.


## Recommendations & Future Improvements

**High priority:** Investigate the `aria-allowed-attr`/`aria-prohibited-attr` violations recurring across every page in this flow.

**Medium priority:** Audit the shared color-contrast tokens (likely overlaps with the same audit recommended for the admin panel's report).

**Low priority:** Manually confirm the document-title/heading-one findings on the category page aren't a real gap — live evidence from this same run suggests they probably aren't. Manually verify a hydration-mismatch console warning seen on both the homepage and general listing (also independently seen on the admin panel's login page in an unrelated codebase, which makes environment noise a plausible, though unconfirmed, explanation). If real-time category visibility ever becomes a product requirement, add a revalidate-on-demand webhook for categories, matching the pattern this app already uses for site-status and theme changes.

