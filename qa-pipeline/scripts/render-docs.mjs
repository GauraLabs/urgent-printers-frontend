#!/usr/bin/env node
/**
 * Documentation renderer — the deterministic half of Module 9.
 *
 *   node qa-pipeline/scripts/render-docs.mjs <report.json> [--run=<run.json>]
 *
 * The LLM produces content blocks (report.json); this turns them into the three
 * deliverables the master plan asks for. Per §11 the model never attempts PDF layout —
 * it writes markdown, and layout is ordinary code.
 *
 * PDF comes from Playwright's Chromium, which this repo already installs for the capture
 * step. That is the whole reason for the choice: no second toolchain, no LaTeX, no system
 * binary, and the same engine that took the screenshots also prints the page.
 *
 * Branding (colours, font, logo) is read from project.config.json, so the same renderer
 * produces a differently-branded document in a different repo without edits.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
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

const slugify = (value) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const escapeHtml = (value) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// --------------------------------------------------------------------- inputs

const [target, ...rest] = process.argv.slice(2);
if (!target) {
  console.error('usage: render-docs.mjs <report.json> [--run=<run.json>]');
  process.exit(2);
}

const config = readJson(resolve(REPO_ROOT, 'project.config.json'), 'project.config.json');
const report = readJson(resolve(process.cwd(), target), 'report');
const runFlag = rest.find((arg) => arg.startsWith('--run='));
const run = runFlag ? readJson(resolve(process.cwd(), runFlag.slice('--run='.length)), 'run log') : null;

const slug = slugify(report.feature_name);
const outDir = resolve(REPO_ROOT, config.output_dirs.docs, slug);
mkdirSync(outDir, { recursive: true });

const brand = config.brand ?? {};
const accent = brand.accent_color ?? '#3b82f6';
const primary = brand.primary_color ?? '#0f172a';
const fontFamily = brand.font_family ?? 'ui-sans-serif, system-ui, sans-serif';

// ------------------------------------------------------------------- markdown

const captionFor = new Map(
  report.screenshot_captions.map((s) => [s.screenshot_path, s.caption]),
);

/**
 * Screenshots are gitignored build products, so a checked-in report.md must not pretend
 * otherwise. Images are linked relative to the markdown file when present, and rendered as
 * a plain note when the capture run hasn't been re-run.
 */
function screenshotBlock() {
  if (!report.screenshot_captions.length) return '';
  const lines = ['', '| Step | Screenshot | What it shows |', '| --- | --- | --- |'];
  for (const shot of report.screenshot_captions) {
    const abs = resolve(REPO_ROOT, shot.screenshot_path);
    const stepId = run?.steps.find((s) => s.screenshot_path === shot.screenshot_path)?.step_id ?? '—';
    const cell = existsSync(abs)
      ? `![${stepId}](${relative(outDir, abs)})`
      : `\`${basename(shot.screenshot_path)}\` *(not captured)*`;
    lines.push(`| \`${stepId}\` | ${cell} | ${shot.caption.replace(/\|/g, '\\|')} |`);
  }
  return `${lines.join('\n')}\n`;
}

function buildMarkdown() {
  const meta = [
    `# ${report.feature_name}`,
    '',
    `**Project:** ${config.project_name}  `,
    `**Generated:** ${report.generated_at ?? new Date().toISOString()}  `,
    run ? `**Run:** ${run.run_timestamp} — ${run.steps.length} steps, viewport ${run.viewport.width}×${run.viewport.height}  ` : '',
    '',
    '---',
    '',
  ].filter((line) => line !== '');

  const body = report.sections.map((section) => {
    const heading = `## ${section.heading}`;
    // The screenshots section is the one place the renderer contributes content of its
    // own: the model writes captions, the renderer knows where the files ended up.
    const extra = /screenshot/i.test(section.heading) ? screenshotBlock() : '';
    return `${heading}\n\n${section.body_markdown.trim()}\n${extra}`;
  });

  return `${meta.join('\n')}\n${body.join('\n\n')}\n`;
}

const markdown = buildMarkdown();
const mdPath = join(outDir, 'report.md');
writeFileSync(mdPath, markdown);

// ----------------------------------------------------------------------- json

const jsonPath = join(outDir, 'report.json');
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

// ------------------------------------------------------------------------ pdf

