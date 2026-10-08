"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const MAX_RECENT_SEARCHES = 6;
export const MAX_RECENT_TERM_LENGTH = 80;

/** Newest first, trimmed, case-insensitive dedupe, capped. Pure so it can be tested without a store. */
export function addRecentSearch(list: string[], term: string): string[] {
  const trimmed = term.trim().slice(0, MAX_RECENT_TERM_LENGTH).trim();
  if (!trimmed) return list;
  const key = trimmed.toLowerCase();
  return [trimmed, ...list.filter((t) => t.toLowerCase() !== key)].slice(0, MAX_RECENT_SEARCHES);
}

export function removeRecentSearch(list: string[], term: string): string[] {
  const key = term.trim().toLowerCase();
  return list.filter((t) => t.toLowerCase() !== key);
}

interface RecentSearchesStore {
  terms: string[];
  record: (term: string) => void;
  remove: (term: string) => void;
  clear: () => void;
}

export const useRecentSearchesStore = create<RecentSearchesStore>()(
  persist(
    (set) => ({
      terms: [],
      record: (term) => set((s) => ({ terms: addRecentSearch(s.terms, term) })),
      remove: (term) => set((s) => ({ terms: removeRecentSearch(s.terms, term) })),
      clear: () => set({ terms: [] }),
    }),
    {
      name: "urgent-printers-recent-searches",
      // A corrupted or hand-edited value must not crash the header.
      merge: (persisted, current) => {
        const terms = (persisted as { terms?: unknown } | undefined)?.terms;
        const clean = Array.isArray(terms)
          ? terms
              .filter((t): t is string => typeof t === "string" && t.trim() !== "")
              .map((t) => t.slice(0, MAX_RECENT_TERM_LENGTH))
              .slice(0, MAX_RECENT_SEARCHES)
          : [];
        return { ...current, terms: clean };
      },
    }
  )
);
