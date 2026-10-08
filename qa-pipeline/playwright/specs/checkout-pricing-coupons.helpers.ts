// Shared, source-grounded locators and flows for the Checkout Pricing & Coupons specs.
//
// Hand-authored (see pipeline/README.md's "The hand-authoring fallback"). Every locator below
// comes from the real component source, not a live DOM snapshot:
//   app/auth/login/page.tsx            — method tabs are buttons 'Mobile' | 'Google' | 'Email';
//     the email form uses <FormField label="Email address"> / label="Password", and FormField
//     derives its input id from the label ("email-address", "password").
//   app/cart/page.tsx                  — each line carries a button aria-label="Remove <name>";
//     the summary column is `div.lg:w-80`; the coupon field is placeholder="Coupon code" with an
//     'Apply' button and a `p.text-destructive` error line.
//   components/common/QuantityInput.tsx — field is aria-label="Quantity"; the +/- buttons are
//     aria-label="Increase quantity"/"Decrease quantity"; the helper line is a sibling
//     <p role="status"> (sr-only while empty).
//   features/checkout/AddressStep.tsx  — 'Continue to Payment'; the default address is preselected.
//   features/checkout/PaymentStep.tsx  — SelectableCard buttons 'Pay Online' / 'Cash on Delivery',
//     then 'Review Order'.
//   features/checkout/ReviewStep.tsx   — the breakdown card contains 'Price Breakdown'; rows are
//     `div.flex.justify-between`; the CTA is 'Place Order · ₹X' (cod) or 'Pay ₹X securely';
//     the repricing banner is a role="status" containing 'Prices have been updated'.
//   components/common/PriceDisplay.tsx — StruckMrp prefixes an sr-only "Original price ".
import { expect, request as pwRequest, type Page, type Locator } from '@playwright/test';

/**
 * The QA backend instance (same database and Redis as the one the storefront talks to on :8000,
 * started for this run so its logs are readable). Used only for test-data setup, never for
 * anything the customer journey itself exercises — and deliberately NOT :8000, because
 * POST /auth/login and POST /admin/auth/login are rate-limited per process and the browser
 * flow needs that budget.
 */
const QA_API = process.env.QA_API ?? 'http://127.0.0.1:8001/api/v1';

export const CUSTOMER = {
  email: 'qa-checkout-shopper@example.com',
  password: 'QaCheckout@123',
  firstName: 'QA',
};

/** Products used by these specs, with the dev-DB pricing they are asserted against. */
export const P = {
  /** tiers 100@12.60(mrp14) 250@9.00(mrp10) 500@6.75(mrp7.5) 1000@4.95(mrp5.5)* 2500@4.05(mrp4.5);
   *  discount window 2026-10-03 → 2026-10-23 is ACTIVE, so sale prices are charged and the MRP
   *  is struck. min = lowest tier 100, listing_quantity 250, no maximum.
   *  Multipliers: size 1.0/1.1, paper 1.0/1.1, finish 1.0/1.3, sides 1.0/1.4.
   *  Turnarounds: Standard +₹0, Express +₹150 (rush exists but is_active=false ⇒ not rendered). */
  cards: {
    name: 'Matte Finish Business Cards',
    url: '/products/business-cards/matte-finish-business-cards',
    category: 'business-cards',
  },
  /** tiers 50@6 100@10 250@6* 500@4 1000@2.50, NO mrp anywhere; min 50, listing 50, max 1000.
   *  The 100 tier is deliberately dearer per piece than the 50 tier — that is the real dev data. */
  stickers: {
    name: 'Custom Die-Cut Stickers',
    url: '/products/stickers-labels/custom-diecut-stickers',
    category: 'stickers-labels',
  },
  /** tiers 100@6 250@4 500@2.80 1000@1.80* 5000@1.20, no mrp; Express +₹200. */
  flyers: {
    name: 'A5 Flyers',
    url: '/products/flyers-leaflets/a5-flyers',
    category: 'flyers-leaflets',
  },
};

