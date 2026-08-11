import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  buildTimeline,
  calloutLayout,
  cameraAt,
  cursorAt,
  easeInOut,
  msToFrames,
  project,
  ramp,
  ringOpacityAt,
  spokenCharCount,
  CAPTION_SAFE_BOTTOM_PCT,
} from './timeline.js';

/**
 * Module 7 — the deterministic renderer.
 *
 * Consumes shotlist.json (what to emphasise), run.json (screenshots + bounding boxes) and
 * project.config.json's brand block. It makes no editorial decisions of its own: no LLM runs
 * at render time, and the same inputs always produce the same frames.
 *
 * ## Layering
 *
 * The camera is ONE transform on a wrapper holding every screenshot plus the highlight ring,
 * so all of them share a single continuous camera path. Per-shot transforms were what
 * produced the "zoom in, reset, zoom in again" stutter.
 *
 *   camera wrapper  ── plates (screenshots, cross-fading)
 *                   └─ highlight ring (viewport coords, so it tracks its element for free)
 *   screen space    ── cursor   (constant size, like a real screen recording)
 *                   └─ callout  (constant size, projected against the moving camera)
 */

/**
 * Sizes are computed in pixels from the composition width rather than written as CSS
 * percentages. A percentage `fontSize` resolves against the PARENT's font size, not the
 * frame, so `fontSize: '2.2%'` renders a caption a couple of pixels tall — and percentage
 * `border-width` is not valid CSS at all. Scaling off `width` keeps every resolution
 * visually identical, which is what makes 1080p and 4K the same video at different sizes.
 */
const scaleOf = (width) => width / 1920;

// ------------------------------------------------------------------- overlays

/**
 * Replays the keystrokes recorded by `capture.type()` over the PREVIOUS screenshot.
 *
 * A pipeline built from stills can never show text appearing — the screenshot for "enter the
 * password" already has the field full. So the previous (empty) plate is held while this
 * draws a growing prefix of `typed_text` inside the field's own bounding box, and only then
 * does the real screenshot fade in. The handover is invisible because both show the same
 * finished text.
 *
 * Drawn inside the camera layer, in the plate's coordinate space, so it tracks and scales
 * with its field exactly as the ring does. Type size is derived from the field's measured
 * height rather than hardcoded, which keeps it plausible across differently-sized inputs.
 */
function TypingOverlay({ shot, viewport, opacity, localFrame, brand, fieldStyle, width }) {
  if (!shot.typedText || !shot.box || opacity <= 0) return null;

  // localFrame, not useCurrentFrame(): Stage sits outside any Sequence, so its own frame is
  // absolute while typingFrom/typingTo are measured from the start of this shot.
  const progress = ramp(localFrame, shot.typingFrom, Math.max(shot.typingTo - shot.typingFrom, 1));
  if (progress <= 0) return null;

  const shown = Math.round(progress * shot.typedText.length);
  const text = shot.typedMasked ? '\u2022'.repeat(shown) : shot.typedText.slice(0, shown);

  // Composition pixels per CSS pixel of the captured viewport.
  const unit = width / viewport.width;
  const fontPx = shot.box.height * 0.39 * unit;

  return (
    <div
      style={{
        position: 'absolute',
        // Inset by the field's border so the input's own outline stays visible, and painted
        // opaque: the plate underneath is the EMPTY field, complete with its placeholder
        // text, which would otherwise show through behind the characters being typed.
        left: `${((shot.box.x + 2) / viewport.width) * 100}%`,
        top: `${((shot.box.y + 2) / viewport.height) * 100}%`,
        width: `${((shot.box.width - 4) / viewport.width) * 100}%`,
        height: `${((shot.box.height - 4) / viewport.height) * 100}%`,
        background: fieldStyle.background,
        borderRadius: 6 * unit,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 11 * unit,
        opacity,
        fontFamily: brand.font_family,
        fontSize: fontPx,
        letterSpacing: shot.typedMasked ? fontPx * 0.12 : 'normal',
        color: fieldStyle.text,
        whiteSpace: 'pre',
        overflow: 'hidden',
      }}
    >
      {text}
      <span
        style={{
          display: 'inline-block',
          width: Math.max(1.5 * unit, 1),
          height: fontPx * 1.15,
          marginLeft: fontPx * 0.06,
          background: fieldStyle.text,
          // Solid rather than blinking: at 22 chars/sec a blink reads as a flicker.
          opacity: progress < 1 ? 0.9 : 0,
        }}
      />
    </div>
  );
}

