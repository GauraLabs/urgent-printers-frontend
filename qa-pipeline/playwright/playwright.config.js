import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The target URL and the command that serves it are the two most project-specific things in
// this file, so they come from project.config.json rather than being edited here. A new
// project changes urls.staging and dev_command, not this config.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const config = JSON.parse(readFileSync(resolve(REPO_ROOT, 'project.config.json'), 'utf8'));
const BASE_URL = config.urls?.staging ?? 'http://localhost:5173';
const DEV_COMMAND = config.dev_command ?? 'npm run dev';

/**
 * Run with:  npx playwright test --config=qa-pipeline/playwright/playwright.config.js
 * The webServer block boots the Vite dev server on demand, so no separate terminal.
 */
export default defineConfig({
  testDir: './specs',
  // seed.spec.ts belongs to Playwright's native generator agent, which executes it itself
  // to set up a page. It is an empty test; running it in a capture pass is pure noise.
  testIgnore: ['seed.spec.ts'],
  fullyParallel: false, // shot lists depend on a single deterministic run ordering
  retries: 0, // a retried run would overwrite the run log with a different timeline
  workers: 1,
  // Module 4 is "plain playwright test" only because the capture reporter is registered
  // here by default — no one has to remember a --reporter flag for the run log to be whole.
  reporter: [['list'], ['./capture-reporter.js']],
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 720 },
    // Bounded so a stuck interaction fails as that step with a real message, instead of
    // silently eating the whole test timeout and truncating the run log.
    actionTimeout: 10_000,
    trace: 'on',
    video: 'off', // Remotion renders from screenshots + shot list, not from Playwright video
    launchOptions: {
      // Lighthouse drives the browser over CDP rather than through Playwright's page, so
      // it needs a debugging port to attach to. Harmless when lighthouse is 'off'.
      args: ['--remote-debugging-port=9222'],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Must come AFTER the spread: devices['Desktop Chrome'] pins deviceScaleFactor to
        // 1, and a project's `use` beats the top-level one, so setting this globally is
        // silently ignored.
        //
        // Screenshots are the Remotion renderer's only source footage and it crops into
        // them. At 1x a 1280x720 PNG pushed to 1440p or 4K is visibly soft. Bounding boxes
        // are unaffected — boundingBox() reports CSS pixels regardless of scale factor — so
        // the run log's coordinate space stays the 1280x720 viewport and the renderer maps
        // onto it.
        deviceScaleFactor: 2,
      },
    },
  ],
  webServer: {
    command: DEV_COMMAND,
    url: BASE_URL,
    cwd: '../..',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
