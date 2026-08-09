#!/usr/bin/env node
/**
 * Zero-dependency validator for the pipeline artifacts.
 *
 *   node qa-pipeline/scripts/validate.mjs plan     <plan.json>
 *   node qa-pipeline/scripts/validate.mjs run      <run.json>
 *   node qa-pipeline/scripts/validate.mjs shotlist <shotlist.json> --run=<run.json>
 *   node qa-pipeline/scripts/validate.mjs analysis <analysis.json> --run=<run.json>
 *   node qa-pipeline/scripts/validate.mjs doc      <report.json>   --run=<run.json>
 *
 * Note: run it with `node`, not `npm run qa:validate`, when passing --run= —
 * npm consumes leading `--`-prefixed arguments before the script ever sees them.
 *
 * Supports the JSON Schema subset the schema files actually use: type (incl. arrays),
 * enum, required, properties, additionalProperties:false, items, minItems, minLength,
 * minimum, maximum, pattern, and local $ref into #/definitions.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCHEMA_DIR = resolve(HERE, '../schemas');

const SCHEMAS = {
  plan: 'plan.schema.json',
  run: 'run-log.schema.json',
  shotlist: 'shot-list.schema.json',
  analysis: 'analysis.schema.json',
  doc: 'doc.schema.json',
  narration: 'narration.schema.json',
  'release-notes': 'release-notes.schema.json',
};

/** Artifact kinds whose cross-checks need the run log they describe. */
const NEEDS_RUN = new Set(['shotlist', 'analysis', 'doc']);

/** The eight sections the master plan requires of every generated document, in order. */
const REQUIRED_DOC_SECTIONS = [
  /overview|objective/i,
  /feature description|business logic/i,
  /user flow/i,
  /screenshot/i,
  /test result|coverage/i,
  /accessibilit/i,
  /performance/i,
  /recommendation|future/i,
];

