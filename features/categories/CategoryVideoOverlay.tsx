"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const CategoryVideoElement = dynamic(
  () => import("./CategoryVideoElement").then((m) => m.CategoryVideoElement),
  { ssr: false }
);

interface CategoryVideoOverlayProps {
  videoUrl: string;
  poster?: string;
}

// Mirrors features/home/HeroBannerSection's HeroSparkles gating: defer mount past
// initial paint so the poster <Image> (rendered by the server-component parent)
// stays the LCP candidate, and never autoplay for prefers-reduced-motion users —
// the poster stays as the static fallback in that case.
export function CategoryVideoOverlay({ videoUrl, poster }: CategoryVideoOverlayProps) {
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const timer = window.setTimeout(() => setShowVideo(true), 1000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!showVideo) return null;
  return <CategoryVideoElement videoUrl={videoUrl} poster={poster} />;
}
