"use client";

import { useState, useEffect } from "react";

/**
 * Returns false on the initial server-side / first render, then true after
 * the component mounts on the client. Use this to guard any output that reads
 * from Zustand persist (localStorage), so SSR output always matches the
 * default store state and avoids React hydration mismatches.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
