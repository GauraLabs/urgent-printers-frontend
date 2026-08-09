#!/usr/bin/env node
/**
 * Archives a completed run into history_dir so Module 10 has something to diff against.
 *
 *   node qa-pipeline/scripts/archive-run.mjs --plan=<plan.json> --run=<run.json>
 *                                            [--analysis=<analysis.json>]
 *                                            [--shotlist=…] [--narration=…] [--dry-run]
 *
 * Nothing else in the pipeline writes to history_dir, which is why it stayed empty until
 * this existed: every module reads and writes the live artifact directories, so each run
 * overwrites the last. Release notes need the previous state to still be around, and the
 * only way that happens is if something deliberately copies it aside before it is replaced.
 *
 * Archives are named `<slug>/<ISO timestamp>` — sortable, unique per run, and readable. The
 * run log's own `run_timestamp` is preferred over wall-clock so re-archiving an old run
 * files it under when it actually happened.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../..');

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const dryRun = args.includes('--dry-run');

const planPath = flag('plan');
const runPath = flag('run');
if (!planPath || !runPath) {
  console.error('usage: archive-run.mjs --plan=<plan.json> --run=<run.json> [--analysis=…] [--shotlist=…] [--narration=…] [--dry-run]');
  console.error('  plan and run are required: the diff needs the intent and the outcome.');
  process.exit(2);
}

const config = JSON.parse(readFileSync(resolve(REPO_ROOT, 'project.config.json'), 'utf8'));
const historyDir = resolve(REPO_ROOT, config.history_dir);

const readJson = (path, label) => {
  try {
    return JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8'));
  } catch (error) {
    console.error(`✗ could not read ${label}: ${error.message}`);
    process.exit(2);
  }
};

const plan = readJson(planPath, 'plan');
const run = readJson(runPath, 'run log');

if (plan.feature_name !== run.feature_name) {
  // Archiving a plan against another feature's run would silently poison the next diff, and
  // the symptom would be a release note about steps that never belonged together.
  console.error(`✗ feature mismatch: plan is "${plan.feature_name}", run is "${run.feature_name}"`);
  process.exit(2);
}

const slug = plan.feature_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// Colons are legal in a path but awkward in a shell; the timestamp stays sortable without them.
const stamp = (run.run_timestamp ?? new Date().toISOString()).replace(/[:.]/g, '-');
const target = join(historyDir, slug, stamp);

const files = [
  ['plan.json', planPath],
  ['run.json', runPath],
  ['analysis.json', flag('analysis')],
  ['shotlist.json', flag('shotlist')],
  ['narration.json', flag('narration')],
].filter(([, path]) => path);

if (existsSync(target) && !args.includes('--force')) {
  console.error(`✗ already archived: ${relative(REPO_ROOT, target)}`);
  console.error('  Re-archiving the same run would create a diff against itself. Use --force to replace.');
  process.exit(2);
}

console.log(`${dryRun ? 'DRY RUN — ' : ''}archiving ${plan.feature_name} → ${relative(REPO_ROOT, target)}`);

if (!dryRun) mkdirSync(target, { recursive: true });
for (const [name, path] of files) {
  const src = resolve(process.cwd(), path);
  if (!existsSync(src)) {
    console.warn(`  ! skipped ${name} — ${path} does not exist`);
    continue;
  }
  if (!dryRun) copyFileSync(src, join(target, name));
  console.log(`  ✓ ${name}`);
}

// An index makes "what is the previous run" answerable without parsing every archive. It is
// rewritten from the directory listing rather than appended to, so a manually deleted
// archive does not leave a phantom entry behind.
if (!dryRun) {
  const featureDir = join(historyDir, slug);
  const archives = readdirSync(featureDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  writeFileSync(
    join(featureDir, 'index.json'),
    `${JSON.stringify({ feature_name: plan.feature_name, archives }, null, 2)}\n`,
  );

  const previous = archives[archives.length - 2] ?? null;
  console.log(`\n✓ ${archives.length} archive(s) for this feature`);
  console.log(
    previous
      ? `  previous run: ${previous}\n  next: /release-notes --plan=${planPath} --analysis=<analysis.json>`
      : '  this is the first archive — release notes will treat everything as new',
  );
}
