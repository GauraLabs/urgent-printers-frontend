/**
 * Capture fixture — the thin wrapper Playwright doesn't ship natively.
 *
 * Playwright's trace has bounding boxes and timestamps, but not in a shape the
 * Shot-List Director can consume. This fixture records, per interaction:
 * step_id, action, selector, bounding_box, timestamp_ms, screenshot_path, status,
 * console_errors, and (if @axe-core/playwright is installed) axe_violations.
 *
 * Usage in a spec:
 *
 *   import { test, expect } from '../capture.js';
 *
 *   test('login happy path', async ({ page, capture }) => {
 *     await capture.step('hp-01', 'Open the login page', null, () => page.goto('/login'));
 *     await capture.step('hp-02', 'Fill email', page.locator('#email'),
 *       (el) => el.fill('operator@visionai.gov.in'));
 *   });
 *
 * The run log lands at qa-pipeline/artifacts/runs/<feature-slug>-run.json and the
 * screenshots at qa-pipeline/artifacts/screenshots/<feature-slug>/.
 */
import { test as base, expect } from '@playwright/test';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../..');
const ARTIFACTS = resolve(REPO_ROOT, 'qa-pipeline/artifacts');

const slugify = (value) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Run logs already written by this worker — guards against one test silently
 *  clobbering another's timeline when two tests share a feature name. */
const writtenRunLogs = new Set();

/**
 * Bounding box for the run log, rounded to whole pixels. Always bounded by a short
 * timeout: a missing box costs the renderer a zoom target, a hung one costs the run.
 */
async function measure(locator) {
  if (!locator) return null;
  const box = await locator.boundingBox({ timeout: 2000 }).catch(() => null);
  if (!box) return null;
  return {
    x: Math.round(box.x),
    y: Math.round(box.y),
    width: Math.round(box.width),
    height: Math.round(box.height),
  };
}

/**
 * Resolve the plan this run exercises. An explicit captureOptions.plan wins; otherwise fall
 * back to the feature slug. Either way the file must exist — a dangling plan_path sends the
 * Analyzer looking for expectations that were never written.
 */
function resolvePlanPath(explicit, slug) {
  const candidate = explicit ?? `qa-pipeline/artifacts/plans/${slug}-plan.json`;
  if (existsSync(resolve(REPO_ROOT, candidate))) return candidate;
  console.warn(
    `capture: no plan found at ${candidate} — recording plan_path: null. ` +
      'Set captureOptions.plan to the plan this spec actually implements.',
  );
  return null;
}

/** Compare URLs by origin + path only — a trailing slash or hash is not a redirect. */
const normaliseUrl = (value) => {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname.replace(/\/$/, '')}`;
  } catch {
    return value;
  }
};

/**
 * Lighthouse checkpoint. Never allowed to fail a run: a perf number is nice to have,
 * but losing the whole run log because an audit timed out is not a trade worth making,
 * so every failure mode is recorded as `{ error }` inside the run log instead of thrown.
 *
 * Requires chromium launched with --remote-debugging-port=<port>; playwright.config.js
 * sets that up. Lighthouse drives the browser over CDP, not through Playwright's page.
 */
/**
 * Copy the test page's localStorage into the browser's *default* context.
 *
 * Playwright runs each test in an isolated context. Lighthouse attaches over the CDP port
 * and drives the default context instead, so it starts with empty storage — which for this
 * app means AuthContext sees no `user`, isAuthenticated is false, and ProtectedRoute
 * redirects every post-login audit to /login. Without this seeding, `final_state` silently
 * measures the login screen and calls it the dashboard.
 *
 * Best-effort: returns false if it can't seed, and the caller reports the mismatch rather
 * than pretending the numbers are about the requested route.
 */
async function seedDefaultContextStorage(page, port) {
  try {
    const { chromium } = await import('@playwright/test');
    const origin = new URL(page.url()).origin;
    const storage = await page.evaluate(() => JSON.stringify(window.localStorage));

    const browser = await chromium.connectOverCDP(`http://localhost:${port}`);
    try {
      const context = browser.contexts()[0];
      if (!context) return false;
      const seedPage = await context.newPage();
      // Storage is per-origin, so we must be on the origin before writing to it.
      await seedPage.goto(origin, { waitUntil: 'domcontentloaded' });
      await seedPage.evaluate((raw) => {
        const entries = JSON.parse(raw);
        for (const [key, value] of Object.entries(entries)) {
          window.localStorage.setItem(key, value);
        }
      }, storage);
      await seedPage.close();
      return true;
    } finally {
      // Only drops this CDP client. Closing the browser here would kill the live test.
      await browser.close().catch(() => {});
    }
  } catch {
    return false;
  }
}

