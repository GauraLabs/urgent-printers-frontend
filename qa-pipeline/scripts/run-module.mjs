#!/usr/bin/env node
/**
 * Runs an AI module against a local (or any OpenAI-compatible) LLM instead of Claude Code.
 *
 *   node qa-pipeline/scripts/run-module.mjs --module=release-notes \
 *        --out=qa-pipeline/artifacts/release-notes/x.json \
 *        --context=plan:path.json --context=analysis:path.json \
 *        [--provider=local-big] [--dry-run]
 *
 * Why this exists, beyond saving Claude tokens: the slash commands only run inside an
 * interactive Claude Code session. Nothing in CI can invoke them. This makes every AI module
 * a plain subprocess, which is what Phase 6 (orchestration + GitHub Actions) actually needs.
 *
 * ## The reliability story
 *
 * Three layers, strongest first:
 *
 *   1. **Guided decoding.** When the provider supports `response_format: json_schema` (vLLM
 *      does), the schema is enforced at the token level and malformed JSON is not merely
 *      unlikely, it is unrepresentable.
 *   2. **Local validation.** The same validate.mjs the rest of the pipeline uses. Guided
 *      decoding guarantees *shape*, never *sense* — a schema cannot say "this step_id must
 *      exist in the run log".
 *   3. **Retry with the errors fed back**, then escalate.
 *
 * A weak model therefore fails loudly at a gate instead of quietly poisoning everything
 * downstream, which is the only reason running these modules on a 27B is defensible at all.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../..');

const args = process.argv.slice(2);
const flag = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=');
const flags = (n) => args.filter((a) => a.startsWith(`--${n}=`)).map((a) => a.split('=').slice(1).join('='));
const dryRun = args.includes('--dry-run');

const moduleName = flag('module');
const outPath = flag('out');
if (!moduleName || !outPath) {
  console.error('usage: run-module.mjs --module=<name> --out=<file.json> [--context=<label>:<path>]… [--provider=<id>]');
  process.exit(2);
}

const config = JSON.parse(readFileSync(resolve(REPO_ROOT, 'project.config.json'), 'utf8'));
const llm = config.llm;
if (!llm) {
  console.error('✗ project.config.json has no `llm` block.');
  process.exit(2);
}

const providerId = flag('provider') ?? llm.modules?.[moduleName] ?? llm.default;
const provider = llm.providers?.[providerId];
if (!provider) {
  console.error(`✗ unknown provider "${providerId}". Known: ${Object.keys(llm.providers ?? {}).join(', ')}`);
  process.exit(2);
}

// ------------------------------------------------------------------- prompt

const promptPath = resolve(REPO_ROOT, '.claude/commands', `${moduleName}.md`);
if (!existsSync(promptPath)) {
  console.error(`✗ no prompt at ${promptPath}`);
  process.exit(2);
}
// The module prompts are Claude Code slash commands with YAML frontmatter. Everything after
// it is provider-agnostic instruction text, so the same file serves both paths — there is no
// second copy of a prompt to drift out of sync.
const rawPrompt = readFileSync(promptPath, 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '');

const schemaMap = {
  'plan-feature': 'plan.schema.json',
  'analyze-run': 'analysis.schema.json',
  'direct-shotlist': 'shot-list.schema.json',
  'narrate-feature': 'narration.schema.json',
  'release-notes': 'release-notes.schema.json',
  'document-feature': 'doc.schema.json',
};
const validateKind = {
  'plan-feature': 'plan',
  'analyze-run': 'analysis',
  'direct-shotlist': 'shotlist',
  'narrate-feature': 'narration',
  'release-notes': 'release-notes',
  'document-feature': 'doc',
}[moduleName];

const schemaFile = schemaMap[moduleName];
if (!schemaFile) {
  console.error(`✗ no schema mapped for module "${moduleName}"`);
  process.exit(2);
}
const schema = JSON.parse(readFileSync(resolve(REPO_ROOT, 'qa-pipeline/schemas', schemaFile), 'utf8'));

// Context files are labelled so the prompt's own vocabulary ("the run log", "the plan")
// lines up with what the model is looking at.
const contextBlocks = flags('context').map((spec) => {
  const idx = spec.indexOf(':');
  const label = spec.slice(0, idx);
  const path = spec.slice(idx + 1);
  return `### ${label}  (${path})\n\n\`\`\`json\n${readFileSync(resolve(process.cwd(), path), 'utf8')}\n\`\`\``;
});
for (const spec of flags('text')) {
  const idx = spec.indexOf(':');
  contextBlocks.push(`### ${spec.slice(0, idx)}\n\n${readFileSync(resolve(process.cwd(), spec.slice(idx + 1)), 'utf8')}`);
}

const configBlock = `### project.config.json\n\n\`\`\`json\n${JSON.stringify(config, null, 2)}\n\`\`\``;

const systemPrompt = [
  rawPrompt,
  '',
  '---',
  '',
  'You are running headless, not inside an interactive session. You cannot read files, run',
  'commands, or ask questions. Everything you need is supplied below.',
  '',
  'Output ONLY the JSON artifact this module produces. No prose, no markdown fence, no',
  'commentary. Ignore any instruction above about writing files or telling the user to run a',
  'command — the caller writes the file.',
].join('\n');

const userPrompt = [configBlock, ...contextBlocks].join('\n\n');

// A prompt that overflows the context window fails in a way that looks like a bad model
// rather than a bad request, so measure it and say so. ~3.5 chars/token is a rough but
// safe estimate for mixed JSON + prose.
const estTokens = Math.round((systemPrompt.length + userPrompt.length) / 3.5);
console.log(`module ${moduleName} → ${providerId} (${provider.model})`);
console.log(`  context ~${estTokens.toLocaleString()} tokens, window ${provider.context_window?.toLocaleString() ?? '?'}`);
if (provider.context_window && estTokens > provider.context_window * 0.75) {
  console.warn(`  ! prompt is >75% of the window — leaves little room for output. Consider a longer-context provider.`);
}

if (dryRun) {
  console.log('\nDRY RUN — prompt assembled, nothing sent.');
  process.exit(0);
}

// -------------------------------------------------------------------- call

async function callModel(messages) {
  const body = {
    model: provider.model,
    messages,
    temperature: provider.temperature ?? 0.2,
    max_tokens: provider.max_tokens ?? 8000,
  };
  // Not every server implements guided decoding; when it is unsupported the request is
  // rejected outright rather than silently ignored, so fall back rather than fail.
  if (provider.guided_json !== false) {
    body.response_format = { type: 'json_schema', json_schema: { name: moduleName.replace(/-/g, '_'), schema } };
  }

  const started = Date.now();
  const res = await fetch(`${provider.base_url}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(provider.api_key_env && process.env[provider.api_key_env]
        ? { Authorization: `Bearer ${process.env[provider.api_key_env]}` }
        : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(provider.timeout_ms ?? 600_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text.slice(0, 400)}`);
  }
  const json = await res.json();
  const choice = json.choices[0];
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  const usage = json.usage ?? {};
  console.log(
    `  ${elapsed}s · ${usage.prompt_tokens ?? '?'} in / ${usage.completion_tokens ?? '?'} out · finish=${choice.finish_reason}`,
  );
  // A reasoning model spends tokens before it answers. Truncation here shows up as valid
  // JSON that is simply missing fields, so name it rather than letting validation guess.
  if (choice.finish_reason === 'length') {
    console.warn('  ! hit max_tokens — output is truncated. Raise max_tokens for this provider.');
  }
  return choice.message.content ?? '';
}

/** Models wrap JSON in fences or prose often enough that this is cheaper than a retry. */
function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.search(/[[{]/);
  if (start === -1) throw new Error('no JSON found in response');
  const end = Math.max(candidate.lastIndexOf('}'), candidate.lastIndexOf(']'));
  return JSON.parse(candidate.slice(start, end + 1));
}

/** Runs the real validator, so local runs are held to the same bar as Claude's output. */
function validateArtifact(path, extraArgs) {
  try {
    execFileSync(
      'node',
      [resolve(REPO_ROOT, 'qa-pipeline/scripts/validate.mjs'), validateKind, path, ...extraArgs],
      { encoding: 'utf8', stdio: 'pipe' },
    );
    return { ok: true };
  } catch (error) {
    return { ok: false, errors: `${error.stdout ?? ''}${error.stderr ?? ''}`.trim() };
  }
}

/**
 * Is the endpoint actually there?
 *
 * Retrying a dead server three times is pure delay — the answer is the same each time and
 * none of the retries can help. Worse, "fetch failed" reads like a bug in this script when
 * it really means "the GPU box is off", which sends people debugging the wrong thing. Check
 * once, and if it is down say precisely what to run instead.
 */
async function providerReachable() {
  try {
    const res = await fetch(`${provider.base_url}/models`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

if (!(await providerReachable())) {
  console.error(`\n✗ ${providerId} is not reachable at ${provider.base_url}`);
  console.error('  The local model server is down, unreachable, or not started.\n');
  console.error('  FALL BACK TO CLAUDE — the module still works, it just costs tokens:');
  console.error(`      /${moduleName} ${flags('context').map((c) => `--${c.split(':')[0]}=${c.split(':').slice(1).join(':')}`).join(' ')}`);
  console.error('\n  Or point at another provider:');
  console.error(`      --provider=${Object.keys(llm.providers).filter((p) => p !== providerId).join(' | ') || '<none configured>'}`);
  // Distinct exit code so an orchestrator can tell "infrastructure is down, escalate" apart
  // from "the model produced an invalid artifact" (exit 1). Those need different responses.
  process.exit(3);
}

const validateArgs = flags('validate-arg');
const maxAttempts = provider.max_attempts ?? 3;
let messages = [
  { role: 'system', content: systemPrompt },
  { role: 'user', content: userPrompt },
];

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  console.log(`\nattempt ${attempt}/${maxAttempts}`);
  let raw;
  try {
    raw = await callModel(messages);
  } catch (error) {
    console.error(`  ✗ request failed — ${error.message}`);
    if (attempt === maxAttempts) process.exit(1);
    continue;
  }

  let parsed;
  try {
    parsed = extractJson(raw);
  } catch (error) {
    console.error(`  ✗ ${error.message}`);
    messages = [...messages, { role: 'assistant', content: raw.slice(0, 2000) }, {
      role: 'user',
      content: 'That was not parseable JSON. Reply with the JSON artifact only.',
    }];
    continue;
  }

  const absOut = resolve(process.cwd(), outPath);
  mkdirSync(dirname(absOut), { recursive: true });
  writeFileSync(absOut, `${JSON.stringify(parsed, null, 2)}\n`);

  const result = validateArtifact(absOut, validateArgs);
  if (result.ok) {
    console.log(`\n✓ ${outPath} — valid ${validateKind} artifact from ${providerId}`);
    process.exit(0);
  }

  console.error(`  ✗ validation failed:\n${result.errors.split('\n').map((l) => `      ${l}`).join('\n')}`);
  if (attempt === maxAttempts) {
    // The file is deliberately left on disk. Reading what the model actually produced is
    // how you tell "the model is too weak for this module" from "the prompt was ambiguous",
    // and deleting it would throw that away.
    console.error(`\n✗ giving up after ${maxAttempts} attempts. Invalid output left at ${outPath} for inspection.`);
    console.error(`  Escalate: run /${moduleName} in Claude Code, or retry with --provider=<stronger>.`);
    process.exit(1);
  }
  messages = [
    ...messages,
    { role: 'assistant', content: JSON.stringify(parsed).slice(0, 4000) },
    {
      role: 'user',
      content: `That artifact failed validation:\n\n${result.errors}\n\nFix ONLY these problems and return the complete corrected JSON.`,
    },
  ];
}