// ---------------------------------------------------------------- schema walk

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function deref(schema, root) {
  if (!schema || !schema.$ref) return schema;
  const path = schema.$ref.replace(/^#\//, '').split('/');
  return path.reduce((node, key) => node?.[key], root);
}

function validate(value, schema, root, path, errors) {
  schema = deref(schema, root);
  if (!schema) return;

  if (schema.type) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = typeOf(value);
    // JSON has no integer/number distinction here; treat both as "number".
    if (!allowed.includes(actual)) {
      errors.push(`${path}: expected ${allowed.join(' | ')}, got ${actual}`);
      return;
    }
    if (actual === 'null') return; // nullable branch — nothing further to check
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: ${JSON.stringify(value)} is not one of ${schema.enum.join(' | ')}`);
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path}: string shorter than minLength ${schema.minLength}`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${path}: "${value}" does not match pattern ${schema.pattern}`);
    }
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${path}: ${value} is below minimum ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${path}: ${value} is above maximum ${schema.maximum}`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path}: needs at least ${schema.minItems} item(s), got ${value.length}`);
    }
    if (schema.items) {
      value.forEach((item, i) => validate(item, schema.items, root, `${path}[${i}]`, errors));
    }
  }

  if (typeOf(value) === 'object') {
    for (const key of schema.required ?? []) {
      if (!(key in value)) errors.push(`${path}: missing required property "${key}"`);
    }
    if (schema.additionalProperties === false && schema.properties) {
      for (const key of Object.keys(value)) {
        if (!(key in schema.properties)) errors.push(`${path}: unexpected property "${key}"`);
      }
    }
    for (const [key, sub] of Object.entries(schema.properties ?? {})) {
      if (key in value) validate(value[key], sub, root, `${path}.${key}`, errors);
    }
  }
}

// ------------------------------------------------------- cross-artifact rules

function planRules(plan, errors) {
  if (plan.feature_found === false) return; // Planner is allowed to stop after Step 1
  for (const key of ['user_goal', 'business_goal', 'user_journey', 'happy_path', 'error_paths', 'edge_cases']) {
    if (!(key in plan)) errors.push(`plan: "${key}" is required when feature_found is true`);
  }
  const ids = [
    ...(plan.happy_path ?? []),
    ...(plan.alternate_paths ?? []).flatMap((p) => p.steps ?? []),
  ].map((s) => s.step_id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) errors.push(`plan: duplicate step_id(s) ${[...new Set(dupes)].join(', ')}`);
}

function runRules(run, errors) {
  const ids = run.steps.map((s) => s.step_id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) errors.push(`run: duplicate step_id(s) ${[...new Set(dupes)].join(', ')}`);

  let previous = -1;
  for (const step of run.steps) {
    if (step.timestamp_ms < previous) {
      errors.push(`run: step ${step.step_id} timestamp_ms goes backwards (${step.timestamp_ms} < ${previous})`);
    }
    previous = step.timestamp_ms;
    // A box may legitimately overflow the viewport — a scrollable <main> is taller than
    // the window. What must never happen is a box with no on-screen part at all: the
    // renderer cannot frame a shot around something the screenshot does not contain.
    const box = step.bounding_box;
    if (box) {
      const { width: vw, height: vh } = run.viewport;
      const offscreen =
        box.x + box.width <= 0 || box.y + box.height <= 0 || box.x >= vw || box.y >= vh;
      if (offscreen) {
        errors.push(`run: step ${step.step_id} bounding_box lies entirely outside the ${vw}x${vh} viewport`);
      }
    }
  }
}

function shotlistRules(shotlist, run, errors) {
  const sum = shotlist.shots.reduce((total, shot) => total + shot.duration_ms, 0);
  if (sum !== shotlist.total_estimated_duration_ms) {
    errors.push(`shotlist: total_estimated_duration_ms is ${shotlist.total_estimated_duration_ms} but shot durations sum to ${sum}`);
  }

  const ids = shotlist.shots.map((s) => s.step_id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) errors.push(`shotlist: duplicate step_id(s) ${[...new Set(dupes)].join(', ')}`);

  if (shotlist.shots.length && shotlist.shots[0].transition_in !== 'cut') {
    errors.push('shotlist: the first shot must have transition_in "cut"');
  }

  const whipPans = shotlist.shots.filter((s) => s.transition_in === 'whip-pan').length;
  if (whipPans > 3) errors.push(`shotlist: ${whipPans} whip-pan transitions — the director prompt caps this at 3`);

  const flagged = new Set(shotlist.flagged_for_review.map((f) => f.step_id));
  for (const id of ids) {
    if (flagged.has(id)) errors.push(`shotlist: step ${id} is both rendered and flagged_for_review`);
  }

  if (!run) return;
  const runSteps = new Map(run.steps.map((s) => [s.step_id, s]));
  for (const id of [...ids, ...flagged]) {
    if (!runSteps.has(id)) errors.push(`shotlist: step_id "${id}" does not exist in the run log`);
  }
  // A step is excluded from the public cut when the *step itself* is broken: it failed, or
  // it threw console errors. Page-level axe violations are deliberately NOT in this list —
  // axe runs per navigation, so its findings describe the whole route rather than the
  // element the step touched, and gating on them excluded every payoff shot in the flow
  // (the dashboard reveal included) over sitewide contrast noise. Those findings belong in
  // page_findings, where a human still sees them. Failures and console errors keep gating.
  for (const step of run.steps) {
    const broken = step.status === 'fail' || (step.console_errors ?? []).length > 0;
    if (broken && !flagged.has(step.step_id)) {
      errors.push(
        `shotlist: run step ${step.step_id} failed or logged console errors but is not in flagged_for_review`,
      );
    }
  }

  // Every route carrying violations must be accounted for in page_findings. Dropping them
  // is how an inaccessible screen ends up in a published demo with nobody having decided so.
  const routesWithFindings = new Set(
    run.steps.filter((s) => (s.axe_violations ?? []).length > 0).map((s) => s.route),
  );
  const reported = new Set((shotlist.page_findings ?? []).map((p) => p.route));
  const rendered = new Set(shotlist.shots.map((s) => s.step_id));
  for (const route of routesWithFindings) {
    // Only require a page_findings entry for routes the public cut actually shows.
    const shown = run.steps.some(
      (s) => s.route === route && rendered.has(s.step_id) && (s.axe_violations ?? []).length > 0,
    );
    if (shown && !reported.has(route)) {
      errors.push(
        `shotlist: route "${route}" has axe violations and appears in the render, but is missing from page_findings`,
      );
    }
  }
}

function analysisRules(analysis, run, errors) {
  const caveat = analysis.accessibility_summary.coverage_caveat;
  // The master plan requires this caveat to survive into the docs verbatim. An Analyzer
  // that drops or softens it lets a clean automated scan read as "accessible", which is
  // the single most misleading thing this pipeline could publish.
  if (!/automated/i.test(caveat) || !/manual|screen.reader/i.test(caveat)) {
    errors.push(
      'analysis: accessibility_summary.coverage_caveat must state that the scan is automated only ' +
        'and that manual/screen-reader review is still needed',
    );
  }

  const ids = analysis.failures.map((f) => f.step_id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) errors.push(`analysis: duplicate failure step_id(s) ${[...new Set(dupes)].join(', ')}`);

  if (!run) return;

  const actualPass = run.steps.filter((s) => s.status === 'pass').length;
  const actualFail = run.steps.filter((s) => s.status === 'fail').length;
  if (analysis.pass_count !== actualPass) {
    errors.push(`analysis: pass_count is ${analysis.pass_count} but the run log has ${actualPass} passing step(s)`);
  }
  if (analysis.fail_count !== actualFail) {
    errors.push(`analysis: fail_count is ${analysis.fail_count} but the run log has ${actualFail} failing step(s)`);
  }

  if (analysis.feature_name !== run.feature_name) {
    errors.push(`analysis: feature_name "${analysis.feature_name}" does not match the run log's "${run.feature_name}"`);
  }

  const runSteps = new Map(run.steps.map((s) => [s.step_id, s]));
  for (const failure of analysis.failures) {
    const step = runSteps.get(failure.step_id);
    if (!step) {
      errors.push(`analysis: failure step_id "${failure.step_id}" does not exist in the run log`);
    } else if (step.status !== 'fail') {
      errors.push(`analysis: step "${failure.step_id}" is reported as a failure but passed in the run log`);
    }
  }

  // Every real failure must be accounted for. Silently dropping one is how a regression
  // reaches the release notes as "no known issues".
  const explained = new Set(ids);
  for (const step of run.steps) {
    if (step.status === 'fail' && !explained.has(step.step_id)) {
      errors.push(`analysis: run step ${step.step_id} failed but has no entry in failures`);
    }
  }

  // axe findings are the Analyzer's raw material; an empty summary alongside real
  // violations means it skipped its own input rather than judged it clean.
  const impacts = new Set(
    run.steps.flatMap((s) => (s.axe_violations ?? []).map((v) => v.impact)),
  );
  const summary = analysis.accessibility_summary;
  for (const impact of ['critical', 'serious', 'moderate']) {
    if (impacts.has(impact) && summary[impact].length === 0) {
      errors.push(`analysis: the run log has ${impact} axe violations but accessibility_summary.${impact} is empty`);
    }
  }
}

