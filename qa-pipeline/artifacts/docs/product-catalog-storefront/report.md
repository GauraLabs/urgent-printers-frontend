# Product Catalog (Storefront)
**Project:** Urgent Printers — Storefront  
**Generated:** 2026-08-11T07:56:51.122Z  
**Run:** 2026-08-11T07:50:56.544Z — 85 steps, viewport 1280×720  
---
## Overview & objectives

A customer arrives on the storefront wanting something printed and has to find the right product. The catalog is where that happens: they browse the full range, narrow it by category, price, highlight or tag, sort it, or search it by name — then open a product's detail page to configure and price it.

That makes this surface the storefront's entire discovery layer. Everything staff publish from the admin panel has to be **findable, correctly priced, correctly linked and correctly counted** here, or it cannot be sold. A product that is invisible, mispriced, or reachable only through a broken link is, commercially, a product that does not exist.

This document covers the **storefront half** of the Product Catalog feature. The admin half — how staff create and edit the products this page displays — is tested and documented separately; the two are joined into one demo video once both halves are complete.


## Feature description & business logic

The catalog spans four routes and three separate search entry points.

**`/products`** is the full listing. A server component reads the filter state straight out of the URL — `category`, `sort`, `min`, `max`, `tags`, `badge`, `page`, `q` — and fetches a page of 12. Every filter control writes back to that URL rather than to component state, which is what makes any filtered view shareable and bookmarkable.

**`/products/[categorySlug]`** is a category's own landing page, with its hero, description and breadcrumb. The category comes from the path rather than a query param, so choosing a different category from the sidebar *navigates* to that category's own route instead of layering `?category=` on top of the current one.

**`/products/[categorySlug]/[productSlug]`** is the product detail page: gallery, description, tags, reviews, related products, and the configurator that turns size, paper, finish, sides, quantity and turnaround into a live per-unit and total price.

**`/search`** is the dedicated search page, reachable without JavaScript through a plain GET form.

Three pieces of business logic are worth calling out because they are easy to get subtly wrong, and all three are asserted by this suite:

- **Search and catalog filters are mutually exclusive.** The search backend (Typesense) accepts only a query, page and page size — it cannot scope to a category or a price range. Rather than silently dropping filters it cannot honour, the UI disables them while a search is active and says so in plain language. Starting a search clears the other filters outright.
- **The "From" price is merchandising, not arithmetic.** It is the tier flagged `is_best_value`, falling back to the true cheapest tier only when none is flagged — so the price a card advertises is the one the business wants featured, not necessarily the mathematical minimum. Anything that *sorts* by price therefore has to sort by that same number, or the sort visibly contradicts the cards.
- **A product's canonical URL contains its category.** There is no category-less product route, which means a product without a category has nowhere to live on the storefront, and a product must not be servable under a category it does not belong to.

The two-character search threshold is shared between the server page and the client hook, so a one-character query is not a search anywhere — the catalog simply renders unfiltered.


## User flow

A customer opens **All Products** and sees the full range with a count of what is available and a filter sidebar covering Category, Price per Unit, Highlights and Tags. The category list shows the first six with a *Show all 8 categories* toggle, so the sidebar stays a reasonable length on a store with a long taxonomy.

They pick **Business Cards**. The URL gains `?category=business-cards`, the count drops to three, and a removable chip appears under an *Active:* label so the current narrowing is always visible and always undoable. They then sort by **Price: Low to High**; the sort becomes its own chip, and the cards reorder by the same "From" price they display.

From a card — category, name, short description, star rating, starting price, a *Configure* link and a wishlist button — they open **Standard Business Cards**. The detail page opens on the best-value tier: ₹4.50 per unit for 500. Switching the paper to **300 GSM Card** carries a 1.1 multiplier, so the per-unit price becomes ₹4.95 and the 500-unit total ₹2,475.00, and every row of the quantity table recalculates with it. Moving to the **1,000** tier and choosing the **Rush** turnaround (1 business day, +₹150.00) updates the total again — the turnaround surcharge is flat, added once, not per unit.

Before committing they check delivery. The *Check* button stays disabled until six digits are present, then returns a delivery date for a serviceable pincode.

Returning to the catalog, **Clear all (2)** — counting both the category and the sort — resets to the bare listing.

Alongside that main path, customers can reach the same products three other ways: the **header instant search**, which returns products as they type and hands off to the full search page; the **catalog's own search field**, which takes over the listing in place; and the **search page** itself, with popular terms and category shortcuts for someone who arrives with no idea what to type.


## Annotated screenshots

