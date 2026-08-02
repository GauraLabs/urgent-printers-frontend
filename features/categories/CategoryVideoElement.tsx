"use client";

interface CategoryVideoElementProps {
  videoUrl: string;
  poster?: string;
}

// Lazy-loaded leaf: the actual <video> only enters the bundle/DOM once
// CategoryVideoOverlay decides autoplay is safe (mounted, no reduced-motion).
export function CategoryVideoElement({ videoUrl, poster }: CategoryVideoElementProps) {
  return (
    <video
      src={videoUrl}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="none"
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}
