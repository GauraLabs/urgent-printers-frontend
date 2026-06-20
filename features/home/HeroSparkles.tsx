"use client";

import { Canvas } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";

// Decorative gold-particle overlay for the hero banner. Lazy-loaded, client-only,
// and gated on viewport/perf — see HeroBannerSection for the mount conditions.
export function HeroSparkles() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 50 }}
      gl={{ alpha: true, antialias: false }}
      dpr={[1, 1.5]}
    >
      <Sparkles count={45} scale={[10, 5, 3]} size={3} speed={0.25} opacity={0.5} color="#f7d293" noise={1} />
    </Canvas>
  );
}
