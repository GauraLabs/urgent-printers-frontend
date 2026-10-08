"use client";

import { productHref } from "@/features/products/productHref";
import { useState, useRef, useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, Loader2, ArrowRight, TrendingUp, History } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SafeImage } from "@/components/common/SafeImage";
import { searchProducts } from "@/lib/api";
import { useDebounce } from "@/hooks/useDebounce";
import { useMounted } from "@/hooks/useMounted";
import { useRecentSearchesStore } from "@/features/search/recentSearches";
import { ROUTES } from "@/lib/constants/routes";
import { ProductPrice } from "@/components/common/ProductPrice";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

function hasPrice(product: Product): boolean {
  return product.pricingTiers.length > 0 || product.priceFrom !== undefined;
}

interface HeaderSearchProps {
  popularSearches: string[];
}

export function HeaderSearch({ popularSearches }: HeaderSearchProps) {
  const router = useRouter();
  const mounted = useMounted();
  const recentTerms = useRecentSearchesStore((s) => s.terms);
  const recordSearch = useRecentSearchesStore((s) => s.record);
  const removeSearch = useRecentSearchesStore((s) => s.remove);
  const clearSearches = useRecentSearchesStore((s) => s.clear);
  const visibleRecent = mounted ? recentTerms : [];
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const uid = useId();
  const panelId = `${uid}-search-panel`;
  const listboxId = `${uid}-search-listbox`;
  const optionId = (index: number) => `${uid}-search-option-${index}`;

  const debouncedQuery = useDebounce(query.trim(), 320);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["instant-search", debouncedQuery],
    queryFn: () => searchProducts(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Reset active index when results change
  useEffect(() => setActiveIndex(-1), [results]);

  function submit(q = query.trim()) {
    if (!q) return;
    recordSearch(q);
    setIsOpen(false);
    setQuery("");
    router.push(`${ROUTES.search}?q=${encodeURIComponent(q)}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const total = results.length + (results.length > 0 ? 1 : 0); // +1 for "see all"
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, total - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < results.length) {
        const p = results[activeIndex];
        setIsOpen(false);
        setQuery("");
        router.push(productHref(p));
      } else {
        submit();
      }
    } else if (e.key === "Escape") {
      // type="search" clears its value natively on Escape, which would refire
      // onChange and reopen the dropdown right after we close it.
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }

  const showDropdown = isOpen && (query.trim().length >= 2 || query.trim() === "");
  const hasOptions = !isFetching && results.length > 0;
  const activeOptionId =
    hasOptions && activeIndex >= 0 && activeIndex < results.length ? optionId(activeIndex) : undefined;

  return (
    <div ref={containerRef} className="relative hidden md:flex items-center w-full max-w-sm lg:max-w-md">
      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="relative w-full"
      >
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search products…"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-label="Search products"
          aria-expanded={showDropdown}
          aria-controls={panelId}
          aria-activedescendant={activeOptionId}
          className={cn(
            "w-full h-9 rounded-full border border-border bg-muted/50 pl-9 pr-8 text-sm",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary",
            "transition-colors"
          )}
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
        {isFetching && !query && (
          <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </form>

      {/* Dropdown */}
      {showDropdown && (
        <div
          id={panelId}
          className={cn(
            "absolute top-full left-0 right-0 mt-2 z-50",
            "bg-popover border border-border rounded-2xl shadow-xl overflow-hidden",
            "animate-in fade-in-0 slide-in-from-top-2 duration-150"
          )}
        >
          {/* Loading */}
          {isFetching && query.length >= 2 && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin shrink-0" aria-hidden="true" />
              Searching…
            </div>
          )}

          {/* Results — the listbox owns ONLY role="option" children; the group
              label and "see all" action sit outside it so it stays ARIA-valid. */}
          {hasOptions && (
            <>
              <div className="px-3 py-2 border-b border-border">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Products
                </p>
              </div>
              <div id={listboxId} role="listbox" aria-label="Search results" className="py-1">
                {results.map((product, i) => {
                  return (
                    <Link
                      key={product.id}
                      id={optionId(i)}
                      href={productHref(product)}
                      onClick={() => { setIsOpen(false); setQuery(""); }}
                      role="option"
                      aria-selected={activeIndex === i}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 transition-colors",
                        activeIndex === i ? "bg-muted" : "hover:bg-muted/70"
                      )}
                    >
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-muted border border-border shrink-0">
                        <SafeImage
                          src={product.images[0]}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.categoryName}</p>
                      </div>
                      {hasPrice(product) && (
                        <ProductPrice
                          variant="compact"
                          align="end"
                          prefix="from"
                          unitLabel="/unit"
                          product={product}
                          className="whitespace-nowrap font-semibold text-primary"
                          priceClassName="text-primary"
                        />
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* See all — not a listbox option: it triggers a full search
                  navigation rather than selecting a value. */}
              <div className="border-t border-border">
                <button
                  type="button"
                  onClick={() => submit()}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-primary hover:bg-muted transition-colors",
                    activeIndex === results.length && "bg-muted"
                  )}
                >
                  See all results for &ldquo;{query}&rdquo;
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              </div>
            </>
          )}

          {/* No results — suggestions */}
          {!isFetching && query.length >= 2 && results.length === 0 && (
            <div className="p-4">
              <p className="text-sm font-medium mb-1">No results for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-muted-foreground mb-3">Try one of these instead:</p>
              <div className="flex flex-wrap gap-1.5">
                {popularSearches.filter(t => t.toLowerCase() !== query.toLowerCase()).slice(0, 5).map(term => (
                  <button
                    key={term}
                    onClick={() => { setQuery(term); submit(term); }}
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-secondary hover:bg-primary/10 hover:text-primary border border-border transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent searches (empty state, client-only) */}
          {query.trim() === "" && visibleRecent.length > 0 && (
            <div className="p-3 pb-0">
              <div className="flex items-center justify-between px-1 mb-2">
                <div className="flex items-center gap-1.5">
                  <History size={12} className="text-muted-foreground" aria-hidden="true" />
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Recent Searches
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearSearches}
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear all
                </button>
              </div>
              <ul className="flex flex-wrap gap-2">
                {visibleRecent.map((term) => (
                  <li
                    key={term}
                    className="inline-flex items-center rounded-full border border-border bg-secondary text-secondary-foreground"
                  >
                    <button
                      type="button"
                      onClick={() => submit(term)}
                      className="pl-3 pr-1.5 py-1 text-xs font-medium hover:text-primary transition-colors"
                    >
                      {term}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSearch(term)}
                      aria-label={`Remove ${term} from recent searches`}
                      className="pr-2 pl-0.5 py-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X size={11} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Popular searches (empty state) */}
          {query.trim() === "" && (
            <div className="p-3">
              <div className="flex items-center gap-1.5 px-1 mb-2">
                <TrendingUp size={12} className="text-muted-foreground" />
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Popular Searches
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => { setQuery(term); submit(term); }}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