/**
 * The element highlight: a rounded outline around the target, drawn in the plate's own
 * coordinate space so the camera carries it automatically.
 *
 * Stroke width and radius are divided by the camera zoom so the ring keeps a constant
 * on-screen weight — otherwise a 1.8x zoom would draw a ring nearly twice as thick.
 */
function HighlightRing({ box, viewport, camera, opacity, brand, width }) {
  if (!box || opacity <= 0) return null;
  const k = scaleOf(width);
  const stroke = (3.5 * k) / camera.zoom;
  const pad = 6 / camera.zoom;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${((box.x - pad) / viewport.width) * 100}%`,
        top: `${((box.y - pad) / viewport.height) * 100}%`,
        width: `${((box.width + pad * 2) / viewport.width) * 100}%`,
        height: `${((box.height + pad * 2) / viewport.height) * 100}%`,
        border: `${stroke}px solid ${brand.accent_color}`,
        borderRadius: 8 / camera.zoom,
        boxShadow: `0 0 ${18 / camera.zoom}px ${brand.accent_color}55`,
        opacity,
      }}
    />
  );
}

/**
 * The pointer. Drawn as vector rather than pulled from a Lottie file so it carries no asset
 * dependency and stays crisp at 4K; `brand.cursor_style` records which is in use.
 *
 * Lives in screen space at a constant size, because that is how a real cursor behaves — it
 * does not grow when the page zooms.
 */
function Cursor({ state, camera, viewport, brand, width }) {
  if (!state) return null;
  const k = scaleOf(width);
  const { xPct, yPct } = project({ x: state.x, y: state.y }, camera, viewport);
  if (xPct < -8 || xPct > 108 || yPct < -8 || yPct > 108) return null;

  // Squash on press and release back — the whole click reads in ~340ms.
  const press = state.clicking ? Math.sin(state.clickProgress * Math.PI) : 0;
  const size = 46 * k * (1 - press * 0.16);
  const ripple = 96 * k * (0.35 + (state.clickProgress ?? 0) * 0.85);

  return (
    <div style={{ position: 'absolute', left: `${xPct}%`, top: `${yPct}%` }}>
      {state.clicking ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: ripple,
            height: ripple,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            border: `${3 * k}px solid ${brand.accent_color}`,
            opacity: (1 - state.clickProgress) * 0.85,
          }}
        />
      ) : null}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        style={{
          position: 'absolute',
          // The arrow tip is the hotspot, so the glyph hangs down-right from the point.
          left: 0,
          top: 0,
          filter: `drop-shadow(0 ${3 * k}px ${5 * k}px rgba(2, 6, 23, 0.45))`,
        }}
      >
        <path
          d="M5.5 2.2 L18.4 12.6 L12.2 13.1 L15.0 19.9 L12.3 21.0 L9.6 14.2 L5.5 18.0 Z"
          fill="#ffffff"
          stroke={brand.primary_color}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function Callout({ text, position, box, camera, viewport, brand, localFrame, durationFrames, visualFrames, settleFrames, fps, width, safeBottomPct }) {
  if (!text) return null;
  const k = scaleOf(width);

  // Comes in after the ring has landed AND after the camera has finished moving, then leaves
  // before the shot ends — always inside the shot's own duration, so a callout can never
  // outlive the shot it belongs to.
  //
  // Entry is timed off the VISUAL length and exit off the full one: a shot held long for a
  // narration line should show its label on schedule and keep it up while the voice talks,
  // not delay the label proportionally into a hold where nothing is happening.
  const inStart = Math.max(settleFrames, Math.round((visualFrames ?? durationFrames) * 0.18));
  const inSpan = msToFrames(240, fps);
  const outSpan = msToFrames(300, fps);
  const outStart = Math.max(durationFrames - outSpan, inStart + inSpan);
  const opacity = Math.min(ramp(localFrame, inStart, inSpan), 1 - ramp(localFrame, outStart, outSpan));
  if (opacity <= 0) return null;

  const rise = interpolate(easeInOut(ramp(localFrame, inStart, inSpan)), [0, 1], [12, 0]);
  const projected = box
    ? project({ x: box.x + box.width / 2, y: box.y + box.height / 2 }, camera, viewport)
    : null;
  const { maxWidthPct, align, ...layout } = calloutLayout(
    position,
    projected,
    box,
    camera,
    viewport,
    safeBottomPct,
  );

  return (
    <div
      style={{
        position: 'absolute',
        ...layout,
        opacity,
        maxWidth: `${maxWidthPct}%`,
        textAlign: align,
        // Wrapping inside a bounded width is what actually stops a long label running off
        // the frame — the flip in calloutLayout only buys room.
        whiteSpace: 'normal',
        transform: `${layout.transform} translateY(${rise}px)`,
        background: brand.primary_color,
        color: '#ffffff',
        fontFamily: brand.font_family,
        fontSize: 34 * k,
        fontWeight: 600,
        letterSpacing: '-0.01em',
        lineHeight: 1.25,
        padding: `${16 * k}px ${26 * k}px`,
        borderRadius: 10 * k,
        boxShadow: `0 ${12 * k}px ${34 * k}px rgba(2, 6, 23, 0.45)`,
        borderLeft: `${6 * k}px solid ${brand.accent_color}`,
      }}
    >
      {text}
    </div>
  );
}

// -------------------------------------------------------------------- caption

/**
 * Devanagari must be named explicitly. `brand.font_family` is a Latin system stack, and a
 * system stack does NOT fall back to a Devanagari face for Devanagari codepoints — Chromium
 * renders tofu boxes instead, silently, in a language most reviewers of this repo cannot
 * proofread. Noto Sans Devanagari ships with most Linux distros and the render container.
 */
const captionFont = (brand) => `'Noto Sans Devanagari', 'Noto Sans', ${brand.font_family}`;

/**
 * The spoken line, revealed in step with the voice using the provider's character alignment.
 *
 * Already-spoken text is full white; the rest sits at low opacity rather than being hidden,
 * so the caption box does not change size mid-line. A caption that reflows while it fills is
 * far more distracting than one that is simply legible from the start.
 */
function Caption({ line, localFrame, fps, brand, width }) {
  if (!line?.text) return null;
  const k = scaleOf(width);

  const inSpan = msToFrames(200, fps);
  const opacity = ramp(localFrame, Math.max(0, (line.fromFrame ?? 0) - inSpan), inSpan);
  if (opacity <= 0) return null;

  const spoken = spokenCharCount(line, localFrame, fps);

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: `${5.5}%`,
        transform: 'translateX(-50%)',
        opacity,
        maxWidth: '82%',
        textAlign: 'center',
        background: 'rgba(2, 6, 23, 0.82)',
        color: '#ffffff',
        fontFamily: captionFont(brand),
        fontSize: 30 * k,
        fontWeight: 500,
        // Devanagari has taller ascenders and descenders than Latin; the default line height
        // clips matras (the marks above and below the consonant line).
        lineHeight: 1.6,
        padding: `${14 * k}px ${28 * k}px`,
        borderRadius: 12 * k,
        boxShadow: `0 ${10 * k}px ${30 * k}px rgba(2, 6, 23, 0.5)`,
        borderBottom: `${4 * k}px solid ${brand.accent_color}`,
      }}
    >
      <span>{line.text.slice(0, spoken)}</span>
      <span style={{ opacity: 0.42 }}>{line.text.slice(spoken)}</span>
    </div>
  );
}

/**
 * One line's audio. Kept in its own Sequence so Remotion places it on the timeline by frame
 * rather than anything here doing arithmetic on playback position.
 */
function NarrationAudio({ line, from }) {
  if (!line?.audio_path) return null;
  return (
    <Sequence from={from + (line.fromFrame ?? 0)} durationInFrames={Infinity}>
      <Audio src={staticFile(line.audio_path.replace(/^qa-pipeline\/artifacts\//, ''))} />
    </Sequence>
  );
}

// ---------------------------------------------------------------------- plate

/**
 * One shot's screenshot. Opacity only — the camera lives on the shared wrapper above.
 *
 * The delayed fade-in is the heart of the choreography. Screenshots are captured AFTER the
 * step's action, so holding the previous plate while the ring is up means the viewer sees
 * the empty field highlighted first and the filled field second — built out of nothing but
 * static stills.
 */
function Plate({ shot, screenshotBase, brand, width }) {
  const frame = useCurrentFrame();
  const opacity = ramp(frame, shot.plateDelayFrames, shot.plateFadeFrames);
  if (opacity <= 0) return null;

  const src = shot.step?.screenshot_path
    ? staticFile(
        screenshotBase ? shot.step.screenshot_path.replace(screenshotBase, '') : shot.step.screenshot_path,
      )
    : null;

  return (
    <AbsoluteFill style={{ opacity }}>
      {src ? (
        <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <AbsoluteFill
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0b1220',
            color: '#94a3b8',
            fontFamily: brand.font_family,
            fontSize: 40 * scaleOf(width),
          }}
        >
          {`no screenshot for ${shot.step_id}`}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

function BrandCard({ title, subtitle, brand, logoDataUri, frames }) {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const k = scaleOf(width);
  const fade = Math.round(fps * 0.4);
  const opacity = interpolate(frame, [0, fade, frames - fade, frames], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rise = interpolate(frame, [0, fade], [14, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: brand.primary_color,
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: brand.font_family,
        color: '#ffffff',
      }}
    >
      <div style={{ opacity, transform: `translateY(${rise}px)`, textAlign: 'center' }}>
        {logoDataUri ? (
          <img
            src={logoDataUri}
            alt=""
            style={{ height: 104 * k, marginBottom: 56 * k, filter: 'brightness(0) invert(1)' }}
          />
        ) : null}
        <div style={{ fontSize: 92 * k, fontWeight: 700, letterSpacing: '-0.02em' }}>{title}</div>
        <div style={{ fontSize: 34 * k, color: '#cbd5e1', marginTop: 22 * k }}>{subtitle}</div>
        <div
          style={{
            height: 8 * k,
            width: 260 * k,
            background: brand.accent_color,
            margin: `${52 * k}px auto 0`,
            borderRadius: 999,
          }}
        />
      </div>
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ the stage

/**
 * Everything that shares the camera. Rendered once for the whole video rather than per
 * shot, which is what makes the camera path continuous.
 */
function Stage({ timeline, screenshotBase, brand, fieldStyle, camera, active }) {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const { viewport } = timeline;
  const ringOpacity = active ? ringOpacityAt(active, frame - active.from, timeline.fps) : 0;

  return (
    <AbsoluteFill
      style={{
        transform: `translate(${50 - (camera.cx / viewport.width) * 100}%, ${
          50 - (camera.cy / viewport.height) * 100
        }%) scale(${camera.zoom})`,
        transformOrigin: `${(camera.cx / viewport.width) * 100}% ${(camera.cy / viewport.height) * 100}%`,
      }}
    >
      {timeline.shots.map((shot) => (
        <Sequence key={`${shot.step_id}-${shot.index}`} from={shot.from} durationInFrames={shot.sequenceFrames}>
          <Plate shot={shot} screenshotBase={screenshotBase} brand={brand} width={width} />
        </Sequence>
      ))}
      {active ? (
        <TypingOverlay
          shot={active}
          localFrame={frame - active.from}
          viewport={viewport}
          fieldStyle={fieldStyle}
          opacity={1 - ramp(frame - active.from, active.plateDelayFrames, active.plateFadeFrames)}
          brand={brand}
          width={width}
        />
      ) : null}
      {active ? (
        <HighlightRing
          box={active.box}
          viewport={viewport}
          camera={camera}
          opacity={ringOpacity}
          brand={brand}
          width={width}
        />
      ) : null}
    </AbsoluteFill>
  );
}

/** Thin wrapper so the callout reads a Sequence-local frame for its own fade timing. */
function CalloutForShot({ shot, viewport, brand, fps, width, safeBottomPct }) {
  const localFrame = useCurrentFrame();
  return (
    <Callout
      text={shot.callout_text}
      position={shot.callout_position}
      box={shot.box}
      // The SETTLED camera, deliberately — not the live one. Laying the callout out against
      // a camera that is still moving recomputes its anchor every frame, and the left/right
      // flip can toggle frame to frame, which is exactly the flicker being fixed here.
      camera={shot.camera}
      settleFrames={shot.isGroupStart ? 0 : shot.panFrames}
      viewport={viewport}
      brand={brand}
      localFrame={localFrame}
      durationFrames={shot.durationFrames}
      visualFrames={shot.visualFrames}
      safeBottomPct={safeBottomPct}
      fps={fps}
      width={width}
    />
  );
}

/** Reads the frame LOCAL to the enclosing Sequence, which is what the alignment is relative to. */
function CaptionForFrame({ line, fps, brand, width }) {
  const localFrame = useCurrentFrame();
  return <Caption line={line} localFrame={localFrame} fps={fps} brand={brand} width={width} />;
}

export function FeatureDemo({
  shotlist,
  run,
  brand,
  fieldStyle,
  projectName,
  logoDataUri,
  screenshotBase,
  narration,
  narrationTiming,
}) {
  const { fps, width } = useVideoConfig();
  const frame = useCurrentFrame();
  const timeline = {
    ...buildTimeline(shotlist, run, fps, { narration, ...(narrationTiming ?? {}) }),
    fps,
  };
  const { viewport } = timeline;

  const camera = cameraAt(timeline, frame);
  const pointer = cursorAt(timeline, frame);
  const active = timeline.shots.find((s) => frame >= s.from && frame < s.from + s.durationFrames);
  const inShots = frame >= timeline.introFrames && frame < timeline.outroFrom;

  return (
    <AbsoluteFill style={{ backgroundColor: '#0b1220' }}>
      <Sequence durationInFrames={timeline.introSequenceFrames}>
        <BrandCard
          title={shotlist.feature_name}
          subtitle={projectName}
          brand={brand}
          logoDataUri={logoDataUri}
          frames={timeline.introSequenceFrames}
        />
      </Sequence>

      <Stage
        timeline={timeline}
        screenshotBase={screenshotBase}
        brand={brand}
        fieldStyle={fieldStyle ?? { background: '#ffffff', text: '#0f172a' }}
        camera={camera}
        active={active}
      />

      {/* Screen-space overlays: constant size, unaffected by the camera transform. */}
      {inShots && active ? (
        <>
          <Cursor state={pointer} camera={camera} viewport={viewport} brand={brand} width={width} />
          <Sequence from={active.from} durationInFrames={active.durationFrames}>
            <CalloutForShot
              shot={active}
              viewport={viewport}
              brand={brand}
              fps={fps}
              width={width}
              safeBottomPct={timeline.narration ? CAPTION_SAFE_BOTTOM_PCT : 0}
            />
          </Sequence>
        </>
      ) : null}

      {/*
        Narration. Audio is mounted for every line regardless of the current frame — a
        Sequence that only exists while its shot is active would cut its own audio off at
        the shot boundary, and lines are allowed to be shorter than the shot they hold.
        Captions are drawn per-shot inside the shot's own Sequence, so localFrame is right.
      */}
      {timeline.narration ? (
        <>
          <NarrationAudio line={timeline.narration.intro} from={0} />
          {timeline.shots.map((shot) => (
            <NarrationAudio key={shot.step_id} line={shot.narration} from={shot.from} />
          ))}
          <NarrationAudio line={timeline.narration.outro} from={timeline.outroFrom} />

          {timeline.narration.intro ? (
            <Sequence durationInFrames={timeline.introFrames}>
              <CaptionForFrame line={timeline.narration.intro} fps={fps} brand={brand} width={width} />
            </Sequence>
          ) : null}
          {timeline.shots
            .filter((shot) => shot.narration)
            .map((shot) => (
              <Sequence key={`cap-${shot.step_id}`} from={shot.from} durationInFrames={shot.durationFrames}>
                <CaptionForFrame line={shot.narration} fps={fps} brand={brand} width={width} />
              </Sequence>
            ))}
          {timeline.narration.outro ? (
            <Sequence from={timeline.outroFrom} durationInFrames={timeline.outroFrames}>
              <CaptionForFrame line={timeline.narration.outro} fps={fps} brand={brand} width={width} />
            </Sequence>
          ) : null}
        </>
      ) : null}

      <Sequence from={timeline.outroFrom} durationInFrames={timeline.outroFrames}>
        <BrandCard
          title={projectName}
          subtitle={run.feature_name}
          brand={brand}
          logoDataUri={logoDataUri}
          frames={timeline.outroFrames}
        />
      </Sequence>
    </AbsoluteFill>
  );
}
