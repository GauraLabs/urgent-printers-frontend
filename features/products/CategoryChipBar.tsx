"use client";

import { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { buildCategoryChipHref, findCategoryPath, type ChipCategory } from "./categoryChips";

interface CategoryChipBarProps {
  categories: ChipCategory[];
}

const CATEGORY_PATH_RE = /^\/products\/([^/]+)$/;

function ChipBarInner({ categories }: CategoryChipBarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeRef = useRef<HTMLAnchorElement>(null);

  const activeSlug = pathname.match(CATEGORY_PATH_RE)?.[1] ?? (searchParams.get("category") || null);
  const path = findCategoryPath(categories, activeSlug);
  const activeKey = path.map((n) => n.slug).join("/");

  // One row for the top level, then one per level of the active branch that has children.
  const rows: { label: string; items: ChipCategory[] }[] = [{ label: "Filter by category", items: categories }];
  for (const node of path) {
    if (node.children.length > 0) rows.push({ label: `${node.name} subcategories`, items: node.children });
  }

  useEffect(() => {
    const el = activeRef.current;
    const track = el?.parentElement;
    if (el && track) track.scrollLeft = Math.max(0, el.offsetLeft - 16);
  }, [activeKey]);

  const chipClass = (state: "active" | "ancestor" | "idle") =>
    cn(
      "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors",
      state === "active" && "border-primary bg-primary text-primary-foreground",
      state === "ancestor" && "border-primary/50 bg-primary/10 text-primary",
      state === "idle" && "border-border bg-card text-foreground hover:border-primary/40 hover:text-primary"
    );

  return (
    <div className="border-b border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {rows.map((row, depth) => (
          <nav key={row.label} aria-label={row.label}>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1.5 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
              {depth === 0 && (
                <Link
                  href={buildCategoryChipHref(null, searchParams)}
                  aria-current={activeSlug === null ? "page" : undefined}
                  ref={activeSlug === null ? activeRef : undefined}
                  className={chipClass(activeSlug === null ? "active" : "idle")}
                >
                  All
                </Link>
              )}
              {row.items.map((c) => {
                const isActive = c.slug === activeSlug;
                const isAncestor = !isActive && path.some((n) => n.slug === c.slug);
                return (
                  <Link
                    key={c.slug}
                    href={buildCategoryChipHref(c.slug, searchParams)}
                    aria-current={isActive ? "page" : isAncestor ? "true" : undefined}
                    ref={isActive || (isAncestor && depth === path.length - 1) ? activeRef : undefined}
                    className={chipClass(isActive ? "active" : isAncestor ? "ancestor" : "idle")}
                  >
                    {c.name}
                  </Link>
                );
              })}
            </div>
          </nav>
        ))}
      </div>
    </div>
  );
}

export function CategoryChipBar(props: CategoryChipBarProps) {
  if (props.categories.length === 0) return null;
  return (
    <Suspense fallback={<div className="h-[61px] border-b border-border" aria-hidden="true" />}>
      <ChipBarInner {...props} />
    </Suspense>
  );
}
