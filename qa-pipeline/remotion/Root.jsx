import React from 'react';
import { Composition } from 'remotion';
import { FeatureDemo } from './FeatureDemo.jsx';
import { buildTimeline } from './timeline.js';

/**
 * Composition registry. Width/height/fps and the total frame count all come from the
 * inputProps the render script passes in, so one composition serves every resolution in
 * project.config.json's video_defaults rather than needing one registration per size.
 */
export function RemotionRoot() {
  return (
    <Composition
      id="FeatureDemo"
      component={FeatureDemo}
      // Placeholders — calculateMetadata overrides all of these from inputProps.
      durationInFrames={600}
      fps={60}
      width={1920}
      height={1080}
      defaultProps={{
        shotlist: { feature_name: '', shots: [] },
        run: { feature_name: '', viewport: { width: 1280, height: 720 }, steps: [] },
        brand: {},
        fieldStyle: { background: '#ffffff', text: '#0f172a' },
        projectName: '',
        logoDataUri: null,
        screenshotBase: '',
        narration: null,
        narrationTiming: null,
      }}
      calculateMetadata={({ props }) => {
        const fps = props.fps ?? 60;
        // Narration MUST be passed here, not just to the component. This is what sets
        // durationInFrames, and narration extends shots — omit it and the composition is
        // shorter than the timeline the component renders, so the encode simply stops
        // partway through with no error anywhere.
        const timeline = buildTimeline(props.shotlist, props.run, fps, {
          narration: props.narration,
          ...(props.narrationTiming ?? {}),
        });
        return {
          durationInFrames: timeline.totalFrames,
          fps,
          width: props.width ?? 1920,
          height: props.height ?? 1080,
        };
      }}
    />
  );
}
