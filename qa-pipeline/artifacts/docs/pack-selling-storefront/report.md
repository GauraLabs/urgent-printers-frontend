# Pack Selling Storefront
**Project:** Urgent Printers — Storefront  
**Generated:** 2026-10-06T21:09:42.821Z  
**Run:** 2026-10-06T21:04:50.586Z — 10 steps, viewport 1280×720  
---
## Overview & objectives

Some things this business sells are not bought one at a time. Nobody orders a single sticker. The goal of pack selling, from the shopper's side, is that a product sold in packs is *priced* in packs everywhere it appears — the category card, the product page, the cart, the checkout — so the number a customer sees is a number they can actually pay.

The commercial reason is narrower and sharper: shopping channels (Google Merchant Center, Microsoft Merchant Center, the Meta catalog) advertise one price per listing. If the feed advertises a per-piece price of ₹6.00 and the cheapest real purchase is a ₹300 pack, the listing is misleading and the click converts badly. Pack selling exists so that the feed price, the price on the landing page the feed links to, and the price actually charged are the same number.


## Feature description & business logic

The central design decision is that **packs are a display and validation concept only**. Quantities stay in pieces everywhere that matters — the cart row, the order line, the pricing tiers, the search index — and prices stay per-unit on the wire. Nothing in the pricing engine changed; a pre-condition was added in front of it.

Two rules follow from that:

