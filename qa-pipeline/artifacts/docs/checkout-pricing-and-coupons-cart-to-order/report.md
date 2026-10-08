# Checkout Pricing and Coupons (Cart to Order)
**Project:** Urgent Printers — Storefront  
**Generated:** 2026-10-08T03:59:13.127Z  
**Run:** 2026-10-08T03:53:31.873Z — 43 steps, viewport 1280×720  
---
## Overview & objectives

A customer configures a print product, collects a few of them, applies a coupon, and pays. The goal of this run was narrow and unforgiving: **every rupee the storefront shows must equal the figure the server computes**, at every step from the product page to the order record a staff member later opens in the admin panel.

That matters because this is the last screen before money changes hands. A total that drifts by a rounding step, a coupon that discounts more than it should, or a shipping charge that appears after the customer has already read "Free" are all failures the business pays for directly — in margin if the number is too low, in abandoned carts and support tickets if it is too high.

The run covered the whole chain on the storefront (`urgent-printers-frontend`, branch `feat/quantity-pricing`) against the real FastAPI backend: product-page pricing across option multipliers, turnarounds and quantity tiers; cart editing and limits; the GST-inclusive review breakdown; fourteen coupon scenarios; two real orders; the handoff amount to Razorpay; and the one genuinely dangerous window — a price edited by an admin while the customer sits on the review step.


## Feature description & business logic

All money on this platform is computed in exactly one place on the server: `app/services/pricing.py::compute_item_pricing`. The cart, the order preview and order creation all call it, so a price cannot be derived one way in the cart and another way at checkout. The rules it applies, all confirmed against live responses during this run:

- **Tiered per-piece rates.** The charged rate is the highest pricing tier whose quantity the customer has reached. 249 business cards pay the 100+ rate of ₹12.60/pc (₹3,137.40); one more piece drops the whole line to the 250+ rate of ₹9.00/pc (₹2,250.00).
- **Option multipliers compound, then round once.** Size, paper, finish and sides each carry a multiplier that is applied to the tier rate and quantized HALF_UP to the paisa *before* multiplying by quantity. Stacking every upgrade on the business cards gives 9.00 × 1.1 × 1.1 × 1.3 × 1.4 = 19.8198 → **₹19.82/pc**, i.e. ₹4,955.00 for 250 — the exact figure the server returned for the same configuration.
- **Turnaround surcharges are per line, not per piece.** Express on the business cards adds a flat ₹150 once: the rate stays ₹9.00/pc and the line becomes ₹2,400.00.
- **MRP and the discount window.** A tier's `mrp_per_unit` is the list price and `price_per_unit` the sale price; a product-level window decides which one the customer actually pays. Inside the window the storefront strikes the MRP and shows the percentage off; outside it, the MRP is what gets charged and no discount is advertised at all.
- **Prices are GST-inclusive.** The 18% GST shown on the breakdown is the tax already embedded in the amount payable (`taxable − taxable/1.18`), not an addition to it. Shipping sits outside that figure.
- **Shipping is free from ₹999 inclusive**, charged at ₹99 below it — and the threshold is tested against the total *after* any coupon, which is why a coupon can bring shipping back.
- **Coupons** are percentage or fixed, optionally capped, optionally floored by a minimum order value, optionally limited globally or per customer, optionally scoped to exclude items already on sale. The discount is always clamped into `[0, basis]`, and the basis is the full subtotal unless the coupon excludes discounted items — in which case it is only the lines that are not already on sale.
- **The review step is advisory until the server agrees.** The page fetches an authoritative order preview, adopts its line prices if they differ from the cart, and sends the total the customer was actually looking at as `expectedTotal` when placing the order. If the server now computes something else it answers `409 price_changed` and creates nothing.


## User flow

The customer signs in (email and password here; the phone tab is Firebase-backed and not drivable in this environment) and opens the Matte Finish Business Cards page. It opens on the advertised listing quantity of 250 at ₹9.00/pc — ₹2,250.00 — with ₹10.00 struck through and "10% off" beside it, because that product's discount window is currently open. Changing the size to the square format moves the rate to ₹9.90/pc; stacking the heavier paper, UV coating and double-sided printing takes it to ₹19.82/pc. Backing the options out again and choosing Express shows the surcharge behaving correctly: the rate stays ₹9.00/pc and only the line total moves, by ₹150.

Typing quantities either side of a tier boundary reprices live. The customer settles on 250 standard cards, adds them, then adds 100 die-cut stickers (₹1,000.00) and 250 express A5 flyers (₹1,200.00).

