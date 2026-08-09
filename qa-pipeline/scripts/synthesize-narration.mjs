#!/usr/bin/env node
/**
 * Module 8, deterministic half — turns narration.json's text into audio and MEASURES it.
 *
 *   node qa-pipeline/scripts/synthesize-narration.mjs --narration=<narration.json>
 *                                                     [--force] [--dry-run]
 *
 * No LLM runs here. The language was decided by /narrate-feature; this only calls the TTS
 * provider, writes one mp3 per line, and patches `audio_path`, `duration_ms` and `alignment`
 * back into the narration file.
 *
 * Why measure rather than estimate: the renderer extends each shot to fit its line. An
 * estimated duration that runs short truncates speech mid-word, and an estimate that runs
 * long pads the video with silence. Neither failure is visible in the JSON — you only find
 * it by watching the render. So the measurement is taken from the provider's own alignment
 * data and nothing downstream is allowed to guess.
 *
 * The `/with-timestamps` endpoint is used instead of the plain one because it returns
 * per-character timings alongside the audio. That gives an exact duration without shelling
 * out to ffprobe, and it is what lets captions highlight in sync with the voice.
 *
 * Caching: a line whose text is unchanged and whose mp3 still exists is skipped. ElevenLabs
 * bills per character and the free tier allows 10,000, so re-running after editing one line
 * must not re-synthesize the other seven. --force overrides.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../..');

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const force = args.includes('--force');
const dryRun = args.includes('--dry-run');

const narrationPath = flag('narration');
if (!narrationPath) {
  console.error('usage: synthesize-narration.mjs --narration=<narration.json> [--force] [--dry-run]');
  process.exit(2);
}

// ------------------------------------------------------------------ environment

/**
 * Minimal .env reader. A dotenv dependency would be one more thing to install in every
 * project that ports this, for a file format that is four lines of parsing.
 */
function loadEnv() {
  const envPath = resolve(REPO_ROOT, '.env');
  if (!existsSync(envPath)) return;
  for (const raw of readFileSync(envPath, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    if (process.env[key]) continue; // a real env var always wins over the file
    process.env[key] = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  }
}
loadEnv();

const config = JSON.parse(readFileSync(resolve(REPO_ROOT, 'project.config.json'), 'utf8'));
const tts = config.tts;
if (!tts) {
  console.error('✗ project.config.json has no `tts` block. Module 8 cannot run.');
  process.exit(2);
}
const providerOverride = flag('tts-provider');
const providerName = providerOverride ?? tts.provider;
const KNOWN_PROVIDERS = new Set(['elevenlabs', 'chatterbox', 'indic-parler']);
if (!KNOWN_PROVIDERS.has(providerName)) {
  console.error(`✗ unsupported tts provider "${providerName}". Known: ${[...KNOWN_PROVIDERS].join(', ')}`);
  process.exit(2);
}
const providerConfig = tts.providers?.[providerName] ?? {};
const isLocal = providerName !== 'elevenlabs';

const apiKey = isLocal ? null : process.env[tts.api_key_env];
if (!isLocal && !apiKey && !dryRun) {
  console.error(`✗ ${tts.api_key_env} is not set. Put it in .env (which is gitignored) or export it.`);
  process.exit(2);
}

// ---------------------------------------------------------------------- inputs

const narrationAbs = resolve(process.cwd(), narrationPath);
const narration = JSON.parse(readFileSync(narrationAbs, 'utf8'));

const slug = (narration.feature_name ?? 'feature')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');
const audioDir = resolve(REPO_ROOT, config.artifact_dirs.narration, slug);
mkdirSync(audioDir, { recursive: true });

const totalChars = narration.lines.reduce((sum, l) => sum + l.text.length, 0);
console.log(
  `${narration.lines.length} lines, ${totalChars} characters via ${providerName}` +
    (isLocal ? ` (${providerConfig.base_url})` : ` voice ${tts.voice_name ?? tts.voice_id}`),
);

// A line is identified by a hash of everything that affects the audio, THE PROVIDER
// INCLUDED — an A/B between two engines that silently reused the first engine's audio would
// look identical and prove nothing. Change the engine, voice or model and every line
// re-synthesizes, which is correct — mixing voices mid-video is a
// defect that is very easy to ship by accident.
const lineHash = (text) =>
  createHash('sha256')
    .update(
      [
        providerName,
        text,
        tts.voice_id ?? '',
        tts.model_id ?? '',
        providerConfig.description ?? '',
        JSON.stringify(tts.voice_settings ?? {}),
      ].join(' '),
    )
    .digest('hex')
    .slice(0, 12);

// ------------------------------------------------------------------ synthesis

/**
 * Duration straight out of the RIFF header — bytes ÷ (sample rate × channels × bytes/sample).
 *
 * Local engines return raw WAV with no timing metadata, and reaching for ffprobe here would
 * add a system dependency to a script that otherwise has none. A WAV header is 44 bytes of
 * fixed layout; parsing it is cheaper and exact.
 */
function wavDurationMs(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('response was not a WAV file');
  }
  const channels = buffer.readUInt16LE(22);
  const sampleRate = buffer.readUInt32LE(24);
  const bitsPerSample = buffer.readUInt16LE(34);
  // Chunks are not guaranteed to be in a fixed order, so find `data` rather than assume 44.
  let offset = 12;
  while (offset < buffer.length - 8) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === 'data') {
      return Math.round((size / (sampleRate * channels * (bitsPerSample / 8))) * 1000);
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error('WAV had no data chunk');
}

