"use client";

import { useRef, useState, type ClipboardEvent } from "react";
import { cn } from "@/lib/utils";
import type { TemplateField } from "@/types";
import { fieldMaxLength } from "@/lib/templateFields";

interface TemplateFormProps {
  fields: TemplateField[];
  onChange: (data: Record<string, string>) => void;
  showErrors?: boolean;  // set true externally to force-show all required-field errors
}

export function TemplateForm({ fields, onChange, showErrors = false }: TemplateFormProps) {
  const [values, setValues] = useState<Record<string, string>>(
    () => Object.fromEntries(fields.map((f) => [f.id, ""]))
  );
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const pastedRef = useRef<string | null>(null);
  const [trimmed, setTrimmed] = useState<Record<string, boolean>>({});

  function handleChange(id: string, value: string) {
    if (pastedRef.current === id) pastedRef.current = null;
    else setTrimmed((t) => (t[id] ? { ...t, [id]: false } : t));
    const next = { ...values, [id]: value };
    setValues(next);
    onChange(next);
  }

  // The browser silently cuts a paste at maxLength; compare before it does so the customer is told.
  function handlePaste(field: TemplateField, e: ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const el = e.currentTarget;
    const pasted = e.clipboardData.getData("text/plain") || e.clipboardData.getData("text");
    const selected = (el.selectionEnd ?? 0) - (el.selectionStart ?? 0);
    if (el.value.length - selected + pasted.length > fieldMaxLength(field)) {
      pastedRef.current = field.id;
      setTrimmed((t) => ({ ...t, [field.id]: true }));
    }
  }

  function handleBlur(id: string) {
    setTouched((t) => ({ ...t, [id]: true }));
  }

  const inputBase = cn(
    "w-full rounded-xl border px-3 py-2.5 text-sm bg-background",
    "transition-colors placeholder:text-muted-foreground/60",
    "focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fields.map((field) => {
        const hasError = (touched[field.id] || showErrors) && field.required && !values[field.id];
        const borderClass = hasError
          ? "border-destructive"
          : "border-border hover:border-primary/40";
        const isFullWidth = field.type === "multiline" || field.id === "address";

        return (
          <div key={field.id} className={isFullWidth ? "sm:col-span-2" : ""}>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              {field.label}
              {field.required && <span className="text-destructive ml-0.5">*</span>}
            </label>

            {field.type === "multiline" ? (
              <textarea
                value={values[field.id]}
                onChange={(e) => handleChange(field.id, e.target.value)}
                onBlur={() => handleBlur(field.id)}
                onPaste={(e) => handlePaste(field, e)}
                placeholder={field.placeholder}
                maxLength={fieldMaxLength(field)}
                rows={3}
                className={cn(inputBase, borderClass, "resize-none")}
              />
            ) : (
              <input
                type={field.type === "phone" ? "tel" : field.type}
                value={values[field.id]}
                onChange={(e) => handleChange(field.id, e.target.value)}
                onBlur={() => handleBlur(field.id)}
                onPaste={(e) => handlePaste(field, e)}
                placeholder={field.placeholder}
                maxLength={fieldMaxLength(field)}
                className={cn(inputBase, borderClass)}
              />
            )}

            <div className="flex justify-between mt-1">
              {hasError
                ? <p className="text-destructive text-[11px]">{field.label} is required</p>
                : trimmed[field.id]
                  ? <p role="status" className="text-muted-foreground text-[11px]">Trimmed to {fieldMaxLength(field)} characters</p>
                  : <span />
              }
              <p className="text-muted-foreground text-[10px]" aria-live="off">
                {values[field.id].length}/{fieldMaxLength(field)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
