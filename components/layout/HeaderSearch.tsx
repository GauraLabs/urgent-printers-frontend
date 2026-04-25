"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Search, X, Loader2, ArrowRight, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { searchProducts } from "@/lib/api";
import { useDebounce } from "@/hooks/useDebounce";
import { ROUTES } from "@/lib/constants/routes";
import { formatPricePerUnit, cn } from "@/lib/utils";

const POPULAR = [
  "Business Cards",
  "Flyers",
  "Vinyl Banners",
  "Custom T-Shirts",
  "Packaging Boxes",
  "Brochures",
];

export function HeaderSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
        router.push(ROUTES.product(p.categorySlug, p.slug));
      } else {
        submit();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }

  const showDropdown = isOpen && (query.trim().length >= 2 || query.trim() === "");

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
          aria-label="Search products"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
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
          role="listbox"
          className={cn(
            "absolute top-full left-0 right-0 mt-2 z-50",
            "bg-popover border border-border rounded-2xl shadow-xl overflow-hidden",
            "animate-in fade-in-0 slide-in-from-top-2 duration-150"
          )}
        >
          {/* Loading */}
          {isFetching && query.length >= 2 && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin shrink-0" />
              Searching…
            </div>
          )}

          {/* Results */}
          {!isFetching && results.length > 0 && (
            <>
              <div className="px-3 py-2 border-b border-border">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Products
                </p>
              </div>
              <ul className="py-1">
                {results.map((product, i) => (
                  <li key={product.id}>
                    <Link
                      href={ROUTES.product(product.categorySlug, product.slug)}
                      onClick={() => { setIsOpen(false); setQuery(""); }}
                      role="option"
                      aria-selected={activeIndex === i}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 transition-colors",
                        activeIndex === i ? "bg-muted" : "hover:bg-muted/70"
                      )}
                    >
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-muted border border-border shrink-0">
                        <Image
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
                      <p className="text-xs font-semibold text-primary shrink-0">
                        from {formatPricePerUnit(product.pricingTiers[0].pricePerUnit)}/unit
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>

              {/* See all */}
              <div className="border-t border-border">
                <button
                  onClick={() => submit()}
                  role="option"
                  aria-selected={activeIndex === results.length}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-primary hover:bg-muted transition-colors",
                    activeIndex === results.length && "bg-muted"
                  )}
                >
                  See all results for &ldquo;{query}&rdquo;
                  <ArrowRight size={14} />
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
                {POPULAR.filter(t => t.toLowerCase() !== query.toLowerCase()).slice(0, 5).map(term => (
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
                {POPULAR.map((term) => (
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
