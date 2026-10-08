// Backend-authoritative price parity. Every row of the generated matrix
// (urgent-printers-backend/tests/pricing_parity_matrix.py) is replayed through the
// storefront's own price code and must match the backend to the paisa.
import { describe, it, expect, beforeEach } from "vitest";
import { useCartStore } from "@/features/cart/store";
import { resolveRates } from "@/features/cart/rateResolver";
import { priceTier } from "@/features/products/configurator/pricing";
import {
  clampQuantity, effectiveBounds, nextTierNudge, NUDGE_MAX_EXTRA_PERCENT, priceForQuantity, tierGuideEntries,
} from "@/lib/quantity";
import { getFromPrice, getListingPrice, minOptionMultiplier } from "@/lib/utils";
import { mapProducts, paise, pdpConfig, pricingFixture, rateTiers, select, type FxRow } from "./fixtures/parity";

const fx = pricingFixture();
const products = mapProducts(fx);
const rowsByProduct = new Map<string, FxRow[]>();
for (const r of fx.rows) rowsByProduct.set(r.p, [...(rowsByProduct.get(r.p) ?? []), r]);

// The backend charges (and records) an MRP/savings on lines whose discount rounds to 0%, but the public
// tiers it publishes strip the MRP in that case, so the storefront cannot know it. See the KNOWN MISMATCH test.
const mrpHiddenAtZeroPercent = (r: FxRow) => r.e!.mrp !== null && r.e!.pct === null;

const describeRow = (r: FxRow) => `${r.p} q=${r.q} ${JSON.stringify(r.o)} [${r.k}]`;

describe("pricing-parity fixture shape", () => {
  it("is the large, rounding-heavy matrix the backend generator promises", () => {
    expect(fx.meta.products).toBeGreaterThanOrEqual(50);
    expect(fx.rows.length).toBe(fx.meta.rows);
    expect(fx.meta.rows).toBeGreaterThanOrEqual(2000);
    expect(fx.meta.tie_rows).toBeGreaterThanOrEqual(100);
  });
});