/**
 * Local engines expose `POST /tts?text=…` and return audio only — no character alignment.
 * That is fine by design: narration.schema.json makes `alignment` nullable and the renderer's
 * spokenCharCount falls back to the whole string, so captions appear complete instead of
 * filling in with the voice. Losing the karaoke effect is the price of local synthesis until
 * a forced aligner is wired in.
 */
/**
 * Bring a WAV to a consistent loudness in place, 16-bit PCM only.
 *
 * The local engines return audio around -28 dBFS mean where ElevenLabs lands near -21, which
 * is quiet enough to be a complaint about the finished video rather than a subtlety. Gain is
 * chosen from RMS (perceived loudness) but capped so the loudest sample still sits under
 * -1 dBFS, because raising RMS blindly is how you clip — which is precisely the defect that
 * disqualified the other engine in the A/B.
 */
function normaliseWav(buffer, targetRmsDb = -20, ceilingDb = -1) {
  if (buffer.readUInt16LE(34) !== 16) return buffer; // not 16-bit; leave it alone

  let offset = 12;
  let dataStart = -1;
  let dataSize = 0;
  while (offset < buffer.length - 8) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === 'data') {
      dataStart = offset + 8;
      dataSize = Math.min(size, buffer.length - dataStart);
      break;
    }
    offset += 8 + size + (size % 2);
  }
  if (dataStart < 0) return buffer;

  const count = Math.floor(dataSize / 2);
  let sumSquares = 0;
  let peak = 0;
  for (let i = 0; i < count; i += 1) {
    const s = buffer.readInt16LE(dataStart + i * 2) / 32768;
    sumSquares += s * s;
    peak = Math.max(peak, Math.abs(s));
  }
  if (!count || peak === 0) return buffer;

  const rms = Math.sqrt(sumSquares / count);
  const wanted = 10 ** (targetRmsDb / 20) / rms;
  const allowed = 10 ** (ceilingDb / 20) / peak;
  const gain = Math.min(wanted, allowed);
  if (Math.abs(gain - 1) < 0.02) return buffer;

  for (let i = 0; i < count; i += 1) {
    const at = dataStart + i * 2;
    const scaled = Math.round(buffer.readInt16LE(at) * gain);
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, scaled)), at);
  }
  return buffer;
}

/**
 * Same reasoning as run-module.mjs: a dead TTS box should say "start it or use ElevenLabs",
 * not fail nine times with a network error while you wonder which line broke.
 */