async function renderPdf() {
  const { marked } = await import('marked');
  const { chromium } = await import('@playwright/test');

  const logoAbs = brand.logo_path ? resolve(REPO_ROOT, brand.logo_path) : null;
  const logo = logoAbs && existsSync(logoAbs)
    ? `<img class="logo" src="data:image/svg+xml;base64,${readFileSync(logoAbs).toString('base64')}" alt="">`
    : '';

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(report.feature_name)}</title>
<style>
  :root { --accent: ${accent}; --primary: ${primary}; }
  * { box-sizing: border-box; }
  body { font-family: ${fontFamily}; color: var(--primary); line-height: 1.6;
         font-size: 11pt; margin: 0; }
  .cover { page-break-after: always; padding-top: 22vh; border-top: 6px solid var(--accent); }
  .cover h1 { font-size: 30pt; margin: 0 0 .2em; letter-spacing: -0.5px; }
  .cover .sub { color: #64748b; font-size: 12pt; }
  .logo { height: 48px; margin-bottom: 2.5rem; }
  h2 { font-size: 15pt; margin-top: 1.8em; padding-bottom: .3em;
       border-bottom: 2px solid var(--accent); page-break-after: avoid; }
  h3 { font-size: 12pt; margin-top: 1.4em; page-break-after: avoid; }
  p, li { orphans: 3; widows: 3; }
  code { background: #f1f5f9; padding: .12em .35em; border-radius: 3px;
         font-size: .88em; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  pre { background: #f8fafc; padding: .9em; border-radius: 6px; overflow-x: auto;
        border-left: 3px solid var(--accent); }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: .92em;
          page-break-inside: avoid; }
  th, td { border: 1px solid #e2e8f0; padding: .5em .7em; text-align: left;
           vertical-align: top; }
  th { background: #f8fafc; font-weight: 600; }
  img { max-width: 100%; border: 1px solid #e2e8f0; border-radius: 4px; }
  .logo { border: none; }
  /* The document metadata is a run header, not a heading — the markdown expresses it as
     bold text, which would otherwise compete with the section titles for weight. */
  body > p:first-of-type { font-size: 9.5pt; color: #64748b; line-height: 1.5; }
  body > p:first-of-type strong { color: #475569; font-weight: 600; }
  blockquote { border-left: 3px solid var(--accent); margin: 1em 0; padding: .1em 1em;
               color: #475569; background: #f8fafc; }
  a { color: var(--accent); }
</style></head>
<body>
  <section class="cover">
    ${logo}
    <h1>${escapeHtml(report.feature_name)}</h1>
    <div class="sub">${escapeHtml(config.project_name)}<br>
      QA &amp; documentation report — ${escapeHtml((report.generated_at ?? new Date().toISOString()).slice(0, 10))}</div>
  </section>
  ${marked.parse(markdown.replace(/^# .*\n/, ''))}
</body></html>`;

  // The HTML is written next to the markdown and loaded over file:// rather than pushed in
  // with setContent, because the screenshot <img> paths are relative to outDir. setContent
  // gives the page an about:blank base URL, against which every one of them 404s and the
  // PDF comes out with empty image boxes.
  const htmlPath = join(outDir, '.report.render.html');
  writeFileSync(htmlPath, html);

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
    await page.emulateMedia({ media: 'print' });
    const pdfPath = join(outDir, 'report.pdf');
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '18mm', bottom: '20mm', left: '16mm', right: '16mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate:
        `<div style="width:100%;font-size:8pt;color:#94a3b8;padding:0 16mm;font-family:${fontFamily};">` +
        `<span>${escapeHtml(config.project_name)} — ${escapeHtml(report.feature_name)}</span>` +
        '<span style="float:right"><span class="pageNumber"></span> / <span class="totalPages"></span></span>' +
        '</div>',
    });
    return pdfPath;
  } finally {
    await browser.close();
    rmSync(htmlPath, { force: true }); // scaffolding, not a deliverable
  }
}

const pdfPath = await renderPdf().catch((error) => {
  console.error(`! PDF rendering failed: ${error.message}`);
  console.error('  Markdown and JSON were still written.');
  return null;
});

console.log(`✓ ${relative(REPO_ROOT, mdPath)}`);
console.log(`✓ ${relative(REPO_ROOT, jsonPath)}`);
if (pdfPath) console.log(`✓ ${relative(REPO_ROOT, pdfPath)}`);
