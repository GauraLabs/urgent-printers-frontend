"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { clampQuantity, formatQty, MAX_LINE_QUANTITY, normalizeUnitLabel, stepQuantity } from "@/lib/quantity";

const DEBOUNCE_MS = 150;
const ADJUSTED_NOTICE_MS = 3000;
const MAX_DIGITS = 7;

interface QuantityInputProps {
  value: number;
  min: number;
  max: number | null;
  unitLabel?: string;
  onChange: (quantity: number) => void;
  /** Reports whether the field is currently empty/0 so the caller can gate its CTA. */
  onEmptyChange?: (empty: boolean) => void;
  compact?: boolean;
  className?: string;
}

function parseDigits(text: string): number {
  return text === "" ? 0 : Number(text);
}

export function QuantityInput({ value, min, max, unitLabel, onChange, onEmptyChange, compact = false, className }: QuantityInputProps) {
  const unit = normalizeUnitLabel(unitLabel);
  const hintId = useId();
  const [draft, setDraftState] = useState<string | null>(null);
  const draftRef = useRef<string | null>(null);
  const setDraft = useCallback((d: string | null) => {
    draftRef.current = d;
    setDraftState(d);
  }, []);
  const [notice, setNotice] = useState<string | null>(null);
  const focused = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const noticeRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // An external change (tier chip, nudge) wins over whatever is half-typed;
  // our own debounced commit lands on clamp(draft), so that draft is kept.
  useEffect(() => {
    const d = draftRef.current;
    if (d !== null && (!focused.current || clampQuantity(parseDigits(d), min, max) !== value)) setDraft(null);
  }, [value, min, max, setDraft]);

  useEffect(
    () => () => {
      clearTimeout(debounceRef.current);
      clearTimeout(noticeRef.current);
    },
    []
  );

  const showNotice = useCallback((text: string) => {
    setNotice(text);
    clearTimeout(noticeRef.current);
    noticeRef.current = setTimeout(() => setNotice(null), ADJUSTED_NOTICE_MS);
  }, []);

  function handleType(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, MAX_DIGITS);
    setDraft(digits);
    setNotice(null);
    clearTimeout(noticeRef.current);
    const typed = parseDigits(digits);
    onEmptyChange?.(typed === 0);
    clearTimeout(debounceRef.current);
    if (typed === 0) return;
    debounceRef.current = setTimeout(() => onChange(clampQuantity(typed, min, max)), DEBOUNCE_MS);
  }

  function commit() {
    clearTimeout(debounceRef.current);
    // Read through the ref: Enter commits and then blurs, and the second call must see no draft.
    if (draftRef.current === null) return;
    const typed = parseDigits(draftRef.current);
    setDraft(null);
    if (typed === 0) {
      onEmptyChange?.(false);
      return;
    }
    const clamped = clampQuantity(typed, min, max);
    onEmptyChange?.(false);
    onChange(clamped);
    if (clamped !== typed) showNotice(`Adjusted to ${formatQty(clamped, unit)}`);
  }

  function step(dir: "up" | "down") {
    clearTimeout(debounceRef.current);
    const pending = draftRef.current;
    const base = pending !== null && parseDigits(pending) > 0 ? clampQuantity(parseDigits(pending), min, max) : value;
    setDraft(null);
    setNotice(null);
    onEmptyChange?.(false);
    onChange(stepQuantity(base, dir, min, max));
  }

  const typed = draft === null ? null : parseDigits(draft);
  let helper: string | null = notice;
  if (typed !== null && typed > 0) {
    if (typed < min) helper = `Minimum order is ${formatQty(min, unit)}`;
    else if (typed > (max ?? MAX_LINE_QUANTITY)) helper = `Maximum order is ${formatQty(max ?? MAX_LINE_QUANTITY, unit)}`;
  }
  const shown = draft ?? String(value);
  const atMin = value <= min;
  const atMax = value >= (max ?? MAX_LINE_QUANTITY);
  const btn = cn(
    "flex shrink-0 items-center justify-center rounded-lg border border-border transition-colors",
    "hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent",
    compact ? "h-9 w-9" : "h-11 w-11"
  );

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => step("down")} disabled={atMin && draft === null} aria-label="Decrease quantity" className={btn}>
          <Minus size={compact ? 12 : 16} />
        </button>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            enterKeyHint="done"
            autoComplete="off"
            maxLength={MAX_DIGITS}
            aria-label="Quantity"
            aria-describedby={helper ? hintId : undefined}
            value={shown}
            onChange={(e) => handleType(e.target.value)}
            onFocus={(e) => {
              focused.current = true;
              e.currentTarget.select();
            }}
            onBlur={() => {
              focused.current = false;
              commit();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
                e.currentTarget.blur();
              }
            }}
            className={cn(
              "rounded-lg border border-border bg-background text-center font-semibold tabular-nums",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              compact ? "h-9 w-24 pr-9 text-sm" : "h-11 w-32 pr-11 text-base"
            )}
          />
          <span className={cn("pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground", compact ? "text-[10px]" : "text-xs")}>
            {unit}
          </span>
        </div>
        <button type="button" onClick={() => step("up")} disabled={atMax && draft === null} aria-label="Increase quantity" className={btn}>
          <Plus size={compact ? 12 : 16} />
        </button>
      </div>
      <p id={hintId} role="status" className={cn("mt-1.5 min-h-4 text-xs text-brand-orange", !helper && "sr-only")}>
        {helper}
      </p>
    </div>
  );
}
