# Quantity Pricing (Storefront)
**Project:** Urgent Printers — Storefront  
**Generated:** 2026-10-07T17:19:12.753Z  
**Run:** 2026-10-07T17:14:01.442Z — 28 steps, viewport 1280×720  
---
## Overview & objectives

Customers can now order **exactly the quantity they want** of any printed product, see the price for that quantity update as they type, and be told when buying a few more pieces would actually cost less.

This replaces the old model, where a customer could only pick one of a handful of fixed quantity rows (and, before that, whole packs). The business goal is twofold: stop losing orders to a quantity that simply was not offered, and use the tier guide and the price-jump nudge to move order values toward the next cheaper rate — a nudge that pays for itself whenever a customer adds one more piece to cross a tier boundary.


## Feature description & business logic

Three optional per-product settings drive everything, and all three default to something sensible so that **no product needs editing to benefit**:

| Setting | What it controls | Automatic value |
|---|---|---|
| `listing_quantity` | The quantity the card, search, feed and structured data price, and the quantity the product page opens on | the effective minimum |
| `min_order_quantity` | The smallest orderable quantity | the lowest pricing tier's quantity |
| `max_order_quantity` | The largest orderable quantity | none (an internal ceiling of 1,000,000 that is never displayed) |

The price for any quantity is the **highest pricing tier at or below that quantity**, multiplied by the selected options, rounded to the paisa per piece and only then multiplied by the quantity. Because the rounding happens per piece before multiplication (`lib/quantity.ts`'s `priceForQuantity`, in integer cents), the storefront total is identical to the amount the server charges — this run confirmed that equality at the card, the product page, the cart line and the shopping feed for the same configuration.

A quantity below the lowest tier is legitimate and falls back to the lowest tier's rate; an administrator may deliberately set a minimum under their cheapest tier.

The **price-jump nudge** appears when the next tier up would cost the same or less in total, or at most 5% more (`NUDGE_MAX_EXTRA_PERCENT`). It considers only the immediately next tier and never caps the price automatically — the customer is always charged exactly rate x quantity.


## User flow

A customer browsing the Business Cards category sees Matte Finish Business Cards priced as a concrete offer — **"250 pcs for ₹2,250.00"**, with ₹2,500.00 struck through and a 10% off badge — rather than a vague per-unit "from" rate.

Opening the product lands them on **250 pieces already selected**: the quantity the card advertised, not the cheapest orderable amount (which is 100). The price summary immediately reads ₹9.00/pc, Total ₹2,250.00, and "You save ₹250.00 on this quantity" — exactly the figure from the card, so nothing changes under them between click and arrival.

Under the field, a hint reads "Min 100 pcs". This product has no maximum, so no maximum is shown; the internal ceiling is never surfaced. Below that, a **rate-by-quantity guide** shows every tier as a chip — 100+ ₹12.60/pc, 250+ ₹9.00/pc, 500+ ₹6.75/pc, 1,000+ ₹4.95/pc (starred as best value), 2,500+ ₹4.05/pc — with the chip covering the current quantity filled in.

The customer types **499**. The price follows live, with no error and no reload: still the 250 tier, so ₹9.00/pc and ₹4,491.00. A nudge then appears: **"Add 1 more pc and pay ₹6.75/pc: ₹3,375.00 total (you save ₹1,116.00)"** — one extra piece crosses into the 500 tier and costs ₹1,116 *less* overall. One tap on "Add 1 more" moves the quantity to 500, animates the total down to ₹3,375.00, moves the highlight to the 500+ chip, and the banner disappears because its job is done.

Adding to the cart carries the live total onto the button itself. On the cart page — and equally in the cart drawer — the quantity stays editable within the same limits and reprices on the spot: 500 down to 250 returns the line to ₹2,250.00; typing 5 in the drawer snaps back to the minimum of 100 rather than erroring.


## Guided input: typing is never punished

The central design rule is that **a customer typing a quantity is never shown an error**. Every out-of-range value is guided, not rejected:

- Typing **10** where the minimum is 100 shows a neutral amber helper line — "Minimum order is 100 pcs" — in a muted tone with no icon and no destructive red. The price keeps working off the clamped value, and Add to Cart stays enabled: an out-of-range value is clamped when clicked, never blocked.
- **Blurring or pressing Enter** snaps the field to the allowed value and says so: "Adjusted to 100 pcs", which clears itself after about three seconds.
- Typing **9999** against a maximum of 1,000 behaves symmetrically — "Maximum order is 1,000 pcs", then "Adjusted to 1,000 pcs" on blur.
- **Letters are stripped as typed**, and input is capped at seven digits, so a pasted nine-digit number becomes seven and is then clamped.
- An **empty field** is the only state that disables the call to action, which relabels to "Enter a quantity". Blurring an empty field restores the last valid quantity — it is never destructive.

The only error a customer can ever see is a server rejection from a stale client, surfaced as a toast.


## Advertised price integrity (feed, structured data, search)

The price advertised off-site is the price the customer lands on. Opening the product page with the shopping feed's own preselect query string (`?qty=1000`) initialises the configurator at 1,000 pieces, at ₹4.95/pc and ₹4,950.00, with the 1,000+ chip current. An out-of-range preselect is clamped into range rather than honoured literally or rejected.

The page's JSON-LD `Product` block names **"Matte Finish Business Cards - 250 pcs"** and carries a single offer at **2250.00 INR** — the listing quantity and its price, not whatever quantity happens to be preselected, which is what a shopping surface should index. The generated feed agrees exactly: titles render as `Matte Finish Business Cards - 250 pcs` and `Custom Die-Cut Stickers - 50 pcs`, with `g:price` 2500.00 INR, `g:sale_price` 2250.00 INR and unit pricing of `250 ct` per `1 ct`.

The header search dropdown and the search results page render the same "250 pcs for ₹2,250.00" line through the shared price component.


## Annotated screenshots

Screenshots are captured at 1280x720 against the local development server. Note that product imagery does not resolve in this environment (the CDN is remote), so the image panes show placeholders; this is an environment artefact, not a defect in the feature.

| Step | Screenshot | What it shows |
| --- | --- | --- |
| `hp-01` | ![hp-01](../../screenshots/quantity-pricing-storefront-happy-path/hp-01.png) | The category listing: the card prices a concrete offer, "250 pcs for ₹2,250.00", with the listing MRP struck through and a 10% off badge — no per-unit "from" wording. |
| `hp-02` | ![hp-02](../../screenshots/quantity-pricing-storefront-happy-path/hp-02.png) | The product page opens with 250 already in the quantity field — the quantity the card advertised, not the product's minimum of 100. |
| `hp-04` | ![hp-04](../../screenshots/quantity-pricing-storefront-happy-path/hp-04.png) | The live price summary at the advertised quantity: ₹9.00/pc, Total ₹2,250.00, and "You save ₹250.00 on this quantity" — identical to the card's figure. |
| `hp-05` | ![hp-05](../../screenshots/quantity-pricing-storefront-happy-path/hp-05.png) | The rate-by-quantity guide, with the 250+ chip filled to show it covers the current quantity and a star marking the best-value tier. |
| `hp-07` | ![hp-07](../../screenshots/quantity-pricing-storefront-happy-path/hp-07.png) | Typing 499 reprices live to ₹4,491.00, and the price-jump nudge offers one more piece for ₹3,375.00 total — a ₹1,116.00 saving for crossing into the 500 tier. |
| `hp-08` | ![hp-08](../../screenshots/quantity-pricing-storefront-happy-path/hp-08.png) | After one tap on "Add 1 more": quantity 500, rate ₹6.75/pc, total ₹3,375.00, the highlight moved to the 500+ chip, and the nudge gone because its tier has been reached. |
| `hp-11` | ![hp-11](../../screenshots/quantity-pricing-storefront-happy-path/hp-11.png) | The cart page: editing the line from 500 back to 250 reprices immediately to ₹2,250.00, using the same tier lookup as the product page. |
| `hp-12` | ![hp-12](../../screenshots/quantity-pricing-storefront-happy-path/hp-12.png) | The cart drawer is an independent consumer of the same quantity control and behaves identically — editing to 1,000 reprices to ₹4,950.00, and typing 5 snaps back to the minimum. |
| `err-01` | ![err-01](../../screenshots/quantity-pricing-storefront-guided-input/err-01.png) | Typing 10 below a minimum of 100 produces a neutral amber helper line, not an error: the price keeps working and Add to Cart stays enabled. |
| `err-03` | ![err-03](../../screenshots/quantity-pricing-storefront-guided-input/err-03.png) | The symmetric case above a maximum — "Maximum order is 1,000 pcs" — on the product whose 1,000-piece limit was set from the admin panel earlier in this run. |
| `err-04` | ![err-04](../../screenshots/quantity-pricing-storefront-guided-input/err-04.png) | An empty quantity field is the only state that blocks the call to action, which relabels to "Enter a quantity". |
| `alt-01` | ![alt-01](../../screenshots/quantity-pricing-storefront-preselect-and-limits/alt-01.png) | The shopping feed's preselect link (?qty=1000) lands on exactly 1,000 pieces at ₹4.95/pc and ₹4,950.00 — the advertised configuration is the one the customer arrives at. |
| `alt-06` | ![alt-06](../../screenshots/quantity-pricing-storefront-preselect-and-limits/alt-06.png) | A product whose tiers carry no MRP: the card reads "50 pcs for ₹300.00" with the strike-through and discount badge correctly suppressed entirely. |
| `alt-08` | ![alt-08](../../screenshots/quantity-pricing-storefront-preselect-and-limits/alt-08.png) | The tier guide renders stored rates faithfully even when they are not monotonic — here the 100+ tier is dearer per piece than 50+, reflecting the underlying product data. |


## Test results & coverage

**28 of 28 steps passed; 0 failed.** Four specs were exercised against the real backend and the real development database: the happy path (12 steps), feed preselect and stepping (5), a maximum-limited product with no MRP (4), and guided out-of-range input (7).

What was genuinely verified end to end: the card's quantity-priced line and its suppression of discount furniture when no tier carries an MRP; the product page opening on the listing quantity rather than the minimum; live repricing equal to per-piece tier rate x quantity; the tier guide's highlighted chip and its use as a one-tap quantity picker; the nudge's appearance, its exact arithmetic and its accept button; stepping snapped to the quantity step derived from the minimum; clamping of out-of-range preselects; JSON-LD parity with the card; and quantity edits repricing in both the cart page and the cart drawer, each respecting the product's own limits.

The nudge's **negative** case was deliberately tested too: at 99 pieces of a product whose next tier is dearer in total, no nudge is offered — correct, and more reassuring than only ever testing the positive case.

**What was not exercised, and should not be read as passing:** everything after the cart. Checkout, order placement, the order confirmation page and account order history were not tested at all, because customer authentication is OTP-only and this run had no way to read the delivered code. The backend's reject-never-clamp behaviour for orders is covered by unit and API tests only. Likewise the server-correction toast (`quantityCorrected`) is unreachable through the browser — the cart's add and update paths reject rather than clamp, so no out-of-range line can be created through the UI to trigger it.


## Accessibility

**automated scan only — manual/screen-reader review still needed.** Automated tooling typically catches only 30-40% of real accessibility issues, so a clean automated result is not evidence of compliance.

**No critical violations** were found on any route this run exercised.

**Serious:** `color-contrast`, 58 nodes across the category listing, the product page and the cart. This is a pre-existing, site-wide theme issue rather than something this feature introduced — the same violation at comparable density was recorded on the product-catalog and pack-selling runs, and it appears on the category listing, which contains none of this feature's controls. That said, the quantity controls' own text (the amber helper line, the tier chips, the nudge banner) sits inside that total, and muted amber on a tinted background is exactly the combination the rule flags. It should be re-measured specifically once the theme tokens are addressed.

On the positive side, the quantity field itself is well-formed for assistive technology: it carries `aria-label="Quantity"`, its helper line is a live `role="status"` region linked by `aria-describedby`, the increment and decrement buttons are named, and the current tier chip is marked `aria-current`.


## Performance

**No performance numbers were captured.** Lighthouse was deliberately disabled for every spec in this run, so there are no figures to report rather than figures to caveat. Any future measurement should be labelled as Next.js **development-server** numbers, not a production build, and treated only as a run-over-run baseline.

What can be said from the run itself: repricing as the customer types is pure client-side arithmetic in integer cents with a 150 ms debounce and **no network request**, so typing imposes no server load. Cart line edits do round-trip to the server, and both the cart page and drawer edits settled promptly with no stale-write or debounce problems observed across 28 steps.


## Recommendations & future improvements

**High — resolve the card-versus-page price promise.** The card drops the word "From" and prices a specific quantity at the *cheapest* option combination, while the product page opens on the product's *default* options. Where those differ, the customer sees the price rise between click and landing: Premium Foil Business Cards would advertise ₹5,040.00 (Spot UV, x2.0) and open at ₹6,300.00 (Gold Foil, x2.5), and A2 Posters is the same shape (₹150 advertised, ₹250 on open). The two products carrying this run's main flows happen to have identical cheapest and default multipliers, which is why the run is green — this is a latent trap, not a visible break. Either open the page on the combination the card advertised, or restore a qualifier to the card.

**Medium — make the tier chips look interactive.** Tapping a chip sets the quantity, but the chips carry no affordance saying so and sit next to a nudge that *does* have an explicit button, which makes them read as a passive legend. Customers who do not discover this lose the quickest route to a cheaper rate.

**Medium — cover the post-cart leg.** Provision a test customer whose OTP is readable in development, or add API-level assertions that order preview and create reject `quantity_below_minimum` / `quantity_above_maximum` and that new order lines carry `unit_label`. Today the money path is verified only as far as the cart.

**Medium — re-measure contrast on this feature's own controls** once the site-wide theme work happens; the 58-node total is dominated by pre-existing page chrome and currently hides whether the new controls pass on their own.

**Low — file the FilterControls hydration mismatch** on the category listing as its own defect. It is unrelated to quantity pricing (no quantity control is in that subtree) and is a genuine server/client markup divergence, not the known tooling noise, but this run reproduced it on every category visit.

**Low — enable Lighthouse once** on the product page, so a page that now does continuous client-side repricing has a baseline.

