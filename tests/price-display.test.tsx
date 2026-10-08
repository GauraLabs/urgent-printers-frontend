import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { PriceDisplay, type PriceVariant } from "@/components/common/PriceDisplay";

const VARIANTS: PriceVariant[] = ["card", "pdp", "line", "compact"];

function html(props: Partial<Parameters<typeof PriceDisplay>[0]> & { variant: PriceVariant }): string {
  return renderToStaticMarkup(<PriceDisplay price={9} unitLabel="/unit" {...props} />);
}

describe("PriceDisplay", () => {
  for (const variant of VARIANTS) {
    it(`${variant}: discount shows struck MRP, then badge, then final price`, () => {
      const out = html({ variant, mrp: 12, percent: 25 });
      const mrp = out.indexOf("line-through");
      const badge = out.indexOf("25% off");
      // Card prices drop ".00" for whole rupees; every other variant keeps paise.
      const whole = variant === "card";
      const price = out.indexOf(whole ? "₹9<" : "₹9.00");
      assert.ok(mrp > -1 && badge > mrp && price > badge, out);
      assert.ok(out.includes(whole ? "₹12<" : "₹12.00"));
    });

    it(`${variant}: percent 0 or absent renders exactly like no discount`, () => {
      const plain = html({ variant });
      assert.equal(html({ variant, mrp: 1000, percent: 0 }), plain);
      assert.equal(html({ variant, mrp: 12 }), plain);
      assert.equal(html({ variant, percent: 25 }), plain);
      assert.ok(!plain.includes("line-through") && !plain.includes("off"));
    });
  }

  it("card without discount keeps today's markup", () => {
    assert.equal(
      renderToStaticMarkup(<PriceDisplay variant="card" prefix="From" unitLabel="per unit" price={9} />),
      '<div><p class="font-sans text-xs md:text-sm leading-snug text-foreground">From <span class="font-bold text-base md:text-xl leading-none">₹9</span></p><p class="text-[10px] text-muted-foreground mt-0.5">per unit</p></div>'
    );
  });

  it("compact without discount keeps today's markup", () => {
    assert.equal(
      renderToStaticMarkup(<PriceDisplay variant="compact" prefix="From" price={9} />),
      '<div><p class="text-xs text-muted-foreground">From <span class="font-semibold text-foreground">₹9.00</span></p></div>'
    );
  });

  it("pdp shows 'Sale ends' in IST only while discounted", () => {
    const withDiscount = html({ variant: "pdp", mrp: 12, percent: 25, endsAt: "2026-10-12T13:00:00Z" });
    assert.ok(withDiscount.includes("Sale ends 12 Oct, 6:30 pm IST"), withDiscount);
    assert.ok(!html({ variant: "pdp", endsAt: "2026-10-12T13:00:00Z" }).includes("Sale ends"));
    assert.ok(!html({ variant: "card", mrp: 12, percent: 25, endsAt: "2026-10-12T13:00:00Z" }).includes("Sale ends"));
  });

  it("badge uses foreground text on a tinted token background (theme/dark-safe)", () => {
    const out = html({ variant: "card", mrp: 12, percent: 25 });
    assert.ok(out.includes("text-foreground") && out.includes("bg-success/15"));
    assert.ok(!out.includes("text-white"));
  });
});
