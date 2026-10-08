import { beforeEach, describe, expect, it } from "vitest";
import {
  addRecentSearch,
  removeRecentSearch,
  useRecentSearchesStore,
  MAX_RECENT_SEARCHES,
  MAX_RECENT_TERM_LENGTH,
} from "@/features/search/recentSearches";

describe("recent searches", () => {
  beforeEach(() => useRecentSearchesStore.setState({ terms: [] }));

  it("trims, ignores blanks, dedupes case-insensitively and puts the newest first", () => {
    let list = addRecentSearch([], "  Wedding Cards ");
    list = addRecentSearch(list, "   ");
    list = addRecentSearch(list, "shagun");
    list = addRecentSearch(list, "wedding cards");
    expect(list).toEqual(["wedding cards", "shagun"]);
  });

  it("caps at 6", () => {
    let list: string[] = [];
    for (let i = 0; i < 10; i++) list = addRecentSearch(list, `t${i}`);
    expect(list).toHaveLength(MAX_RECENT_SEARCHES);
    expect(list[0]).toBe("t9");
  });

  it("truncates very long terms", () => {
    const [t] = addRecentSearch([], "x".repeat(300));
    expect(t).toHaveLength(MAX_RECENT_TERM_LENGTH);
  });

  it("removes one term case-insensitively", () => {
    expect(removeRecentSearch(["A", "b"], "a")).toEqual(["b"]);
  });

  it("store supports record, remove and clear", () => {
    const s = useRecentSearchesStore.getState();
    s.record("one");
    s.record("two");
    s.remove("one");
    expect(useRecentSearchesStore.getState().terms).toEqual(["two"]);
    s.clear();
    expect(useRecentSearchesStore.getState().terms).toEqual([]);
  });
});
