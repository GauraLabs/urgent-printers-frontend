"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { TemplateField } from "@/types";

interface TemplateFormProps {
  fields: TemplateField[];
  onChange: (data: Record<string, string>) => void;
}

export function TemplateForm({ fields, onChange }: TemplateFormProps) {
  const [values, setValues] = useState<Record<string, string>>(
    () => Object.fromEntries(fields.map((f) => [f.id, ""]))
  );
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function handleChange(id: string, value: string) {
    const next = { ...values, [id]: value };
    setValues(next);
    onChange(next);
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
        const hasError = touched[field.id] && field.required && !values[field.id];
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
                placeholder={field.placeholder}
                maxLength={field.maxLength}
                rows={3}
                className={cn(inputBase, borderClass, "resize-none")}
              />
            ) : (
              <input
                type={field.type === "phone" ? "tel" : field.type}
                value={values[field.id]}
                onChange={(e) => handleChange(field.id, e.target.value)}
                onBlur={() => handleBlur(field.id)}
                placeholder={field.placeholder}
                maxLength={field.maxLength}
                className={cn(inputBase, borderClass)}
              />
            )}

            <div className="flex justify-between mt-1">
              {hasError
                ? <p className="text-destructive text-[11px]">{field.label} is required</p>
                : <span />
              }
              {field.maxLength && values[field.id] && (
                <p className="text-muted-foreground text-[10px]">
                  {values[field.id].length}/{field.maxLength}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
