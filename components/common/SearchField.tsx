"use client";

import { useRef, type ChangeEvent, type ReactNode } from "react";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  loading?: boolean;
  name?: string;
  placeholder: string;
  ariaLabel: string;
  autoFocus?: boolean;
  className?: string;
  inputClassName?: string;
  iconClassName?: string;
  iconSize?: number;
  /** Positions the spinner/clear cluster (e.g. `right-3.5`, or further in to clear a submit button). */
  endClassName?: string;
  children?: ReactNode;
}

export function SearchField({
  value,
  onChange,
  onClear,
  loading = false,
  name,
  placeholder,
  ariaLabel,
  autoFocus,
  className,
  inputClassName,
  iconClassName,
  iconSize = 16,
  endClassName = "right-3.5",
  children,
}: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("relative", className)}>
      <Search
        size={iconSize}
        className={cn("absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none", iconClassName)}
      />
      <input
        ref={inputRef}
        type="search"
        name={name}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        autoFocus={autoFocus}
        className={cn(
          "[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:hidden",
          inputClassName
        )}
      />
      <div className={cn("absolute top-1/2 -translate-y-1/2 flex items-center gap-2", endClassName)}>
        {loading && (
          <Loader2
            size={14}
            role="status"
            aria-label="Searching"
            className="animate-spin motion-reduce:animate-none text-muted-foreground"
          />
        )}
        {value && (
          <button
            type="button"
            onClick={() => {
              onClear();
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="rounded-full p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
