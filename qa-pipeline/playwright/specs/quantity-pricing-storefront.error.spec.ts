// Hand-authored — see pipeline/README.md's "The hand-authoring fallback".
// These are the "typing is guided, never a hard error" paths. The single most important
// property under test: nothing a customer types into the quantity field may ever produce a
// destructive error state, a blank price, or a blocked CTA other than a genuinely empty field.
import { test, expect } from '../capture.js';
import {
  PRODUCTS, summary, qtyInput, qtyHelper, addToCartButton, typeQuantity, waitForConfigurator,
  bringIntoView,
} from './quantity-pricing-storefront.helpers';

const PLAN = 'qa-pipeline/artifacts/plans/quantity-pricing-storefront-plan.json';

test.use({
  captureOptions: {
    feature: 'Quantity Pricing Storefront Guided Input',
    plan: PLAN,
    axe: 'per-navigation',
    lighthouse: 'off',
  },
});

test.describe('Quantity Pricing (Storefront) — guided out-of-range input', () => {
  test.describe.configure({ timeout: 300_000 });

  test('below min, above max, empty, huge and non-numeric input are all guided', async ({ page, capture }) => {
    // ── err-01: below the minimum is a neutral helper, not an error ──
    await capture.step('err-01', 'Type 10 on a product whose minimum is 100', null, async () => {
      await page.goto(PRODUCTS.cards.url);
      await waitForConfigurator(page, '250');
      await typeQuantity(page, '10');
      await expect(qtyHelper(page)).toHaveText('Minimum order is 100 pcs', { timeout: 15_000 });
      // Guided, not blocked: muted amber, never the destructive token, and no icon.
      await expect(qtyHelper(page)).toHaveClass(/text-brand-orange/);
      await expect(qtyHelper(page)).not.toHaveClass(/text-destructive|text-red/);
      // The price keeps working off clamp(10) = 100 rather than blanking out.
      await expect(summary(page).getByText('₹1,260.00', { exact: true })).toBeVisible({ timeout: 15_000 });
      // The CTA must stay usable — an out-of-range value is clamped on click, never refused.
      await expect(addToCartButton(page)).toBeEnabled();
      await expect(addToCartButton(page)).toContainText('Add to Cart');
    });

    // ── err-02: blur snaps the value and says so ──
    await bringIntoView(qtyInput(page));
    await capture.step('err-02', 'Blur while the field still holds 10', qtyInput(page), async (el) => {
      await el.blur();
      await expect(el).toHaveValue('100');
      await expect(qtyHelper(page)).toHaveText('Adjusted to 100 pcs');
    });

    // ── err-04: an empty field is the ONLY state that blocks the CTA ──
    await bringIntoView(qtyInput(page));
    await capture.step('err-04', 'Clear the quantity field entirely', qtyInput(page), async (el) => {
      await el.click();
      await el.fill('');
      await expect(el).toHaveValue('');
      await expect(addToCartButton(page)).toContainText('Enter a quantity');
      await expect(addToCartButton(page)).toBeDisabled();
      // Never a 0 and never an error message for an empty field.
      await expect(page.getByText('Minimum order is 100 pcs')).toHaveCount(0);
    });

    // ── err-05: an empty blur restores the last valid value ──
    await bringIntoView(qtyInput(page));
    await capture.step('err-05', 'Blur while the field is empty', qtyInput(page), async (el) => {
      await el.blur();
      await expect(el).toHaveValue('100');
      await expect(addToCartButton(page)).toBeEnabled();
      await expect(addToCartButton(page)).toContainText('₹1,260.00');
    });

    // ── err-06: non-digits are stripped and length is capped at 7 ──
    await bringIntoView(qtyInput(page));
    await capture.step('err-06', 'Type letters, then a 9-digit number', qtyInput(page), async (el) => {
      await el.click();
      await el.fill('abc');
      await expect(el).toHaveValue('');
      await el.fill('12a3b');
      await expect(el).toHaveValue('123');
      await el.fill('123456789');
      // MAX_DIGITS = 7, so the 9-digit value is truncated as typed rather than accepted.
      await expect(el).toHaveValue('1234567');
    });

    // ── err-07: Enter commits exactly like a blur ──
    await bringIntoView(qtyInput(page));
    await capture.step('err-07', 'Press Enter with an out-of-range quantity in the field', qtyInput(page), async (el) => {
      await el.click();
      await el.fill('5');
      await el.press('Enter');
      await expect(el).toHaveValue('100');
      await expect(qtyHelper(page)).toHaveText('Adjusted to 100 pcs');
      // Enter must not submit anything or navigate away.
      await expect(page).toHaveURL(new RegExp(`${PRODUCTS.cards.slug}$`));
    });

    // ── err-03: above the maximum, on the product whose max the admin half set ──
    await capture.step('err-03', 'Type 9999 on a product whose maximum is 1,000', null, async () => {
      await page.goto(PRODUCTS.stickers.url);
      await waitForConfigurator(page, '50');
      await typeQuantity(page, '9999');
      await expect(qtyHelper(page)).toHaveText('Maximum order is 1,000 pcs', { timeout: 15_000 });
      await expect(qtyHelper(page)).toHaveClass(/text-brand-orange/);
      await qtyInput(page).blur();
      await expect(qtyInput(page)).toHaveValue('1000');
      await expect(qtyHelper(page)).toHaveText('Adjusted to 1,000 pcs');
      await expect(summary(page).getByText('₹2,500.00', { exact: true })).toBeVisible({ timeout: 15_000 });
    });
  });
});
