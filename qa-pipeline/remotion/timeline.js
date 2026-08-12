/**
 * Timeline, camera and choreography maths.
 *
 * Kept free of React and of Node built-ins so both the browser bundle and the CLI can
 * import it. Everything here is a pure function of (shotlist, run, fps) — that determinism
 * is the whole point of the architecture: the same shot list must always produce the same
 * video, so no timing decision may depend on wall-clock time, randomness, or measurement.
 *
 * ## The camera model
 *
 * The first version gave every shot its own independent zoom, so the camera pushed in and
 * reset on every single step: zoom into the login page, reset, zoom into the email field,
 * reset, zoom into the password field, reset. That reads as a slideshow of unrelated
 * close-ups, not as somebody using an application.
 *
 * The camera is now a single continuous path over the whole video. Consecutive shots on the
 * same route form a **group**; the camera zooms in once when the group starts, then only
 * *pans* between elements at that held zoom, and pulls back at the end of the group so the
 * final action is seen in context. Zoom level is a property of the group, not of the step.
 */

/** Transition lengths in ms. A shot's transition_in describes how it ENTERS. */
export const TRANSITION_MS = {
  cut: 0,
  crossfade: 320,
  'whip-pan': 380,
};

export const INTRO_MS = 2000;
export const OUTRO_MS = 2400;

/**
 * Silence held before a narration line starts and after it ends. Without the tail a line
 * finishes on the same frame the cut happens, which sounds clipped even when the audio is
 * complete. Overridden from project.config.json's tts block.
 */
export const NARRATION_DEFAULTS = { leadInMs: 220, tailMs: 320 };

/**
 * Percentage of frame height the caption band occupies, measured from the bottom, including
 * its offset and room for a two-line Devanagari caption. Callouts treat this as unusable.
 * Shared from here so the layout maths and the caption's own CSS cannot drift apart.
 */
export const CAPTION_SAFE_BOTTOM_PCT = 22;

/** Choreography constants, all in ms and all deliberately named rather than inlined. */
export const CHOREO = {
  /** Cursor travel to the target, as a fraction of the shot, capped. */
  travelMaxMs: 620,
  travelFraction: 0.32,
  /** How long after arriving the click pulse lasts. */
  clickMs: 340,
  /** When the shot's own screenshot replaces the previous one, as a fraction of the shot. */
  plateDelayFraction: 0.44,
  /** Typing shots hold the previous plate much longer — the keystrokes have to finish
   *  before the screenshot of the filled field is allowed to appear. */
  typingPlateDelayFraction: 0.8,
  /** Typing begins partway through the click rather than after it, the way a real user
   *  starts typing as soon as the field takes focus. */
  typingStartAfterClick: 0.5,
  plateFadeMs: 280,
  ringFadeInMs: 220,
  ringFadeOutMs: 320,
  /** Gap between the plate finishing its swap and the ring starting to leave. */
  ringLingerMs: 200,
  /** Camera move between two keyframes. */
  panMaxMs: 780,
  panFraction: 0.5,
};

export const msToFrames = (ms, fps) => Math.max(1, Math.round((ms / 1000) * fps));
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Smooth 0→1 ramp for a value entering over `span` frames starting at `start`. */
export const ramp = (frame, start, span) =>
  span <= 0 ? (frame >= start ? 1 : 0) : clamp((frame - start) / span, 0, 1);

// ------------------------------------------------------------------- geometry