function docRules(doc, run, errors) {
  // The eight sections are the deliverable's contract with its reader. A document missing
  // "Accessibility" reads as a document about a feature with no accessibility concerns.
  const headings = doc.sections.map((s) => s.heading);
  REQUIRED_DOC_SECTIONS.forEach((pattern, i) => {
    if (!headings.some((h) => pattern.test(h))) {
      errors.push(`doc: no section heading matches required section ${i + 1} (${pattern})`);
    }
  });

  // The caveat has to survive the hop from analysis.json into the prose a human reads;
  // this is the last checkpoint before it reaches a PDF someone forwards.
  const a11y = doc.sections.find((s) => /accessibilit/i.test(s.heading));
  if (a11y && !/automated/i.test(a11y.body_markdown)) {
    errors.push('doc: the accessibility section must carry the automated-scan coverage caveat');
  }

  if (!run) return;

  const known = new Set(run.steps.map((s) => s.screenshot_path));
  for (const shot of doc.screenshot_captions) {
    if (!known.has(shot.screenshot_path)) {
      errors.push(`doc: screenshot_path "${shot.screenshot_path}" is not in the run log`);
    }
  }
  const captioned = new Set(doc.screenshot_captions.map((s) => s.screenshot_path));
  const dupes = doc.screenshot_captions.length - captioned.size;
  if (dupes > 0) errors.push(`doc: ${dupes} duplicate screenshot_path entrie(s) in screenshot_captions`);

  if (doc.feature_name !== run.feature_name) {
    errors.push(`doc: feature_name "${doc.feature_name}" does not match the run log's "${run.feature_name}"`);
  }
}

// ------------------------------------------------------------------ cli entry

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    console.error(`✗ could not read ${label} at ${path}: ${error.message}`);
    process.exit(2);
  }
}

