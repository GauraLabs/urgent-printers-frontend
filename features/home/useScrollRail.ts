"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ScrollRailState {
  trackRef: React.RefObject<HTMLDivElement | null>;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  scrollByPage: (direction: "left" | "right") => void;
}

// One-pixel slack so rounding on fractional-width flex children doesn't leave
// the buttons permanently "stuck" disabled at rest.
const EDGE_EPSILON = 1;

/**
 * Tracks scroll-edge state for a horizontally-scrollable track (overflow-x
 * auto + scroll-snap) and exposes a "scroll by one viewport" step for
 * desktop prev/next buttons. Native touch/trackpad scrolling on the track
 * itself needs none of this — it's purely the optional button affordance.
 */
export function useScrollRail(): ScrollRailState {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > EDGE_EPSILON);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - EDGE_EPSILON);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateEdges();

    const onScroll = () => updateEdges();
    el.addEventListener("scroll", onScroll, { passive: true });

    const observer = new ResizeObserver(() => updateEdges());
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, [updateEdges]);

  const scrollByPage = useCallback((direction: "left" | "right") => {
    const el = trackRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.85;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  }, []);

  return { trackRef, canScrollLeft, canScrollRight, scrollByPage };
}
