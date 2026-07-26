"use client";

import { create } from "zustand";

// Deliberately NOT wrapped in zustand's `persist` middleware. A "degraded"
// flag surviving a hard refresh would be misleading — the refresh itself is
// a fresh attempt to reach the backend, so state should start clean every
// load rather than replaying a stale failure from localStorage. This also
// means no useMounted guard is needed at render sites: server and first
// client render both start from `isDegraded: false`, so there's no
// hydration mismatch to guard against.
interface DegradedStore {
  isDegraded: boolean;
  reportFailure: () => void;
  reportRecovery: () => void;
}

export const useDegradedStore = create<DegradedStore>((set) => ({
  isDegraded: false,
  reportFailure: () => set({ isDegraded: true }),
  reportRecovery: () => set({ isDegraded: false }),
}));