/**
 * Narration cross-checks.
 *
 * The expensive failure this catches is a line that was written but never synthesized: the
 * renderer would place a silent gap where speech should be, and every frame would still look
 * correct. Half-synthesized narration is a normal state after a failed run, so it is worth
 * naming precisely rather than reporting "invalid".
 */
function narrationRules(narration, shotlist, errors) {
  const ids = narration.lines.map((l) => l.step_id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) errors.push(`narration: duplicate step_id(s) ${[...new Set(dupes)].join(', ')}`);

  for (const line of narration.lines) {
    const synthesized = Boolean(line.audio_path) && typeof line.duration_ms === 'number';
    const partial = Boolean(line.audio_path) !== (typeof line.duration_ms === 'number');
    if (partial) {
      errors.push(
        `narration: line ${line.step_id} has audio_path or duration_ms but not both — re-run the synthesizer`,
      );
    }
    // A measured line whose rate is wildly off usually means the text and the audio have
    // drifted apart: the line was edited after synthesis and the cache key did not change.
    if (synthesized && line.duration_ms > 0) {
      const rate = line.text.length / (line.duration_ms / 1000);
      if (rate > 45) {
        errors.push(
          `narration: line ${line.step_id} claims ${rate.toFixed(0)} chars/s — audio is almost certainly stale for this text`,
        );
      }
    }
  }

  if (!shotlist) return;

  const shotIds = new Set(shotlist.shots.map((s) => s.step_id));
  for (const line of narration.lines) {
    if (line.step_id === 'intro' || line.step_id === 'outro') continue;
    if (!shotIds.has(line.step_id)) {
      errors.push(`narration: line "${line.step_id}" has no matching shot in the shot list`);
    }
  }
  // A shot with no line is a silent stretch of video. Not fatal — an establishing shot can
  // legitimately be silent — so it is a warning, not an error.
  const lineIds = new Set(narration.lines.map((l) => l.step_id));
  const silent = [...shotIds].filter((id) => !lineIds.has(id));
  if (silent.length) {
    console.warn(`! ${silent.length} shot(s) have no narration line: ${silent.join(', ')}`);
  }
}

const [kind, target, ...rest] = process.argv.slice(2);

if (!kind || !target || !SCHEMAS[kind]) {
  console.error('usage: validate.mjs <plan|run|shotlist|analysis|doc|narration|release-notes> <file.json>');
  console.error('                    [--run=<run.json>] [--shotlist=<shotlist.json>]');
  process.exit(2);
}

const schema = readJson(resolve(SCHEMA_DIR, SCHEMAS[kind]), 'schema');
const doc = readJson(resolve(process.cwd(), target), kind);
const errors = [];

validate(doc, schema, schema, kind, errors);

if (errors.length === 0) {
  if (kind === 'plan') planRules(doc, errors);
  if (kind === 'run') runRules(doc, errors);
  if (kind === 'narration') {
    const shotlistFlag = rest.find((arg) => arg.startsWith('--shotlist='));
    const shotlist = shotlistFlag
      ? readJson(resolve(process.cwd(), shotlistFlag.slice('--shotlist='.length)), 'shot list')
      : null;
    narrationRules(doc, shotlist, errors);
    if (!shotlist) console.warn('! pass --shotlist=<shotlist.json> to check the lines against the shots');
  }
  if (NEEDS_RUN.has(kind)) {
    const runFlag = rest.find((arg) => arg.startsWith('--run='));
    if (!runFlag && !rest.includes('--no-run-check')) {
      // Silently skipping the cross-checks is worse than failing: they are the only thing
      // that catches an invented step_id, an unflagged failing step, or a miscount.
      console.error(`✗ ${kind} validation needs --run=<run.json> (or --no-run-check to skip the cross-checks)`);
      process.exit(2);
    }
    const run = runFlag ? readJson(resolve(process.cwd(), runFlag.slice('--run='.length)), 'run log') : null;
    if (!run) console.warn('! --no-run-check: skipping the cross-checks against the run log');
    if (kind === 'shotlist') shotlistRules(doc, run, errors);
    if (kind === 'analysis') analysisRules(doc, run, errors);
    if (kind === 'doc') docRules(doc, run, errors);
  }
}

if (errors.length) {
  console.error(`✗ ${target} is not a valid ${kind} artifact (${errors.length} problem(s)):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`✓ ${target} is a valid ${kind} artifact`);