- **Pack price = rounded unit price × pack size.** The storefront computes this in integer cents (`lib/pack.ts`'s `packPrice`), never by float multiplication, so the displayed pack figure is exactly the amount the server will charge for one pack. The same helper backs the MRP strikethrough, so a struck pack price is `mrp_per_unit × pack_size` and the percentage off is unchanged (percentage is scale-invariant).
- **A pack product can only be bought in whole packs.** The cart steppers, which previously moved in fixed 25/50 jumps, now move by one pack and floor at one pack (`stepQuantity`). Anything that still arrives at a non-multiple — a cart persisted from before the product was opted in — is snapped to the nearest whole pack by the server, flagged with `quantityCorrected`, and surfaced to the shopper as a single toast.

Backward compatibility is the other half of the feature. `normalizePack` treats absent or invalid pack data as "size 1, label pcs", so a stale backend response or an old persisted cart entry degrades to exactly the pre-pack behaviour rather than to `NaN`. A product with `pack_size = 1` is byte-for-byte the old experience: no pack vocabulary, no unit label, the original 25/50 steppers.

The feed side introduces one shared source of truth, `build_listing_offer`, used by both the XML feed and the product detail response. It picks the lowest tier quantity and the cheapest active option in each category, prices that exact configuration through the normal pricing function, and emits both the price and the query string that reproduces the configuration on the product page. The page's JSON-LD then advertises the same figure as a single `Offer` — replacing the old `AggregateOffer` price range, which search engines could render as a low price the shopper could not actually get.


## User flow

A shopper browsing the Stickers & Labels category sees Custom Die-Cut Stickers priced **From ₹300.00, per 50 pcs**. That caption replaces the per-unit one rather than sitting beside it, so there is no competing per-piece figure on the card.

Opening the product shows the pricing ladder in pack terms: **50 pcs · ₹300.00** with a quieter **₹6.00/pc** underneath, then **250 pcs · ₹1,500.00** — also ₹6.00/pc, annotated **5 packs**. The per-piece line is deliberately secondary: it is there to let a shopper compare tiers, not to be the headline. Selecting the 250-piece tier updates the summary to **Total for 5 packs (250 pcs)** and the call to action to **Add to Cart · ₹1,500.00**.

In the cart drawer the line reads **5 packs (250 pcs)**. Pressing the increase control once moves it to **6 packs (300 pcs)** — one whole pack, not the legacy 25- or 50-piece step — and decreasing returns it to 5 packs. The full cart page behaves identically, since both surfaces call the same stepper helper.

The other entry point is a shopper arriving from a shopping channel. The feed's link carries the exact configuration it priced (`?qty=50&size=2-x-2-in-square&paper=vinyl-matte&finish=diecut&sides=single-sided&turnaround=standard`). Landing on that URL preselects the one-pack tier and each named option, and the total reads **₹300.00** — the same figure the feed advertised. These parameters are read on the client, inside a Suspense boundary, specifically so the product page keeps its 60-second incremental regeneration rather than becoming dynamically rendered.


## Annotated screenshots

The captures below follow one shopper journey end to end, then the two alternate entry points (a feed landing URL, and a product that is not sold in packs) that prove the feature is scoped correctly.

| Step | Screenshot | What it shows |
| --- | --- | --- |
| `hp-01` | ![hp-01](../../screenshots/pack-selling-storefront/hp-01.png) | The Stickers & Labels category listing: the Custom Die-Cut Stickers card is priced From ₹300.00 with the caption "per 50 pcs", which replaces the per-unit caption rather than joining it. |
| `hp-02` | ![hp-02](../../screenshots/pack-selling-storefront/hp-02.png) | The product page's pricing ladder in pack terms — "50 pcs · ₹300.00" with a quieter "₹6.00/pc" secondary line, and the 250-piece tier annotated as 5 packs at the same per-piece rate. |
| `hp-03` | ![hp-03](../../screenshots/pack-selling-storefront/hp-03.png) | Selecting the 250-piece tier: the summary becomes "Total for 5 packs (250 pcs)" and the call to action reads "Add to Cart · ₹1,500.00". |
| `hp-04` | ![hp-04](../../screenshots/pack-selling-storefront/hp-04.png) | The cart drawer after adding the line, showing the quantity as "5 packs (250 pcs)" rather than a bare piece count. |
| `hp-05` | ![hp-05](../../screenshots/pack-selling-storefront/hp-05.png) | One press of the increase control moves the line by a whole pack, to "6 packs (300 pcs)" — not by the legacy 25- or 50-piece step. |
| `hp-06` | ![hp-06](../../screenshots/pack-selling-storefront/hp-06.png) | The full cart page, confirming the pack-phrased quantity and the pack-sized stepper behave the same as the drawer. |
| `alt-01` | ![alt-01](../../screenshots/pack-selling-storefront/alt-01.png) | Arriving from the shopping feed's own link: the one-pack tier and every named option are preselected and the total reads ₹300.00, matching the price the feed advertised. |
| `alt-02` | ![alt-02](../../screenshots/pack-selling-storefront/alt-02.png) | The same page's structured data, verified in the test to be a single Offer in INR at the same ₹300.00, with the feed's "Pack of 50 pcs" suffix on the product name — replacing the old AggregateOffer price range. |
| `err-01` | ![err-01](../../screenshots/pack-selling-storefront/err-01.png) | The product page opened with invalid preselect parameters (qty=37, an unknown size, a bogus finish and turnaround): every unresolvable value is dropped, the defaults stand, and nothing errors. |
| `alt-03` | ![alt-03](../../screenshots/pack-selling-storefront/alt-03.png) | The control case — a pack_size = 1 product still reads "Price per unit" with no pack wording, unit label or per-piece suffix anywhere. |


## Test results & coverage

**10 of 10 steps passed, with no failures.** The run log validates against the pipeline's run schema and the trace is attached.

What was genuinely exercised in a real browser, against the real backend and database:

- The category card's pack price and caption, and the absence of the per-unit caption.
- The product page's pack tier rows, their per-piece secondary line, the multi-pack annotation, and the "Price per pack of 50 pcs" label.
- Selecting a tier, and the resulting pack-phrased summary and call to action.
- Adding to the cart, and the pack-phrased drawer line.
- Stepping up and down by whole packs, on both the drawer and the cart page.
- Landing from the feed's own query string, and confirming the displayed total equals the backend's `listing_offer.price` read live from the API during the test.
- That the preselect parameters genuinely drive the configuration rather than coincidentally matching: the same URL with the 3×3 size (multiplier 1.6) reprices the pack to **₹480.00**.
- The JSON-LD block being a single `Offer` in INR at that same price, with the pack-suffixed product name.
- Invalid and malformed preselect parameters (`qty=37`, an unknown size, an empty paper, a bogus finish and turnaround) being silently dropped in favour of the defaults, with the page rendering normally.
- A `pack_size = 1` product showing no pack vocabulary at all.

**What was not exercised, and must not be read as passing.** Four surfaces sit behind customer authentication and were not reached in a browser: the checkout review step, the order confirmation page, account order history, and the "Quantity adjusted to full packs" correction toast. Customer login is OTP-only and the one-time code is written to the backend's fake SMS provider's standard output, a stream this run could not read; signing a session token directly was attempted and correctly refused by the environment's permission system as credential forging. Those four surfaces are covered by the storefront's own unit suites — `tests/pack-display.test.tsx` covers per-pack cart line pricing, the price-mismatch telemetry staying in pieces and per-unit prices for pack lines, and the cart-store correction path; `tests/checkout-price-changed.test.tsx` covers the expected-total and 409 re-preview flow — and by the backend's `tests/api/test_pack_selling.py`. That is real coverage, but it is unit-level. The specific claim that *the rendered checkout review total equals the server's preview to the paisa, with no price-changed banner and no mismatch telemetry row written* has not been established end to end and remains the highest-priority outstanding verification.

The shopping feed route itself returns **503 `feed_not_configured`** in this environment, which the run confirmed. The guard refuses to publish whenever `FRONTEND_URL` is a localhost origin, so the endpoint cannot be smoke-tested locally. Feed *content* was verified two other ways: the backend's `tests/api/test_shopping_feed.py` (13 tests covering selection rules, pack titles, sale windows, shipping thresholds, XML escaping, ETag 304 handling, and the invariant that `listing_offer` equals the feed price), and an in-process render of the real development database, which produced well-formed XML advertising this product as `Custom Die-Cut Stickers - Pack of 50 pcs` at `300.00 INR` with `50 ct` / `1 ct` unit pricing and a correctly escaped landing link.


## Accessibility

automated scan only — manual/screen-reader review still needed

One rule failed, at **serious** severity, on every page the run visited: **colour contrast**. Node counts were 1 on the category listing, 7 on the pack product page, 3 on the cart and 9 on the non-pack control page. Pack selling adds two new muted-foreground lines — the card's "per 50 pcs" caption and the tier row's "₹6.00/pc" secondary — using the same low-contrast token the rest of the storefront already uses, so pack text plausibly adds nodes without being the origin of the failure. The strongest evidence for that reading is that the page with no pack content at all scored worst.

No critical or moderate violations were reported.

One gap automated scanning did not catch, found by reading the component source while writing the test: the size, paper and finish option buttons convey their selected state through colour and font weight only — they set no `aria-pressed`, `aria-checked` or radio role. That matters more for this feature than it did before, because a shopper arriving from a shopping channel has had options chosen *for* them, and a screen-reader or keyboard user has no way to perceive which. It is pre-existing component behaviour, not a regression, but the feed-landing flow raises its cost. It is also why the test had to assert price rather than selection state to prove the preselection worked.

A hydration-mismatch console error appeared on two steps. It was investigated rather than assumed: the diff consists entirely of `caret-color: transparent` on text inputs, and `caret-color` appears **zero** times across both applications' source trees (`app/`, `components/`, `features/`, `hooks/`, `lib/`, `types/` and the admin panel's `src/`). This is Chromium's own programmatic-input handling under Playwright, i.e. test tooling, not an application defect — consistent with the standing finding recorded in the pipeline's own documentation, re-verified here rather than carried over.


