# Subcategories and category SEO (frontend)

Scenario input for Module 2. Plan: `qa-pipeline/artifacts/plans/subcategories-category-seo-plan.json`.

> **Module 2 note.** `.mcp.json`'s single `playwright-test` server is pinned to
> `urgent-printers-admin-panel`'s cwd, and three orphaned `run-test-mcp-server` process trees
> were live on this box (`pipeline/README.md` finding #8). Driving
> `playwright-test-generator` against the storefront from that cwd produces the two-copies
> `test.describe()` failure (finding #2), and switching it needs a `.mcp.json` edit plus a
> session restart — a human decision, per this command's Step 0. The specs below were
> therefore hand-authored under the README's documented **hand-authoring fallback**, with
> every locator grounded in the component source the plan cites. This is the fifth
> consecutive storefront run to take that path.

## Subcategories and category SEO — happy path

### Parent category page: tiles, rollup, intro, FAQ and structured data
**Seed:** qa-pipeline/playwright/specs/seed.spec.ts
**Steps:**
1. Navigate to the parent category page /products/marketing-prints — target: route /products/marketing-prints (step_id: hp-01)
2. Read the document title, meta description and canonical link — target: head > title, meta[name=description], link[rel=canonical] (step_id: hp-02)
3. Read the answer-first intro paragraph under the h1 — target: text 'Marketing prints are printed promotional materials' (step_id: hp-03)
4. Check the UI breadcrumb trail — target: nav[aria-label=Breadcrumb] (step_id: hp-04)
5. Read the BreadcrumbList JSON-LD — target: script[type='application/ld+json'] with @type BreadcrumbList (step_id: hp-05)
6. Check the subcategory tiles block above the product grid — target: nav[aria-label='Marketing Prints subcategories'] containing heading 'Shop Marketing Prints by type' (step_id: hp-06)
7. Check the product grid rolls descendants up into the parent — target: product grid cards within ProductsPageShell (step_id: hp-07)
8. Read the CollectionPage/ItemList JSON-LD — target: script[type='application/ld+json'] with @type CollectionPage (step_id: hp-08)
9. Scroll to the category FAQ accordion below the grid and expand the first question — target: h2#category-faq-heading; details > summary 'What sizes do you print?' (step_id: hp-09)
10. Read the FAQPage JSON-LD and compare to the visible accordion — target: script[type='application/ld+json'] with @type FAQPage (step_id: hp-10)
11. Click the 'Posters' subcategory tile — target: link 'Posters' inside the subcategories nav (step_id: hp-11)
12. On the child page, check the breadcrumb includes the parent and the sibling row renders — target: nav[aria-label=Breadcrumb]; nav[aria-label='Related categories'] (step_id: hp-12)

**Expect:** The parent renders with 0 direct products, both tiles carry rolled-up counts, both
descendant products appear in the grid, seo_intro is above the grid and the FAQ accordion below
it, and BreadcrumbList / CollectionPage / FAQPage JSON-LD all match the visible text.

## Subcategories and category SEO — alternate paths

### Thin child category is crawlable but not indexable
**Seed:** qa-pipeline/playwright/specs/seed.spec.ts
**Steps:**
1. Load /products/posters and read its robots meta and canonical (step_id: alt-01)
2. Read the child page's BreadcrumbList JSON-LD (step_id: alt-02)
3. Click 'Shop all Marketing Prints' in the sibling row (step_id: alt-03)

**Expect:** `noindex, follow` with a self-canonical, a 4-level BreadcrumbList sourced from the
API's `ancestors` (the URL itself is flat), and the parent reachable in one click.

### Parent that also owns a direct product shows both levels
**Seed:** qa-pipeline/playwright/specs/seed.spec.ts
**Steps:**
1. Load /products/stickers-labels (1 direct product + 1 child) (step_id: alt-04)
2. Check the subcategory tile and the grid together (step_id: alt-05)

**Expect:** A 'Die-cut Stickers' tile plus BOTH the direct product `test` and the descendant
`Custom Die-Cut Stickers` in the grid; rollup must not hide the parent's own product.

### A moved product's old URL 308s to its canonical path
**Seed:** qa-pipeline/playwright/specs/seed.spec.ts
**Steps:**
1. Request the old URL /products/stickers-labels/custom-diecut-stickers without following redirects (step_id: alt-06)
2. Follow to the canonical PDP and read the breadcrumb (step_id: alt-07)
3. Read the Product JSON-LD on the canonical PDP (step_id: alt-08)
4. Read the PDP canonical link (step_id: alt-09)

**Expect:** A real HTTP 308 to /products/die-cut-stickers/custom-diecut-stickers; a 5-level
breadcrumb; Product JSON-LD `category` = 'Stickers & Labels > Die-cut Stickers'; the canonical
agreeing with the redirect target.

### Header mega-menu and mobile drawer expose the 2-level tree
**Seed:** qa-pipeline/playwright/specs/seed.spec.ts
**Steps:**
1. At desktop width, open the header 'Shop' panel (step_id: alt-10)
2. At 375px width, open the mobile drawer and expand a parent row (step_id: alt-11)

**Expect:** Both surfaces nest children under their parents, and the drawer's disclosure
button swaps its accessible name between 'Show …' and 'Hide … subcategories'.

### Discovery surfaces that must stay top-level only
**Seed:** qa-pipeline/playwright/specs/seed.spec.ts
**Steps:**
1. On the homepage, inspect the 'All Categories' rail (step_id: alt-12)
2. On /search with no query, inspect the 'Browse by Category' grid (step_id: alt-13)
3. On a listing page, inspect the sidebar Category filter (step_id: alt-14)
4. Scan every product card on the homepage for repeats (step_id: alt-15)

**Expect:** Rail and search grid show the 6 roots only; the filter sidebar shows children
indented under their parent; no product card is repeated across homepage shelves.

### Machine-readable SEO surfaces
**Seed:** qa-pipeline/playwright/specs/seed.spec.ts
**Steps:**
1. Fetch /sitemap.xml and inspect the <loc> set (step_id: alt-16)
2. Fetch /robots.txt (step_id: alt-17)
3. Fetch /llms.txt (step_id: alt-18)
4. Check the footer and /contact phone numbers against the SEO constant (step_id: alt-19)
5. Confirm no loading.tsx exists anywhere under app/products/ and the listing skeleton comes from the page's own Suspense boundary (step_id: alt-20)

**Expect:** The parent is in the sitemap, the thin children are not, their products still are;
robots and llms.txt render; the phone number is `+91 95281 91807` everywhere; zero
`loading.tsx` under `app/products/`, which is what keeps alt-06's 308 and err-01/02's 404 real.

## Subcategories and category SEO — error paths

### Unknown category slug returns a real 404
**Steps:** 1. Request /products/nope-category (step_id: err-01)
**Expect:** HTTP 404, not a soft-404 with status 200.

### Junk category segment on a valid product returns a real 404
**Steps:** 1. Request /products/bogus-cat/custom-diecut-stickers (step_id: err-02)
**Expect:** HTTP 404 — `isKnownCategorySlug` refuses to mint a cached 308 per junk prefix.

### Facet params make an indexable category noindex and canonical back to base
**Steps:** 1. Load /products/marketing-prints?sort=price_asc (step_id: err-03)
**Expect:** `noindex, follow` and canonical `<SITE_URL>/products/marketing-prints`.

### A search submitted from a category page hands off to the unscoped listing
**Steps:** 1. Load /products/marketing-prints?q=flyers (step_id: err-04)
**Expect:** Redirect to /products?q=flyers.

### An unrecognised sort value is ignored rather than emptying the listing
**Steps:** 1. Load /products/marketing-prints with ?sort=bogus, ?sort=price_asc and ?sort=toString (step_id: err-05)
**Expect:** Each renders the same products as the bare listing, and `?sort=price-asc` still sorts.
Regression guard for a **real defect this run found and had fixed**: an unmapped sort went out
as the literal string `sort_by=undefined`, the backend 422'd, `getProducts` swallowed it and
the page served an empty grid at HTTP 200.

### An unrecognised badge value is ignored rather than emptying the listing
**Steps:** 1. Load /products/marketing-prints with ?badge=bogus, ?badge=toString and ?badge=__proto__ (step_id: err-06)
**Expect:** Each matches the bare listing; `?badge=sale` stays legitimately empty (it maps to
`on_sale=true` and neither product is discounted), which is what proves only *unrecognised*
values were dropped. Same defect class as err-05 on the other first-class `FACET_PARAMS` entry.

## Not generated — unvalidated edge cases

- **Two `<nav>` landmarks share the accessible name '`<Parent>` subcategories'** on a parent
  page (`CategoryChipBar`'s row nav and `SubcategoryTiles`). `existing_validation: null` —
  confirmed live (2 occurrences on /products/marketing-prints). Left to the Analyzer as an
  axe `landmark-unique` / screen-reader-ambiguity recommendation rather than asserted as
  intended behaviour. The specs below never locate by that aria-label alone for the same reason.
- **Homepage dominant-root shelf splitting (`DOMINANT_SHARE = 0.6`)** is latent on this
  catalog: 9 products over 6 roots means no root is dominant, so the child-promotion branch
  cannot be reached without re-parenting real products. Only `dedupeShelfProducts` is
  exercised (alt-15).
- **An indexable subcategory** (>= 3 rolled-up products) has no live fixture; all three dev
  children hold 1 product. Asserting "a child that IS in the sitemap" would require moving
  real products, which this run is forbidden from doing.
- **Pagination of a rolled-up parent** (`?page=2`, and the `isFirstPage` suppression of
  `seo_body`/FAQs) is unreachable: largest category is 3 products against `PAGE_SIZE = 12`.
- **`seo_body` long-form prose, `google_product_category`, and the admin `noindex` flag** are
  unset on every dev category, so those branches of `CategorySeoBody` and
  `isCategoryIndexable` are covered by Vitest only.
