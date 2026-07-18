"use client";

import { useEffect, useRef } from "react";

/**
 * Fires `onIntersect` whenever the returned ref's element enters the viewport.
 * `onIntersect` is read from a ref on every call so callers don't need to
 * memoize it — the observer itself is only re-created when `options` change.
 */
export function useIntersectionObserver<T extends Element>(
  onIntersect: () => void,
  options?: IntersectionObserverInit
) {
  const targetRef = useRef<T>(null);
  const callbackRef = useRef(onIntersect);

  useEffect(() => {
    callbackRef.current = onIntersect;
  });

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) callbackRef.current();
    }, options);

    observer.observe(target);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.root, options?.rootMargin, options?.threshold]);

  return targetRef;
}
