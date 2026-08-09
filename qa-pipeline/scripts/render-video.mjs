#!/usr/bin/env node
/**
 * Module 7 driver — bundles the Remotion composition and renders one file per resolution
 * listed in project.config.json's video_defaults.resolutions.
 *
 *   node qa-pipeline/scripts/render-video.mjs --shotlist=<shotlist.json> --run=<run.json>
 *                                             [--resolutions=1080p60] [--preview|--contact-sheet]
 *
 * No LLM runs here and nothing is decided here. Every editorial choice already lives in
 * shotlist.json; this script only turns it into pixels. Same inputs, same output — which
 * is what makes the video debuggable instead of a black box.
 */
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { buildTimeline } from '../remotion/timeline.js';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../..');

const readJson = (path, label) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    console.error(`✗ could not read ${label} at ${path}: ${error.message}`);
    process.exit(2);
  }
};

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** "1440p60" → { width, height, fps }. Height drives width at a fixed 16:9. */
function parseResolution(label) {
  const match = /^(\d+)p(\d+)$/i.exec(label) ?? /^(4k)(\d+)$/i.exec(label);
  if (!match) throw new Error(`unrecognised resolution "${label}" — expected e.g. 1080p60 or 4K60`);
  const height = match[1].toLowerCase() === '4k' ? 2160 : Number(match[1]);
  const fps = Number(match[2]);
  return { label, width: Math.round((height * 16) / 9), height, fps };
}

// ------------------------------------------------------------------- arguments

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

const shotlistPath = flag('shotlist');
const runPath = flag('run');
const narrationPath = flag('narration');
if (!shotlistPath || !runPath) {
  console.error('usage: render-video.mjs --shotlist=<shotlist.json> --run=<run.json> [--narration=<narration.json>] [--resolutions=…] [--preview|--contact-sheet]');
  process.exit(2);
}

const config = readJson(resolve(REPO_ROOT, 'project.config.json'), 'project.config.json');
const shotlist = readJson(resolve(process.cwd(), shotlistPath), 'shot list');
const run = readJson(resolve(process.cwd(), runPath), 'run log');
const narration = narrationPath ? readJson(resolve(process.cwd(), narrationPath), 'narration') : null;

// An unsynthesized line has no measured duration, so the timeline cannot reserve room for
// it and the renderer has no audio to play. Rendering anyway would produce a silent cut
// that looks correct — the worst kind of wrong — so name the lines and stop.
if (narration) {
  const unsynth = narration.lines.filter((l) => !l.audio_path || !l.duration_ms);
  if (unsynth.length) {
    console.error(`✗ ${unsynth.length} narration line(s) have no synthesized audio: ${unsynth.map((l) => l.step_id).join(', ')}`);
    console.error('  Run: npm run qa:narrate -- --narration=<narration.json>');
    process.exit(2);
  }
  const missingAudio = narration.lines.filter((l) => !existsSync(resolve(REPO_ROOT, l.audio_path)));
  if (missingAudio.length) {
    console.error(`✗ narration audio missing on disk: ${missingAudio.map((l) => l.audio_path).join(', ')}`);
    console.error('  mp3s are gitignored build products — re-run qa:narrate to regenerate them.');
    process.exit(2);
  }
}

const brand = config.brand ?? {};
const artifactsDir = resolve(REPO_ROOT, 'qa-pipeline/artifacts');
const slug = slugify(shotlist.feature_name);
const outDir = resolve(REPO_ROOT, config.output_dirs.video, 'renders', slug);
mkdirSync(outDir, { recursive: true });

const resolutions = (flag('resolutions')?.split(',') ?? config.video_defaults.resolutions).map(parseResolution);
const previewOnly = args.includes('--preview');
const contactSheet = args.includes('--contact-sheet');

// A missing screenshot yields a placeholder frame rather than a crash, but it is always
// worth saying so — a silently empty shot is the kind of defect nobody notices until the
// video is in front of someone.
const missing = shotlist.shots
  .map((shot) => run.steps.find((s) => s.step_id === shot.step_id))
  .filter((step) => step && !existsSync(resolve(REPO_ROOT, step.screenshot_path)));
if (missing.length) {
  console.warn(`! ${missing.length} shot(s) have no screenshot on disk — run \`npm run qa:capture\` first:`);
  for (const step of missing) console.warn(`    ${step.step_id} → ${step.screenshot_path}`);
}