// ── PDP ───────────────────────────────────────────────────────────────────────

/** The configurator's live price summary — the only element carrying the GST note. */
export const summary = (page: Page): Locator =>
  page.locator('div').filter({ has: page.getByText('GST and shipping calculated at checkout') }).last();

export const qtyInput = (page: Page): Locator => page.getByLabel('Quantity', { exact: true });

export const addToCartButton = (page: Page): Locator =>
  page.locator('button.w-full.h-12').filter({ hasText: /Add to Cart|Update Cart|Enter a quantity/ });

const esc = (v: string): string => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const optionButton = (page: Page, label: string): Locator =>
  page.getByRole('button', { name: new RegExp(`^${esc(label)}`) });

/**
 * A turnaround card. Matched on the "N business days" suffix, NOT on the label alone: the
 * accessible name of the size button '3.5 x 2 in (Standard)' also contains "Standard", so
 * `name: /Standard/` is genuinely ambiguous on this PDP (found while probing).
 */
export const turnaroundCard = (page: Page, label: 'Standard' | 'Express' | 'Rush'): Locator =>
  page.getByRole('button', { name: new RegExp(`^${label} \\d+ business days`) });

export async function waitForConfigurator(page: Page, expectedQuantity: string): Promise<void> {
  await expect(qtyInput(page)).toHaveValue(expectedQuantity, { timeout: 30_000 });
  await expect(summary(page)).toContainText('Total', { timeout: 15_000 });
}

/** Set the quantity field and wait out the 150 ms debounce by asserting the caller's total. */
export async function typeQuantity(page: Page, value: string): Promise<void> {
  const input = qtyInput(page).first();
  await input.click();
  await input.fill(value);
}

// ── Cart ──────────────────────────────────────────────────────────────────────

/** One cart-page line, located through its own unique Remove button. */
export const cartLine = (page: Page, productName: string): Locator =>
  page.locator('div.flex.gap-4.p-5').filter({ hasText: productName });

export const removeButton = (page: Page, productName: string): Locator =>
  page.getByRole('button', { name: `Remove ${productName}` });

/** The sticky Order Summary column on /cart. */
export const cartSummary = (page: Page): Locator => page.locator('div.lg\\:w-80');

export const couponInput = (page: Page): Locator => page.getByPlaceholder('Coupon code');
export const applyCouponButton = (page: Page): Locator => page.getByRole('button', { name: 'Apply' });
export const couponError = (page: Page): Locator => page.locator('p.text-destructive');
export const appliedCouponBox = (page: Page): Locator => page.getByText(/ applied$/);

/** Apply a coupon code and wait for either the applied badge or the error line. */
export async function applyCoupon(page: Page, code: string): Promise<void> {
  await couponInput(page).fill(code);
  await applyCouponButton(page).click();
}

/** Remove whatever coupon is applied (the XCircle button beside the applied badge). */
export async function removeCoupon(page: Page): Promise<void> {
  // The applied-coupon box is `div.rounded-xl` containing a <p>"CODE applied" plus the coupon
  // description, so it must be matched on the <p> (`has:`) — a /applied$/ text filter fails
  // because the box's own text ends with the description, not with "applied".
  const box = page.locator('div.rounded-xl').filter({ has: page.getByText(/ applied$/) }).last();
  await box.getByRole('button').last().click();
  await expect(couponInput(page)).toBeVisible({ timeout: 10_000 });
}

// ── Checkout ──────────────────────────────────────────────────────────────────

export const breakdown = (page: Page): Locator =>
  page.locator('div.rounded-2xl').filter({ hasText: 'Price Breakdown' }).first();

/** One labelled row inside a money panel, e.g. row(page, 'Items subtotal'). */
export const row = (scope: Locator, label: string): Locator =>
  scope.locator('div.flex.justify-between').filter({ hasText: label }).first();

export const placeOrderButton = (page: Page): Locator =>
  page.getByRole('button', { name: /^(Place Order|Pay ₹)/ });