async function runLighthouse(page, port) {
  const requestedUrl = page.url();
  try {
    const seeded = await seedDefaultContextStorage(page, port);
    const { playAudit } = await import('playwright-lighthouse');
    const result = await playAudit({
      page,
      port,
      // playwright-lighthouse derives onlyCategories from the KEYS of `thresholds`, so an
      // empty object here silently audits nothing ("onlyCategories cannot be an empty
      // array"). Zero thresholds mean "collect these three categories, gate on none of
      // them" — judging the numbers is the Analyzer's job (Module 5), not the runner's.
      thresholds: { performance: 0, accessibility: 0, 'best-practices': 0 },
      ignoreError: true,
      disableLogs: true,
      reports: { formats: {} },
      config: {
        extends: 'lighthouse:default',
        settings: {
          formFactor: 'desktop',
          // The page is already at Playwright's viewport; letting Lighthouse re-emulate
          // a phone here would measure a layout the screenshots never show.
          screenEmulation: { disabled: true },
          // Lighthouse clears storage before auditing by default. This app keeps its
          // session in localStorage under 'user' (src/contexts/AuthContext.jsx), so a
          // reset logs the operator out and ProtectedRoute redirects the audit to /login
          // — silently measuring the wrong page for every post-login checkpoint.
          // Keeping storage means final_state is a warm-cache, in-session measurement;
          // it is not comparable to a cold first load, and the Analyzer is told so.
          disableStorageReset: true,
        },
      },
    });
    const lhr = result?.lhr;
    if (!lhr) return { error: 'lighthouse returned no result' };
    const audit = (id) => lhr.audits?.[id]?.numericValue ?? null;
    const auditedUrl = lhr.finalDisplayedUrl ?? lhr.finalUrl ?? requestedUrl;
    return {
      url: auditedUrl,
      // A redirect between "the page under test" and "the page Lighthouse actually
      // measured" invalidates the numbers. Surface it rather than let it pass as data.
      requested_url: requestedUrl,
      url_mismatch: normaliseUrl(auditedUrl) !== normaliseUrl(requestedUrl),
      session_seeded: seeded,
      warm_cache: true,
      fetched_at: new Date().toISOString(),
      scores: {
        performance: lhr.categories?.performance?.score ?? null,
        accessibility: lhr.categories?.accessibility?.score ?? null,
        best_practices: lhr.categories?.['best-practices']?.score ?? null,
      },
      metrics: {
        first_contentful_paint_ms: audit('first-contentful-paint'),
        largest_contentful_paint_ms: audit('largest-contentful-paint'),
        total_blocking_time_ms: audit('total-blocking-time'),
        cumulative_layout_shift: audit('cumulative-layout-shift'),
        speed_index_ms: audit('speed-index'),
        time_to_interactive_ms: audit('interactive'),
      },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/** Run axe only if the optional peer dep is present — the pipeline works without it. */
async function runAxe(page) {
  try {
    const { default: AxeBuilder } = await import('@axe-core/playwright');
    const { violations } = await new AxeBuilder({ page }).analyze();
    return violations.map((v) => ({
      id: v.id,
      impact: v.impact ?? 'minor',
      description: v.description,
      nodes: v.nodes.length,
    }));
  } catch {
    return [];
  }
}

export const test = base.extend({
  /**
   * @param {{
   *   feature: string,
   *   axe?: 'per-step' | 'per-navigation' | 'off',
   *   lighthouse?: 'off' | 'on',
   *   lighthousePort?: number,
   * }} options
   * Override per file with:
   *   test.use({ captureOptions: { feature: 'Login', axe: 'per-navigation', lighthouse: 'on' } })
   *
   * Lighthouse defaults to 'off' because an audit costs 10-20s per checkpoint. Module 2's
   * bridging rule turns it on for the happy-path spec only, and even there only two
   * checkpoints fire (initial load, final state).
   */
  captureOptions: [
    { feature: null, plan: null, axe: 'per-navigation', lighthouse: 'off', lighthousePort: 9222 },
    { option: true },
  ],

  capture: async ({ page, captureOptions }, use, testInfo) => {
    const feature = captureOptions.feature ?? testInfo.title;
    const slug = slugify(feature);
    const shotDir = join(ARTIFACTS, 'screenshots', slug);
    mkdirSync(shotDir, { recursive: true });
    mkdirSync(join(ARTIFACTS, 'runs'), { recursive: true });

    const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
    const runTimestamp = new Date().toISOString();
    const t0 = Date.now();
    const steps = [];
    /** Filled by capture.lighthouseCheckpoint(); shape is fixed by the master plan. */
    const lighthouse = { initial_load: null, final_state: null };

    // timestamp_ms is a *user* timeline — the Shot-List Director reads it as the rhythm of
    // the flow. A 10-20s Lighthouse audit between two steps is instrumentation, not the
    // user hesitating, so its cost is subtracted from every subsequent timestamp.
    let instrumentationMs = 0;
    const elapsed = () => Date.now() - t0 - instrumentationMs;

    // Console errors are collected continuously and drained onto the step that was
    // in flight when they fired.
    let pendingConsoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') pendingConsoleErrors.push(msg.text());
    });
    page.on('pageerror', (error) => pendingConsoleErrors.push(String(error)));

    let lastUrl = null;

    const capture = {
      /**
       * @param {string} stepId       joins back to the plan, e.g. 'hp-01'
       * @param {string} action       plain-language description
       * @param {import('@playwright/test').Locator | null} locator element being acted on
       * @param {(locator: any) => Promise<void>} fn the actual interaction
       */
      async step(stepId, action, locator, fn, meta = {}) {
        pendingConsoleErrors = [];
        let status = 'pass';
        let error = null;

        // Measure BEFORE acting. The renderer animates a cursor toward the element the
        // user is about to hit, so the pre-action position is the correct one — and many
        // interactions destroy their own target (a menu item that closes its menu, a link
        // that navigates), which would leave boundingBox() waiting for a detached node.
        let boundingBox = await measure(locator);

        try {
          await fn(locator);
        } catch (err) {
          status = 'fail';
          error = err instanceof Error ? err.message : String(err);
        }

        // Let the UI settle so the screenshot reflects the post-action state.
        await page.waitForLoadState('domcontentloaded').catch(() => {});

        // An element that was not yet on screen before the action (e.g. an error message
        // the click reveals) only has a box afterwards.
        if (!boundingBox) boundingBox = await measure(locator);

        const screenshotPath = join(shotDir, `${stepId}.png`);
        await page.screenshot({ path: screenshotPath }).catch(() => {});

        const url = page.url();
        const navigated = url !== lastUrl;
        lastUrl = url;

        const axeMode = captureOptions.axe ?? 'per-navigation';
        const shouldRunAxe =
          axeMode === 'per-step' || (axeMode === 'per-navigation' && navigated);

        // Same reasoning as the Lighthouse subtraction above, and it took a big page to
        // expose: axe walks the whole accessibility tree, so on a 700-row list it costs ~30s
        // where a login form costs ~200ms. Left in the timeline it reads as the user staring
        // at the screen for half a minute, and the Director and Narrator both take
        // timestamp_ms literally — a gap over ~1200ms is supposed to mean the app was
        // working. Measure it here and subtract it like any other instrumentation.
        const axeStart = Date.now();
        const axeViolations = shouldRunAxe ? await runAxe(page) : [];
        if (shouldRunAxe) instrumentationMs += Date.now() - axeStart;

        steps.push({
          step_id: stepId,
          action,
          selector: locator ? String(locator) : null,
          route: new URL(url).pathname,
          bounding_box: boundingBox,
          timestamp_ms: elapsed(),
          screenshot_path: relative(REPO_ROOT, screenshotPath),
          status,
          error,
          // What the user typed, when they typed. The renderer replays this character by
          // character over the *previous* screenshot so the video shows the text being
          // entered — a screenshot alone can only ever show the field already full.
          typed_text: meta.typedText ?? null,
          typed_masked: meta.typedMasked ?? false,
          axe_violations: axeViolations,
          console_errors: pendingConsoleErrors.slice(),
        });

        pendingConsoleErrors = [];
        if (status === 'fail') throw new Error(`step ${stepId} (${action}) failed: ${error}`);
      },

      /**
       * Fill a field AND record what was typed, so the renderer can animate the keystrokes.
       *
       * Prefer this over `capture.step(..., el => el.fill(text))` for any text entry: the
       * plain step records that a field was filled but not with what, and the demo video
       * then has to cut straight from an empty field to a full one.
       *
       * Masking is detected from the input's own `type` attribute rather than guessed from
       * the selector name, so a password field renders as dots in the video exactly as it
       * does in the screenshot that follows it.
       *
       * @param {string} stepId
       * @param {string} action
       * @param {import('@playwright/test').Locator} locator
       * @param {string} text
       */
      async type(stepId, action, locator, text) {
        const inputType = await locator.getAttribute('type').catch(() => null);
        return capture.step(stepId, action, locator, (el) => el.fill(text), {
          typedText: text,
          typedMasked: inputType === 'password',
        });
      },

      /**
       * Record a Lighthouse audit of the current page under a fixed label.
       * @param {'initial_load' | 'final_state'} label
       */
      async lighthouseCheckpoint(label) {
        if (!(label in lighthouse)) {
          throw new Error(
            `lighthouseCheckpoint: label must be 'initial_load' or 'final_state', got '${label}'`,
          );
        }
        if ((captureOptions.lighthouse ?? 'off') === 'off') return;
        const auditStart = Date.now();
        lighthouse[label] = await runLighthouse(page, captureOptions.lighthousePort ?? 9222);
        instrumentationMs += Date.now() - auditStart;
      },
    };

    await use(capture);

    if (steps.length) {
      let runName = `${slug}-run.json`;
      if (writtenRunLogs.has(runName)) {
        runName = `${slug}--${slugify(testInfo.title)}-run.json`;
        console.warn(
          `two tests share the feature name "${feature}" — writing this one to ${runName}. ` +
            'Give each test its own captureOptions.feature to keep run logs stable.',
        );
      }
      writtenRunLogs.add(runName);
      const runPath = join(ARTIFACTS, 'runs', runName);
      writeFileSync(
        runPath,
        `${JSON.stringify(
          {
            feature_name: feature,
            // Several specs can exercise one plan (a happy-path spec and an edge-case spec
            // share theirs), so the feature slug is only a guess at the plan filename. Point
            // captureOptions.plan at the real one; a path that doesn't resolve is recorded
            // as null rather than as a link the Analyzer will fail to open.
            plan_path: resolvePlanPath(captureOptions.plan, slug),
            run_timestamp: runTimestamp,
            // Playwright finalises trace.zip after every fixture has torn down, so the
            // path cannot be known here. capture-reporter.js patches it in onTestEnd.
            trace_path: null,
            viewport,
            steps,
            lighthouse,
          },
          null,
          2,
        )}\n`,
      );

      // Hand the reporter the run log to patch. An annotation is the only channel that
      // survives from fixture teardown into onTestEnd.
      testInfo.annotations.push({ type: 'qa-run-log', description: relative(REPO_ROOT, runPath) });
      console.log(`run log written: ${relative(REPO_ROOT, runPath)}`);
    }
  },
});

export { expect };