The captions below cover the entry state, each genuine state change, and the notable error and edge states. The full run log holds a screenshot for all 85 steps; these are the ones that carry meaning.

Screenshots are gitignored, so this section renders as filename references rather than embedded images unless the run's artifacts are present locally.

| Step | Screenshot | What it shows |
| --- | --- | --- |
| `hp-01` | ![hp-01](../../screenshots/product-catalog-storefront-happy-path/hp-01.png) | The full catalog listing at /products — page heading, product count, filter sidebar and the product grid. |
| `hp-03` | ![hp-03](../../screenshots/product-catalog-storefront-happy-path/hp-03.png) | The category filter expanded from six visible entries to all eight via the 'Show all 8 categories' toggle. |
| `hp-04` | ![hp-04](../../screenshots/product-catalog-storefront-happy-path/hp-04.png) | Filtered to Business Cards: the count drops to three and a removable 'business-cards' chip appears under 'Active:'. |
| `hp-05` | ![hp-05](../../screenshots/product-catalog-storefront-happy-path/hp-05.png) | Sorted by Price: Low to High — the cards now order by the same 'From' price they display, which is what defect 1 fixed. |
| `hp-06` | ![hp-06](../../screenshots/product-catalog-storefront-happy-path/hp-06.png) | A single product card: category, name, description, rating, starting price, Configure link and wishlist button. |
| `hp-08` | ![hp-08](../../screenshots/product-catalog-storefront-happy-path/hp-08.png) | The product detail page opens on its best-value tier — ₹4.50 per unit for 500 — with the full quantity pricing table. |
| `hp-09` | ![hp-09](../../screenshots/product-catalog-storefront-happy-path/hp-09.png) | Switching to 300 GSM Card applies a 1.1 multiplier: ₹4.95 per unit, ₹2,475.00 total, and every tier row recalculates. |
| `hp-11` | ![hp-11](../../screenshots/product-catalog-storefront-happy-path/hp-11.png) | The Rush turnaround option — 1 business day, +₹150.00 — added once as a flat surcharge, not per unit. |
| `hp-14` | ![hp-14](../../screenshots/product-catalog-storefront-happy-path/hp-14.png) | The delivery check returns a date for a serviceable pincode. |
| `hp-16` | ![hp-16](../../screenshots/product-catalog-storefront-happy-path/hp-16.png) | 'Clear all (2)' resets both the category and the sort, returning the full unfiltered catalog. |
| `alt-01` | ![alt-01](../../screenshots/product-catalog-storefront-alt-category-route/alt-01.png) | A category's own landing route, with its hero, description and breadcrumb — the category comes from the path, not a query param. |
| `alt-06` | ![alt-06](../../screenshots/product-catalog-storefront-alt-header-search/alt-06.png) | The header instant search: each result carries a thumbnail, name, category and starting price, inside a correctly-owned ARIA listbox. |
| `alt-09` | ![alt-09](../../screenshots/product-catalog-storefront-alt-header-search/alt-09.png) | Keyboard navigation — one arrow-down marks the first option selected, and Enter opens it. |
| `alt-11` | ![alt-11](../../screenshots/product-catalog-storefront-alt-search-page/alt-11.png) | The dedicated search page with no query: popular search terms and category shortcuts for a customer who doesn't know what to type. |
| `alt-17` | ![alt-17](../../screenshots/product-catalog-storefront-alt-catalog-search/alt-17.png) | With a search active, the filter sidebar is replaced by 'Filters unavailable' and the sort control reads 'Relevance' — the search backend cannot honour either. |
| `alt-22` | ![alt-22](../../screenshots/product-catalog-storefront-alt-filters/alt-22.png) | The 'Bestseller' highlight filter narrowing the catalog to a single product — note the singular '1 product'. |
| `alt-25` | ![alt-25](../../screenshots/product-catalog-storefront-alt-filters/alt-25.png) | Two tags combined: the backend requires every selected tag, so 'Events' plus 'Corporate' yields nothing rather than the union. |
| `alt-30` | ![alt-30](../../screenshots/product-catalog-storefront-alt-filters/alt-30.png) | A committed price range shown as a single '₹200 – ₹400' chip; blurring the field applies it just as Enter does. |
| `alt-33` | ![alt-33](../../screenshots/product-catalog-storefront-alt-detail-sections/alt-33.png) | 'You Might Also Like' — same-category siblings, excluding the product being viewed. |
| `err-01` | ![err-01](../../screenshots/product-catalog-storefront-err-unknown-routes/err-01.png) | An unknown category slug renders the branded 404 page with recovery links, under the title 'Category Not Found'. |
| `err-03` | ![err-03](../../screenshots/product-catalog-storefront-err-empty-results/err-03.png) | A catalog search with no matches: 'No products found', with the search-specific wording naming the term that failed. |
| `err-04` | ![err-04](../../screenshots/product-catalog-storefront-err-empty-results/err-04.png) | A filter with no matches shows the same heading but different guidance — 'Try adjusting your filters', not 'try a different search term'. |
| `err-08` | ![err-08](../../screenshots/product-catalog-storefront-err-header-search-empty/err-08.png) | The instant search with no matches falls back to suggested popular terms rather than an empty panel. |
| `err-13` | ![err-13](../../screenshots/product-catalog-storefront-err-delivery-check/err-13.png) | Pincode sanitisation: typing 'ab12cd34ef' leaves '12', because the field's maxLength truncates before the non-digit strip runs. |
| `err-17` | ![err-17](../../screenshots/product-catalog-storefront-err-delivery-check/err-17.png) | A pincode outside the delivery network: 'Not deliverable to this pincode'. |
| `err-18` | ![err-18](../../screenshots/product-catalog-storefront-err-delivery-check/err-18.png) | The delivery service failing — a distinct, recoverable message rather than the not-deliverable verdict. |
| `err-21` | ![err-21](../../screenshots/product-catalog-storefront-err-template-fields/err-21.png) | Add to Cart blocked by a missing personalisation field: a toast plus the inline required-field error, with the section scrolled into view. |
| `err-22` | ![err-22](../../screenshots/product-catalog-storefront-err-malformed-urls/err-22.png) | A malformed price bound degrades to an empty catalog rather than an error screen — no crash, but also no explanation. |
| `edge-03` | ![edge-03](../../screenshots/product-catalog-storefront-edge-query-bounds/edge-03.png) | The end-of-list line confirming the whole catalog has been seen, with the infinite-scroll sentinel correctly never arming. |
| `edge-04` | ![edge-04](../../screenshots/product-catalog-storefront-edge-card-links/edge-04.png) | The card-link audit: every product card now links to a resolvable route and none advertises a ₹0.00 price — the state defect 3 fixed. |
| `edge-06` | ![edge-06](../../screenshots/product-catalog-storefront-edge-detail-url/edge-06.png) | A product requested under the wrong category now 404s instead of rendering with a misleading breadcrumb — defect 4. |
| `edge-07` | ![edge-07](../../screenshots/product-catalog-storefront-edge-price-sort/edge-07.png) | The whole catalog sorted low-to-high, in genuinely ascending displayed price — the regression guard for defect 1. |
| `edge-09` | ![edge-09](../../screenshots/product-catalog-storefront-edge-category-counts/edge-09.png) | The last category checked while reconciling every homepage tile's advertised count against the products its page actually lists — defect 2. |