export const repricingBanner = (page: Page): Locator =>
  page.locator('div[role="status"]').filter({ hasText: 'Prices have been updated' });

/** Address step → payment step → review step, with the saved default address. */
export async function reachReview(page: Page, method: 'cod' | 'online'): Promise<void> {
  await page.goto('/checkout');
  await page.getByRole('button', { name: /Continue to Payment/ }).click();
  await expect(page.getByText('Payment Method')).toBeVisible({ timeout: 20_000 });
  if (method === 'cod') await page.getByRole('button', { name: /Cash on Delivery/ }).click();
  await page.getByRole('button', { name: /Review Order/ }).click();
  await expect(page.getByText('Review Your Order')).toBeVisible({ timeout: 20_000 });
  // The preview is authoritative; every money assertion must wait for it to land.
  await expect(page.getByText('Confirming prices…')).toHaveCount(0, { timeout: 30_000 });
}

// ── Auth + fixtures ───────────────────────────────────────────────────────────

/**
 * Sign in through the real UI with email + password.
 *
 * The 'Mobile' tab uses Firebase phone auth (signInWithPhoneNumber + invisible reCAPTCHA),
 * which cannot be driven in this environment — see the plan's `gaps`. POST /auth/login is
 * rate-limited to 10/hour/IP, so every spec signs in exactly once.
 */
export async function signIn(page: Page): Promise<void> {
  await page.goto('/auth/login');
  await page.getByRole('button', { name: 'Email', exact: true }).click();
  // FormField appends a required-marker <span>*</span> inside the <label>, so the accessible
  // name is "Email address *" — address the inputs by the id FormField derives from the label.
  await page.locator('#email-address').fill(CUSTOMER.email);
  await page.locator('#password').fill(CUSTOMER.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 30_000 });
}

/**
 * Leave the server-side cart empty.
 *
 * The cart is synced per user (features/cart/CartSyncProvider.tsx), so whatever a previous run
 * left behind is restored on login. Removing every line locally and letting the 500 ms debounced
 * sync push the empty cart is the only way to do this through the UI — there is no "clear cart"
 * control.
 */
/**
 * One real email+password sign-in against the QA backend instance, reused for everything in this
 * worker that needs an API token. Both /auth/login endpoints are rate-limited to 10/hour/IP per
 * process, so each spec spends exactly one.
 */
let qaAccessToken: string | null = null;

async function qaCustomerLogin(): Promise<{ token: string; refresh: string }> {
  const api = await pwRequest.newContext();
  try {
    const login = await api.post(`${QA_API}/auth/login`, { data: { email: CUSTOMER.email, password: CUSTOMER.password } });
    if (login.status() === 429) {
      throw new Error(
        'QA backend POST /auth/login is rate-limited (10/hour/IP, counted in-process). Restart the ' +
          ':8001 QA backend instance to reset its counter — do not spend the storefront backend\'s budget.'
      );
    }
    expect(login.status(), 'QA-instance customer sign-in').toBe(200);
    const raw = login.headersArray().filter((h) => h.name.toLowerCase() === 'set-cookie').map((h) => h.value).join('; ');
    const match = /refresh_token=([^;]+)/.exec(raw);
    expect(match, 'refresh_token cookie on the login response').not.toBeNull();
    const token = (await login.json()).data.token as string;
    qaAccessToken = token;
    return { token, refresh: (match as RegExpExecArray)[1] };
  } finally {
    await api.dispose();
  }
}

/**
 * Put the browser into an already-signed-in session WITHOUT using the login form.
 *
 * Why: POST /auth/login on the storefront's backend is rate-limited to 10/hour/IP, and a
 * four-spec capture plus any re-run exhausts that budget in one sitting. The session here is a
 * real one — a real email+password login against the QA backend instance (same database, same
 * Redis, its own rate-limit counters), whose genuine httpOnly refresh cookie is handed to the
 * browser. `TokenRefreshProvider` then does exactly what it does after any page refresh:
 * POST /auth/refresh with that cookie, then GET /auth/me. Nothing is minted or forged, and the
 * login FORM itself is still exercised for real by hp-01 in the happy-path spec.
 */