The cart totals ₹4,450.00 with free shipping and "Incl. GST: ₹678.81". Applying `QA-CHECKOUT-PCT10` takes ₹445.00 off, leaving ₹4,005.00 and GST of ₹610.93, and the savings panel adds the ₹250.00 of MRP discount to the ₹445.00 coupon for a stated ₹695.00 saved.

Checkout is three steps: the saved address, the payment method, then review. The review step fetches the server's own preview and every line of the breakdown matches it to the paisa — subtotal, coupon, after-coupon, shipping, embedded GST, grand total and savings — with no "prices have been updated" banner, because nothing had changed. Placing the order lands on the confirmation page with the same figures and the order number, and the same order read back from account history shows identical quantities, option labels, per-unit prices, line totals, coupon, shipping, GST and total.

The other three journeys branch off the same cart: editing quantities on the cart page and in the drawer (including clamping a typed 1,500 down to the product's 1,000 maximum), walking the free-shipping threshold from ₹594.00 to ₹1,000.00 to exactly ₹999.00 and back below it with a coupon, working through every coupon rejection, and finally having an admin change a price while the review step is open.


## Annotated screenshots

Screenshots below are the capture fixture's own frames, one per recorded step, in run order across the four journeys (happy path, cart edits and shipping thresholds, coupon error paths, mid-checkout price change). The money visible in each frame is the figure that was asserted against the server's response for the same inputs.

Screenshots are gitignored, so a reader working from a fresh clone will see filename notes instead of images; the run log keeps the paths and bounding boxes either way.

| Step | Screenshot | What it shows |
| --- | --- | --- |
| `hp-02` | ![hp-02](../../screenshots/checkout-pricing-and-coupons-happy-path/hp-02.png) | The product page opens on the advertised 250 pieces at ₹9.00/pc — ₹2,250.00 — with ₹10.00 struck through, "10% off", and "You save ₹250.00 on this quantity", because this product's discount window is open. |
| `hp-04` | ![hp-04](../../screenshots/checkout-pricing-and-coupons-happy-path/hp-04.png) | Every option upgrade stacked: 9.00 × 1.1 × 1.1 × 1.3 × 1.4 rounds HALF_UP to ₹19.82/pc, giving ₹4,955.00 for the same 250 pieces — the exact figure the server returns for that configuration. |
| `hp-05` | ![hp-05](../../screenshots/checkout-pricing-and-coupons-happy-path/hp-05.png) | Express turnaround selected: the per-piece rate stays ₹9.00 and only the line total moves to ₹2,400.00 — the ₹150 surcharge is charged once per line, not per piece. |
| `hp-06` | ![hp-06](../../screenshots/checkout-pricing-and-coupons-happy-path/hp-06.png) | Crossing a tier boundary by typing: 249 pieces still pay the 100+ rate (₹12.60/pc, ₹3,137.40) and 250 drop to ₹9.00/pc (₹2,250.00). |
| `hp-09` | ![hp-09](../../screenshots/checkout-pricing-and-coupons-happy-path/hp-09.png) | The cart with three differently-configured products: ₹4,450.00 subtotal, free shipping above ₹999, "Incl. GST: ₹678.81", and ₹250.00 of MRP savings called out separately. |
| `hp-10` | ![hp-10](../../screenshots/checkout-pricing-and-coupons-happy-path/hp-10.png) | A 10% coupon applied in the cart: −₹445.00, "After coupon ₹4,005.00", GST recomputed to ₹610.93, and the savings panel adding the MRP discount and the coupon to ₹695.00. |
| `hp-13` | ![hp-13](../../screenshots/checkout-pricing-and-coupons-happy-path/hp-13.png) | The review step's breakdown, every row equal to the server's own order preview to the paisa — and no "prices have been updated" banner, because nothing had changed. |
| `hp-15` | ![hp-15](../../screenshots/checkout-pricing-and-coupons-happy-path/hp-15.png) | The order confirmation repeating the same figures against a real order number, including the coupon code and "Pay ₹4,005.00 in cash" for the Cash-on-Delivery method. |
| `hp-16` | ![hp-16](../../screenshots/checkout-pricing-and-coupons-happy-path/hp-16.png) | The same order re-read from account history: identical quantities, option labels, line totals, coupon, shipping, GST and grand total — the figures the admin order detail also returns. |
| `alt-03` | ![alt-03](../../screenshots/checkout-pricing-cart-edits-and-shipping-thresholds/alt-03.png) | A typed 1,500 on a product capped at 1,000: the field clamps to the maximum with a muted helper line and reprices to ₹2,500.00 at ₹2.50/pc — guidance, never a hard error. |
| `alt-04` | ![alt-04](../../screenshots/checkout-pricing-cart-edits-and-shipping-thresholds/alt-04.png) | The same line edited from the cart drawer, which is an independent consumer of the quantity control, honouring the same bounds and showing the same repriced total. |
| `alt-06` | ![alt-06](../../screenshots/checkout-pricing-cart-edits-and-shipping-thresholds/alt-06.png) | Just below the free-shipping threshold: ₹594.00 of goods, ₹99.00 shipping, "Add ₹405.00 for free", GST ₹90.61, total ₹693.00. |
| `alt-08` | ![alt-08](../../screenshots/checkout-pricing-cart-edits-and-shipping-thresholds/alt-08.png) | Exactly on the threshold: a ₹1 coupon lands the order at ₹999.00 and shipping is still free, confirming the rule is "₹999 or more" rather than "more than ₹999". |
| `alt-09` | ![alt-09](../../screenshots/checkout-pricing-cart-edits-and-shipping-thresholds/alt-09.png) | A coupon that pushes the order back under the threshold: −₹200.00 leaves ₹800.00, so ₹99.00 shipping reappears and the total becomes ₹899.00. |
| `alt-11` | ![alt-11](../../screenshots/checkout-pricing-cart-edits-and-shipping-thresholds/alt-11.png) | The Razorpay handoff: the order is created for real in test mode and the gateway is handed 89,900 paise for a server total of ₹899.00, with the order id the backend stored. |
| `err-05` | ![err-05](../../screenshots/checkout-coupon-error-paths/err-05.png) | A coupon whose ₹3,000 minimum the ₹1,000 cart does not meet: the server's own wording is shown under the field and no total changes. |
| `err-06` | ![err-06](../../screenshots/checkout-coupon-error-paths/err-06.png) | The same minimum met exactly: equality qualifies, −₹100.00 applies, and because ₹900.00 is under the free-shipping threshold the ₹99.00 shipping returns for a ₹999.00 total. |
| `err-07` | ![err-07](../../screenshots/checkout-coupon-error-paths/err-07.png) | A 50%-off coupon capped at ₹100: the discount is −₹100.00 on a ₹4,450.00 cart, not −₹2,225.00. |
| `err-08` | ![err-08](../../screenshots/checkout-coupon-error-paths/err-08.png) | A coupon that excludes items already on sale: 20% is taken from the ₹2,200.00 of full-price lines only, giving −₹440.00 — and the server's preview agrees. |
| `err-12` | ![err-12](../../screenshots/checkout-coupon-error-paths/err-12.png) | The stale-coupon gap: a ₹3,000-minimum coupon stays applied after the cart drops to ₹2,200.00, so the review step can only report "Could not confirm pricing" with the server's refusal. |
| `edge-03` | ![edge-03](../../screenshots/checkout-price-change-mid-checkout/edge-03.png) | A price raised in admin while the review step was open: placing the order is refused with 409 price_changed, nothing is created, and the banner states plainly that nothing has been charged. |
| `edge-04` | ![edge-04](../../screenshots/checkout-price-change-mid-checkout/edge-04.png) | The re-previewed total after the refusal: ₹1,100.00 with GST ₹167.80, which is what the second attempt actually charges. |


## Test results & coverage

**43 steps, 43 passing, 0 failing**, across four hand-authored Playwright specs driving the real backend. One real defect was found during the run and fixed before it closed (see Accessibility). No pricing or coupon arithmetic failure was found: every asserted amount had first been produced by the server's own `POST /orders/preview` for the same configuration, so the specs compare the UI against the backend rather than against a hand calculation.

What was verified, with the figures that were checked:

- **Product page**: four option-multiplier combinations (₹9.00 → ₹9.90 → ₹19.82/pc), both orderable turnarounds (₹0 and +₹150, surcharge applied once per line), typed quantities across a tier boundary (₹3,137.40 at 249 → ₹2,250.00 at 250), and MRP display inside an active window.
- **MRP outside the window** (verified outside the browser, by moving one product's window and restoring it): the charged unit price becomes the MRP — ₹55.00/pc instead of ₹49.50/pc for the configuration tested — with no struck price, no percentage and `on_sale: false` on the public response.
- **Cart**: three products with different configurations, stepper up and down (step of 5 derived from the product's 50-piece minimum), typed edits across a tier (₹1,500.00 at 250 stickers), clamping above the maximum (1,500 → 1,000, ₹2,500.00, with a muted helper line and no error state), the same edits repeated in the cart drawer, and line removal recomputing the summary (₹3,250.00, GST ₹495.76).
- **Shipping threshold**: ₹594.00 → ₹99.00 shipping and "Add ₹405.00 for free"; ₹1,000.00 → free; exactly ₹999.00 after a ₹1 coupon → still free (the rule is ≥, not >); ₹800.00 after a ₹200 coupon → ₹99.00 shipping, total ₹899.00, and the server preview agreed.
- **Review step**: every row equal to the server preview, including the embedded-GST line, on both a coupon-free and a couponed cart; no false repricing banner on a clean flow; and **no `price_mismatch_events` row written by any clean flow** — the only two rows the whole run produced were from the deliberate mid-checkout price change, correctly labelled `stage: order_create`, `likely_cause: price_changed_at_checkout`, diff −₹100.00.
- **Coupons, all fourteen**: percentage, fixed, 50% capped at ₹100 (−₹100.00, not −₹2,225.00), minimum not met, minimum met exactly (equality qualifies, and the resulting ₹900.00 brings ₹99.00 shipping back for a ₹999.00 total), expired, not yet valid, deactivated, unknown code, global usage limit reached, per-user limit reached on a second order, excludes-discounted-items on a mixed cart (−₹440.00 of the ₹2,200.00 full-price lines, not of the ₹4,450.00 subtotal — and the server preview agreed), a coupon that drops the order below the free-shipping threshold, and removing a coupon to restore the uncoupled totals. Each rejection showed the server's own wording, and no rejected coupon changed any total.
- **Orders**: four real orders placed (two through the UI, two through the API to consume the single-use coupons). The confirmation page, account order history, **and the admin order detail** all show the same quantities, options, unit prices, line totals, coupon, shipping, GST and grand total as the review step. The invoice PDF for the main order downloads as a valid 41 KB `application/pdf`.
- **Razorpay handoff**: an online order was created for real in test mode and the gateway options were recorded — `amount: 89900` paise for a server total of ₹899.00, currency INR, and the `order_id` matching the `razorpay_order_id` the backend stored.
- **Price changed mid-checkout**: with the review step open, a tier price was raised from ₹10.00 to ₹11.00 through the admin API. Placing the order was refused with `409 price_changed` and created nothing; the banner "Prices have been updated" appeared with "Prices changed while you were checking out. Nothing has been charged."; the breakdown re-previewed to ₹1,100.00 with GST ₹167.80; and the second attempt charged the new price. The price was restored afterwards.

**What was not exercised, and should not be read as working:**

- **Payment capture.** The Razorpay modal is a third-party iframe that cannot be driven here, so the SDK constructor was replaced with a recorder after the order had been created for real. Everything up to and including the amount handed to the gateway is verified; the paid/confirmed states that follow a successful capture, and the signature-verification path, are not.
- **Coupon scoping to products or categories** is unenforced, so there is nothing to test — see Recommendations.
- **The `rush` turnaround** is `is_active: false` on both products that define it in the dev catalogue, so its surcharge (+₹300 / +₹500) has no live data. The storefront correctly does not offer it and the server correctly rejects it.
- **The sign-in form itself** is exercised once, by the happy path. The other three specs restore a session from a real refresh cookie obtained by a real password login against a second backend instance, because `POST /auth/login` is rate-limited to 10/hour/IP and a four-spec run plus re-runs exhausts that budget.
- **Guest-to-customer cart merge, multi-device carts, COD-versus-online order progression after payment, and partial refunds** were out of scope entirely.
- **Concurrent work caveat:** while this run was finishing, other agents were mid-change on three parity bugs (backend coupon rounding half-even → half-up, storefront discounted-item coupon eligibility, admin discount-window preview). None of this run's asserted amounts is sensitive to those: every coupon figure here is exact to the paisa, so no rounding mode can move it. Two unrelated storefront vitest cases were failing from that in-progress work at the time of the final capture.


## Accessibility

**One critical violation was found and fixed during this run.** On `/cart`, the button that removes an applied coupon was an icon-only `<button>` with no accessible name (`button-name`, 1 node), so a screen-reader user could apply a coupon but had no way to discover how to take it off again. It surfaced on every captured step where a coupon was applied. It was fixed by `frontend-developer` — the button now carries `aria-label="Remove coupon <CODE>"` and the icon is `aria-hidden` — and the spec was re-captured: the re-run reports **zero critical violations**, with `color-contrast` the only rule still firing anywhere in the flow.

**Serious.** `color-contrast`, 88 node-instances summed across the run on nine routes (`/account`, `/account/orders/[id]`, `/cart`, `/checkout`, `/checkout/confirmation/[id]`, the category listing and both product pages). This is the same site-wide, token-level contrast finding the Product Catalog and Quantity Pricing runs reported; it is attributable to the routes rather than to this feature's controls, and it appears on pages containing none of this feature's UI. It still prevents a clean WCAG AA pass and is best fixed once in the theme tokens.

**Moderate.** A skipped heading level (`heading-order`) on the order confirmation and account order-detail screens, so the money breakdown is not reachable as a properly nested section by heading navigation — on exactly the two screens customers go back to re-read. Plus a nested/duplicated `<main>` in the account shell (`landmark-main-is-top-level`, `landmark-no-duplicate-main`, `landmark-unique`, one node each), which sends landmark navigation to the wrong place. Both are pre-existing rather than introduced here.

*automated scan only — manual/screen-reader review still needed*


## Performance

**No usable performance numbers came out of this run, and the ones in the run log must not be quoted.** Both Lighthouse checkpoints report `url_mismatch: true`: the audit asked for `/account` and `/account/orders/[id]` and measured `http://localhost:3000/auth/login?redirect=…` instead. The cause is structural — the storefront keeps its access token in memory only and restores sessions from an httpOnly refresh cookie, which the capture fixture's storage seeding cannot copy into the context Lighthouse drives, so any authenticated route redirects the audit to the login page. The scores sitting in the log (performance 0.28 initial, 0.50 final) are the **login page's** numbers, not the account pages'. `warm_cache: true` on the final checkpoint would make it non-comparable to a cold load even if the URL had matched.

This is the same failure mode `pipeline/README.md` already documents for the admin panel's in-memory token; this run confirms it applies to the storefront too, for authenticated routes. Future checkout runs should either turn Lighthouse off (as the other three specs here already do) or checkpoint on a public route such as a product page, which needs no session.

Even with the URLs fixed these would be **Next.js dev-server measurements, not a production build** — useful only as a run-over-run baseline, never as a shippable score. The practical consequence is that nothing in this run says whether the review step and the confirmation page are fast enough, which for a checkout is the measurement that would have been worth having.


## Recommendations & future improvements

**High — decide what a product/category-restricted coupon means, then enforce it.** `coupons.applicable_product_ids` and `applicable_category_ids` are written by the admin API, stored, and echoed back to the admin UI, but neither `coupon_service.validate_for_customer` nor `order_service._compute_order` ever reads them. Verified end to end during this run: a coupon restricted to product 17 discounted a cart containing none of that product by its full ₹445.00, at both the validate and the preview endpoint. Any product-scoped promotion run today silently discounts the whole catalogue. This is the only finding here that can cost real margin. It needs a semantic decision first — scope the discount basis to the matching lines, or refuse the coupon outright — which is why it was flagged rather than handed straight to a developer.

**High — re-validate an applied coupon when the cart changes.** A coupon with a ₹3,000 minimum applied to a ₹4,450.00 cart keeps advertising its ₹445.00 discount after the customer removes a line and drops to ₹2,200.00. `features/cart/store.ts` comments that the coupon is "cleared when items change significantly", but no code does it. The customer only finds out at the review step, which then shows "Could not confirm pricing: Minimum order amount for this coupon is ₹3000.00" next to the reassuring "shown amounts are estimates. You can still place the order" — and placing it is guaranteed to fail. Pair the re-validation with a narrower review-step message: when the preview failed with a 4xx the server will repeat, say so and disable Place Order instead of inviting the attempt.

**Medium — make the cart's server sync removal-safe.** `CartSyncProvider` debounces its sync by 500 ms and its login-merge unions local and server lines, so a removal that has not been pushed yet is undone by the next full page load; a deleted line and a line added on another device look identical to that merge. Observed directly: the cart read ₹2,200.00 with two lines and the review step then read ₹4,450.00 with three. Either flush on unload or give the merge tombstones / per-line timestamps. The window is narrow, but the direction of the failure is wrong — it resurrects something the customer deleted, one screen before payment.

**Medium — fix the heading and landmark findings on the two order-summary screens.** One skipped heading level on the confirmation and order-detail pages, and a duplicated `<main>` in the account shell. Small changes on the screens customers return to.

**Medium — stop collecting Lighthouse on authenticated storefront routes** until the audit can carry a session; both checkpoints in this run measured the login page.

**Low — address `color-contrast` once at the theme-token level** rather than screen by screen: 88 node-instances across nine routes, unchanged across three consecutive pipeline runs.

**Low — two small clean-ups.** The email sign-in form reports a 429 rate-limit as "Invalid email or password. Please try again.", so a merely rate-limited customer is told their credentials are wrong and keeps retrying. And the dev catalogue points at a CDN product image that does not exist (`cdn.urgentprinters.com/product/2a97…_lg.webp`), producing `404`s through `next/image` on three captured steps — harmless in itself, but it is noise that would mask a real failed request.