describe.each([...rowsByProduct.keys()])("storefront == backend for %s", (key) => {
  const { fx: fp, product } = products.get(key)!;
  const rows = rowsByProduct.get(key)!;
  const bounds = effectiveBounds(product);
  const ok = rows.filter((r) => r.e);

  it("PDP rate-card path: per-piece, line total, MRP, % off, savings and tier match the backend", () => {
    const bad: string[] = [];
    for (const r of ok) {
      const e = r.e!;
      const sel = select(product, r.o);
      const priced = priceForQuantity(rateTiers(product), r.q, sel.optionMultiplier, sel.turnaroundExtra);
      if (!priced) { bad.push(`${describeRow(r)}: no price`); continue; }
      const got = {
        unit: paise(priced.pricePerUnit), total: paise(priced.total), tier: priced.tier.quantity,
        mrp: paise(priced.mrpPerUnit), pct: priced.discountPercent ?? null,
        shownSavings: priced.discountPercent !== undefined ? paise(priced.savings) : 0,
      };
      const want = { unit: e.unit, total: e.total, tier: e.tier, mrp: mrpHiddenAtZeroPercent(r) ? got.mrp : e.mrp, pct: e.pct, shownSavings: e.pct !== null ? e.disc! * r.q : 0 };
      if (JSON.stringify(got) !== JSON.stringify(want)) bad.push(`${describeRow(r)}: storefront ${JSON.stringify(got)} backend ${JSON.stringify(want)}`);
    }
    expect(bad, bad.slice(0, 8).join("\n")).toEqual([]);
  });

  it("legacy rateResolver path resolves the same rate card and multiplier and prices identically", () => {
    const bad: string[] = [];
    for (const r of ok) {
      const e = r.e!;
      const sel = select(product, r.o);
      const cfg = pdpConfig(product, sel, r.q, bounds);
      const resolved = resolveRates(product, { ...cfg, rateTiers: undefined, optionMultiplier: undefined });
      if (!resolved) { bad.push(`${describeRow(r)}: unresolved`); continue; }
      if (resolved.optionMultiplier !== sel.optionMultiplier) bad.push(`${describeRow(r)}: multiplier ${resolved.optionMultiplier} vs ${sel.optionMultiplier}`);
      if (resolved.minQuantity !== fp.bounds.min || resolved.maxQuantity !== bounds.max) bad.push(`${describeRow(r)}: bounds`);
      const priced = priceForQuantity(resolved.rateTiers, r.q, resolved.optionMultiplier, sel.turnaroundExtra)!;
      const wantMrp = mrpHiddenAtZeroPercent(r) ? paise(priced.mrpPerUnit) : e.mrp;
      if (paise(priced.pricePerUnit) !== e.unit || paise(priced.total) !== e.total || paise(priced.mrpPerUnit) !== wantMrp) {
        bad.push(`${describeRow(r)}: ${paise(priced.pricePerUnit)}/${paise(priced.total)}/${paise(priced.mrpPerUnit)} vs ${e.unit}/${e.total}/${wantMrp}`);
      }
    }
    expect(bad, bad.slice(0, 8).join("\n")).toEqual([]);
  });

  it("cart store repricing (add, edit quantity, apply resolved rates to a pending line) matches the backend", () => {
    const bad: string[] = [];
    const store = useCartStore;
    const stubProduct = { id: product.id, slug: product.slug, name: product.name, images: [], thumbnailUrl: null, categoryName: "", categorySlug: "" };
    for (const r of ok) {
      const e = r.e!;
      const sel = select(product, r.o);
      store.setState({ items: [] });
      const first = priceForQuantity(rateTiers(product), bounds.min, sel.optionMultiplier, sel.turnaroundExtra)!;
      store.getState().addItem(stubProduct, pdpConfig(product, sel, bounds.min, bounds), first.pricePerUnit, first.mrpPerUnit);
      const id = store.getState().items[0].cartItemId;
      store.getState().updateQuantity(id, r.q);
      const edited = store.getState().items[0];
      const wantMrp = mrpHiddenAtZeroPercent(r) ? paise(edited.mrpPerUnit) : e.mrp;
      if (paise(edited.pricePerUnit) !== e.unit || paise(edited.totalPrice) !== e.total || paise(edited.mrpPerUnit) !== wantMrp || edited.config.quantity !== r.q) {
        bad.push(`${describeRow(r)} updateQuantity: ${paise(edited.pricePerUnit)}/${paise(edited.totalPrice)}/${paise(edited.mrpPerUnit)} q=${edited.config.quantity} vs ${e.unit}/${e.total}/${wantMrp}`);
      }
      // a line restored from the server without a rate card, priced once the product is looked up
      const cfg = { ...pdpConfig(product, sel, r.q, bounds), rateTiers: undefined, optionMultiplier: undefined };
      store.setState({ items: [{ cartItemId: id, product: stubProduct, config: cfg, pricePerUnit: 0.01, totalPrice: 0.01, pricePending: true }] });
      const rates = resolveRates(product, cfg)!;
      store.getState().applyResolvedRates(id, rates);
      const resolved = store.getState().items[0];
      const wantMrp2 = mrpHiddenAtZeroPercent(r) ? paise(resolved.mrpPerUnit) : e.mrp;
      if (paise(resolved.pricePerUnit) !== e.unit || paise(resolved.totalPrice) !== e.total || paise(resolved.mrpPerUnit) !== wantMrp2) {
        bad.push(`${describeRow(r)} applyResolvedRates: ${paise(resolved.pricePerUnit)}/${paise(resolved.totalPrice)}/${paise(resolved.mrpPerUnit)} vs ${e.unit}/${e.total}/${wantMrp2}`);
      }
    }
    store.setState({ items: [] });
    expect(bad, bad.slice(0, 8).join("\n")).toEqual([]);
  });

  it("price-jump nudge offers exactly the backend's next-tier totals, and only inside the allowed extra-cost band", () => {
    const bad: string[] = [];
    for (const r of ok) {
      const sel = select(product, r.o);
      const nudge = nextTierNudge(r.q, rateTiers(product), sel.optionMultiplier, sel.turnaroundExtra, bounds.max);
      if (!r.n) {
        if (nudge) bad.push(`${describeRow(r)}: nudge offered but backend has no reachable next tier`);
        continue;
      }
      const allowed = r.n.nxt <= r.n.cur || (r.n.nxt - r.n.cur) * 100 <= r.n.cur * NUDGE_MAX_EXTRA_PERCENT;
      if (!allowed) { if (nudge) bad.push(`${describeRow(r)}: nudge offered outside band`); continue; }
      if (!nudge) { bad.push(`${describeRow(r)}: expected a nudge to ${r.n.q}`); continue; }
      const got = { q: nudge.newQty, cur: paise(nudge.currentTotal), nxt: paise(nudge.newTotal), unit: paise(nudge.newPerPiece), add: nudge.addQty };
      const want = { q: r.n.q, cur: r.n.cur, nxt: r.n.nxt, unit: r.n.unit, add: r.n.q - r.q };
      if (JSON.stringify(got) !== JSON.stringify(want)) bad.push(`${describeRow(r)}: ${JSON.stringify(got)} vs ${JSON.stringify(want)}`);
      const saving = Math.max(0, r.n.cur - r.n.nxt), extra = Math.max(0, r.n.nxt - r.n.cur);
      if (paise(nudge.saving) !== saving || paise(nudge.extra) !== extra) bad.push(`${describeRow(r)}: saving/extra`);
    }
    expect(bad, bad.slice(0, 8).join("\n")).toEqual([]);
  });

  it("tier rate guide highlights the backend's tier at the backend's per-piece rate", () => {
    const bad: string[] = [];
    for (const r of ok) {
      const sel = select(product, r.o);
      const entries = tierGuideEntries(product.pricingTiers, r.q, sel.optionMultiplier, bounds.min, bounds.max);
      const current = entries.find((x) => x.current);
      if (!current || current.pricePerUnit === undefined || paise(current.pricePerUnit) !== r.e!.unit) {
        bad.push(`${describeRow(r)}: guide ${current?.quantity}@${current?.pricePerUnit} vs backend ${r.e!.tier}@${r.e!.unit}`);
      }
    }
    expect(bad, bad.slice(0, 8).join("\n")).toEqual([]);
  });
});