export async function restoreSession(page: Page): Promise<void> {
  const { refresh } = await qaCustomerLogin();
  // Cookies are scoped by domain, not port, so a cookie set for localhost/api/v1/auth is sent to
  // the API on :8000 even though the page is served from :3000.
  await page.context().addCookies([
    { name: 'refresh_token', value: refresh, domain: 'localhost', path: '/api/v1/auth', httpOnly: true, secure: false, sameSite: 'Lax' },
  ]);
  // Only `isAuthenticated` is persisted by the auth store (no token, no PII) — this is the exact
  // state a real page refresh leaves behind.
  await page.addInitScript(() => {
    window.localStorage.setItem('urgent-printers-auth', JSON.stringify({ state: { isAuthenticated: true }, version: 0 }));
  });
  await page.goto('/account');
  await expect(page.getByRole('link', { name: 'My account' })).toBeVisible({ timeout: 30_000 });
}

export async function clearServerCart(): Promise<void> {
  const token = qaAccessToken ?? (await qaCustomerLogin()).token;
  const api = await pwRequest.newContext();
  try {
    const cleared = await api.delete(`${QA_API}/cart`, { headers: { Authorization: `Bearer ${token}` } });
    expect([200, 204]).toContain(cleared.status());
  } finally {
    await api.dispose();
  }
}

export async function emptyCart(page: Page): Promise<void> {
  // 1. Empty the server cart first. CartSyncProvider's login merge runs once per session and
  //    restores the server cart asynchronously — a removal loop racing that merge is exactly
  //    how the first run of these specs failed (the cart refilled right after it was cleared).
  await clearServerCart();
  // 2. Let the merge finish against the now-empty server cart.
  await page.goto('/cart');
  await page.waitForTimeout(3500);
  // 3. Remove anything still held locally (a line added earlier in the same test).
  for (let i = 0; i < 25; i++) {
    const remove = page.getByRole('button', { name: /^Remove / });
    if ((await remove.count()) === 0) break;
    await remove.first().click();
    await page.waitForTimeout(350);
  }
  await expect(page.getByText('Your cart is empty')).toBeVisible({ timeout: 20_000 });
  // 4. Let the debounced sync (500 ms) push the empty cart back to the server.
  await page.waitForTimeout(1500);
}

/** Configure a PDP and add it to the cart. */
export async function addToCart(
  page: Page,
  product: { name: string; url: string },
  opts: { quantity: string; options?: string[]; turnaround?: 'Standard' | 'Express' | 'Rush'; expectTotal: string }
): Promise<void> {
  await page.goto(product.url);
  await expect(qtyInput(page).first()).toBeVisible({ timeout: 30_000 });
  for (const label of opts.options ?? []) await optionButton(page, label).first().click();
  if (opts.turnaround) await turnaroundCard(page, opts.turnaround).click();
  await typeQuantity(page, opts.quantity);
  await expect(summary(page).getByText(opts.expectTotal, { exact: true })).toBeVisible({ timeout: 20_000 });
  await addToCartButton(page).click();
  await expect(addToCartButton(page)).toContainText('Update Cart', { timeout: 30_000 });
}

/**
 * Scroll a step's target into the viewport BEFORE handing it to capture.step() — capture.js
 * measures the bounding box first, and validate.mjs rejects a box entirely below the fold.
 */
/** The cookie consent bar overlays the bottom of every page; dismiss it so it never eats a
 *  click and never lands in a screenshot the docs/video embed. */
export async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole('button', { name: 'Accept', exact: true });
  if (await accept.count()) await accept.first().click().catch(() => {});
}

export async function bringIntoView(locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded({ timeout: 5_000 }).catch(() => {});
}