if (shotlist.page_findings?.some((p) => p.blocks_public_cut)) {
  const routes = shotlist.page_findings.filter((p) => p.blocks_public_cut).map((p) => p.route);
  console.warn(
    `! page_findings mark this cut as internal-review only (critical findings on ${routes.join(', ')}).`,
  );
  console.warn('  Rendering anyway — the shot list is the authority — but do not publish without a human sign-off.');
}

// The logo is inlined as a data URI: the bundle is served from a temp directory, so a
// repo-relative path would not resolve inside the browser.
const logoAbs = brand.logo_path ? resolve(REPO_ROOT, brand.logo_path) : null;
const logoDataUri =
  logoAbs && existsSync(logoAbs)
    ? `data:image/svg+xml;base64,${readFileSync(logoAbs).toString('base64')}`
    : null;

// ---------------------------------------------------------------------- render

console.log('bundling composition…');
const serveUrl = await bundle({
  entryPoint: resolve(REPO_ROOT, 'qa-pipeline/remotion/index.jsx'),
  // Screenshots live under artifacts/, so staticFile('screenshots/…') resolves once the
  // run log's repo-relative prefix is stripped. See screenshotBase below.
  publicDir: artifactsDir,
});

const baseProps = {
  shotlist,
  run,
  brand,
  // Form-field colours for the typing overlay. These describe the APP's inputs, not the
  // brand, so a dark-themed app overrides them without touching the renderer.
  fieldStyle: config.video_defaults?.field_style ?? { background: '#ffffff', text: '#0f172a' },
  projectName: config.project_name,
  logoDataUri,
  screenshotBase: 'qa-pipeline/artifacts/',
  narration,
  // Read from the tts block so the pause before and after a line is a project-level voice
  // decision, not a renderer constant.
  narrationTiming: narration
    ? { leadInMs: config.tts?.lead_in_ms, tailMs: config.tts?.tail_ms }
    : null,
};

if (narration) {
  const spoken = narration.lines.reduce((sum, l) => sum + l.duration_ms, 0);
  console.log(`narration: ${narration.lines.length} lines, ${(spoken / 1000).toFixed(1)}s of speech (${narration.language})`);
}

for (const resolution of resolutions) {
  const inputProps = { ...baseProps, width: resolution.width, height: resolution.height, fps: resolution.fps };
  const composition = await selectComposition({ serveUrl, id: 'FeatureDemo', inputProps });

  if (previewOnly || contactSheet) {
    // One still at the midpoint of each shot, plus the intro and outro cards. Checking a
    // 20-second encode frame by frame is slow; this shows every framing, callout position
    // and brand card in seconds, which is how you actually catch a zoom anchored on the
    // wrong element or a caption running off-frame.
    const timeline = buildTimeline(shotlist, run, resolution.fps, {
      narration,
      leadInMs: config.tts?.lead_in_ms,
      tailMs: config.tts?.tail_ms,
    });
    const marks = contactSheet
      ? [
          { name: 'intro', frame: Math.floor(timeline.introFrames / 2) },
          ...timeline.shots.map((shot) => ({
            name: `${String(shot.index + 1).padStart(2, '0')}-${shot.step_id}-${shot.emphasis}`,
            frame: shot.from + Math.floor(shot.durationFrames / 2),
          })),
          { name: 'outro', frame: timeline.outroFrom + Math.floor(timeline.outroFrames / 2) },
        ]
      : [{ name: 'preview', frame: Math.floor(composition.durationInFrames * 0.62) }];

    for (const mark of marks) {
      const stillPath = join(outDir, `${mark.name}-${resolution.label}.png`);
      await renderStill({
        composition,
        serveUrl,
        output: stillPath,
        inputProps,
        frame: Math.min(mark.frame, composition.durationInFrames - 1),
        chromiumOptions: { gl: 'swangle' },
      });
      console.log(`✓ ${relative(REPO_ROOT, stillPath)}`);
    }
    continue;
  }

  const outputLocation = join(outDir, `${resolution.label}.mp4`);
  const seconds = (composition.durationInFrames / resolution.fps).toFixed(1);
  console.log(`rendering ${resolution.label} (${resolution.width}x${resolution.height}, ${seconds}s)…`);

  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation,
    inputProps,
    // swangle is the software rasteriser: no GPU is available in CI or a container, and
    // the default GL backend fails there rather than falling back.
    chromiumOptions: { gl: 'swangle' },
    onProgress: ({ progress }) => {
      if (Math.round(progress * 100) % 25 === 0) process.stdout.write(`  ${Math.round(progress * 100)}%\r`);
    },
  });
  console.log(`✓ ${relative(REPO_ROOT, outputLocation)}`);
}