describe("storefront listing/card figures equal the backend's", () => {
  it.each(fx.products.map((p) => p.key))("%s: bounds, card price/qty, discount and 'From' price", (key) => {
    const { fx: fp, product, card } = products.get(key)!;
    const bounds = effectiveBounds(product);
    expect(bounds.min).toBe(fp.bounds.min);
    expect(bounds.listing).toBe(fp.bounds.listing);
    expect(bounds.max).toBe(fp.bounds.stored_max);
    expect(clampQuantity(fp.bounds.min - 1, bounds.min, bounds.max)).toBe(fp.bounds.min);
    if (fp.bounds.stored_max !== null) expect(clampQuantity(fp.bounds.stored_max + 1, bounds.min, bounds.max)).toBe(fp.bounds.stored_max);

    // card pass-through (mapper + getListingPrice) == backend listing_display
    const listing = getListingPrice(card);
    const want = fp.admin.listing;
    if (want.price === null) {
      expect(listing).toBeNull();
    } else {
      expect(listing!.quantity).toBe(want.qty);
      expect(paise(listing!.price)).toBe(want.price);
      // the backend may send listing_mrp with a null percent (rounds to 0%); the card then shows no discount block
      expect(listing!.discount ? paise(listing!.discount.mrp) : null).toBe(want.pct === null ? null : want.mrp);
      expect(listing!.discount?.percent ?? null).toBe(want.pct);
    }

    // PDP opening state recomputed client-side (cheapest options, listing qty) == the card price
    if (want.price !== null) {
      const m = minOptionMultiplier(product.printSpec);
      const opening = priceForQuantity(rateTiers(product), bounds.listing, m, 0)!;
      expect(paise(opening.subtotal), `${key}: PDP opening total vs card`).toBe(want.price);
      const pct = opening.discountPercent ?? null;
      expect(pct, `${key}: PDP opening % off vs card`).toBe(want.pct);
      if (want.mrp !== null && want.pct !== null) expect(Math.round(opening.mrpPerUnit! * 100) * bounds.listing, `${key}: PDP opening MRP total vs card`).toBe(want.mrp);
    }

    // "From" price: server fields and the client-side fallback both equal the backend
    const fromServer = getFromPrice(card);
    const fromClient = getFromPrice({ pricingTiers: product.pricingTiers, printSpec: product.printSpec });
    for (const from of [fromServer, fromClient]) {
      expect(paise(from.price), `${key}: From price`).toBe(paise(fp.card.price_from));
      expect(from.discount ? paise(from.discount.mrp) : null).toBe(paise(fp.card.mrp_from));
      expect(from.discount?.percent ?? null).toBe(fp.card.discount_percent ?? null);
    }
  });
});

describe("MRP on lines whose discount rounds to 0%", () => {
  const zeroPct = fx.rows.filter((r) => r.e && mrpHiddenAtZeroPercent(r));

  it("the matrix contains such lines", () => {
    expect(zeroPct.length).toBeGreaterThan(0);
  });

  // Backend: compute_item_pricing returns mrp_per_unit/discount_per_unit (counted in preview mrpSavings) at 0%.
  // Storefront: public tiers carry no MRP at 0% so the cart line has none. it.fails flips to a failure once fixed.
  it("storefront knows the same MRP as the backend charges for (backend savings counted in the order preview)", () => {
    for (const r of zeroPct) {
      const { product } = products.get(r.p)!;
      const sel = select(product, r.o);
      const priced = priceForQuantity(rateTiers(product), r.q, sel.optionMultiplier, sel.turnaroundExtra)!;
      expect(paise(priced.mrpPerUnit), describeRow(r)).toBe(r.e!.mrp);
    }
  });
});

describe("rows the backend refuses", () => {
  it("product_unavailable rows are exactly the ones whose rounded per-piece price is under one paisa", () => {
    const errs = fx.rows.filter((r) => r.err);
    expect(errs.length).toBe(fx.meta.error_rows);
    for (const r of errs) {
      expect(r.err).toBe("product_unavailable");
      const { product } = products.get(r.p)!;
      const sel = select(product, r.o);
      const tier = product.pricingTiers.reduce((a, t) => (t.quantity <= r.q ? t : a), product.pricingTiers[0]);
      expect(priceTier(tier, sel.optionMultiplier).pricePerUnit).toBeLessThan(0.01);
    }
  });

  it("the storefront flags exactly those selections unavailable (add-to-cart is disabled)", () => {
    for (const r of fx.rows) {
      const { product } = products.get(r.p)!;
      const sel = select(product, r.o);
      const priced = priceForQuantity(rateTiers(product), r.q, sel.optionMultiplier, sel.turnaroundExtra)!;
      expect(priced.unavailable, describeRow(r)).toBe(Boolean(r.err));
    }
  });
});

beforeEach(() => { useCartStore.setState({ items: [] }); });
