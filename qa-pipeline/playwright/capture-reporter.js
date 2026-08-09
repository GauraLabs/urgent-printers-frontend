/**
 * Capture reporter — the second half of Module 3.
 *
 * The capture fixture (capture.js) owns everything measurable *during* a test: bounding
 * boxes, timestamps, screenshots, axe, console errors, Lighthouse. It cannot own the
 * trace, because Playwright only finalises trace.zip after every fixture has torn down.
 * By then the fixture has already written its run log with `trace_path: null`.
 *
 * This reporter closes that gap. In onTestEnd the trace attachment exists on disk, so it
 * copies the zip into the pipeline's own artifact tree (Playwright's test-results/ is
 * gitignored churn and gets wiped on the next run) and patches trace_path into the run
 * log the fixture announced via its `qa-run-log` annotation.
 *
 * Registered as a reporter in playwright.config.js, so `npm run qa:capture` gets it by
 * default — Module 4 is "plain playwright test" precisely because this is already wired.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../..');
const TRACE_DIR = resolve(REPO_ROOT, 'qa-pipeline/artifacts/traces');

export default class CaptureReporter {
  constructor() {
    this.patched = [];
    this.problems = [];
  }

  onTestEnd(test, result) {
    const runLogRel = test.annotations?.find((a) => a.type === 'qa-run-log')?.description;
    // A spec that doesn't use the capture fixture (the agents' seed.spec.ts, say) writes
    // no run log. Nothing to patch, and that is not an error.
    if (!runLogRel) return;

    const runLogPath = resolve(REPO_ROOT, runLogRel);
    if (!existsSync(runLogPath)) {
      this.problems.push(`run log announced but missing on disk: ${runLogRel}`);
      return;
    }

    const trace = result.attachments?.find((a) => a.name === 'trace' && a.path);
    if (!trace || !existsSync(trace.path)) {
      // trace: 'on' should make this unreachable, but a crashed worker can drop it.
      this.problems.push(`no trace attachment for "${test.title}" — trace_path stays null`);
      return;
    }

    mkdirSync(TRACE_DIR, { recursive: true });
    // Name the copy after the run log so a feature's trace and run log stay a pair.
    const traceName = `${runLogRel.split('/').pop().replace(/-run\.json$/, '')}-trace.zip`;
    const destination = join(TRACE_DIR, traceName);
    copyFileSync(trace.path, destination);

    const runLog = JSON.parse(readFileSync(runLogPath, 'utf8'));
    runLog.trace_path = relative(REPO_ROOT, destination);
    writeFileSync(runLogPath, `${JSON.stringify(runLog, null, 2)}\n`);
    this.patched.push(`${runLogRel} → ${runLog.trace_path}`);
  }

  onEnd() {
    for (const line of this.patched) console.log(`trace attached: ${line}`);
    for (const line of this.problems) console.warn(`capture-reporter: ${line}`);
  }

  // Keep the terminal readable — the 'list' reporter alongside this one prints progress.
  printsToStdio() {
    return false;
  }
}
