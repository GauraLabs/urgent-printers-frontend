"use client";

import { useRecentSearchesStore } from "@/features/search/recentSearches";
import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { SearchField } from "@/components/common/SearchField";
import { ProductGridSkeleton } from "@/components/common/ProductCardSkeleton";
import { ROUTES } from "@/lib/constants/routes";

const PendingContext = createContext<{ isPending: boolean; navigate: (q: string) => void } | null>(null);

function usePending() {
  const ctx = useContext(PendingContext);
  if (!ctx) throw new Error("Search components must be inside SearchPageProvider");
  return ctx;
}

export function SearchPageProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = (q: string) => {
    const term = q.trim();
    startTransition(() => {
      router.push(term ? `${ROUTES.search}?q=${encodeURIComponent(term)}` : ROUTES.search);
    });
  };

  return <PendingContext value={{ isPending, navigate }}>{children}</PendingContext>;
}

export function SearchPageForm({ query }: { query: string }) {
  const { isPending, navigate } = usePending();
  const [value, setValue] = useState(query);
  const recordSearch = useRecentSearchesStore((s) => s.record);

  // Resync when the URL changes from elsewhere (popular-search links, back/forward).
  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setValue(query);
  }

  return (
    <form
      action={ROUTES.search}
      method="GET"
      className="mb-10"
      onSubmit={(e) => {
        e.preventDefault();
        recordSearch(value);
        navigate(value);
      }}
    >
      <SearchField
        name="q"
        value={value}
        onChange={setValue}
        onClear={() => {
          setValue("");
          navigate("");
        }}
        loading={isPending}
        placeholder="Search products, categories…"
        ariaLabel="Search products"
        autoFocus={!query}
        className="max-w-xl"
        iconSize={18}
        iconClassName="left-4"
        endClassName="right-24"
        inputClassName="w-full h-12 pl-12 pr-32 rounded-2xl border-2 border-border bg-card text-base focus:outline-none focus:border-primary transition-colors shadow-sm"
      >
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Search
        </button>
      </SearchField>
    </form>
  );
}

export function SearchResultsFrame({ children }: { children: ReactNode }) {
  const { isPending } = usePending();
  if (isPending) {
    return (
      <div aria-busy="true" aria-label="Loading results">
        <ProductGridSkeleton count={8} />
      </div>
    );
  }
  return <>{children}</>;
}