async function ttsReachable() {
  try {
    const res = await fetch(`${providerConfig.base_url}/health`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function synthesizeLocal(text) {
  const base = providerConfig.base_url;
  if (!base) throw new Error(`tts.providers.${providerName}.base_url is not set`);
  // indic-parler picks its speaker from a natural-language DESCRIPTION, not a voice id, and
  // with no description it falls back to a default that does not sound Indian at all. This
  // is the single setting that decides the accent, and it is invisible in the audio metadata
  // — pacing and loudness look identical whichever speaker you get, which is exactly how a
  // wrong-accent voice ships unnoticed. Chatterbox ignores the parameter harmlessly.
  const params = new URLSearchParams({ text });
  if (providerConfig.description) params.set('description', providerConfig.description);
  const url = `${base}/tts?${params.toString()}`;

  const response = await fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(providerConfig.timeout_ms ?? 300_000),
  });
  if (!response.ok) {
    throw new Error(`${providerName} ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  const audio = normaliseWav(Buffer.from(await response.arrayBuffer()));
  return { audio, durationMs: wavDurationMs(audio), alignment: null, ext: 'wav' };
}

async function synthesizeElevenLabs(text) {
  const url =
    `https://api.elevenlabs.io/v1/text-to-speech/${tts.voice_id}/with-timestamps` +
    `?output_format=${encodeURIComponent(tts.output_format ?? 'mp3_44100_128')}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: tts.model_id,
      voice_settings: tts.voice_settings ?? undefined,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    // The provider's own message is far more useful than a status code — "Free users cannot
    // use library voices" is a config problem, a 401 is a key problem, and a 429 is neither.
    let detail = body.slice(0, 300);
    try {
      detail = JSON.stringify(JSON.parse(body).detail ?? detail);
    } catch {
      /* keep the raw body */
    }
    throw new Error(`ElevenLabs ${response.status}: ${detail}`);
  }

  const payload = await response.json();
  // `alignment` is per-character over the raw text; `normalized_alignment` is over the
  // provider's normalised form. The caption displays the raw text, so raw alignment is the
  // one that lines up with what is on screen.
  const alignment = payload.alignment ?? payload.normalized_alignment;
  if (!payload.audio_base64 || !alignment) {
    throw new Error('response had no audio or no alignment — cannot measure this line');
  }

  const ends = alignment.character_end_times_seconds;
  return {
    ext: 'mp3',
    audio: Buffer.from(payload.audio_base64, 'base64'),
    durationMs: Math.round(ends[ends.length - 1] * 1000),
    alignment: {
      characters: alignment.characters,
      start_times_ms: alignment.character_start_times_seconds.map((s) => Math.round(s * 1000)),
      end_times_ms: ends.map((s) => Math.round(s * 1000)),
    },
  };
}

const synthesize = (text) => (isLocal ? synthesizeLocal(text) : synthesizeElevenLabs(text));

if (isLocal && !dryRun && !(await ttsReachable())) {
  console.error(`\n✗ ${providerName} is not reachable at ${providerConfig.base_url}`);
  console.error('  The local TTS server is down, unreachable, or not started.\n');
  console.error('  FALL BACK TO ELEVENLABS — costs characters, but needs no GPU:');
  console.error(`      node qa-pipeline/scripts/synthesize-narration.mjs --narration=${narrationPath} --tts-provider=elevenlabs`);
  console.error('  (requires ELEVENLABS_API_KEY in .env)');
  console.error('\n  Note: switching provider changes the cache key, so every line re-synthesizes');
  console.error('  and the voice will differ from any previously rendered cut of this feature.');
  process.exit(3);
}

let synthesized = 0;
let reused = 0;
let billedChars = 0;

for (const line of narration.lines) {
  const hash = lineHash(line.text);
  const fileName = `${line.step_id}-${hash}.${isLocal ? 'wav' : 'mp3'}`;
  const absPath = join(audioDir, fileName);
  const relPath = relative(REPO_ROOT, absPath);

  if (!force && existsSync(absPath) && line.audio_path === relPath && line.duration_ms) {
    reused += 1;
    console.log(`  = ${line.step_id.padEnd(6)} cached (${line.duration_ms}ms)`);
    continue;
  }

  if (dryRun) {
    console.log(`  → ${line.step_id.padEnd(6)} would synthesize ${line.text.length} chars`);
    billedChars += line.text.length;
    continue;
  }

  try {
    const { audio, durationMs, alignment } = await synthesize(line.text);
    writeFileSync(absPath, audio);
    line.audio_path = relPath;
    line.duration_ms = durationMs;
    line.alignment = alignment;
    synthesized += 1;
    billedChars += line.text.length;
    const rate = (line.text.length / (durationMs / 1000)).toFixed(1);
    console.log(`  ✓ ${line.step_id.padEnd(6)} ${String(durationMs).padStart(5)}ms  ${rate} chars/s  ${line.text.slice(0, 44)}`);
  } catch (error) {
    console.error(`  ✗ ${line.step_id}: ${error.message}`);
    // Partial results are kept deliberately: the successful lines have been written and
    // paid for, and losing them to one failure would mean paying twice.
    if (synthesized && !dryRun) {
      narration.synthesized_at = new Date().toISOString();
      writeFileSync(narrationAbs, `${JSON.stringify(narration, null, 2)}\n`);
      console.error(`  (kept ${synthesized} line(s) already synthesized — re-run to continue)`);
    }
    process.exit(1);
  }
}

if (dryRun) {
  console.log(`\nDRY RUN — would synthesize ${billedChars} characters. Nothing written.`);
  process.exit(0);
}

narration.synthesized_at = new Date().toISOString();
narration.tts = isLocal
  ? { provider: providerName, voice_id: providerName, voice_name: null, model_id: providerName }
  : { provider: providerName, voice_id: tts.voice_id, voice_name: tts.voice_name ?? null, model_id: tts.model_id };
writeFileSync(narrationAbs, `${JSON.stringify(narration, null, 2)}\n`);

const spoken = narration.lines.reduce((sum, l) => sum + (l.duration_ms ?? 0), 0);
console.log(`\n✓ ${synthesized} synthesized, ${reused} cached — ${billedChars} characters billed`);
console.log(`  total speech: ${(spoken / 1000).toFixed(1)}s across ${narration.lines.length} lines`);
console.log(`  ${relative(process.cwd(), narrationAbs)}`);