function unionOf(boxes) {
  const real = boxes.filter(Boolean);
  if (!real.length) return null;
  const minX = Math.min(...real.map((b) => b.x));
  const minY = Math.min(...real.map((b) => b.y));
  const maxX = Math.max(...real.map((b) => b.x + b.width));
  const maxY = Math.max(...real.map((b) => b.y + b.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

const centreOf = (box) => ({ cx: box.x + box.width / 2, cy: box.y + box.height / 2 });

/**
 * Zoom that fits `box` inside the frame with `pad` times its size of breathing room.
 * Never below 1 (we have no pixels beyond the screenshot) and never above `maxZoom`
 * (the source is a 2x screenshot, so pushing further starts to show softness).
 */
function fitZoom(box, viewport, pad, maxZoom = 2.2) {
  if (!box || box.width <= 0 || box.height <= 0) return 1;
  const z = Math.min(viewport.width / (box.width * pad), viewport.height / (box.height * pad));
  return clamp(z, 1, maxZoom);
}

/**
 * Keep the visible rectangle inside the screenshot. Without this, panning to an element
 * near an edge slides empty background into frame.
 */
export function clampCamera(camera, viewport) {
  const halfW = viewport.width / (2 * camera.zoom);
  const halfH = viewport.height / (2 * camera.zoom);
  return {
    zoom: camera.zoom,
    cx: clamp(camera.cx, halfW, viewport.width - halfW),
    cy: clamp(camera.cy, halfH, viewport.height - halfH),
  };
}

/** Project a point in run-log viewport coords to a percentage position in the frame. */
export function project(point, camera, viewport) {
  return {
    xPct: 50 + ((point.x - camera.cx) / viewport.width) * 100 * camera.zoom,
    yPct: 50 + ((point.y - camera.cy) / viewport.height) * 100 * camera.zoom,
  };
}

const lerp = (a, b, t) => a + (b - a) * t;

const lerpCamera = (a, b, t) => ({
  cx: lerp(a.cx, b.cx, t),
  cy: lerp(a.cy, b.cy, t),
  zoom: lerp(a.zoom, b.zoom, t),
});

// ------------------------------------------------------------------- timeline

/**
 * Build the frame-accurate timeline, including the camera path and per-shot choreography.
 *
 * Each shot's Sequence is extended past its own duration by however long the NEXT shot
 * waits before swapping in its screenshot — otherwise the outgoing frame would vanish while
 * the incoming one is still deliberately holding off, leaving a gap.
 */
export function buildTimeline(shotlist, run, fps, options = {}) {
  const viewport = run.viewport;
  const stepsById = new Map(run.steps.map((s) => [s.step_id, s]));

  // --- narration -------------------------------------------------------------
  //
  // A line's MEASURED duration is a hard floor on its shot: speech is never truncated to
  // fit a visual budget. The Director's duration_ms stays authoritative for *choreography*
  // though — see visualFrames below — so a long line holds the finished frame rather than
  // slowing the cursor down to match.
  const narration = options.narration ?? null;
  const leadInMs = options.leadInMs ?? NARRATION_DEFAULTS.leadInMs;
  const tailMs = options.tailMs ?? NARRATION_DEFAULTS.tailMs;
  const linesById = new Map((narration?.lines ?? []).map((l) => [l.step_id, l]));
  const leadInFrames = msToFrames(leadInMs, fps);

  /** Total ms a line needs on screen, or 0 when there is no measured audio. */
  const narrationBudget = (line) =>
    line?.duration_ms ? line.duration_ms + leadInMs + tailMs : 0;

  const introLine = linesById.get('intro') ?? null;
  const outroLine = linesById.get('outro') ?? null;
  const introFrames = msToFrames(Math.max(INTRO_MS, narrationBudget(introLine)), fps);
  const outroFrames = msToFrames(Math.max(OUTRO_MS, narrationBudget(outroLine)), fps);

  const raw = shotlist.shots.map((shot, index) => {
    const step = stepsById.get(shot.step_id);
    return { ...shot, index, step, box: step?.bounding_box ?? null, route: step?.route ?? null };
  });

  // --- group consecutive shots by route -------------------------------------
  const groups = [];
  for (const entry of raw) {
    const current = groups[groups.length - 1];
    if (current && current.route === entry.route) current.items.push(entry);
    else groups.push({ route: entry.route, items: [entry] });
  }

  // One zoom per group, chosen to frame every element the group visits. Panning between
  // them then never needs to change zoom, which is what removes the per-step re-zoom.
  for (const group of groups) {
    const union = unionOf(group.items.map((i) => i.box));
    group.union = union;
    group.zoom = fitZoom(union, viewport, 1.55);
    // The pull-back at the end of a group: wide enough to see the whole region again, so
    // the last action of a flow (submitting a form) is read in context rather than as a
    // close-up of a button.
    group.pullBackZoom = clamp(fitZoom(union, viewport, 2.7), 1, group.zoom);
  }

  // --- per-shot timing and camera keyframes ---------------------------------
  let cursor = introFrames;
  const shots = raw.map((entry) => {
    const group = groups.find((g) => g.items.includes(entry));
    const positionInGroup = group.items.indexOf(entry);
    const isGroupStart = positionInGroup === 0;
    const isGroupEnd = positionInGroup === group.items.length - 1;

    // Two different lengths, and conflating them was the bug this split fixes.
    //
    //   visualFrames — what the Director budgeted. Every choreography fraction below is a
    //                  proportion of THIS, so the cursor travels, the ring fades and the
    //                  plate swaps at the pace they were tuned at.
    //   durationFrames — how long the shot actually occupies the timeline, extended when
    //                  narration needs longer.
    //
    // Deriving the choreography from the extended length instead makes a shot with a long
    // line play in slow motion: a 2.2s cursor move stretched to 5s reads as the render
    // having stalled. The extra time is a HOLD on the finished frame, which is what a real
    // edit does while a voice-over catches up.
    const line = linesById.get(entry.step_id) ?? null;
    const visualFrames = msToFrames(entry.duration_ms, fps);
    const durationFrames = Math.max(visualFrames, msToFrames(narrationBudget(line), fps));

    // A shot with no bounding box is an establishing shot: whole screen, no close-up, no
    // cursor, no ring. A bare navigation has no element to point at.
    const hasTarget = Boolean(entry.box);

    // The FIRST shot on a route always presents the whole page, unzoomed. A viewer has to
    // see where they are before a close-up means anything, and opening a screen already
    // pushed in hides the very page the shot is introducing. Zooming only ever happens on a
    // LATER shot in the group, once the page has been established.
    let camera;
    if (isGroupStart || !hasTarget) {
      camera = { cx: viewport.width / 2, cy: viewport.height / 2, zoom: 1 };
    } else if (isGroupEnd && group.items.length > 1) {
      // The last step of a multi-step group is its payoff (submitting the form). Framing it
      // wide means the click is read in context rather than as a close-up of a button.
      camera = { ...centreOf(group.union), zoom: group.pullBackZoom };
    } else {
      camera = { ...centreOf(entry.box), zoom: group.zoom };
    }
    camera = clampCamera(camera, viewport);

    // Typed text has to finish being typed before the screenshot showing the filled field
    // is allowed in, so a typing shot holds the previous plate far longer than a click does.
    const typedText = entry.step?.typed_text ?? null;
    const plateDelayFrames = hasTarget
      ? Math.round(
          visualFrames * (typedText ? CHOREO.typingPlateDelayFraction : CHOREO.plateDelayFraction),
        )
      : 0;
    const plateFadeFrames = hasTarget
      ? msToFrames(CHOREO.plateFadeMs, fps)
      : msToFrames(TRANSITION_MS[entry.transition_in] ?? 0, fps);

    const travelFrames = Math.min(
      Math.round(visualFrames * CHOREO.travelFraction),
      msToFrames(CHOREO.travelMaxMs, fps),
    );
    const panFrames = Math.min(
      Math.round(visualFrames * CHOREO.panFraction),
      msToFrames(CHOREO.panMaxMs, fps),
    );

    const typingFrom = typedText
      ? travelFrames + Math.round(msToFrames(CHOREO.clickMs, fps) * CHOREO.typingStartAfterClick)
      : 0;

    const shot = {
      ...entry,
      typedText,
      typedMasked: Boolean(entry.step?.typed_masked),
      typingFrom,
      typingTo: typedText ? Math.max(plateDelayFrames, typingFrom + 1) : 0,
      groupIndex: groups.indexOf(group),
      isGroupStart,
      isGroupEnd,
      hasTarget,
      camera,
      groupZoom: group.zoom,
      from: cursor,
      durationFrames,
      visualFrames,
      narration: line ? { ...line, fromFrame: leadInFrames } : null,
      plateDelayFrames,
      plateFadeFrames,
      travelFrames,
      panFrames,
      transitionFrames: msToFrames(TRANSITION_MS[entry.transition_in] ?? 0, fps),
    };
    cursor += durationFrames;
    return shot;
  });

  // Extend each shot's Sequence to cover the next shot's deliberate plate delay.
  shots.forEach((shot, i) => {
    const next = shots[i + 1];
    shot.sequenceFrames = next
      ? shot.durationFrames + next.plateDelayFrames + next.plateFadeFrames
      : shot.durationFrames + outroFrames;
  });

  // The intro card's own Sequence duration, extended (like every shot's sequenceFrames
  // extends into the NEXT shot's plateDelayFrames) to cover shot 0's plate delay. Shot 0 has
  // no shot -1 whose held plate can cover its own delay window, and unlike the fade-out this
  // card already does, the delay ramp for shot 0's plate genuinely needs *something* on
  // screen — the card's own fade-out is retimed against this longer duration too (see the
  // `frames` prop passed alongside it), so it holds rather than leaving a blank frame. Caught
  // by pulling real frames from a render, not from the contact sheet's one-sample-per-shot
  // view, which never lands inside this specific gap.
  const introSequenceFrames = introFrames + (shots[0] ? shots[0].plateDelayFrames + shots[0].plateFadeFrames : 0);

  return {
    introFrames,
    introSequenceFrames,
    outroFrames,
    shots,
    groups,
    viewport,
    outroFrom: cursor,
    totalFrames: cursor + outroFrames,
    narration: narration
      ? {
          language: narration.language ?? null,
          leadInFrames,
          intro: introLine ? { ...introLine, fromFrame: leadInFrames } : null,
          outro: outroLine ? { ...outroLine, fromFrame: leadInFrames } : null,
        }
      : null,
  };
}

/**
 * Which character of a line is being spoken at a local frame, from the provider's alignment.
 * Returns the count of characters started so far, so a caption can reveal in step with the
 * voice. Falls back to the whole string when there is no alignment, which is the honest
 * default: showing everything is better than showing nothing.
 */
export function spokenCharCount(line, localFrame, fps) {
  if (!line?.alignment) return line?.text?.length ?? 0;
  const ms = ((localFrame - (line.fromFrame ?? 0)) / fps) * 1000;
  if (ms <= 0) return 0;
  const starts = line.alignment.start_times_ms;
  // Linear scan: a narration line is a few dozen characters, and a binary search here would
  // be harder to read for no measurable gain at 60fps.
  let count = 0;
  while (count < starts.length && starts[count] <= ms) count += 1;
  return count;
}

// --------------------------------------------------------------------- camera

/**
 * The camera at an absolute frame.
 *
 * Within a group the camera eases from the previous shot's framing to this shot's over
 * `panFrames`, then holds — a pan, not a new zoom, because the group shares one zoom level.
 * At a group boundary the camera snaps: the route changed and there is a cut or whip-pan
 * covering it, so interpolating across would drag the camera through a screenshot it does
 * not belong to.
 *
 * The first shot of a group gets one slow settle from slightly wider, which reads as a
 * deliberate arrival rather than a jump.
 */
export function cameraAt(timeline, frame) {
  const { shots, viewport } = timeline;
  if (!shots.length) return { cx: viewport.width / 2, cy: viewport.height / 2, zoom: 1 };

  if (frame < shots[0].from) return shots[0].camera;

  let index = shots.findIndex((s) => frame < s.from + s.durationFrames);
  if (index === -1) index = shots.length - 1;
  const shot = shots[index];
  const local = frame - shot.from;

  // A group start is held perfectly still at full page — no settle, no drift. Any motion
  // here reads as "the camera is already zooming" and defeats the point of establishing the
  // screen. Every other shot pans from the previous framing; within a group the zoom is
  // shared, so that pan is a pure translation.
  if (shot.isGroupStart) return shot.camera;

  const previous = shots[index - 1];
  const t = easeInOut(ramp(local, 0, shot.panFrames));
  return clampCamera(lerpCamera(previous.camera, shot.camera, t), viewport);
}

// --------------------------------------------------------------------- cursor

/**
 * Where the pointer rests before it has anything to point at.
 *
 * Returns {cx, cy} to match centreOf(). Returning {x, y} here made `lerp(fromPoint.cx, …)`
 * NaN for the first targeted shot, and a NaN percentage is an invalid CSS length, so the
 * cursor silently parked itself in the top-left corner of the frame instead of travelling.
 */
const cursorParkingSpot = (viewport) => ({
  cx: viewport.width * 0.8,
  cy: viewport.height * 0.92,
});

/**
 * Pointer position and click state at an absolute frame, in viewport coords.
 *
 * The pointer travels from wherever it last was to this shot's element over `travelFrames`,
 * then clicks. Because it always starts from its previous resting place, the motion reads as
 * one continuous hand moving down a form rather than a pointer teleporting between fields.
 */
export function cursorAt(timeline, frame) {
  const { shots, viewport } = timeline;
  const targets = shots.filter((s) => s.hasTarget);
  if (!targets.length) return null;

  const first = targets[0];
  if (frame < first.from) return null;

  let index = shots.findIndex((s) => frame < s.from + s.durationFrames);
  if (index === -1) index = shots.length - 1;

  // Shots without a target (a bare navigation) keep the pointer parked where it was.
  const activeIndex = shots[index].hasTarget
    ? index
    : shots.slice(0, index + 1).map((s) => s.hasTarget).lastIndexOf(true);
  if (activeIndex === -1) return null;

  const shot = shots[activeIndex];
  const previousTarget = shots
    .slice(0, activeIndex)
    .filter((s) => s.hasTarget)
    .pop();
  const to = centreOf(shot.box);
  const fromPoint = previousTarget
    ? centreOf(previousTarget.box)
    : cursorParkingSpot(viewport);

  const local = frame - shot.from;
  const t = easeInOut(ramp(local, 0, shot.travelFrames));
  const position = {
    x: lerp(fromPoint.cx, to.cx, t),
    y: lerp(fromPoint.cy, to.cy, t),
  };

  // Click fires on arrival. `press` drives the pointer's own squash, `ripple` the ring that
  // expands out of it, so the two can be timed independently.
  const clickFrames = msToFrames(CHOREO.clickMs, timeline.fps ?? 60);
  const sinceArrival = local - shot.travelFrames;
  const clicking = sinceArrival >= 0 && sinceArrival <= clickFrames;
  const clickProgress = clicking ? clamp(sinceArrival / Math.max(clickFrames, 1), 0, 1) : null;

  return { ...position, clicking, clickProgress };
}

// ----------------------------------------------------------------- highlights

/**
 * Opacity of the element highlight ring at an absolute frame.
 *
 * The ring's whole reason for existing is the ordering: it appears on the element *before*
 * the screenshot showing that element's new state swaps in. Screenshots are captured after
 * the action, so the previous shot's plate is still on screen while the ring is up — which
 * is what lets the video read as "here is the field you are about to fill … now it is
 * filled" from nothing but static stills.
 */
export function ringOpacityAt(shot, local, fps) {
  if (!shot.hasTarget) return 0;
  const inStart = Math.round(shot.durationFrames * 0.08);
  const inSpan = msToFrames(CHOREO.ringFadeInMs, fps);
  const outStart =
    shot.plateDelayFrames + shot.plateFadeFrames + msToFrames(CHOREO.ringLingerMs, fps);
  const outSpan = msToFrames(CHOREO.ringFadeOutMs, fps);

  const fadeIn = ramp(local, inStart, inSpan);
  const fadeOut = 1 - ramp(local, outStart, outSpan);
  return clamp(Math.min(fadeIn, fadeOut), 0, 1);
}

// ------------------------------------------------------------------- callouts

/**
 * Place a callout so it does not cover the element it refers to.
 *
 * Positions are resolved in SCREEN space against the projected element, because the camera
 * now moves: an anchor computed in viewport coordinates would drift off-frame as soon as the
 * camera panned. `callout_position` is the Director's instruction and is honoured as given;
 * this only resolves it into concrete CSS, and flips it when the chosen side has no room.
 */
export function calloutLayout(position, projected, box, camera, viewport, safeBottomPct = 0) {
  const MIN_SIDE_PCT = 26;
  const EDGE_PCT = 3;
  // Narration captions own the bottom of the frame. Without this the two overlap — and they
  // overlap most on exactly the shots that matter, because a payoff shot tends to have both
  // the longest line and a centred callout.
  const BOTTOM_EDGE = Math.max(EDGE_PCT, safeBottomPct);
  // The callout's own height is not known here (it depends on wrapped text), so this is a
  // deliberate over-estimate. Being 2% too cautious costs nothing; being 2% short collides.
  const CALLOUT_H_PCT = 11;

  if (position === 'none' || !box || !projected) {
    return {
      left: '50%',
      top: `${Math.min(80, 100 - BOTTOM_EDGE - CALLOUT_H_PCT)}%`,
      transform: 'translate(-50%, -50%)',
      maxWidthPct: 62,
      align: 'center',
    };
  }

  const halfW = ((box.width / viewport.width) * 100 * camera.zoom) / 2;
  const halfH = ((box.height / viewport.height) * 100 * camera.zoom) / 2;
  const gapPct = 2;

  const rightRoom = 100 - (projected.xPct + halfW + gapPct) - EDGE_PCT;
  const leftRoom = projected.xPct - halfW - gapPct - EDGE_PCT;

  let resolved = position;
  if (position === 'right' && rightRoom < MIN_SIDE_PCT && leftRoom > rightRoom) resolved = 'left';
  else if (position === 'left' && leftRoom < MIN_SIDE_PCT && rightRoom > leftRoom) resolved = 'right';

  // Neither side fits. Flipping cannot help, and clamping the width to MIN_SIDE_PCT anyway
  // pushes the label off the frame — which is what a zoomed-in wide element does to a side
  // callout. Above or below the element has the full frame width to play with, so go there.
  if ((resolved === 'left' || resolved === 'right') && Math.max(leftRoom, rightRoom) < MIN_SIDE_PCT) {
    // Below the element is only an option if the label would actually clear the caption band.
    const bottomAnchor = projected.yPct + halfH + gapPct;
    const bottomFits = bottomAnchor + CALLOUT_H_PCT <= 100 - BOTTOM_EDGE;
    resolved = projected.yPct > 55 || !bottomFits ? 'top' : 'bottom';
  }

  const x = clamp(projected.xPct, EDGE_PCT, 100 - EDGE_PCT);
  const y = clamp(projected.yPct, EDGE_PCT, 100 - BOTTOM_EDGE);

  switch (resolved) {
    case 'top':
      return {
        left: `${x}%`,
        top: `${clamp(y - halfH - gapPct, EDGE_PCT, 100 - EDGE_PCT)}%`,
        transform: 'translate(-50%, -100%)',
        maxWidthPct: 62,
        align: 'center',
      };
    case 'bottom':
      return {
        left: `${x}%`,
        // Anchored by its TOP edge and grows downward, so the clamp has to leave a whole
        // callout's height above the caption band, not just reach it.
        top: `${clamp(y + halfH + gapPct, EDGE_PCT, 100 - BOTTOM_EDGE - CALLOUT_H_PCT)}%`,
        transform: 'translate(-50%, 0)',
        maxWidthPct: 62,
        align: 'center',
      };
    case 'left':
      return {
        left: `${clamp(x - halfW - gapPct, EDGE_PCT, 100 - EDGE_PCT)}%`,
        top: `${y}%`,
        transform: 'translate(-100%, -50%)',
        maxWidthPct: Math.max(leftRoom, MIN_SIDE_PCT),
        align: 'right',
      };
    case 'right':
    default:
      return {
        left: `${clamp(x + halfW + gapPct, EDGE_PCT, 100 - EDGE_PCT)}%`,
        top: `${y}%`,
        transform: 'translate(0, -50%)',
        maxWidthPct: Math.max(rightRoom, MIN_SIDE_PCT),
        align: 'left',
      };
  }
}