## Test results & coverage

**85 of 85 steps passed. 0 failed.**

That number is only meaningful next to what it took to get there, and what it still does not cover.

### What was tested

| Area | Steps | What it proves |
|---|---|---|
| Happy path | 16 | Browse → filter → sort → open a product → reconfigure it → price it → check delivery → clear filters |
| Alternate paths | 33 | Category landing routes, header instant search (including keyboard navigation), the search page, the in-catalog search field, badge/tag/price filters, and the detail page's gallery, description and related products |
| Error paths | 23 | Every distinct error message the catalog can show — unknown category and product slugs, three separate empty-result states with three different wordings, header-search fallback suggestions, the delivery-check validation ladder, required personalisation fields, and malformed URLs |
| Edge cases | 13 | Search threshold, pagination bounds, end-of-list, card-link integrity, product/category URL integrity, price-sort ordering, category counts, query-param handling and image integrity |

Every validation rule and every error string was asserted against the exact copy in the source, not paraphrased. Two worth noting because their behaviour is not what the code reads like at a glance: the pincode field's sanitisation is **two rules composing in order** — the input's own `maxLength` truncates before React sees the value, and only then does the non-digit strip run, so typing `ab12cd34ef` leaves `12`, not `1234` — and the delivery-failure message uses a straight apostrophe where the rest of the app uses a typographic one.

### Five real defects were found and fixed during this run

The suite did not pass first time. It failed on five genuine product defects, each of which was fixed and re-verified before this document was written.

