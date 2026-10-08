"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { CategoryTile } from "./CategoryTile";
import { useNavCategories } from "./NavCategoriesContext";
import type { NavCategory } from "./buildCategoryTree";

// A click this soon after a hover-open is the same gesture, not a request to close.
const HOVER_CLICK_GRACE_MS = 600;
const OPEN_DELAY_MS = 120;
const CLOSE_DELAY_MS = 220;
const MAX_TOP_LEVEL = 12;

function SubList({ items, depth }: { items: NavCategory[]; depth: number }) {
  return (
    <ul className={cn(depth > 1 && "ml-3 border-l border-border pl-2")}>
      {items.map((c) => (
        <li key={c.slug}>
          <Link
            href={ROUTES.category(c.slug)}
            className="flex min-h-11 items-center justify-between gap-2 rounded px-2 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <span className="truncate">{c.name}</span>
            <span className="text-[11px] tabular-nums">{c.productCount}</span>
          </Link>
          {c.children.length > 0 && <SubList items={c.children} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}

export function MegaMenu() {
  const categories = useNavCategories();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const uid = useId();
  const panelId = `${uid}-mega-panel`;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverOpenedAtRef = useRef(0);
  const pointerInsideRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const schedule = useCallback(
    (next: boolean, delay: number) => {
      clearTimer();
      timerRef.current = setTimeout(() => {
        if (next) hoverOpenedAtRef.current = Date.now();
        setOpen(next);
      }, delay);
    },
    [clearTimer]
  );

  useEffect(() => clearTimer, [clearTimer]);

  useEffect(() => clearTimer(), [pathname, clearTimer]);

  // Route change closes the panel (render-phase adjustment, not an effect).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        pointerInsideRef.current = false;
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function focusables(): HTMLElement[] {
    return Array.from(panelRef.current?.querySelectorAll<HTMLElement>("a[href]") ?? []);
  }

  function closeAndRestoreFocus() {
    clearTimer();
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      closeAndRestoreFocus();
      return;
    }
    const isTrigger = e.target === triggerRef.current;
    if (e.key === "ArrowDown" && isTrigger) {
      e.preventDefault();
      clearTimer();
      setOpen(true);
      requestAnimationFrame(() => focusables()[0]?.focus());
      return;
    }
    if (!open || isTrigger) return;
    const items = focusables();
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (index === -1) return;
    let next = -1;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = Math.min(index + 1, items.length - 1);
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = index - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else return;
    e.preventDefault();
    if (next < 0) triggerRef.current?.focus();
    else items[next]?.focus();
  }

  if (categories.length === 0) return null;

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={() => schedule(true, OPEN_DELAY_MS)}
      onMouseLeave={() => schedule(false, CLOSE_DELAY_MS)}
      onKeyDown={onKeyDown}
      onPointerDown={() => {
        pointerInsideRef.current = true;
      }}
      onPointerUp={() => {
        pointerInsideRef.current = false;
      }}
      onPointerCancel={() => {
        pointerInsideRef.current = false;
      }}
      onBlur={(e) => {
        // Safari reports relatedTarget=null (and doesn't focus buttons) on mouse
        // clicks, so a blur during a press inside the menu is not "focus left".
        if (pointerInsideRef.current) return;
        if (!wrapperRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          clearTimer();
          if (open && Date.now() - hoverOpenedAtRef.current < HOVER_CLICK_GRACE_MS) return;
          setOpen(!open);
        }}
        className={cn(
          "flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
          open ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        Shop
        <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>

      {/* Anchored to the sticky <header> (the nearest positioned ancestor), so it
          overlays page content instead of pushing it and never changes the h-14 row. */}
      <div
        ref={panelRef}
        id={panelId}
        hidden={!open}
        className="absolute left-0 right-0 top-full border-b border-border bg-popover text-popover-foreground shadow-xl"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="flex items-end justify-between mb-4">
            <h2 className="font-heading font-bold text-lg">Shop by occasion</h2>
            <Link href={ROUTES.products} className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              View all products <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <ul className="grid grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-5">
            {categories.slice(0, MAX_TOP_LEVEL).map((c) => (
              <li key={c.slug}>
                <Link
                  href={ROUTES.category(c.slug)}
                  className="flex items-center gap-3 rounded-lg p-1.5 -m-1.5 hover:bg-muted"
                >
                  <CategoryTile name={c.name} imageUrl={c.imageUrl} className="h-12 w-12 text-lg" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{c.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {c.productCount} product{c.productCount !== 1 ? "s" : ""}
                    </span>
                  </span>
                </Link>
                {c.children.length > 0 && (
                  <div className="mt-2 pl-[3.75rem]">
                    <SubList items={c.children} depth={1} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