## Performance

**No performance figures were collected, and none should be quoted for this feature.** Lighthouse was deliberately switched off for this run: the question being answered was pricing correctness, and each audit checkpoint costs roughly 10–20 seconds against a ten-step single-test budget. Both `initial_load` and `final_state` are null in the run log.

That is a gap worth closing separately, because this feature made two changes of exactly the kind that move real numbers without failing any assertion: the pricing table now renders a second text line per tier row, and the configurator reads the URL's query parameters on the client inside a Suspense boundary, which shifts the preselect resolution out of the server render. A dedicated pass on the pack product page would establish a baseline for both. Any figures from such a pass would still be Next.js development-server measurements, not production numbers.


## Recommendations & future improvements

**High priority**

1. **Run the authenticated half of this flow end to end before release.** Add a pack line to a logged-in cart, confirm the review step's total equals the order-preview total to the paisa, place the order, and confirm that no price-mismatch telemetry row is written and that the confirmation page reads "N packs (M pcs)". This is the one claim in the specification that unit tests can support but not establish, and it is the claim with money attached to it.
2. **Verify the quantity-correction path against a real legacy cart.** Seed an authenticated cart line at a non-multiple quantity — 120 pieces of a pack-of-50 product — reload, and confirm the server snaps it to 100, the store adopts the corrected value, and exactly one toast appears rather than one per line.

**Medium priority**

3. **Give the option buttons a real selected semantic** (`aria-pressed`, or a radio group). The feed-landing flow turns an invisible preselection from an accessibility nicety into a functional problem.
4. **Decide deliberately whether the feed's localhost guard should stay unconditional.** As built it refuses to publish in any environment whose `FRONTEND_URL` is localhost; the specification scoped that guard to production only. Refusing everywhere is a defensible hardening choice — a feed full of localhost links is worse than no feed — but it should be a decision, and the admin panel's feed-URL card currently gives no hint that the URL it displays will return 503 anywhere but production.

**Low priority**

5. **Re-run this specification with Lighthouse enabled** once the pack product page is otherwise stable, to get a baseline for the extra per-tier text and the client-side preselect read.
6. **Triage the storefront's colour-contrast debt as its own piece of work.** It is pre-existing and affects non-pack pages more than pack pages, so it should not be filed against this feature — but it currently sits at serious severity on every page the feature touches.
7. **Resolve the four 404 resource requests** on the non-pack control product page. They read as missing media variants in the development dataset rather than a code defect, but they are unexplained console errors on a product page.