1. **The price sort contradicted the prices on screen.** "Price: Low to High" ordered by the *first* pricing tier — which, because tiers are stored ascending by quantity, is the **most expensive** per-unit price — while the cards displayed the best-value tier. The catalog showed ₹1.80, ₹4.50, ₹12.00, ₹5.50, ₹6.00, ₹22.00. Fixed in the backend so the sort key computes the same value the card displays.
2. **Category tiles advertised products customers could not see.** The count included inactive products, so "Business Cards — 4 products" led to a page listing 3. Fixed so the customer-facing count is active-only; the admin count deliberately stays all-inclusive, because the admin delete dialog uses it to warn how many products will be orphaned.
3. **The first card in the catalog was a broken link.** A product with no category was returned by the public listing and rendered with the URL `/products//<slug>` — an unresolvable route that 404s — and a "From ₹0.00" price. Deleting a category nullifies its products' category, so this state recurs from an ordinary admin action. Fixed by excluding uncategorised products from every customer-facing catalog surface while keeping them fully visible to staff.
4. **Every product was reachable under every category.** `/products/business-cards/photo-mugs` returned HTTP 200 and rendered Photo Mugs under a Business Cards breadcrumb, because the page looked up the product and the category independently and never checked they matched. Fixed with a 404 on mismatch, in both the page and its metadata.
5. **The catalog was not usable with a screen reader.** Four critical and one serious accessibility violation on every catalog page: the header search declared combobox behaviour without the combobox role, its popup listbox had no accessible name and contained children a listbox may not own, star ratings carried a label on an element with no role to hold it, and the artwork upload's file input had no name at all. Fixed by rebuilding the search as a correct ARIA combobox and labelling the other two.

### What was *not* exercised

- **Infinite scroll has no coverage at all.** The environment holds 10 catalogued products against a page size of 12, so the load-more path never arms. That includes the guard which discards a stale in-flight page when a filter changes mid-fetch — a deliberate race protection with zero test coverage today.
- **Reviews** on the product detail page were treated as a neighbouring feature and not asserted.
- **The configurator's "not orderable yet" branch** — shown when a product has no turnaround options — is now unreachable, because the only product in that state was also the only uncategorised one. The code path is live; the fixture is gone.
- **Colour contrast was measured under one theme.** The storefront currently serves the admin-selected `plum` theme, and the app ships six.

Mobile viewports were not tested; the whole run is a single 1280x720 desktop viewport.


## Accessibility

> automated scan only — manual/screen-reader review still needed. Automated scanning typically catches only 30-40% of real accessibility issues, so a clean critical row here does not mean this feature is accessible; the combobox rewrite in particular (aria-activedescendant, option ownership, Escape handling) should be confirmed with an actual screen reader before anyone claims conformance.

**Critical: none remaining.** The run began with four critical violations on every catalog page and ends with zero — see defect 5 in the previous section for what they were and how they were fixed.

**Serious: colour contrast, unresolved and escalated.** Three token pairs fail WCAG 2 AA at 10px type, on every catalog route (`/products` 4 nodes, `/products/business-cards` 2, `/search` 3, product detail pages 10):

| Element | Foreground / background | Ratio | Required |
|---|---|---|---|
| `success` badge | `#f8f8f8` on `#479c4d` | 3.22 | 4.5 |
| `default`/brand badge | `#f8f8f8` on `#e356a2` | 3.23 | 4.5 |
| Configurator price-delta chips | `#e356a2` on `#fce6ec` | 2.88 | 4.5 |

This was left unfixed **deliberately**, and it is a decision that needs a human. These are design tokens, not a component bug, and the storefront is currently rendering one of six admin-selectable themes — so every ratio above describes the `plum` theme specifically, and a fix has to be evaluated across all six. Changing them is a brand decision.

**Moderate:** one `heading-order` violation on `/products`, where heading levels skip between the page title and the product card names. Low user impact and cheap to fix.

A note on attribution: axe runs once per navigation, so each finding belongs to the route the step landed on rather than to the specific element that step touched.

One recurring console warning was investigated and dismissed. A React hydration-mismatch warning appears 21 times across the run, always on the header search input's `caret-color: transparent`. A grep for `caret-color` and `caretColor` across the entire frontend source tree returns **zero matches** — no application code sets this style anywhere. It appears only on inputs Playwright has filled or focused, which makes it browser-automation instrumentation rather than an application defect. It is not treated as a finding. The other console output in the run is all deliberate: API errors logged by the app's own error handler while the tests exercise unknown slugs and malformed query strings, and one aborted request from the test that forces a delivery-check failure.


## Performance

**These are Next.js dev-server measurements, not a production build.** Dev mode ships unminified bundles and compiles routes on demand, so the absolute scores below are not shippable figures. Their value is as a run-over-run baseline for this feature. Both audits report `url_mismatch: false`, so they do describe the route under test.

**Initial load — `/products`:** performance **0.56**, accessibility **0.97**, best practices **0.96**. First Contentful Paint 1,116ms · Largest Contentful Paint 2,760ms · Speed Index 1,396ms · Cumulative Layout Shift **0** · Total Blocking Time 695ms · Time to Interactive 6,532ms.

**Final state — `/products` after the full journey:** performance **0.65**, accessibility 0.97, best practices 0.96. Recorded with a warm cache, i.e. an in-session measurement — the improvement over the initial load is mostly caching, not a real speed-up, and it is not comparable to a cold first load.

### Concerns

- **Total Blocking Time (695ms) and Time to Interactive (6.5s)** are the weakest signals and the ones most worth re-checking on a production build. The likely contributor is how many client components hydrate at once on the catalog page: the page shell, the filter controls, the sort dropdown, the header search, and a wishlist button on every card.
- **Cumulative Layout Shift is 0** and LCP is 2.76s even in dev, which is the encouraging half of the picture — layout stability on a grid of image cards is the thing most likely to regress, and it currently does not.
- **No performance budget exists** for this feature anywhere in the repo, so "good" here is a judgement rather than a threshold check. Catalog browsing is discovery-stage and can tolerate a slower bar than checkout — but it is also the most-visited surface on the storefront, which pulls the other way.


## Recommendations & future improvements

Ordered by severity, as ranked by the analysis.

### High

1. **Seed enough products (30+, across several categories) to make infinite scroll testable**, then extend this suite to cover the load-more path, its loading indicator, and — most importantly — the guard that discards a stale in-flight page when a filter changes mid-fetch. That guard exists because someone anticipated a real race; it has zero coverage today, and a regression in it would append the wrong products to a filtered list, which customers would report as "the filters don't work".
2. **Make a deliberate decision on catalog colour contrast across all six themes**, rather than spot-fixing one. Three token pairs fail WCAG AA at 10px. Because the theme is admin-switchable, contrast effectively ships with whichever theme staff select, so the check belongs in the theme definitions — ideally as a contrast assertion over `lib/themes.ts`, not a one-off CSS change.

### Medium

3. **Validate catalog query params client-side** before they reach the API: ignore a non-numeric min/max instead of forwarding `NaN`, allowlist `badge` against the four values the UI actually offers, clamp `page` to the available range, and swap or reject an inverted price range. All four currently produce the same undifferentiated empty catalog, and the out-of-range page case additionally contradicts its own product-count line.
4. **Confirm the soft-404 behaviour against a production build.** Both catalog 404 routes currently return HTTP 200 in dev, because each route's loading state flushes the page shell before the 404 is thrown. The rendered page and title are correct — this is invisible to a human but a soft 404 to a crawler, on exactly the two routes most likely to be crawled with stale slugs.
5. **Give the desktop filter sidebar its own scroll context.** It is a sticky panel 731px tall against a 720px viewport — the narrowest possible margin. Everything is still reachable, but only by scrolling most of the catalog, and any additional filter group tips it over into genuinely unreachable.
6. **Verify the rebuilt header-search combobox with a real screen reader.** The automated findings are gone and the ARIA structure is asserted, but keyboard-plus-assistive-technology behaviour — particularly whether "See all results" stays discoverable now that it correctly sits outside the listbox — is precisely what automated scanning cannot judge.
7. **Re-measure Lighthouse against a production build** before treating 0.56 as either a problem or a baseline, paying particular attention to blocking time and interactivity. If they stay high, the number of client components hydrating at once on the catalog page is the candidate, and a wishlist button per card is the most obviously reducible.

### Low

8. **Derive the filter sidebar's tag list from tags products actually carry**, or drop "Eco Friendly" until something uses it. It currently matches no product, so selecting it can only ever return zero results. The list is hand-curated because the backend exposes no tag-facet endpoint, and nothing keeps it in sync.
9. **Fix the single heading-order violation** on the catalog page, and strip a stray `?category=` param on load rather than on the next filter interaction, so shared URLs are clean.
10. **Add a categorised product with no turnaround options to the seed data**, so the configurator's "not orderable yet" branch and its accompanying toast regain a reachable fixture. The code path is still live; only the fixture disappeared when uncategorised products were excluded from the catalog.

### Beyond this feature

Two pre-existing gaps surfaced while fixing the uncategorised-product defect and were left alone as out of scope. The Typesense search provider coerces a product's category id with `int(...)`, which raises on a product whose category is null — latent today because the development environment uses a fake provider. And deleting a category, which nullifies its products' category, does not re-index or remove those products from the search provider, so stale documents can survive until a manual reindex. Both are worth a follow-up ticket.

